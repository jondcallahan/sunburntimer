import { TZDate } from "@date-fns/tz";
import { WMO_DESCRIPTIONS } from "../src/constants/wmo-descriptions.js";

type WeatherOverview = {
	id: number;
	main: string;
	description: string;
	icon: string;
};

type WeatherProvider = "open-meteo" | "current-uv-index";

type WeatherData = {
	provider: WeatherProvider;
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

type OpenMeteoResponse = {
	elevation: number;
	timezone: string;
	current?: {
		time?: string;
		temperature_2m?: number;
		uv_index?: number;
		weather_code?: number;
	};
	hourly?: {
		time?: string[];
		temperature_2m?: number[];
		uv_index?: number[];
		weather_code?: number[];
	};
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

type CurrentUvIndexPoint = {
	time: string;
	uvi: number;
};

type CurrentUvIndexResponse =
	| {
			ok: true;
			now: CurrentUvIndexPoint;
			forecast: CurrentUvIndexPoint[];
			history?: CurrentUvIndexPoint[];
	  }
	| {
			ok: false;
			message?: string;
	  };

type MetNoTimeseries = {
	time?: string;
	data?: {
		instant?: {
			details?: {
				air_temperature?: number;
			};
		};
		next_1_hours?: {
			summary?: {
				symbol_code?: string;
			};
		};
		next_6_hours?: {
			summary?: {
				symbol_code?: string;
			};
		};
		next_12_hours?: {
			summary?: {
				symbol_code?: string;
			};
		};
	};
};

type MetNoResponse = {
	geometry?: {
		coordinates?: number[];
	};
	properties?: {
		timeseries?: MetNoTimeseries[];
	};
};

type MetNoPoint = {
	timeMs: number;
	temp: number;
	symbolCode?: string;
};

const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AQI_URL =
	"https://air-quality-api.open-meteo.com/v1/air-quality";
const CURRENT_UV_INDEX_URL = "https://currentuvindex.com/api/v1/uvi";
const MET_NO_FORECAST_URL =
	"https://api.met.no/weatherapi/locationforecast/2.0/compact";
const FORECAST_DAYS = 3;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export default {
	async fetch(request: Request): Promise<Response> {
		if (request.method !== "GET") {
			return jsonResponse({ error: "Method not allowed" }, 405);
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
			const [forecast, aqi] = await Promise.all([
				fetchOpenMeteoForecast(latitude, longitude),
				fetchOpenMeteoAqi(latitude, longitude),
			]);

			return weatherResponse(normalizeOpenMeteoWeatherData(forecast, aqi));
		} catch (openMeteoError) {
			try {
				const timezone = parseTimezone(
					url.searchParams.get("timezone"),
					longitude,
				);
				const fallbackWeather = await fetchUvFallbackWeather(
					latitude,
					longitude,
					timezone,
				);

				return weatherResponse(fallbackWeather);
			} catch (fallbackError) {
				const openMeteoMessage =
					openMeteoError instanceof Error
						? openMeteoError.message
						: "Failed to fetch Open-Meteo weather";
				const fallbackMessage =
					fallbackError instanceof Error
						? fallbackError.message
						: "fallback weather also failed";

				return jsonResponse(
					{
						error: `${openMeteoMessage}. Fallback weather also failed: ${fallbackMessage}`,
					},
					502,
				);
			}
		}
	},
};

function parseTimezone(value: string | null, longitude: number): string {
	if (!value) {
		return getApproximateTimezone(longitude);
	}

	try {
		new Intl.DateTimeFormat("en", { timeZone: value }).format();
		if (!isTimezoneReasonableForLongitude(value, longitude)) {
			return getApproximateTimezone(longitude);
		}

		return value;
	} catch {
		return getApproximateTimezone(longitude);
	}
}

function isTimezoneReasonableForLongitude(
	timezone: string,
	longitude: number,
): boolean {
	const offsetHours = getTimezoneOffsetHours(timezone);
	if (offsetHours === undefined) {
		return true;
	}

	const expectedLongitude = offsetHours * 15;
	const delta = Math.abs(
		normalizeLongitudeDelta(longitude - expectedLongitude),
	);
	return delta <= 45;
}

function getTimezoneOffsetHours(timezone: string): number | undefined {
	const timezoneName = new Intl.DateTimeFormat("en", {
		timeZone: timezone,
		timeZoneName: "shortOffset",
	})
		.formatToParts(new Date())
		.find((part) => part.type === "timeZoneName")?.value;
	if (!timezoneName) {
		return undefined;
	}

	if (timezoneName === "GMT" || timezoneName === "UTC") {
		return 0;
	}

	const match =
		/^GMT(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?$/.exec(
			timezoneName,
		);
	if (!match?.groups) {
		return undefined;
	}

	const sign = match.groups.sign === "-" ? -1 : 1;
	const hours = Number(match.groups.hours);
	const minutes = Number(match.groups.minutes ?? "0");
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return undefined;
	}

	return sign * (hours + minutes / 60);
}

function normalizeLongitudeDelta(delta: number): number {
	let normalized = delta;
	while (normalized > 180) normalized -= 360;
	while (normalized < -180) normalized += 360;
	return normalized;
}

function getApproximateTimezone(longitude: number): string {
	const offset = Math.max(-12, Math.min(14, Math.round(longitude / 15)));
	if (offset === 0) {
		return "UTC";
	}

	return `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
}

function parseCoordinate(
	value: string | null,
	min: number,
	max: number,
): number | undefined {
	if (!value) return undefined;

	const coordinate = Number(value);
	if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
		return undefined;
	}

	return coordinate;
}

async function fetchWithTimeout(
	input: string | URL,
	init?: RequestInit,
	timeoutMs = 8000,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(input, {
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function fetchOpenMeteoForecast(
	latitude: number,
	longitude: number,
): Promise<OpenMeteoResponse> {
	const url = new URL(OPEN_METEO_FORECAST_URL);
	url.search = new URLSearchParams({
		latitude: latitude.toFixed(4),
		longitude: longitude.toFixed(4),
		current: "temperature_2m,uv_index,weather_code",
		hourly: "temperature_2m,uv_index,weather_code",
		daily: "sunrise,sunset",
		temperature_unit: "fahrenheit",
		wind_speed_unit: "mph",
		timezone: "auto",
		forecast_days: FORECAST_DAYS.toString(),
	}).toString();

	const response = await fetchWithTimeout(url);
	if (!response.ok) {
		throw new Error(
			`Open-Meteo forecast error: ${response.status} ${response.statusText}`,
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
		latitude: latitude.toFixed(4),
		longitude: longitude.toFixed(4),
		current: "us_aqi",
		domains: "cams_global",
	}).toString();

	const response = await fetchWithTimeout(url);
	if (!response.ok) {
		return undefined;
	}

	return response.json();
}

async function fetchUvFallbackWeather(
	latitude: number,
	longitude: number,
	timezone: string,
): Promise<WeatherData> {
	const [uvIndex, metNo] = await Promise.all([
		fetchCurrentUvIndex(latitude, longitude),
		fetchMetNoForecast(latitude, longitude),
	]);

	return normalizeUvFallbackWeatherData(uvIndex, metNo, timezone);
}

async function fetchCurrentUvIndex(
	latitude: number,
	longitude: number,
): Promise<CurrentUvIndexResponse> {
	const url = new URL(CURRENT_UV_INDEX_URL);
	url.search = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
	}).toString();

	const response = await fetchWithTimeout(url, {
		headers: {
			Accept: "application/json",
		},
	});
	if (!response.ok) {
		throw new Error(
			`Current UV Index error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

async function fetchMetNoForecast(
	latitude: number,
	longitude: number,
): Promise<MetNoResponse> {
	const url = new URL(MET_NO_FORECAST_URL);
	url.search = new URLSearchParams({
		lat: latitude.toString(),
		lon: longitude.toString(),
	}).toString();

	const response = await fetchWithTimeout(url, {
		headers: {
			Accept: "application/json",
			"User-Agent": "SunburnTimer/1.0 https://github.com/coloboxp/sunburntimer",
		},
	});
	if (!response.ok) {
		throw new Error(
			`MET Norway error: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
}

function normalizeOpenMeteoWeatherData(
	data: OpenMeteoResponse,
	aqi: OpenMeteoAqiResponse | undefined,
): WeatherData {
	if (!data.current || !data.hourly || !data.daily) {
		throw new Error("Invalid weather data received from Open-Meteo");
	}

	const timezone = data.timezone;
	if (!timezone) {
		throw new Error("Missing weather timezone");
	}

	const currentTime = data.current.time;
	const currentTemp = data.current.temperature_2m;
	const currentUvi = data.current.uv_index;
	const currentWeatherCode = data.current.weather_code;
	if (
		!currentTime ||
		typeof currentTemp !== "number" ||
		typeof currentUvi !== "number" ||
		typeof currentWeatherCode !== "number"
	) {
		throw new Error("Missing current Open-Meteo weather fields");
	}

	const hourlyTime = data.hourly.time ?? [];
	const hourlyTemp = data.hourly.temperature_2m ?? [];
	const hourlyUvi = data.hourly.uv_index ?? [];
	const hourlyWeatherCode = data.hourly.weather_code ?? [];
	const hourly = hourlyTime.flatMap((time, index) => {
		const temp = hourlyTemp[index];
		const uvi = hourlyUvi[index];
		const weatherCode = hourlyWeatherCode[index];
		if (
			typeof temp !== "number" ||
			typeof uvi !== "number" ||
			typeof weatherCode !== "number"
		) {
			return [];
		}

		return [
			{
				dt: Math.floor(parseLocationTime(time, timezone) / 1000),
				temp,
				uvi,
				weather: [normalizeWeatherOverview(weatherCode)],
			},
		];
	});

	const sunrise = data.daily.sunrise?.[0];
	const sunset = data.daily.sunset?.[0];
	const nextSunrise = data.daily.sunrise?.[1];
	if (!sunrise || !sunset || !nextSunrise) {
		throw new Error("Missing sunrise or sunset metadata");
	}

	return {
		provider: "open-meteo",
		current: {
			dt: Math.floor(parseLocationTime(currentTime, timezone) / 1000),
			temp: currentTemp,
			uvi: currentUvi,
			weather: [normalizeWeatherOverview(currentWeatherCode)],
		},
		hourly,
		elevation: data.elevation,
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

function normalizeUvFallbackWeatherData(
	uvIndex: CurrentUvIndexResponse,
	metNo: MetNoResponse,
	timezone: string,
): WeatherData {
	if (uvIndex.ok !== true) {
		const message = "message" in uvIndex ? uvIndex.message : undefined;
		throw new Error(message || "Invalid Current UV Index response");
	}

	const uvPoints = [uvIndex.now, ...uvIndex.forecast].filter((point) =>
		isValidUvPoint(point),
	);
	if (uvPoints.length === 0) {
		throw new Error("Current UV Index did not return forecast points");
	}

	const metNoPoints = normalizeMetNoPoints(metNo);
	if (metNoPoints.length === 0) {
		throw new Error("MET Norway did not return temperature forecast points");
	}

	const currentTimeMs = Date.parse(uvIndex.now.time);
	const currentMetNo = findNearestMetNoPoint(metNoPoints, currentTimeMs);
	const hourly = uvPoints.slice(0, 120).map((point) => {
		const timeMs = Date.parse(point.time);
		const metNoPoint = findNearestMetNoPoint(metNoPoints, timeMs);

		return {
			dt: Math.floor(timeMs / 1000),
			temp: metNoPoint.temp,
			uvi: point.uvi,
			weather: [normalizeMetNoWeatherOverview(metNoPoint.symbolCode)],
		};
	});
	const sunTimes = buildSunTimes(
		[...(uvIndex.history ?? []), ...uvPoints],
		timezone,
		currentTimeMs,
	);

	return {
		provider: "current-uv-index",
		current: {
			dt: Math.floor(currentTimeMs / 1000),
			temp: currentMetNo.temp,
			uvi: uvIndex.now.uvi,
			weather: [normalizeMetNoWeatherOverview(currentMetNo.symbolCode)],
		},
		hourly,
		elevation: metNo.geometry?.coordinates?.[2] ?? 0,
		sunrise: new Date(sunTimes.sunrise).toISOString(),
		sunset: new Date(sunTimes.sunset).toISOString(),
		nextSunrise: new Date(sunTimes.nextSunrise).toISOString(),
		timezone,
	};
}

function isValidUvPoint(point: CurrentUvIndexPoint): boolean {
	return Number.isFinite(Date.parse(point.time)) && Number.isFinite(point.uvi);
}

function normalizeMetNoPoints(metNo: MetNoResponse): MetNoPoint[] {
	return (metNo.properties?.timeseries ?? []).flatMap((entry) => {
		const timeMs = entry.time ? Date.parse(entry.time) : Number.NaN;
		const tempC = entry.data?.instant?.details?.air_temperature;
		if (!Number.isFinite(timeMs) || typeof tempC !== "number") {
			return [];
		}

		return [
			{
				timeMs,
				temp: celsiusToFahrenheit(tempC),
				symbolCode:
					entry.data?.next_1_hours?.summary?.symbol_code ??
					entry.data?.next_6_hours?.summary?.symbol_code ??
					entry.data?.next_12_hours?.summary?.symbol_code,
			},
		];
	});
}

function findNearestMetNoPoint(
	points: MetNoPoint[],
	timeMs: number,
): MetNoPoint {
	return points.reduce((nearest, point) => {
		const nearestDistance = Math.abs(nearest.timeMs - timeMs);
		const pointDistance = Math.abs(point.timeMs - timeMs);
		return pointDistance < nearestDistance ? point : nearest;
	});
}

function buildSunTimes(
	uvPoints: CurrentUvIndexPoint[],
	timezone: string,
	currentTimeMs: number,
): { sunrise: number; sunset: number; nextSunrise: number } {
	const todayStart = getLocalDayStart(currentTimeMs, timezone);
	const tomorrowStart = todayStart + DAY_MS;
	const dayAfterTomorrowStart = tomorrowStart + DAY_MS;
	const todayRange = getPositiveUvRange(uvPoints, todayStart, tomorrowStart);
	const tomorrowRange = getPositiveUvRange(
		uvPoints,
		tomorrowStart,
		dayAfterTomorrowStart,
	);

	return {
		sunrise: todayRange ? todayRange.first - HOUR_MS : todayStart + 6 * HOUR_MS,
		sunset: todayRange ? todayRange.last + HOUR_MS : todayStart + 18 * HOUR_MS,
		nextSunrise: tomorrowRange
			? tomorrowRange.first - HOUR_MS
			: tomorrowStart + 6 * HOUR_MS,
	};
}

function getLocalDayStart(timeMs: number, timezone: string): number {
	const localTime = new TZDate(timeMs, timezone);
	return new TZDate(
		localTime.getFullYear(),
		localTime.getMonth(),
		localTime.getDate(),
		0,
		0,
		0,
		timezone,
	).getTime();
}

function getPositiveUvRange(
	uvPoints: CurrentUvIndexPoint[],
	startMs: number,
	endMs: number,
): { first: number; last: number } | undefined {
	const positiveTimes = uvPoints
		.map((point) => ({ timeMs: Date.parse(point.time), uvi: point.uvi }))
		.filter(
			(point) =>
				Number.isFinite(point.timeMs) &&
				point.timeMs >= startMs &&
				point.timeMs < endMs &&
				point.uvi > 0.1,
		)
		.map((point) => point.timeMs)
		.sort((a, b) => a - b);

	const first = positiveTimes[0];
	const last = positiveTimes[positiveTimes.length - 1];
	if (first === undefined || last === undefined) {
		return undefined;
	}

	return { first, last };
}

function celsiusToFahrenheit(celsius: number): number {
	return (celsius * 9) / 5 + 32;
}

function parseLocationTime(timeStr: string, timezone: string): number {
	const [datePart, timePart] = timeStr.split("T");
	const [year, month, day] = datePart.split("-").map(Number);
	const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);

	return new TZDate(year, month - 1, day, hour, minute, 0, timezone).getTime();
}

function normalizeWeatherOverview(weatherCode: number): WeatherOverview {
	const description =
		WMO_DESCRIPTIONS[weatherCode.toString() as keyof typeof WMO_DESCRIPTIONS] ??
		"Unknown";

	return {
		id: 800,
		main: description,
		description,
		icon: "01d",
	};
}

function normalizeMetNoWeatherOverview(symbolCode: string | undefined) {
	const description = toTitleCase(
		(symbolCode || "weather")
			.replaceAll("_", " ")
			.replaceAll("clearsky", "clear sky")
			.replaceAll("partlycloudy", "partly cloudy")
			.replaceAll("lightrain", "light rain")
			.replaceAll("fair", "fair")
			.replace(/\b(day|night|polartwilight)\b/g, "")
			.trim(),
	);

	return {
		id: 800,
		main: description || "Weather",
		description: description || "Weather",
		icon: symbolCode || "",
	};
}

function toTitleCase(value: string): string {
	return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function weatherResponse(body: WeatherData): Response {
	return jsonResponse(body, 200, {
		"Cache-Control": "no-store",
		"X-Weather-Provider": body.provider,
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
