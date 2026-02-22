export interface GeocodingResult {
	id: number;
	name: string;
	admin1?: string;
	country: string;
	countryCode: string;
	latitude: number;
	longitude: number;
}

interface OpenMeteoGeocodingResponse {
	results?: {
		id: number;
		name: string;
		admin1?: string;
		country: string;
		country_code: string;
		latitude: number;
		longitude: number;
	}[];
}

export async function searchLocations(
	query: string,
): Promise<GeocodingResult[]> {
	if (query.length < 2) return [];

	const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
	url.searchParams.set("name", query);
	url.searchParams.set("count", "5");
	url.searchParams.set("language", "en");
	url.searchParams.set("format", "json");

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Geocoding API error");
	}

	const data: OpenMeteoGeocodingResponse = await response.json();
	if (!data.results) return [];

	return data.results.map((r) => ({
		id: r.id,
		name: r.name,
		admin1: r.admin1,
		country: r.country,
		countryCode: r.country_code,
		latitude: r.latitude,
		longitude: r.longitude,
	}));
}
