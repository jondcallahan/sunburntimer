import type { ChartTooltipOptions } from "@tanstack/charts";
import { focusNearestX } from "@tanstack/charts/focus";
import { renderChartSvgWithResources } from "@tanstack/charts/svg/resources";
import { Chart } from "@tanstack/react-charts";
import { useMemo } from "react";
import {
	burnChartDefinition,
	formatChartTime,
	type BurnChartDatum,
	type BurnChartInput,
} from "../lib/tanstack-charts";
import type { CalculationResult } from "../types";
import { toTZDate } from "../utils/timezone";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface BurnChartProps {
	result: CalculationResult;
	timezone?: string;
}

export function BurnChart({ result, timezone }: BurnChartProps) {
	const filteredPoints = useMemo(() => {
		const tzPoints = result.points.map((point) => ({
			...point,
			slice: {
				...point.slice,
				datetime: toTZDate(point.slice.datetime, timezone),
			},
		}));

		const tzStartTime = toTZDate(
			result.startTime ? new Date(result.startTime) : new Date(),
			timezone,
		);
		const cutoffTime = new Date(tzStartTime);
		cutoffTime.setHours(24, 0, 0, 0);

		return tzPoints.filter((point) => point.slice.datetime <= cutoffTime);
	}, [result.points, result.startTime, timezone]);

	const rows = useMemo<BurnChartDatum[]>(() => {
		let cumulativeDamage = 0;
		return filteredPoints.map((point) => {
			cumulativeDamage = Math.min(cumulativeDamage + point.burnCost, 100);
			return {
				id: `${point.slice.datetime.getTime()}-${cumulativeDamage}`,
				time: point.slice.datetime,
				damage: cumulativeDamage,
				point,
			};
		});
	}, [filteredPoints]);

	const input = useMemo<BurnChartInput>(
		() => ({
			rows,
			fallbackTime: toTZDate(result.startTime ?? new Date(), timezone),
			timezone,
		}),
		[rows, result.startTime, timezone],
	);

	const tooltip = useMemo<ChartTooltipOptions<BurnChartDatum, Date, number>>(
		() => ({
			className: "sunburn-chart-tooltip",
			format: ({ datum }) =>
				[
					formatChartTime(datum.time, timezone, "h:mm a"),
					`Damage: ${datum.damage.toFixed(1)}%`,
					`UV Index: ${datum.point.slice.uvIndex.toFixed(1)}`,
					`Rate: ${datum.point.burnCost.toFixed(2)}%/interval`,
				].join("\n"),
		}),
		[timezone],
	);

	const burnTimeReached = rows.some((row) => row.damage >= 100);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Skin Damage Over Time</span>
					{burnTimeReached && (
						<span className="rounded bg-destructive/10 px-2 py-1 text-sm text-destructive">
							Burn threshold reached
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80 w-full">
					<Chart
						definition={burnChartDefinition}
						input={input}
						height={320}
						initialWidth={560}
						ariaLabel="Cumulative skin damage percentage over time"
						ariaDescription="Skin damage accumulated from UV exposure, skin type, and sun protection factors."
						className="sunburn-chart"
						focus={focusNearestX}
						maxFocusDistance={Number.POSITIVE_INFINITY}
						tooltip={tooltip}
						animate={{ duration: 450, easing: "ease-out" }}
						idPrefix="burn-chart"
						renderSvg={renderChartSvgWithResources}
					/>
				</div>

				<div className="mt-4 text-sm text-muted-foreground">
					<p>
						This chart shows how skin damage accumulates over time based on UV
						exposure, your skin type, and sun protection factors.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
