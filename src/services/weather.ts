import { TZDate } from "@date-fns/tz";
import type {
	ActualWeatherProvider,
	Position,
	WeatherData,
	AQIData,
	WeatherProvider,
} from "../types";
import { WMO_DESCRIPTIONS } from "../constants/wmo-descriptions";
import { fetchAQIData } from "./aqi";

interface OpenMeteoResponse {
	elevation: number;
	timezone: string;
	current: {
		time: string;
		temperature_2m: number;
		uv_index: number;
		weather_code: number;
	};
	hourly: {
		time: string[];
		temperature_2m: number[];
		uv_index: number[];
		weather_code: number[];
	};
	daily: {
		sunrise: string[];
		sunset: string[];
	};
}

interface EPAHourlyUVResponse {
	DATE_TIME?: string;
	UV_VALUE?: number | string;
}

const US_STATE_ABBREVIATIONS: Record<string, string> = {
	alabama: "AL",
	alaska: "AK",
	arizona: "AZ",
	arkansas: "AR",
	california: "CA",
	colorado: "CO",
	connecticut: "CT",
	delaware: "DE",
	florida: "FL",
	georgia: "GA",
	hawaii: "HI",
	idaho: "ID",
	illinois: "IL",
	indiana: "IN",
	iowa: "IA",
	kansas: "KS",
	kentucky: "KY",
	louisiana: "LA",
	maine: "ME",
	maryland: "MD",
	massachusetts: "MA",
	michigan: "MI",
	minnesota: "MN",
	mississippi: "MS",
	missouri: "MO",
	montana: "MT",
	nebraska: "NE",
	nevada: "NV",
	"new hampshire": "NH",
	"new jersey": "NJ",
	"new mexico": "NM",
	"new york": "NY",
	"north carolina": "NC",
	"north dakota": "ND",
	ohio: "OH",
	oklahoma: "OK",
	oregon: "OR",
	pennsylvania: "PA",
	"rhode island": "RI",
	"south carolina": "SC",
	"south dakota": "SD",
	tennessee: "TN",
	texas: "TX",
	utah: "UT",
	vermont: "VT",
	virginia: "VA",
	washington: "WA",
	"west virginia": "WV",
	wisconsin: "WI",
	wyoming: "WY",
};

/**
 * Parse a naive datetime string from Open-Meteo (e.g. "2026-02-22T14:00")
 * as local time in the given IANA timezone, returning a UTC timestamp (ms).
 */
function parseLocationTime(timeStr: string, timezone: string): number {
	const [datePart, timePart] = timeStr.split("T");
	const [y, m, d] = datePart.split("-").map(Number);
	const [h, min] = (timePart ?? "00:00").split(":").map(Number);
	return new TZDate(y, m - 1, d, h, min, 0, timezone).getTime();
}

export function getActiveWeatherProvider(): WeatherProvider {
	return isGoogleWeatherTestRoute() ? "google" : "open-meteo";
}

export function isGoogleWeatherTestRoute(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	return window.location.pathname.replace(/\/+$/, "") === "/google";
}

export async function fetchWeatherData(
	position: Position,
	provider: ActualWeatherProvider = getActiveWeatherProvider() as ActualWeatherProvider,
): Promise<WeatherData> {
	if (provider === "google") {
		return fetchGoogleWeatherData(position);
	}

	return fetchOpenMeteoWeatherData(position);
}

export async function fetchEnsembleWeatherData(
	position: Position,
	placeName?: string,
	countryCode?: string,
): Promise<WeatherData[]> {
	const [openMeteo, google] = await Promise.all([
		fetchOpenMeteoWeatherData(position),
		fetchGoogleWeatherData(position),
	]);
	const providers = [openMeteo, google];
	const epa = await fetchEPAWeatherData(openMeteo, placeName, countryCode);

	if (epa) {
		providers.push(epa);
	}

	return providers;
}

async function fetchGoogleWeatherData(
	position: Position,
): Promise<WeatherData> {
	const params = new URLSearchParams({
		latitude: position.latitude.toString(),
		longitude: position.longitude.toString(),
	});

	const response = await fetch(`/api/google-weather?${params.toString()}`, {
		headers: {
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		const message = await readErrorMessage(response);
		throw new Error(message || `Google Weather API error: ${response.status}`);
	}

	const contentType = response.headers.get("content-type");
	if (!contentType?.includes("application/json")) {
		throw new Error(
			"Google weather endpoint did not return JSON. Use a Vercel preview deployment or run the app with Vercel dev.",
		);
	}

	return response.json();
}

async function readErrorMessage(
	response: Response,
): Promise<string | undefined> {
	const contentType = response.headers.get("content-type");

	if (contentType?.includes("application/json")) {
		const body = (await response.json().catch(() => undefined)) as
			| { error?: string }
			| undefined;
		return body?.error;
	}

	return response.text().catch(() => undefined);
}

export async function fetchOpenMeteoWeatherData(
	position: Position,
): Promise<WeatherData> {
	const lat = position.latitude.toFixed(4);
	const lon = position.longitude.toFixed(4);

	const url = new URL("https://api.open-meteo.com/v1/forecast");
	const params = new URLSearchParams({
		latitude: lat,
		longitude: lon,
		current: "temperature_2m,uv_index,weather_code",
		hourly: "temperature_2m,uv_index,weather_code",
		daily: "sunrise,sunset",
		temperature_unit: "fahrenheit",
		wind_speed_unit: "mph",
		timezone: "auto",
		forecast_days: "3",
	});
	url.search = params.toString();

	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429) {
			throw new Error("API rate limit exceeded. Please try again later.");
		} else {
			throw new Error(
				`Weather API error: ${response.status} ${response.statusText}`,
			);
		}
	}

	const data: OpenMeteoResponse = await response.json();

	// Validate required fields
	if (!data.current || !data.hourly) {
		throw new Error("Invalid weather data received from API");
	}

	const locationTimezone = data.timezone;

	const current = {
		dt: Math.floor(
			parseLocationTime(data.current.time, locationTimezone) / 1000,
		),
		temp: data.current.temperature_2m,
		uvi: data.current.uv_index,
		weather: [
			{
				id: 800,
				main: "Clear",
				description:
					WMO_DESCRIPTIONS[
						data.current.weather_code.toString() as keyof typeof WMO_DESCRIPTIONS
					] || "Unknown",
				icon: "01d",
			},
		],
	};

	// Convert hourly data (use all available data from 3-day forecast)
	const hourlyData = data.hourly;
	const maxHours = hourlyData.time.length;

	const hourly = Array.from({ length: maxHours }, (_, i) => ({
		dt: Math.floor(
			parseLocationTime(hourlyData.time[i], locationTimezone) / 1000,
		),
		temp: hourlyData.temperature_2m[i],
		uvi: hourlyData.uv_index[i],
		weather: [
			{
				id: 800,
				main: "Clear",
				description:
					WMO_DESCRIPTIONS[
						hourlyData.weather_code[
							i
						].toString() as keyof typeof WMO_DESCRIPTIONS
					] || "Unknown",
				icon: "01d",
			},
		],
	}));

	// Fetch AQI data
	let aqi: AQIData | undefined;
	try {
		aqi = await fetchAQIData(position);
	} catch (error) {
		console.warn("Failed to fetch AQI data:", error);
		// AQI data is optional, so we continue without it
	}

	return {
		provider: "open-meteo",
		current,
		hourly,
		elevation: data.elevation,
		aqi,
		sunrise: new Date(
			parseLocationTime(data.daily.sunrise[0], locationTimezone),
		).toISOString(),
		sunset: new Date(
			parseLocationTime(data.daily.sunset[0], locationTimezone),
		).toISOString(),
		nextSunrise: new Date(
			parseLocationTime(data.daily.sunrise[1], locationTimezone),
		).toISOString(),
		timezone: locationTimezone,
	};
}

async function fetchEPAWeatherData(
	baseWeather: WeatherData,
	placeName?: string,
	countryCode?: string,
): Promise<WeatherData | undefined> {
	const location = parseUSCityState(placeName, countryCode);
	if (!location) {
		return undefined;
	}

	const url = new URL(
		`https://data.epa.gov/dmapservice/getEnvirofactsUVHOURLY/CITY/${encodeURIComponent(
			location.city,
		)}/STATE/${location.state}/JSON`,
	);
	const response = await fetch(url);

	if (!response.ok) {
		return undefined;
	}

	const data = (await response.json()) as EPAHourlyUVResponse[];
	const uvByTime = new Map<number, number>();

	for (const row of data) {
		const uvValue = Number(row.UV_VALUE);
		if (!row.DATE_TIME || !Number.isFinite(uvValue)) {
			continue;
		}

		const timestamp = parseEPALocationTime(row.DATE_TIME, baseWeather.timezone);
		uvByTime.set(Math.floor(timestamp / 1000), uvValue);
	}

	if (uvByTime.size === 0) {
		return undefined;
	}

	const hourly = baseWeather.hourly.map((hour) => ({
		...hour,
		uvi: uvByTime.get(hour.dt) ?? hour.uvi,
		weather: [
			{
				id: 800,
				main: "EPA UV",
				description: "EPA hourly UV forecast",
				icon: "",
			},
		],
	}));

	return {
		...baseWeather,
		provider: "epa",
		current: {
			...baseWeather.current,
			uvi: uvByTime.get(baseWeather.current.dt) ?? baseWeather.current.uvi,
			weather: [
				{
					id: 800,
					main: "EPA UV",
					description: "EPA hourly UV forecast",
					icon: "",
				},
			],
		},
		hourly,
	};
}

function parseUSCityState(
	placeName?: string,
	countryCode?: string,
): { city: string; state: string } | undefined {
	if (countryCode !== "US" || !placeName) {
		return undefined;
	}

	const [city, stateName] = placeName.split(",").map((part) => part.trim());
	if (!city || !stateName) {
		return undefined;
	}

	const normalizedStateName = stateName.toLowerCase();
	const state =
		stateName.length === 2
			? stateName.toUpperCase()
			: US_STATE_ABBREVIATIONS[normalizedStateName];

	if (!state) {
		return undefined;
	}

	return { city, state };
}

function parseEPALocationTime(timeStr: string, timezone: string): number {
	const [datePart, hourPart, meridiem] = timeStr.split(" ");
	const [monthName, dayString, yearString] = datePart.split("/");
	const month = [
		"jan",
		"feb",
		"mar",
		"apr",
		"may",
		"jun",
		"jul",
		"aug",
		"sep",
		"oct",
		"nov",
		"dec",
	].indexOf(monthName.slice(0, 3).toLowerCase());
	const day = Number(dayString);
	const year = Number(yearString);
	const hour12 = Number(hourPart);
	const hour =
		meridiem === "PM" && hour12 !== 12
			? hour12 + 12
			: meridiem === "AM" && hour12 === 12
				? 0
				: hour12;

	return new TZDate(year, month, day, hour, 0, 0, timezone).getTime();
}

export function getWeatherProviderLabel(
	provider: ActualWeatherProvider,
): string {
	switch (provider) {
		case "google":
			return "Google";
		case "epa":
			return "EPA/NOAA";
		case "open-meteo":
			return "Open-Meteo";
	}
}
