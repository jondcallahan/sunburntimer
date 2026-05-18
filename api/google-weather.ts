import { TZDate } from "@date-fns/tz";

type WeatherOverview = {
	id: number;
	main: string;
	description: string;
	icon: string;
};

type WeatherData = {
	provider: "google";
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
	aqi?: {
		us_aqi: number;
	};
	sunrise: string;
	sunset: string;
	nextSunrise: string;
	timezone: string;
};

type GoogleForecastHour = {
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
};

type GoogleHourlyResponse = {
	forecastHours?: GoogleForecastHour[];
	timeZone?: {
		id?: string;
	};
	nextPageToken?: string;
};

type OpenMeteoMetadataResponse = {
	elevation?: number;
	timezone?: string;
	daily?: {
		sunrise?: string[];
		sunset?: string[];
	};
};

type OpenMeteoAqiResponse = {
	current?: {
		us_aqi?: number;
	};
};

type RateLimitEntry = {
	windowStart: number;
	count: number;
};

const GOOGLE_WEATHER_BASE_URL =
	"https://weather.googleapis.com/v1/forecast/hours:lookup";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AQI_URL =
	"https://air-quality-api.open-meteo.com/v1/air-quality";
const FORECAST_DAYS = 3;
const MAX_GOOGLE_FORECAST_HOURS = 72;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

const globalRuntime = globalThis as typeof globalThis & {
	__sunburnGoogleWeatherRateLimit?: Map<string, RateLimitEntry>;
};

const rateLimit =
	globalRuntime.__sunburnGoogleWeatherRateLimit ??
	new Map<string, RateLimitEntry>();

globalRuntime.__sunburnGoogleWeatherRateLimit = rateLimit;

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method !== "GET") {
			return jsonResponse({ error: "Method not allowed" }, 405);
		}

		if (!isAllowedGoogleTestRequest(request)) {
			return jsonResponse({ error: "Google weather test route required" }, 403);
		}

		const rateLimitResponse = checkRateLimit(request);
		if (rateLimitResponse) {
			return rateLimitResponse;
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
			const [googleWeather, metadata, aqi] = await Promise.all([
				fetchGoogleHourlyWeather(apiKey, latitude, longitude),
				fetchOpenMeteoMetadata(latitude, longitude),
				fetchOpenMeteoAqi(latitude, longitude),
			]);
			const weather = normalizeWeatherData(googleWeather, metadata, aqi);

			return weatherResponse(weather);
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
	},
};

function isAllowedGoogleTestRequest(request: Request): boolean {
	if (process.env.NODE_ENV !== "production") {
		return true;
	}

	const referer = request.headers.get("referer");
	if (!referer) {
		return false;
	}

	try {
		return new URL(referer).pathname.replace(/\/+$/, "") === "/google";
	} catch {
		return false;
	}
}

function checkRateLimit(request: Request): Response | undefined {
	const ipAddress = getIpAddress(request);
	const now = Date.now();
	const entry = rateLimit.get(ipAddress);

	if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
		rateLimit.set(ipAddress, { windowStart: now, count: 1 });
		return undefined;
	}

	entry.count += 1;
	if (entry.count > RATE_LIMIT_MAX) {
		return jsonResponse(
			{ error: "Too many Google weather requests. Please try again later." },
			429,
			{
				"Retry-After": Math.ceil(
					(RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000,
				).toString(),
			},
		);
	}

	return undefined;
}

function getIpAddress(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
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
	} while (nextPageToken && forecastHours.length < MAX_GOOGLE_FORECAST_HOURS);

	return {
		forecastHours: forecastHours.slice(0, MAX_GOOGLE_FORECAST_HOURS),
		timeZone,
	};
}

async function fetchGoogleHourlyWeatherPage(
	apiKey: string,
	latitude: number,
	longitude: number,
	pageToken?: string,
): Promise<GoogleHourlyResponse> {
	const url = new URL(GOOGLE_WEATHER_BASE_URL);
	const params = new URLSearchParams({
		key: apiKey,
		"location.latitude": latitude.toString(),
		"location.longitude": longitude.toString(),
		unitsSystem: "IMPERIAL",
		hours: MAX_GOOGLE_FORECAST_HOURS.toString(),
		pageSize: "24",
		languageCode: "en",
	});

	if (pageToken) {
		params.set("pageToken", pageToken);
	}

	url.search = params.toString();

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Google Weather API error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

async function fetchOpenMeteoMetadata(
	latitude: number,
	longitude: number,
): Promise<OpenMeteoMetadataResponse> {
	const url = new URL(OPEN_METEO_FORECAST_URL);
	url.search = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
		daily: "sunrise,sunset",
		forecast_days: FORECAST_DAYS.toString(),
		timezone: "auto",
	}).toString();

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Open-Meteo metadata error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

async function fetchOpenMeteoAqi(
	latitude: number,
	longitude: number,
): Promise<OpenMeteoAqiResponse | undefined> {
	const url = new URL(OPEN_METEO_AQI_URL);
	url.search = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
		current: "us_aqi",
		domains: "cams_global",
	}).toString();

	const response = await fetch(url);
	if (!response.ok) {
		return undefined;
	}

	return response.json();
}

function normalizeWeatherData(
	googleWeather: GoogleHourlyResponse,
	metadata: OpenMeteoMetadataResponse,
	aqi: OpenMeteoAqiResponse | undefined,
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
				weather: [normalizeWeatherOverview(hour)],
			},
		];
	});
	const filteredHourly = filterToForecastDays(hourly, timezone);

	const current = filteredHourly[0];
	if (!current) {
		throw new Error("Invalid Google weather data received");
	}

	const sunrise = metadata.daily?.sunrise?.[0];
	const sunset = metadata.daily?.sunset?.[0];
	const nextSunrise = metadata.daily?.sunrise?.[1];
	if (!sunrise || !sunset || !nextSunrise) {
		throw new Error("Missing sunrise or sunset metadata");
	}

	return {
		provider: "google",
		current,
		hourly: filteredHourly,
		elevation: metadata.elevation ?? 0,
		aqi:
			typeof aqi?.current?.us_aqi === "number"
				? { us_aqi: Math.round(aqi.current.us_aqi) }
				: undefined,
		sunrise: new Date(parseLocationTime(sunrise, timezone)).toISOString(),
		sunset: new Date(parseLocationTime(sunset, timezone)).toISOString(),
		nextSunrise: new Date(
			parseLocationTime(nextSunrise, timezone),
		).toISOString(),
		timezone,
	};
}

function filterToForecastDays(
	hourly: WeatherData["hourly"],
	timezone: string,
): WeatherData["hourly"] {
	const firstHour = hourly[0];
	if (!firstHour) {
		return [];
	}

	const startDay = getDateKeyInTimezone(firstHour.dt, timezone);
	const includedDays = new Set<string>();
	let lastIncludedDay = startDay;

	for (const hour of hourly) {
		const day = getDateKeyInTimezone(hour.dt, timezone);
		if (!includedDays.has(day)) {
			if (includedDays.size >= FORECAST_DAYS) {
				break;
			}
			includedDays.add(day);
			lastIncludedDay = day;
		}
	}

	return hourly.filter((hour) => {
		const day = getDateKeyInTimezone(hour.dt, timezone);
		return day >= startDay && day <= lastIncludedDay;
	});
}

function getDateKeyInTimezone(
	timestampSeconds: number,
	timezone: string,
): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date(timestampSeconds * 1000));
	const part = (type: string) =>
		parts.find((datePart) => datePart.type === type)?.value;

	return `${part("year")}-${part("month")}-${part("day")}`;
}

function parseLocationTime(timeStr: string, timezone: string): number {
	const [datePart, timePart] = timeStr.split("T");
	const [year, month, day] = datePart.split("-").map(Number);
	const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

	return new TZDate(year, month - 1, day, hour, minute, 0, timezone).getTime();
}

function normalizeWeatherOverview(hour: GoogleForecastHour): WeatherOverview {
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

function weatherResponse(body: WeatherData): Response {
	return jsonResponse(body, 200, {
		"Cache-Control": "no-store",
		"X-Weather-Provider": "google",
	});
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
