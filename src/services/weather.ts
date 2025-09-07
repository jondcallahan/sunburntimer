import type { Position, WeatherData, AQIData } from "../types";
import { WMO_DESCRIPTIONS } from "../constants/wmo-descriptions";
import { fetchAQIData } from "./aqi";

interface OpenMeteoResponse {
	elevation: number;
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
	const current = {
		dt: Math.floor(new Date(data.current.time).getTime() / 1000),
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
		dt: Math.floor(new Date(hourlyData.time[i]).getTime() / 1000),
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
	} as WeatherData;
}
