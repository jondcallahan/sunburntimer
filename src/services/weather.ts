import { TZDate } from "@date-fns/tz";
import type { Position, WeatherData, AQIData } from "../types";
import { WMO_DESCRIPTIONS } from "../constants/wmo-descriptions";
import { fetchAQIData } from "./aqi";

const UV_FORECAST_UNAVAILABLE_ERROR =
	"UV forecast is currently unavailable. Please try again later.";

interface OpenMeteoResponse {
	elevation: number;
	timezone: string;
	current: {
		time: string;
		temperature_2m: number;
		uv_index: number | null;
		weather_code: number | null;
	};
	hourly: {
		time: string[];
		temperature_2m: number[];
		uv_index: (number | null)[];
		weather_code: (number | null)[];
	};
	daily: {
		sunrise: string[];
		sunset: string[];
	};
}

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

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function getWeatherDescription(code: number | null | undefined): string {
	if (!isFiniteNumber(code)) return "Unknown";

	return (
		WMO_DESCRIPTIONS[
			Math.trunc(code).toString() as keyof typeof WMO_DESCRIPTIONS
		] || "Unknown"
	);
}

function requireUvIndex(value: unknown): number {
	if (!isFiniteNumber(value)) {
		throw new Error(UV_FORECAST_UNAVAILABLE_ERROR);
	}

	return value;
}

function getHourlyUvIndex(hourly: OpenMeteoResponse["hourly"]): number[] {
	if (hourly.time.length === 0 || hourly.uv_index.length < hourly.time.length) {
		throw new Error(UV_FORECAST_UNAVAILABLE_ERROR);
	}

	return hourly.time.map((_, i) => requireUvIndex(hourly.uv_index[i]));
}

export async function fetchWeatherData(
	position: Position,
): Promise<WeatherData> {
	try {
		return await fetchOpenMeteoWeatherData(position);
	} catch (openMeteoError) {
		console.warn(
			"Open-Meteo weather failed, trying Google fallback:",
			openMeteoError,
		);

		try {
			return await fetchGoogleWeatherFallback(position);
		} catch (googleError) {
			throw new Error(
				`Weather providers unavailable. Open-Meteo: ${getErrorMessage(
					openMeteoError,
				)} Google: ${getErrorMessage(googleError)}`,
			);
		}
	}
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
	if (!data.current || !data.hourly || !data.daily) {
		throw new Error("Invalid weather data received from API");
	}

	const locationTimezone = data.timezone;
	const currentUv = requireUvIndex(data.current.uv_index);

	const current = {
		dt: Math.floor(
			parseLocationTime(data.current.time, locationTimezone) / 1000,
		),
		temp: data.current.temperature_2m,
		uvi: currentUv,
		weather: [
			{
				id: 800,
				main: "Clear",
				description: getWeatherDescription(data.current.weather_code),
				icon: "01d",
			},
		],
	};

	// Convert hourly data (use all available data from 3-day forecast)
	const hourlyData = data.hourly;
	const maxHours = hourlyData.time.length;
	const hourlyUvIndex = getHourlyUvIndex(hourlyData);

	const hourly = Array.from({ length: maxHours }, (_, i) => {
		return {
			dt: Math.floor(
				parseLocationTime(hourlyData.time[i], locationTimezone) / 1000,
			),
			temp: hourlyData.temperature_2m[i],
			uvi: hourlyUvIndex[i],
			weather: [
				{
					id: 800,
					main: "Clear",
					description: getWeatherDescription(hourlyData.weather_code[i]),
					icon: "01d",
				},
			],
		};
	});

	// Fetch AQI data
	let aqi: AQIData | undefined;
	try {
		aqi = await fetchAQIData(position);
	} catch (error) {
		console.warn("Failed to fetch AQI data:", error);
		// AQI data is optional, so we continue without it
	}

	return {
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

async function fetchGoogleWeatherFallback(
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
		throw new Error(
			message || `Google weather fallback error: ${response.status}`,
		);
	}

	const contentType = response.headers.get("content-type");
	if (!contentType?.includes("application/json")) {
		throw new Error("Google weather fallback did not return JSON");
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

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
