import type { ChartTooltipOptions } from "@tanstack/charts";
import { focusNearestX } from "@tanstack/charts/focus";
import { renderChartSvgWithResources } from "@tanstack/charts/svg/resources";
import { Chart } from "@tanstack/react-charts";
import { useMemo } from "react";
import {
	formatChartTime,
	type UVChartDatum,
	type UVChartInput,
	uvChartDefinition,
} from "../lib/tanstack-charts";
import { getUVIndexColor } from "../lib/utils";
import { useAppStore } from "../store";
import type { CalculationResult } from "../types";
import { toTZDate } from "../utils/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface UVChartProps {
	result: CalculationResult;
	timezone?: string;
}

export function UVChart({ result, timezone }: UVChartProps) {
	const { geolocation } = useAppStore();
	const weatherData = geolocation.weather;

	const currentUV =
		weatherData?.current.uvi ?? result.points[0]?.slice.uvIndex ?? 0;
	const uvValues =
		weatherData && weatherData.hourly.length > 0
			? weatherData.hourly.map((hour) => hour.uvi)
			: result.points.map((point) => point.slice.uvIndex);
	const maxUV = uvValues.length > 0 ? Math.max(...uvValues) : 0;

	const rows = useMemo<UVChartDatum[]>(() => {
		if (weatherData) {
			return weatherData.hourly.map((hour) => ({
				id: `weather-${hour.dt}`,
				time: toTZDate(new Date(hour.dt * 1000), timezone),
				uvIndex: hour.uvi,
				source: hour,
			}));
		}

		return result.points.map((point) => ({
			id: `calculation-${point.slice.datetime.getTime()}`,
			time: toTZDate(point.slice.datetime, timezone),
			uvIndex: point.slice.uvIndex,
			source: point,
		}));
	}, [result.points, weatherData, timezone]);

	const input = useMemo<UVChartInput>(
		() => ({
			rows,
			now: toTZDate(new Date(), timezone),
			yMaximum: Math.max(12, Math.ceil(maxUV + 1)),
			timezone,
		}),
		[rows, maxUV, timezone],
	);

	const tooltip = useMemo<ChartTooltipOptions<UVChartDatum, Date, number>>(
		() => ({
			className: "sunburn-chart-tooltip",
			format: ({ datum }) =>
				[
					formatChartTime(datum.time, timezone, "h:mm a"),
					`UV Index: ${datum.uvIndex.toFixed(1)}`,
					`Risk Level: ${getUVRiskLevel(datum.uvIndex)}`,
				].join("\n"),
		}),
		[timezone],
	);

	return (
		<Card className="border-stone-200 shadow-sm">
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-slate-800">
					<span>UV Index Throughout the Day</span>
					<div className="flex items-center space-x-4 text-sm">
						<div className="text-center">
							<p className="text-xs text-slate-600">Current</p>
							<p
								className={`font-bold tabular-nums ${getUVRiskColor(currentUV)}`}
							>
								{currentUV.toFixed(1)}
							</p>
						</div>
						<div className="text-center">
							<p className="text-xs text-slate-600">Peak</p>
							<p className={`font-bold tabular-nums ${getUVRiskColor(maxUV)}`}>
								{maxUV.toFixed(1)}
							</p>
						</div>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="mb-4 h-64 w-full">
					<Chart
						definition={uvChartDefinition}
						input={input}
						height={256}
						initialWidth={560}
						ariaLabel="UV index forecast over the next three days"
						ariaDescription="Hourly ultraviolet index forecast with a marker for the current time."
						className="sunburn-chart"
						focus={focusNearestX}
						maxFocusDistance={Number.POSITIVE_INFINITY}
						tooltip={tooltip}
						animate={{ duration: 450, easing: "ease-out" }}
						idPrefix="uv-chart"
						renderSvg={renderChartSvgWithResources}
					/>
				</div>

				<div className="grid grid-cols-5 gap-2 text-xs">
					<UVRiskLegend uvIndex={1} label="Low" range="0-2" />
					<UVRiskLegend uvIndex={4} label="Moderate" range="3-5" />
					<UVRiskLegend uvIndex={7} label="High" range="6-7" />
					<UVRiskLegend uvIndex={9} label="Very High" range="8-10" />
					<UVRiskLegend uvIndex={12} label="Extreme" range="11+" />
				</div>

				<div className="mt-4 text-sm text-slate-600">
					<p>
						The UV Index measures the strength of ultraviolet radiation. Higher
						values indicate greater risk of sunburn and need for protection.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function UVRiskLegend({
	uvIndex,
	label,
	range,
}: {
	uvIndex: number;
	label: string;
	range: string;
}) {
	const color = getUVIndexColor(uvIndex);
	return (
		<div className={`rounded p-2 text-center ${color.bg}`}>
			<div className={`font-semibold ${color.text}`}>{label}</div>
			<div className={`${color.text} opacity-75`}>{range}</div>
		</div>
	);
}

function getUVRiskLevel(uvIndex: number): string {
	if (uvIndex < 3) return "Low";
	if (uvIndex < 6) return "Moderate";
	if (uvIndex < 8) return "High";
	if (uvIndex < 11) return "Very High";
	return "Extreme";
}

function getUVRiskColor(uvIndex: number): string {
	if (uvIndex < 3) return "text-green-600";
	if (uvIndex < 6) return "text-yellow-600";
	if (uvIndex < 8) return "text-orange-600";
	if (uvIndex < 11) return "text-red-600";
	return "text-purple-600";
}
