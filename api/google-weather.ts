type WeatherOverview = {
	id: number;
	main: string;
	description: string;
	icon: string;
};

type WeatherData = {
	current: {
		dt: number;
		temp: number;
		uvi: number;
		weather: WeatherOverview[];
	};
	hourly: Array<{
		dt: number;
		temp: number;
		uvi: number;
		weather: WeatherOverview[];
	}>;
	elevation: number;
	sunrise: string;
	sunset: string;
	nextSunrise: string;
	timezone: string;
};

type GoogleForecastHour = {
	interval?: {
		startTime?: string;
	};
	weatherCondition?: GoogleWeatherCondition;
	temperature?: {
		degrees?: number;
	};
	uvIndex?: number;
};

type GoogleForecastDay = {
	sunEvents?: {
		sunriseTime?: string;
		sunsetTime?: string;
	};
};

type GoogleWeatherCondition = {
	iconBaseUri?: string;
	type?: string;
	description?: {
		text?: string;
	};
};

type GoogleHourlyResponse = {
	forecastHours?: GoogleForecastHour[];
	timeZone?: {
		id?: string;
	};
	nextPageToken?: string;
};

type GoogleDailyResponse = {
	forecastDays?: GoogleForecastDay[];
	timeZone?: {
		id?: string;
	};
};

type GoogleElevationResponse = {
	results?: Array<{
		elevation?: number;
	}>;
	status?: string;
	error_message?: string;
};

const GOOGLE_WEATHER_HOURLY_URL =
	"https://weather.googleapis.com/v1/forecast/hours:lookup";
const GOOGLE_WEATHER_DAILY_URL =
	"https://weather.googleapis.com/v1/forecast/days:lookup";
const GOOGLE_ELEVATION_URL =
	"https://maps.googleapis.com/maps/api/elevation/json";
const FORECAST_HOURS = 72;
const DAILY_FORECAST_DAYS = 2;

export default async function handler(request: Request): Promise<Response> {
	if (request.method !== "GET") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	const apiKey = process.env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) {
		return jsonResponse({ error: "Missing GOOGLE_MAPS_API_KEY" }, 500);
	}

	const url = new URL(request.url);
	const latitude = parseCoordinate(url.searchParams.get("latitude"), -90, 90);
	const longitude = parseCoordinate(
		url.searchParams.get("longitude"),
		-180,
		180,
	);

	if (latitude === undefined || longitude === undefined) {
		return jsonResponse(
			{ error: "Valid latitude and longitude are required" },
			400,
		);
	}

	try {
		const [hourly, daily, elevation] = await Promise.all([
			fetchGoogleHourlyWeather(apiKey, latitude, longitude),
			fetchGoogleDailyWeather(apiKey, latitude, longitude),
			fetchGoogleElevation(apiKey, latitude, longitude).catch(() => 0),
		]);

		return jsonResponse(normalizeWeatherData(hourly, daily, elevation), 200, {
			"Cache-Control": "no-store",
			"X-Weather-Provider": "google",
		});
	} catch (error) {
		return jsonResponse(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch Google weather",
			},
			502,
		);
	}
}

function parseCoordinate(
	value: string | null,
	min: number,
	max: number,
): number | undefined {
	if (!value) {
		return undefined;
	}

	const coordinate = Number(value);
	if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
		return undefined;
	}

	return coordinate;
}

async function fetchGoogleHourlyWeather(
	apiKey: string,
	latitude: number,
	longitude: number,
): Promise<GoogleHourlyResponse> {
	let nextPageToken: string | undefined;
	let timeZone: GoogleHourlyResponse["timeZone"];
	const forecastHours: GoogleForecastHour[] = [];

	do {
		const page = await fetchGoogleHourlyWeatherPage(
			apiKey,
			latitude,
			longitude,
			nextPageToken,
		);
		timeZone ??= page.timeZone;
		forecastHours.push(...(page.forecastHours ?? []));
		nextPageToken = page.nextPageToken;
	} while (nextPageToken && forecastHours.length < FORECAST_HOURS);

	return {
		forecastHours: forecastHours.slice(0, FORECAST_HOURS),
		timeZone,
	};
}

async function fetchGoogleHourlyWeatherPage(
	apiKey: string,
	latitude: number,
	longitude: number,
	pageToken?: string,
): Promise<GoogleHourlyResponse> {
	const url = new URL(GOOGLE_WEATHER_HOURLY_URL);
	url.search = new URLSearchParams({
		key: apiKey,
		"location.latitude": latitude.toString(),
		"location.longitude": longitude.toString(),
		unitsSystem: "IMPERIAL",
		hours: FORECAST_HOURS.toString(),
		pageSize: "24",
		languageCode: "en",
	}).toString();

	if (pageToken) {
		url.searchParams.set("pageToken", pageToken);
	}

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Google hourly weather error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

async function fetchGoogleDailyWeather(
	apiKey: string,
	latitude: number,
	longitude: number,
): Promise<GoogleDailyResponse> {
	const url = new URL(GOOGLE_WEATHER_DAILY_URL);
	url.search = new URLSearchParams({
		key: apiKey,
		"location.latitude": latitude.toString(),
		"location.longitude": longitude.toString(),
		unitsSystem: "IMPERIAL",
		days: DAILY_FORECAST_DAYS.toString(),
		pageSize: DAILY_FORECAST_DAYS.toString(),
		languageCode: "en",
	}).toString();

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Google daily weather error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

async function fetchGoogleElevation(
	apiKey: string,
	latitude: number,
	longitude: number,
): Promise<number> {
	const url = new URL(GOOGLE_ELEVATION_URL);
	url.search = new URLSearchParams({
		key: apiKey,
		locations: `${latitude},${longitude}`,
	}).toString();

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Google elevation error: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as GoogleElevationResponse;
	const elevation = data.results?.[0]?.elevation;

	if (data.status !== "OK" || typeof elevation !== "number") {
		throw new Error(data.error_message || "Invalid Google elevation response");
	}

	return elevation;
}

function normalizeWeatherData(
	hourlyResponse: GoogleHourlyResponse,
	dailyResponse: GoogleDailyResponse,
	elevation: number,
): WeatherData {
	const timezone = hourlyResponse.timeZone?.id || dailyResponse.timeZone?.id;
	if (!timezone) {
		throw new Error("Missing Google weather timezone");
	}

	const hourly = (hourlyResponse.forecastHours ?? []).map((hour) =>
		normalizeHourlyWeather(hour),
	);
	const current = hourly[0];
	if (!current) {
		throw new Error("Invalid Google hourly weather response");
	}

	const today = dailyResponse.forecastDays?.[0]?.sunEvents;
	const tomorrow = dailyResponse.forecastDays?.[1]?.sunEvents;
	const sunrise = today?.sunriseTime;
	const sunset = today?.sunsetTime;
	const nextSunrise = tomorrow?.sunriseTime;
	if (!sunrise || !sunset || !nextSunrise) {
		throw new Error("Missing Google sun event forecast");
	}

	return {
		current,
		hourly,
		elevation,
		sunrise,
		sunset,
		nextSunrise,
		timezone,
	};
}

function normalizeHourlyWeather(
	hour: GoogleForecastHour,
): WeatherData["hourly"][number] {
	const startTime = hour.interval?.startTime;
	const temperature = hour.temperature?.degrees;
	const uvIndex = hour.uvIndex;

	if (
		!startTime ||
		typeof temperature !== "number" ||
		typeof uvIndex !== "number"
	) {
		throw new Error("Invalid Google hourly weather response");
	}

	return {
		dt: Math.floor(Date.parse(startTime) / 1000),
		temp: temperature,
		uvi: uvIndex,
		weather: [normalizeWeatherOverview(hour.weatherCondition)],
	};
}

function normalizeWeatherOverview(
	condition: GoogleWeatherCondition | undefined,
): WeatherOverview {
	const type = condition?.type ?? "UNKNOWN";
	const description =
		condition?.description?.text ?? type.replaceAll("_", " ").toLowerCase();

	return {
		id: 800,
		main: toTitleCase(type.replaceAll("_", " ").toLowerCase()),
		description,
		icon: condition?.iconBaseUri ?? "",
	};
}

function toTitleCase(value: string): string {
	return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function jsonResponse(
	body: unknown,
	status: number,
	headers?: Record<string, string>,
): Response {
	return Response.json(body, {
		status,
		headers: {
			...headers,
			"Content-Type": "application/json",
		},
	});
}
