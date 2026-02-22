import type { Position, WeatherData, AQIData } from "../types";
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

export async function fetchWeatherData(
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

	// Convert Open-Meteo format to our internal format
	const locationTimezone = data.timezone;

	// Parse a naive datetime string (from Open-Meteo, in location's timezone) to a UTC timestamp.
	// Open-Meteo returns times like "2026-02-22T14:00" in the location's local time.
	// We need to interpret these in the location's timezone, not the browser's.
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: locationTimezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	function parseLocationTime(timeStr: string): number {
		// Parse as UTC first to get the date/time components
		const asUtc = new Date(`${timeStr}Z`);
		// What time would it be in the target timezone if it were this UTC time?
		// We need the reverse: given local time, find UTC.
		// Use iterative approach: assume offset, check, adjust.
		// Simple method: get offset at a rough estimate, then refine once.
		const roughUtc = asUtc.getTime(); // treat the local time as UTC
		const testDate = new Date(roughUtc);
		const parts = formatter.formatToParts(testDate);
		const get = (type: string) =>
			Number.parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
		const localAtRoughUtc = Date.UTC(
			get("year"),
			get("month") - 1,
			get("day"),
			get("hour"),
			get("minute"),
			get("second"),
		);
		const offset = localAtRoughUtc - roughUtc;
		// The actual UTC time = local time - offset
		return roughUtc - offset;
	}

	const current = {
		dt: Math.floor(parseLocationTime(data.current.time) / 1000),
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
		dt: Math.floor(parseLocationTime(hourlyData.time[i]) / 1000),
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
		current,
		hourly,
		elevation: data.elevation,
		aqi,
		sunrise: new Date(parseLocationTime(data.daily.sunrise[0])).toISOString(),
		sunset: new Date(parseLocationTime(data.daily.sunset[0])).toISOString(),
		timezone: locationTimezone,
	};
}
