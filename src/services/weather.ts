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

interface GoogleForecastHour {
	interval?: {
		startTime?: string;
	};
	weatherCondition?: {
		iconBaseUri?: string;
		type?: string;
		description?: {
			text?: string;
		};
	};
	temperature?: {
		degrees?: number;
	};
	uvIndex?: number;
}

interface GoogleHourlyResponse {
	forecastHours?: GoogleForecastHour[];
	timeZone?: {
		id?: string;
	};
	nextPageToken?: string;
}

const GOOGLE_FORECAST_HOURS = 72;

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

export function isGoogleWeatherTestRoute(): boolean {
	if (typeof window === "undefined") return false;
	return window.location.pathname.replace(/\/+$/, "") === "/google";
}

export function getActiveWeatherProvider(): WeatherProvider {
	return isGoogleWeatherTestRoute() ? "google" : "open-meteo";
}

export async function fetchWeatherData(
	position: Position,
	provider: WeatherProvider = getActiveWeatherProvider(),
): Promise<WeatherData> {
	if (provider === "google") {
		return fetchGoogleWeatherData(position);
	}

	return fetchOpenMeteoWeatherData(position);
}

export async function fetchOpenMeteoWeatherData(
	position: Position,
): Promise<WeatherData> {
	const proxiedWeather = await fetchOpenMeteoWeatherDataFromApi(position);
	if (proxiedWeather) {
		return proxiedWeather;
	}

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

async function fetchOpenMeteoWeatherDataFromApi(
	position: Position,
): Promise<WeatherData | undefined> {
	if (typeof window === "undefined") {
		return undefined;
	}

	const params = new URLSearchParams({
		latitude: position.latitude.toString(),
		longitude: position.longitude.toString(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});

	let response: Response;
	try {
		response = await fetch(`/api/open-meteo-weather?${params.toString()}`, {
			headers: {
				Accept: "application/json",
			},
		});
	} catch {
		return undefined;
	}

	const contentType = response.headers.get("content-type");
	if (!contentType?.includes("application/json")) {
		return undefined;
	}

	if (!response.ok) {
		const message = await readErrorMessage(response);
		throw new Error(message || `Weather API error: ${response.status}`);
	}

	return response.json();
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
			"Google weather needs Vercel dev or a Vercel preview deployment.",
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

export function normalizeGoogleWeatherData(
	googleWeather: GoogleHourlyResponse,
	metadata: Pick<
		WeatherData,
		"elevation" | "sunrise" | "sunset" | "nextSunrise" | "timezone" | "aqi"
	>,
): WeatherData {
	const timezone = googleWeather.timeZone?.id || metadata.timezone;
	if (!timezone) {
		throw new Error("Missing weather timezone");
	}

	const hourly = (googleWeather.forecastHours ?? []).flatMap((hour) => {
		const startTime = hour.interval?.startTime;
		const temperature = hour.temperature?.degrees;
		const uvIndex = hour.uvIndex;

		if (
			!startTime ||
			typeof temperature !== "number" ||
			typeof uvIndex !== "number"
		) {
			return [];
		}

		return [
			{
				dt: Math.floor(Date.parse(startTime) / 1000),
				temp: temperature,
				uvi: uvIndex,
				weather: [normalizeGoogleWeatherOverview(hour)],
			},
		];
	});
	const filteredHourly = hourly.slice(0, GOOGLE_FORECAST_HOURS);
	const current = filteredHourly[0];
	if (!current) {
		throw new Error("Invalid Google weather data received");
	}

	return {
		provider: "google",
		current,
		hourly: filteredHourly,
		elevation: metadata.elevation,
		aqi: metadata.aqi,
		sunrise: metadata.sunrise,
		sunset: metadata.sunset,
		nextSunrise: metadata.nextSunrise,
		timezone,
	};
}

function normalizeGoogleWeatherOverview(hour: GoogleForecastHour) {
	const type = hour.weatherCondition?.type ?? "UNKNOWN";
	const description =
		hour.weatherCondition?.description?.text ?? type.replaceAll("_", " ");

	return {
		id: 800,
		main: toTitleCase(type.replaceAll("_", " ").toLowerCase()),
		description,
		icon: hour.weatherCondition?.iconBaseUri ?? "",
	};
}

function toTitleCase(value: string): string {
	return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getWeatherProviderLabel(
	provider: ActualWeatherProvider | undefined,
): string {
	switch (provider) {
		case "google":
			return "Google";
		case "current-uv-index":
			return "CurrentUVIndex + MET Norway";
		case "open-meteo":
		case undefined:
			return "Open-Meteo";
	}
}

export function getWeatherProviderUrl(
	provider: ActualWeatherProvider | undefined,
): string | undefined {
	switch (provider) {
		case "current-uv-index":
			return "https://currentuvindex.com";
		case "google":
			return "https://weather.google.com";
		case "open-meteo":
			return "https://open-meteo.com";
		case undefined:
			return undefined;
	}
}
