import { TZDate } from "@date-fns/tz";
import type { ActivityStart, WeatherData } from "../types";
import { formatInTimeZone } from "./timezone";

export const ACTIVITY_START_STEP_MINUTES = 30;
export const ACTIVITY_START_MAX_HOURS = 48;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export interface ForecastStartWindow {
	baseTimeMs: number;
	minOffsetMinutes: number;
	maxOffsetMinutes: number;
	forecastEnd: Date;
	hasUsableForecast: boolean;
}

export function resolveActivityStartDate(
	activityStart: ActivityStart,
	now = new Date(),
): Date {
	if (activityStart.mode === "now") {
		return now;
	}

	return new Date(
		activityStart.baseTimeMs + activityStart.offsetMinutes * MINUTE_MS,
	);
}

export function getForecastStartWindow(
	weather: WeatherData,
	baseTimeMs = Date.now(),
): ForecastStartWindow {
	const firstForecastMs = weather.hourly[0]?.dt
		? weather.hourly[0].dt * 1000
		: baseTimeMs;
	const lastHourly = weather.hourly.at(-1);
	const lastForecastMs = lastHourly ? lastHourly.dt * 1000 : baseTimeMs;
	const stepMs = ACTIVITY_START_STEP_MINUTES * MINUTE_MS;
	const minMs = Math.max(baseTimeMs, firstForecastMs);
	const maxMs = Math.min(
		baseTimeMs + ACTIVITY_START_MAX_HOURS * HOUR_MS,
		lastForecastMs,
	);

	const minOffsetMinutes = Math.max(
		0,
		Math.ceil(minMs / stepMs) * ACTIVITY_START_STEP_MINUTES -
			baseTimeMs / MINUTE_MS,
	);
	const maxOffsetMinutes = Math.max(
		minOffsetMinutes,
		Math.floor(maxMs / stepMs) * ACTIVITY_START_STEP_MINUTES -
			baseTimeMs / MINUTE_MS,
	);

	return {
		baseTimeMs,
		minOffsetMinutes,
		maxOffsetMinutes,
		forecastEnd: new Date(maxMs),
		hasUsableForecast: maxMs > minMs,
	};
}

export function snapOffsetMinutes(
	offsetMinutes: number,
	window: ForecastStartWindow,
): number {
	const stepMs = ACTIVITY_START_STEP_MINUTES * MINUTE_MS;
	const targetMs = window.baseTimeMs + offsetMinutes * MINUTE_MS;
	const snappedTargetMs = Math.round(targetMs / stepMs) * stepMs;
	const snapped = (snappedTargetMs - window.baseTimeMs) / MINUTE_MS;

	return Math.min(
		window.maxOffsetMinutes,
		Math.max(window.minOffsetMinutes, snapped),
	);
}

export function createForecastOffsetStart(
	offsetMinutes: number,
	weather: WeatherData,
	baseTimeMs = Date.now(),
): ActivityStart {
	return {
		mode: "forecastOffset",
		baseTimeMs,
		offsetMinutes: snapOffsetMinutes(
			offsetMinutes,
			getForecastStartWindow(weather, baseTimeMs),
		),
	};
}

export function formatActivityStartLabel(
	activityStart: ActivityStart,
	timezone: string,
	now = new Date(),
): string {
	if (activityStart.mode === "now") {
		return "Now";
	}

	return formatForecastDate(
		resolveActivityStartDate(activityStart, now),
		timezone,
		now,
	);
}

export function formatForecastDate(
	date: Date,
	timezone: string,
	now = new Date(),
): string {
	const zonedDate = new TZDate(date.getTime(), timezone);
	const zonedNow = new TZDate(now.getTime(), timezone);
	const dayDiff =
		startOfDay(zonedDate, timezone).getTime() -
		startOfDay(zonedNow, timezone).getTime();
	const dayLabel =
		dayDiff === 0
			? "Today"
			: dayDiff === 24 * HOUR_MS
				? "Tomorrow"
				: formatInTimeZone(date, timezone, "EEE");

	return `${dayLabel} ${formatInTimeZone(date, timezone, "h:mm a")}`;
}

export function getPresetOffsetMinutes(
	preset: "laterToday" | "tomorrowMorning" | "tomorrowAfternoon",
	timezone: string,
	window: ForecastStartWindow,
	baseTimeMs = Date.now(),
): number | undefined {
	const base = new TZDate(baseTimeMs, timezone);
	let targetMs: number;

	if (preset === "laterToday") {
		targetMs =
			Math.ceil(
				(baseTimeMs + 2 * HOUR_MS) / (ACTIVITY_START_STEP_MINUTES * MINUTE_MS),
			) *
			ACTIVITY_START_STEP_MINUTES *
			MINUTE_MS;

		if (!isSameZonedDay(new Date(targetMs), base, timezone)) {
			return undefined;
		}
	} else {
		const targetHour = preset === "tomorrowMorning" ? 9 : 13;
		targetMs = new TZDate(
			base.getFullYear(),
			base.getMonth(),
			base.getDate() + 1,
			targetHour,
			0,
			0,
			timezone,
		).getTime();
	}

	const offsetMinutes = (targetMs - baseTimeMs) / MINUTE_MS;
	const snapped = snapOffsetMinutes(offsetMinutes, window);

	if (snapped < window.minOffsetMinutes || snapped > window.maxOffsetMinutes) {
		return undefined;
	}

	const snappedMs = baseTimeMs + snapped * MINUTE_MS;
	if (
		Math.abs(snappedMs - targetMs) >
		ACTIVITY_START_STEP_MINUTES * MINUTE_MS
	) {
		return undefined;
	}

	return snapped;
}

function startOfDay(date: TZDate, timezone: string): Date {
	return new TZDate(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		0,
		0,
		0,
		timezone,
	);
}

function isSameZonedDay(
	date: Date,
	zonedBase: TZDate,
	timezone: string,
): boolean {
	const zonedDate = new TZDate(date.getTime(), timezone);
	return (
		zonedDate.getFullYear() === zonedBase.getFullYear() &&
		zonedDate.getMonth() === zonedBase.getMonth() &&
		zonedDate.getDate() === zonedBase.getDate()
	);
}
