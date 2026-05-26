import type { CalculationPoint, HourlyWeather } from "../types";

export interface UVSeriesRange {
	start: Date;
	end: Date;
}

export interface UVSeriesPoint {
	datetime: Date;
	uvIndex: number;
}

interface ForecastPoint {
	timestampMs: number;
	uvIndex: number;
}

function normalizeForecast(hourly: HourlyWeather[]): ForecastPoint[] {
	return hourly
		.map((hour) => ({
			timestampMs: hour.dt * 1000,
			uvIndex: hour.uvi,
		}))
		.filter(
			(point) =>
				Number.isFinite(point.timestampMs) && Number.isFinite(point.uvIndex),
		)
		.sort((left, right) => left.timestampMs - right.timestampMs);
}

export function getUVIndexAtTime(
	hourly: HourlyWeather[],
	targetTime: Date,
): number | undefined {
	const forecast = normalizeForecast(hourly);
	if (forecast.length === 0) return undefined;

	const targetMs = targetTime.getTime();
	if (targetMs <= forecast[0].timestampMs) return forecast[0].uvIndex;

	const lastPoint = forecast[forecast.length - 1];
	if (targetMs >= lastPoint.timestampMs) return lastPoint.uvIndex;

	for (let index = 0; index < forecast.length - 1; index++) {
		const start = forecast[index];
		const end = forecast[index + 1];

		if (targetMs === start.timestampMs) return start.uvIndex;
		if (targetMs > start.timestampMs && targetMs <= end.timestampMs) {
			const durationMs = end.timestampMs - start.timestampMs;
			if (durationMs <= 0) return start.uvIndex;

			const progress = (targetMs - start.timestampMs) / durationMs;
			return start.uvIndex + (end.uvIndex - start.uvIndex) * progress;
		}
	}

	return undefined;
}

export function buildUVSeriesForRange(
	hourly: HourlyWeather[],
	range: UVSeriesRange,
): UVSeriesPoint[] {
	const startMs = range.start.getTime();
	const endMs = range.end.getTime();
	if (!(endMs > startMs)) return [];

	const forecast = normalizeForecast(hourly);
	const points = new Map<number, UVSeriesPoint>();

	const addPoint = (timestampMs: number, uvIndex: number | undefined) => {
		if (
			!Number.isFinite(timestampMs) ||
			typeof uvIndex !== "number" ||
			!Number.isFinite(uvIndex)
		) {
			return;
		}
		points.set(timestampMs, {
			datetime: new Date(timestampMs),
			uvIndex,
		});
	};

	addPoint(startMs, getUVIndexAtTime(hourly, range.start));

	for (const point of forecast) {
		if (point.timestampMs > startMs && point.timestampMs < endMs) {
			addPoint(point.timestampMs, point.uvIndex);
		}
	}

	addPoint(endMs, getUVIndexAtTime(hourly, range.end));

	return Array.from(points.values()).sort(
		(left, right) => left.datetime.getTime() - right.datetime.getTime(),
	);
}

export function buildFallbackUVSeriesForRange(
	points: CalculationPoint[],
	range: UVSeriesRange,
): UVSeriesPoint[] {
	const startMs = range.start.getTime();
	const endMs = range.end.getTime();

	return points
		.filter((point) => {
			const timestampMs = point.slice.datetime.getTime();
			return timestampMs >= startMs && timestampMs <= endMs;
		})
		.map((point) => ({
			datetime: point.slice.datetime,
			uvIndex: point.slice.uvIndex,
		}));
}
