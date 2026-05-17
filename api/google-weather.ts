import { TZDate } from "@date-fns/tz";

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

type CacheEntry = {
	expiresAt: number;
	body: WeatherData;
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
const CACHE_TTL_MS = 30 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

const globalRuntime = globalThis as typeof globalThis & {
	__sunburnGoogleWeatherCache?: Map<string, CacheEntry>;
	__sunburnGoogleWeatherRateLimit?: Map<string, RateLimitEntry>;
};

const weatherCache =
	globalRuntime.__sunburnGoogleWeatherCache ?? new Map<string, CacheEntry>();
const rateLimit =
	globalRuntime.__sunburnGoogleWeatherRateLimit ??
	new Map<string, RateLimitEntry>();

globalRuntime.__sunburnGoogleWeatherCache = weatherCache;
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

		const roundedLatitude = roundCoordinate(latitude);
		const roundedLongitude = roundCoordinate(longitude);
		const cacheKey = [
			"google-weather-v1",
			roundedLatitude,
			roundedLongitude,
			new Date().toISOString().slice(0, 13),
		].join(":");

		const cached = weatherCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) {
			return weatherResponse(cached.body, "HIT");
		}

		try {
			const [googleWeather, metadata, aqi] = await Promise.all([
				fetchGoogleHourlyWeather(apiKey, roundedLatitude, roundedLongitude),
				fetchOpenMeteoMetadata(roundedLatitude, roundedLongitude),
				fetchOpenMeteoAqi(roundedLatitude, roundedLongitude),
			]);
			const weather = normalizeWeatherData(googleWeather, metadata, aqi);

			weatherCache.set(cacheKey, {
				expiresAt: Date.now() + CACHE_TTL_MS,
				body: weather,
			});

			return weatherResponse(weather, "MISS");
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

function roundCoordinate(coordinate: number): number {
	return Number(coordinate.toFixed(3));
}

async function fetchGoogleHourlyWeather(
	apiKey: string,
	latitude: number,
	longitude: number,
): Promise<GoogleHourlyResponse> {
	const url = new URL(GOOGLE_WEATHER_BASE_URL);
	url.search = new URLSearchParams({
		key: apiKey,
		"location.latitude": latitude.toString(),
		"location.longitude": longitude.toString(),
		unitsSystem: "IMPERIAL",
		hours: "24",
		pageSize: "24",
		languageCode: "en",
	}).toString();

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
		forecast_days: "2",
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

	const current = hourly[0];
	if (!current) {
		throw new Error("Invalid Google weather data received");
	}

	const timezone = googleWeather.timeZone?.id || metadata.timezone;
	if (!timezone) {
		throw new Error("Missing weather timezone");
	}

	const sunrise = metadata.daily?.sunrise?.[0];
	const sunset = metadata.daily?.sunset?.[0];
	const nextSunrise = metadata.daily?.sunrise?.[1];
	if (!sunrise || !sunset || !nextSunrise) {
		throw new Error("Missing sunrise or sunset metadata");
	}

	return {
		current,
		hourly,
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

function weatherResponse(
	body: WeatherData,
	cacheStatus: "HIT" | "MISS",
): Response {
	return jsonResponse(body, 200, {
		"Cache-Control":
			"public, max-age=0, s-maxage=1800, stale-while-revalidate=1800",
		"X-Weather-Provider": "google",
		"X-Cache-Status": cacheStatus,
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
