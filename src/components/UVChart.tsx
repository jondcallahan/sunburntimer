import { useCallback, useMemo } from "react";
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
import "chartjs-adapter-date-fns";
import type { CalculationResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAppStore } from "../store";
import { getUVIndexColor } from "../lib/utils";

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
}

export function UVChart({ result }: UVChartProps) {
	const { geolocation } = useAppStore();

	// Calculate UV statistics from weather data or fallback to calculation points
	const weatherData = geolocation.weather;
	let currentUV: number;
	let maxUV: number;

	if (weatherData && weatherData.hourly.length > 0) {
		currentUV = weatherData.current.uvi;
		maxUV = Math.max(...weatherData.hourly.map((h) => h.uvi));
	} else {
		currentUV = result.points[0]?.slice.uvIndex || 0;
		maxUV = Math.max(...result.points.map((p) => p.slice.uvIndex));
	}

	const chartData = useMemo(() => {
		// Use full weather data instead of just calculation points for better forecast visualization
		let times: Date[];
		let uvData: number[];

		if (!weatherData) {
			// Fallback to calculation points if no weather data
			times = result.points.map((point) => point.slice.datetime);
			uvData = result.points.map((point) => point.slice.uvIndex);
		} else {
			// Show UV data for the next 3 days (up to 72 hours)
			times = weatherData.hourly.map((hour) => new Date(hour.dt * 1000));
			uvData = weatherData.hourly.map((hour) => hour.uvi);
		}

		return {
			labels: times,
			datasets: [
				{
					label: "UV Index",
					data: uvData,
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
	}, [result.points, weatherData?.hourly.map, weatherData]);

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
							return format(date, "h:mm a");
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
						currentTime: {
							type: "line" as const,
							xMin: Date.now(),
							xMax: Date.now(),
							borderColor: "#dc2626", // red-600
							borderWidth: 2,
							borderDash: [3, 3],
							label: {
								content: "Now",
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
						color: "#64748b", // slate-500
					},
					grid: {
						color: "rgba(148, 163, 184, 0.1)", // slate-400 with opacity
					},
					ticks: {
						color: "#64748b",
					},
				},
				y: {
					min: 0,
					max: Math.max(12, Math.ceil(maxUV + 1)),
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
		[maxUV, getUVRiskLevel],
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
				<CardTitle className="flex items-center justify-between text-slate-800">
					<span>UV Index Throughout the Day</span>
					<div className="flex items-center space-x-4 text-sm">
						<div className="text-center">
							<p className="text-xs text-slate-600">Current</p>
							<p className={`font-bold ${getUVRiskColor(currentUV)}`}>
								{currentUV.toFixed(1)}
							</p>
						</div>
						<div className="text-center">
							<p className="text-xs text-slate-600">Peak</p>
							<p className={`font-bold ${getUVRiskColor(maxUV)}`}>
								{maxUV.toFixed(1)}
							</p>
						</div>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent>
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
						The UV Index measures the strength of ultraviolet radiation. Higher
						values indicate greater risk of sunburn and need for protection.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
