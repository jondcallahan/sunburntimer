import { describe, expect, it } from "bun:test";
import type { HourlyWeather } from "../types";
import { buildUVSeriesForRange, getUVIndexAtTime } from "./uvSeries";

function createHourlyForecast(
	values: number[],
	startTime: Date,
): HourlyWeather[] {
	return values.map((uvi, index) => ({
		dt: Math.floor(startTime.getTime() / 1000) + index * 3600,
		temp: 75,
		uvi,
		weather: [
			{ id: 800, main: "Clear", description: "clear sky", icon: "01d" },
		],
	}));
}

describe("UV series helpers", () => {
	const forecastStart = new Date("2026-06-15T12:00:00Z");
	const hourly = createHourlyForecast([0, 4, 8, 4], forecastStart);

	it("interpolates UV Index between hourly forecast points", () => {
		const value = getUVIndexAtTime(hourly, new Date("2026-06-15T12:30:00Z"));

		expect(value).toBe(2);
	});

	it("builds a focused range with interpolated start and end points", () => {
		const series = buildUVSeriesForRange(hourly, {
			start: new Date("2026-06-15T12:30:00Z"),
			end: new Date("2026-06-15T14:30:00Z"),
		});

		expect(series.map((point) => point.datetime.toISOString())).toEqual([
			"2026-06-15T12:30:00.000Z",
			"2026-06-15T13:00:00.000Z",
			"2026-06-15T14:00:00.000Z",
			"2026-06-15T14:30:00.000Z",
		]);
		expect(series.map((point) => point.uvIndex)).toEqual([2, 4, 8, 6]);
	});
});
