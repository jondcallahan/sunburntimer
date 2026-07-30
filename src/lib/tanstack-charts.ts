import { areaY, d3Curve, defineChart, lineY, ruleX } from "@tanstack/charts";
import { scaleLinear, scaleTime } from "d3-scale";
import { curveMonotoneX } from "d3-shape";
import { format } from "date-fns";
import type { CalculationPoint, HourlyWeather } from "../types";
import { formatInTimeZone } from "../utils/timezone";

const HOUR_IN_MS = 60 * 60 * 1000;
const smoothCurve = d3Curve(curveMonotoneX);

const chartTheme = {
	foreground: "#334155",
	muted: "#64748b",
	grid: "rgba(148, 163, 184, 0.18)",
	background: "transparent",
	palette: ["#f97316", "#f59e0b"],
} as const;

export interface BurnChartDatum {
	id: string;
	time: Date;
	damage: number;
	point: CalculationPoint;
}

export interface BurnChartInput {
	rows: readonly BurnChartDatum[];
	fallbackTime: Date;
	timezone?: string;
}

export interface UVChartDatum {
	id: string;
	time: Date;
	uvIndex: number;
	source: CalculationPoint | HourlyWeather;
}

export interface UVChartInput {
	rows: readonly UVChartDatum[];
	now: Date;
	yMaximum: number;
	timezone?: string;
}

export const burnChartDefinition = defineChart<BurnChartInput>()(
	({ input, width }) => ({
		marks: [
			areaY(input.rows, {
				id: "burn-area",
				x: "time",
				y: "damage",
				key: "id",
				fill: "url(#burn-fill)",
				fillOpacity: 1,
				curve: smoothCurve,
			}),
			lineY(input.rows, {
				id: "burn-line",
				x: "time",
				y: "damage",
				key: "id",
				stroke: "#f97316",
				strokeWidth: 2.25,
				points: true,
				curve: smoothCurve,
			}),
		],
		x: {
			scale: scaleTime().domain(
				getDateDomain(
					input.rows.map((row) => row.time),
					input.fallbackTime,
				),
			),
			ticks: width < 520 ? 4 : 7,
			format: (value) => formatChartTime(value, input.timezone, "h a"),
			grid: true,
			label: "Time",
		},
		y: {
			scale: scaleLinear().domain([0, 100]),
			ticks: 10,
			format: (value) => `${value}%`,
			grid: true,
			label: "Skin Damage (%)",
		},
		gradients: [
			{
				id: "burn-fill",
				x1: 0,
				y1: 0,
				x2: 0,
				y2: 1,
				stops: [
					{ offset: 0, color: "#f97316", opacity: 0.3 },
					{ offset: 0.6, color: "#fbbf24", opacity: 0.2 },
					{ offset: 1, color: "#ffffff", opacity: 0.08 },
				],
			},
		],
		clip: true,
		margin: { top: 12, right: 10, bottom: 42, left: 58 },
		theme: chartTheme,
	}),
);

export const uvChartDefinition = defineChart<UVChartInput>()(
	({ input, width }) => ({
		marks: [
			areaY(input.rows, {
				id: "uv-area",
				x: "time",
				y: "uvIndex",
				key: "id",
				fill: "url(#uv-fill)",
				fillOpacity: 1,
				curve: smoothCurve,
			}),
			lineY(input.rows, {
				id: "uv-line",
				x: "time",
				y: "uvIndex",
				key: "id",
				stroke: "#f59e0b",
				strokeWidth: 2.25,
				curve: smoothCurve,
			}),
			ruleX([input.now], {
				id: "current-time",
				stroke: "#dc2626",
				strokeWidth: 2,
				strokeDasharray: "3 3",
			}),
		],
		x: {
			scale: scaleTime().domain(
				getDateDomain(
					[...input.rows.map((row) => row.time), input.now],
					input.now,
				),
			),
			ticks: width < 520 ? 12 : 10,
			format: (value) => formatChartTime(value, input.timezone, "h a"),
			grid: true,
			label: "Time",
			tickRotate: width < 520 ? -45 : 0,
		},
		y: {
			scale: scaleLinear().domain([0, input.yMaximum]).nice(),
			ticks: 6,
			grid: true,
			label: "UV Index",
		},
		gradients: [
			{
				id: "uv-fill",
				x1: 0,
				y1: 0,
				x2: 0,
				y2: 1,
				stops: [
					{ offset: 0, color: "#ef4444", opacity: 0.3 },
					{ offset: 0.3, color: "#f59e0b", opacity: 0.3 },
					{ offset: 0.6, color: "#22c55e", opacity: 0.3 },
					{ offset: 1, color: "#22c55e", opacity: 0.08 },
				],
			},
		],
		clip: true,
		margin: { top: 12, right: 10, bottom: 52, left: 50 },
		theme: chartTheme,
	}),
);

export function formatChartTime(
	value: Date,
	timezone: string | undefined,
	formatString: string,
) {
	return timezone
		? formatInTimeZone(value, timezone, formatString)
		: format(value, formatString);
}

export function getDateDomain(
	values: readonly Date[],
	fallback: Date,
): [Date, Date] {
	const timestamps = values
		.map((value) => value.getTime())
		.filter(Number.isFinite);

	if (timestamps.length === 0) {
		const start = Number.isFinite(fallback.getTime())
			? fallback.getTime()
			: Date.now();
		return [new Date(start), new Date(start + HOUR_IN_MS)];
	}

	const start = Math.min(...timestamps);
	const end = Math.max(...timestamps);

	if (start === end) {
		return [new Date(start - HOUR_IN_MS / 2), new Date(end + HOUR_IN_MS / 2)];
	}

	return [new Date(start), new Date(end)];
}
