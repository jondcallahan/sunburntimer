import type { Position, AQIData } from "../types";

interface OpenMeteoAQIResponse {
	current: {
		us_aqi: number;
	};
}

export async function fetchAQIData(position: Position): Promise<AQIData> {
	const lat = position.latitude.toFixed(4);
	const lon = position.longitude.toFixed(4);

	const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
	const params = new URLSearchParams({
		latitude: lat,
		longitude: lon,
		current: "us_aqi",
		domains: "cams_global",
	});
	url.search = params.toString();

	const response = await fetch(url);

	if (!response.ok) {
		if (response.status === 429) {
			throw new Error("AQI API rate limit exceeded. Please try again later.");
		} else {
			throw new Error(
				`AQI API error: ${response.status} ${response.statusText}`,
			);
		}
	}

	const data: OpenMeteoAQIResponse = await response.json();

	if (!data.current || data.current.us_aqi === undefined) {
		throw new Error("Invalid AQI data received from API");
	}

	return {
		us_aqi: Math.round(data.current.us_aqi),
	};
}
