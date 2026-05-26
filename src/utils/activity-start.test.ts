import { describe, expect, it } from "bun:test";
import type { WeatherData } from "../types";
import {
	createForecastOffsetStart,
	formatActivityStartLabel,
	getForecastStartWindow,
	getPresetOffsetMinutes,
	resolveActivityStartDate,
} from "./activity-start";

function createWeather(
	baseTimeMs: number,
	hours: number,
	timezone = "America/Denver",
): WeatherData {
	const baseSeconds = Math.floor(baseTimeMs / 1000);

	return {
		current: {
			dt: baseSeconds,
			temp: 75,
			uvi: 5,
			weather: [
				{ id: 800, main: "Clear", description: "clear sky", icon: "01d" },
			],
		},
		hourly: Array.from({ length: hours }, (_, index) => ({
			dt: baseSeconds + index * 3600,
			temp: 75,
			uvi: 5,
			weather: [
				{ id: 800, main: "Clear", description: "clear sky", icon: "01d" },
			],
		})),
		elevation: 0,
		sunrise: new Date(baseTimeMs).toISOString(),
		sunset: new Date(baseTimeMs + 12 * 3600 * 1000).toISOString(),
		nextSunrise: new Date(baseTimeMs + 24 * 3600 * 1000).toISOString(),
		timezone,
	};
}

describe("activity start utilities", () => {
	it("resolves planned starts from a session base time without drifting", () => {
		const baseTimeMs = Date.parse("2026-06-15T16:00:00Z");
		const activityStart = {
			mode: "forecastOffset" as const,
			baseTimeMs,
			offsetMinutes: 180,
		};

		expect(resolveActivityStartDate(activityStart).toISOString()).toBe(
			"2026-06-15T19:00:00.000Z",
		);
	});

	it("limits slider range to the smaller of forecast coverage and 48 hours", () => {
		const baseTimeMs = Date.parse("2026-06-15T16:00:00Z");
		const weather = createWeather(baseTimeMs, 72);

		const window = getForecastStartWindow(weather, baseTimeMs);

		expect(window.minOffsetMinutes).toBe(0);
		expect(window.maxOffsetMinutes).toBe(48 * 60);
	});

	it("snaps selected offsets to 30 minute forecast increments", () => {
		const baseTimeMs = Date.parse("2026-06-15T16:00:00Z");
		const weather = createWeather(baseTimeMs, 24);

		const activityStart = createForecastOffsetStart(74, weather, baseTimeMs);

		expect(activityStart).toEqual({
			mode: "forecastOffset",
			baseTimeMs,
			offsetMinutes: 60,
		});
	});

	it("snaps from off-boundary current times to actual wall-clock half hours", () => {
		const baseTimeMs = Date.parse("2026-06-15T21:07:00Z"); // 3:07 PM Denver
		const weather = createWeather(baseTimeMs, 24);

		const window = getForecastStartWindow(weather, baseTimeMs);
		const activityStart = createForecastOffsetStart(
			window.minOffsetMinutes,
			weather,
			baseTimeMs,
		);

		expect(resolveActivityStartDate(activityStart).toISOString()).toBe(
			"2026-06-15T21:30:00.000Z",
		);
		expect(
			formatActivityStartLabel(
				activityStart,
				"America/Denver",
				new Date(baseTimeMs),
			),
		).toBe("Today 3:30 PM");
	});

	it("formats selected starts in the forecast timezone", () => {
		const baseTimeMs = Date.parse("2026-06-15T16:00:00Z");
		const activityStart = {
			mode: "forecastOffset" as const,
			baseTimeMs,
			offsetMinutes: 150,
		};

		expect(
			formatActivityStartLabel(
				activityStart,
				"America/Denver",
				new Date(baseTimeMs),
			),
		).toBe("Today 12:30 PM");
	});

	it("creates tomorrow presets in the forecast timezone", () => {
		const baseTimeMs = Date.parse("2026-06-15T22:00:00Z"); // 4 PM Denver
		const weather = createWeather(baseTimeMs, 48);
		const window = getForecastStartWindow(weather, baseTimeMs);

		const offset = getPresetOffsetMinutes(
			"tomorrowMorning",
			"America/Denver",
			window,
			baseTimeMs,
		);

		expect(offset).toBe(17 * 60);
	});
});
