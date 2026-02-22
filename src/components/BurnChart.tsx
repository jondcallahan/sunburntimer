import { useMemo } from "react";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	Filler,
	TimeScale,
	type TooltipItem,
	type ScriptableContext,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format } from "date-fns";
import "chartjs-adapter-date-fns";
import type { CalculationResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toTZDate } from "../utils/timezone";

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
);

interface BurnChartProps {
	result: CalculationResult;
	timezone?: string;
}

export function BurnChart({ result, timezone }: BurnChartProps) {
	const filteredPoints = useMemo(() => {
		const tzPoints = result.points.map((p) => ({
			...p,
			slice: {
				...p.slice,
				datetime: toTZDate(p.slice.datetime, timezone),
			},
		}));

		const tzStartTime = toTZDate(
			result.startTime ? new Date(result.startTime) : new Date(),
			timezone,
		);

		// setHours(24) on a TZDate correctly means "midnight in the target tz"
		const cutoffTime = new Date(tzStartTime);
		cutoffTime.setHours(24, 0, 0, 0);

		return tzPoints.filter((point) => point.slice.datetime <= cutoffTime);
	}, [result.points, result.startTime, timezone]);

	const chartData = useMemo(() => {
		const times = filteredPoints.map((point) => point.slice.datetime);
		const damageData = filteredPoints.map((_, i) => {
			// Calculate cumulative damage up to this point
			const cumulativeDamage = filteredPoints
				.slice(0, i + 1)
				.reduce((sum, point) => sum + point.burnCost, 0);
			return Math.min(cumulativeDamage, 100);
		});

		return {
			labels: times,
			datasets: [
				{
					label: "Cumulative Skin Damage (%)",
					data: damageData,
					borderColor: "#f97316", // Orange
					backgroundColor: (context: ScriptableContext<"line">) => {
						const ctx = context.chart.ctx;
						const gradient = ctx.createLinearGradient(0, 0, 0, 400);
						gradient.addColorStop(0, "rgba(249, 115, 22, 0.3)");
						gradient.addColorStop(0.6, "rgba(251, 191, 36, 0.2)");
						gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
						return gradient;
					},
					fill: true,
					tension: 0.3,
					pointRadius: 4,
					pointHoverRadius: 6,
					pointBackgroundColor: "#f97316",
					pointBorderColor: "#fff",
					pointBorderWidth: 2,
				},
			],
		};
	}, [filteredPoints]);

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
							return format(date, "h:mm a");
						},
						label: (context: TooltipItem<"line">) => {
							const damage = context.parsed.y.toFixed(1);
							const point = filteredPoints[context.dataIndex];
							return [
								`Damage: ${damage}%`,
								`UV Index: ${point.slice.uvIndex.toFixed(1)}`,
								`Rate: ${point.burnCost.toFixed(2)}%/interval`,
							];
						},
					},
				},
			},
			scales: {
				x: {
					type: "time" as const,
					time: {
						unit: "hour" as const,
						displayFormats: {
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
					},
					grid: {
						color: "rgba(0, 0, 0, 0.05)",
					},
				},
				y: {
					min: 0,
					max: 100,
					title: {
						display: true,
						text: "Skin Damage (%)",
						font: {
							size: 12,
							weight: "bold" as const,
						},
					},
					grid: {
						color: "rgba(0, 0, 0, 0.05)",
					},
					ticks: {
						callback: (value: string | number) => `${value}%`,
					},
				},
			},
			elements: {
				point: {
					hoverRadius: 8,
				},
			},
		}),
		[filteredPoints],
	);

	const burnTimeReached = useMemo(() => {
		return filteredPoints.some((_, i) => {
			const cumulativeDamage = filteredPoints
				.slice(0, i + 1)
				.reduce((sum, point) => sum + point.burnCost, 0);
			return cumulativeDamage >= 100;
		});
	}, [filteredPoints]);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Skin Damage Over Time</span>
					{burnTimeReached && (
						<span className="text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">
							Burn threshold reached
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="h-80 w-full">
					<Line data={chartData} options={options} />
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
