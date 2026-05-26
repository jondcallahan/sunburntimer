import { useCallback, useMemo, useState } from "react";
import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
	Legend,
	LinearScale,
	LineElement,
	PointElement,
	TimeScale,
	Title,
	Tooltip,
	type TooltipItem,
	type ScriptableContext,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import { CalendarDays, Clock } from "lucide-react";
import "chartjs-adapter-date-fns";
import type { CalculationResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAppStore } from "../store";
import { getUVIndexColor } from "../lib/utils";
import { Button } from "./ui/button";
import {
	buildFallbackUVSeriesForRange,
	buildUVSeriesForRange,
	type UVSeriesPoint,
} from "../lib/uvSeries";
import { formatInTimeZone, getDayBoundsInTimeZone } from "../utils/timezone";

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
	TimeScale,
	annotationPlugin,
);

interface UVChartProps {
	result: CalculationResult;
	timezone?: string;
	activityStartTime: Date;
	activityDurationMinutes: number;
}

const UVChartViewMode = {
	ACTIVITY: "activity",
	DAY: "day",
} as const;

type UVChartViewMode = (typeof UVChartViewMode)[keyof typeof UVChartViewMode];

function addMinutes(date: Date, minutes: number): Date {
	return new Date(date.getTime() + minutes * 60000);
}

function formatChartTime(date: Date, timezone?: string): string {
	return timezone
		? formatInTimeZone(date, timezone, "h:mm a")
		: format(date, "h:mm a");
}

function formatChartDateTime(date: Date, timezone?: string): string {
	return timezone
		? formatInTimeZone(date, timezone, "MMM d, h:mm a")
		: format(date, "MMM d, h:mm a");
}

function getVisibleUVStats(points: UVSeriesPoint[]): {
	startUV: number;
	peakUV: number;
} {
	const uvValues = points.map((point) => point.uvIndex);
	const startUV = uvValues[0] ?? 0;
	const peakUV = uvValues.length > 0 ? Math.max(...uvValues) : 0;

	return { startUV, peakUV };
}

export function UVChart({
	result,
	timezone,
	activityStartTime,
	activityDurationMinutes,
}: UVChartProps) {
	const [viewMode, setViewMode] = useState<UVChartViewMode>(
		UVChartViewMode.ACTIVITY,
	);
	const { geolocation } = useAppStore();

	const weatherData = geolocation.weather;
	const activityRange = useMemo(
		() => ({
			start: activityStartTime,
			end: addMinutes(activityStartTime, activityDurationMinutes),
		}),
		[activityStartTime, activityDurationMinutes],
	);
	const dayRange = useMemo(
		() => getDayBoundsInTimeZone(activityStartTime, timezone),
		[activityStartTime, timezone],
	);
	const visibleRange =
		viewMode === UVChartViewMode.ACTIVITY ? activityRange : dayRange;
	const chartPoints = useMemo(() => {
		const points =
			weatherData && weatherData.hourly.length > 0
				? buildUVSeriesForRange(weatherData.hourly, visibleRange)
				: buildFallbackUVSeriesForRange(result.points, visibleRange);

		if (points.length > 0) return points;

		return result.points.map((point) => ({
			datetime: point.slice.datetime,
			uvIndex: point.slice.uvIndex,
		}));
	}, [result.points, visibleRange, weatherData]);
	const { startUV, peakUV } = getVisibleUVStats(chartPoints);

	const chartData = useMemo(() => {
		return {
			labels: chartPoints.map((point) => point.datetime),
			datasets: [
				{
					label: "UV Index",
					data: chartPoints.map((point) => point.uvIndex),
					borderColor: "#f59e0b", // amber-500
					backgroundColor: (context: ScriptableContext<"line">) => {
						const ctx = context.chart.ctx;
						const gradient = ctx.createLinearGradient(0, 0, 0, 400);

						// Create gradient based on UV risk levels
						gradient.addColorStop(0, "rgba(239, 68, 68, 0.3)"); // red for high UV
						gradient.addColorStop(0.3, "rgba(245, 158, 11, 0.3)"); // amber for moderate UV
						gradient.addColorStop(0.6, "rgba(34, 197, 94, 0.3)"); // green for low UV
						gradient.addColorStop(1, "rgba(34, 197, 94, 0.1)"); // very light green

						return gradient;
					},
					fill: true,
					tension: 0.4,
					pointRadius: 1,
					pointHoverRadius: 4,
					pointBackgroundColor: "#f59e0b",
					pointBorderColor: "#fff",
					pointBorderWidth: 2,
				},
			],
		};
	}, [chartPoints]);

	const getUVRiskLevel = useCallback((uvIndex: number): string => {
		if (uvIndex < 3) return "Low";
		if (uvIndex < 6) return "Moderate";
		if (uvIndex < 8) return "High";
		if (uvIndex < 11) return "Very High";
		return "Extreme";
	}, []);

	const options = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				intersect: false,
				mode: "index" as const,
			},
			plugins: {
				legend: {
					display: false,
				},
				tooltip: {
					backgroundColor: "rgba(0, 0, 0, 0.8)",
					titleColor: "#fff",
					bodyColor: "#fff",
					cornerRadius: 8,
					padding: 12,
					callbacks: {
						title: (context: TooltipItem<"line">[]) => {
							const date = new Date(context[0].parsed.x);
							return formatChartDateTime(date, timezone);
						},
						label: (context: TooltipItem<"line">) => {
							const uvIndex = context.parsed.y.toFixed(1);
							const uvRisk = getUVRiskLevel(context.parsed.y);
							return [`UV Index: ${uvIndex}`, `Risk Level: ${uvRisk}`];
						},
					},
				},
				annotation: {
					annotations: {
						activityStart: {
							type: "line" as const,
							xMin: activityRange.start.getTime(),
							xMax: activityRange.start.getTime(),
							borderColor: "#dc2626",
							borderWidth: 2,
							borderDash: [3, 3],
							label: {
								content:
									viewMode === UVChartViewMode.ACTIVITY ? "Start" : "Plan",
								enabled: true,
								position: "start" as const,
								backgroundColor: "#dc2626",
								color: "white",
								padding: 4,
								borderRadius: 4,
								font: {
									size: 10,
									weight: "bold" as const,
								},
							},
						},
						...(viewMode === UVChartViewMode.ACTIVITY
							? {
									activityEnd: {
										type: "line" as const,
										xMin: activityRange.end.getTime(),
										xMax: activityRange.end.getTime(),
										borderColor: "#475569",
										borderWidth: 2,
										borderDash: [3, 3],
										label: {
											content: "End",
											enabled: true,
											position: "end" as const,
											backgroundColor: "#475569",
											color: "white",
											padding: 4,
											borderRadius: 4,
											font: {
												size: 10,
												weight: "bold" as const,
											},
										},
									},
								}
							: {}),
					},
				},
			},
			scales: {
				x: {
					type: "time" as const,
					min: visibleRange.start.getTime(),
					max: visibleRange.end.getTime(),
					time: {
						unit:
							viewMode === UVChartViewMode.ACTIVITY &&
							activityDurationMinutes <= 180
								? ("minute" as const)
								: ("hour" as const),
						displayFormats: {
							minute: "h:mm a",
							hour: "h a",
						},
					},
					title: {
						display: true,
						text: "Time",
						font: {
							size: 12,
							weight: "bold" as const,
						},
						color: "#64748b", // slate-500
					},
					grid: {
						color: "rgba(148, 163, 184, 0.1)", // slate-400 with opacity
					},
					ticks: {
						color: "#64748b",
						callback: (value: string | number) => {
							const date = new Date(value as number);
							return viewMode === UVChartViewMode.ACTIVITY
								? formatChartTime(date, timezone)
								: timezone
									? formatInTimeZone(date, timezone, "h a")
									: format(date, "h a");
						},
					},
				},
				y: {
					min: 0,
					max: Math.max(12, Math.ceil(peakUV + 1)),
					title: {
						display: true,
						text: "UV Index",
						font: {
							size: 12,
							weight: "bold" as const,
						},
						color: "#64748b",
					},
					grid: {
						color: "rgba(148, 163, 184, 0.1)",
					},
					ticks: {
						color: "#64748b",
						callback: (value: string | number) => value.toString(),
					},
				},
			},
			elements: {
				point: {
					hoverRadius: 6,
				},
			},
		}),
		[
			activityDurationMinutes,
			activityRange,
			getUVRiskLevel,
			peakUV,
			timezone,
			viewMode,
			visibleRange,
		],
	);

	const getUVRiskColor = (uvIndex: number): string => {
		if (uvIndex < 3) return "text-green-600";
		if (uvIndex < 6) return "text-yellow-600";
		if (uvIndex < 8) return "text-orange-600";
		if (uvIndex < 11) return "text-red-600";
		return "text-purple-600";
	};

	return (
		<Card className="border-stone-200 shadow-sm">
			<CardHeader>
				<CardTitle className="flex flex-col gap-3 text-slate-800 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<span>
							{viewMode === UVChartViewMode.ACTIVITY
								? "UV Index During Activity"
								: "UV Index on Planned Day"}
						</span>
						<p className="mt-1 text-sm font-normal text-slate-600">
							{formatChartDateTime(visibleRange.start, timezone)} to{" "}
							{viewMode === UVChartViewMode.ACTIVITY
								? formatChartDateTime(visibleRange.end, timezone)
								: formatChartTime(visibleRange.end, timezone)}
						</p>
					</div>
					<div className="flex items-center justify-between gap-4 text-sm sm:justify-end">
						<div className="text-center">
							<p className="text-xs text-slate-600">Start</p>
							<p
								className={`font-bold tabular-nums ${getUVRiskColor(startUV)}`}
							>
								{startUV.toFixed(1)}
							</p>
						</div>
						<div className="text-center">
							<p className="text-xs text-slate-600">Peak</p>
							<p className={`font-bold tabular-nums ${getUVRiskColor(peakUV)}`}>
								{peakUV.toFixed(1)}
							</p>
						</div>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-stone-200 bg-stone-50 p-1">
					<Button
						type="button"
						size="sm"
						variant={
							viewMode === UVChartViewMode.ACTIVITY ? "default" : "ghost"
						}
						onClick={() => setViewMode(UVChartViewMode.ACTIVITY)}
					>
						<Clock className="size-4" />
						Activity
					</Button>
					<Button
						type="button"
						size="sm"
						variant={viewMode === UVChartViewMode.DAY ? "default" : "ghost"}
						onClick={() => setViewMode(UVChartViewMode.DAY)}
					>
						<CalendarDays className="size-4" />
						Day
					</Button>
				</div>
				<div className="h-64 w-full mb-4">
					<Line data={chartData} options={options} />
				</div>

				{/* UV Risk Legend */}
				<div className="grid grid-cols-5 gap-2 text-xs">
					<div className={`text-center p-2 rounded ${getUVIndexColor(1).bg}`}>
						<div className={`font-semibold ${getUVIndexColor(1).text}`}>
							Low
						</div>
						<div className={`${getUVIndexColor(1).text} opacity-75`}>0-2</div>
					</div>
					<div className={`text-center p-2 rounded ${getUVIndexColor(4).bg}`}>
						<div className={`font-semibold ${getUVIndexColor(4).text}`}>
							Moderate
						</div>
						<div className={`${getUVIndexColor(4).text} opacity-75`}>3-5</div>
					</div>
					<div className={`text-center p-2 rounded ${getUVIndexColor(7).bg}`}>
						<div className={`font-semibold ${getUVIndexColor(7).text}`}>
							High
						</div>
						<div className={`${getUVIndexColor(7).text} opacity-75`}>6-7</div>
					</div>
					<div className={`text-center p-2 rounded ${getUVIndexColor(9).bg}`}>
						<div className={`font-semibold ${getUVIndexColor(9).text}`}>
							Very High
						</div>
						<div className={`${getUVIndexColor(9).text} opacity-75`}>8-10</div>
					</div>
					<div className={`text-center p-2 rounded ${getUVIndexColor(12).bg}`}>
						<div className={`font-semibold ${getUVIndexColor(12).text}`}>
							Extreme
						</div>
						<div className={`${getUVIndexColor(12).text} opacity-75`}>11+</div>
					</div>
				</div>

				<div className="mt-4 text-sm text-slate-600">
					<p>
						The UV Index measures ultraviolet radiation strength. Activity view
						uses the planned start and time outside. Day view is limited to that
						local calendar day.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
