import { useState, useEffect, useCallback } from "react";
import {
	Play,
	Pause,
	Square,
	Clock,
	AlertTriangle,
	CheckCircle,
} from "lucide-react";
import { format, addMilliseconds } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import type { CalculationResult } from "../types";

interface SunTimerProps {
	result: CalculationResult;
}

interface TimerState {
	isRunning: boolean;
	startTime: Date | null;
	elapsedMs: number;
	accumulatedDamage: number;
}

export function SunTimer({ result }: SunTimerProps) {
	const [timer, setTimer] = useState<TimerState>({
		isRunning: false,
		startTime: null,
		elapsedMs: 0,
		accumulatedDamage: 0,
	});

	// Calculate real-time damage based on elapsed time
	const calculateRealTimeDamage = useCallback(
		(elapsedMs: number, startTime: Date) => {
			const currentTime = addMilliseconds(startTime, elapsedMs);
			let totalDamage = 0;

			// Find relevant calculation points for the elapsed time
			for (const point of result.points) {
				if (point.slice.datetime <= currentTime) {
					totalDamage += point.burnCost;
				} else {
					// Interpolate partial damage for current time slice
					const prevPoint = result.points[result.points.indexOf(point) - 1];
					if (prevPoint && prevPoint.slice.datetime <= startTime) {
						const sliceDuration =
							point.slice.datetime.getTime() -
							prevPoint.slice.datetime.getTime();
						const elapsedInSlice =
							currentTime.getTime() - prevPoint.slice.datetime.getTime();
						const partialDamage =
							(elapsedInSlice / sliceDuration) * point.burnCost;
						totalDamage += Math.min(partialDamage, point.burnCost);
					}
					break;
				}
			}

			return Math.min(totalDamage, 100);
		},
		[result.points],
	);

	// Timer effect
	useEffect(() => {
		let interval: NodeJS.Timeout;

		if (timer.isRunning && timer.startTime) {
			interval = setInterval(() => {
				setTimer((prev) => {
					if (!prev.startTime) return prev;
					const newElapsedMs = Date.now() - prev.startTime.getTime();
					const newDamage = calculateRealTimeDamage(
						newElapsedMs,
						prev.startTime,
					);

					return {
						...prev,
						elapsedMs: newElapsedMs,
						accumulatedDamage: newDamage,
					};
				});
			}, 1000);
		}

		return () => {
			if (interval) clearInterval(interval);
		};
	}, [timer.isRunning, timer.startTime, calculateRealTimeDamage]);

	const handleStart = () => {
		const now = new Date();
		setTimer({
			isRunning: true,
			startTime: now,
			elapsedMs: 0,
			accumulatedDamage: 0,
		});
	};

	const handlePause = () => {
		setTimer((prev) => ({ ...prev, isRunning: false }));
	};

	const handleResume = () => {
		setTimer((prev) => ({ ...prev, isRunning: true }));
	};

	const handleStop = () => {
		setTimer({
			isRunning: false,
			startTime: null,
			elapsedMs: 0,
			accumulatedDamage: 0,
		});
	};

	const formatElapsedTime = (ms: number): string => {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const getRiskStatus = (damage: number) => {
		if (damage < 25)
			return {
				status: "Safe",
				color: "bg-green-500",
				textColor: "text-green-700",
			};
		if (damage < 50)
			return {
				status: "Caution",
				color: "bg-yellow-500",
				textColor: "text-yellow-700",
			};
		if (damage < 75)
			return {
				status: "Warning",
				color: "bg-orange-500",
				textColor: "text-orange-700",
			};
		if (damage < 95)
			return {
				status: "Danger",
				color: "bg-red-500",
				textColor: "text-red-700",
			};
		return {
			status: "Critical",
			color: "bg-red-600",
			textColor: "text-red-800",
		};
	};

	const riskStatus = getRiskStatus(timer.accumulatedDamage);
	const burnTime = result.burnTime;
	const remainingTime =
		burnTime && timer.startTime
			? Math.max(
					0,
					burnTime.getTime() - (timer.startTime.getTime() + timer.elapsedMs),
				)
			: null;

	return (
		<Card className="border-stone-200 shadow-sm">
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-slate-800">
					<div className="flex items-center">
						<Clock className="w-5 h-5 mr-2" />
						Sun Exposure Timer
					</div>
					<Badge
						variant={timer.accumulatedDamage > 75 ? "destructive" : "secondary"}
					>
						{riskStatus.status}
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Timer Display */}
				<div className="text-center">
					<div className="text-4xl font-mono font-bold tabular-nums text-slate-800 mb-2">
						{formatElapsedTime(timer.elapsedMs)}
					</div>
					{timer.startTime && (
						<p className="text-sm tabular-nums text-slate-600">
							Started at {format(timer.startTime, "h:mm a")}
						</p>
					)}
				</div>

				{/* Progress Bar */}
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span className="text-slate-600">Skin Damage</span>
						<span className={`font-medium tabular-nums ${riskStatus.textColor}`}>
							{timer.accumulatedDamage.toFixed(1)}%
						</span>
					</div>
					<Progress
						value={Math.min(timer.accumulatedDamage, 100)}
						className="h-3"
					/>
					{burnTime && remainingTime !== null && (
						<p className="text-xs tabular-nums text-slate-600 text-center">
							{remainingTime > 0
								? `${formatElapsedTime(remainingTime)} until burn threshold`
								: "Burn threshold reached!"}
						</p>
					)}
				</div>

				{/* Timer Controls */}
				<div className="flex justify-center space-x-2">
					{!timer.isRunning && timer.startTime === null && (
						<Button
							onClick={handleStart}
							className="bg-green-600 hover:bg-green-700"
						>
							<Play className="w-4 h-4 mr-2" />
							Start Timer
						</Button>
					)}

					{timer.isRunning && (
						<Button onClick={handlePause} variant="outline">
							<Pause className="w-4 h-4 mr-2" />
							Pause
						</Button>
					)}

					{!timer.isRunning && timer.startTime !== null && (
						<Button
							onClick={handleResume}
							className="bg-green-600 hover:bg-green-700"
						>
							<Play className="w-4 h-4 mr-2" />
							Resume
						</Button>
					)}

					{timer.startTime !== null && (
						<Button onClick={handleStop} variant="destructive">
							<Square className="w-4 h-4 mr-2" />
							Stop
						</Button>
					)}
				</div>

				{/* Warnings */}
				{timer.accumulatedDamage > 50 && (
					<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
						<div className="flex items-start space-x-2">
							<AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
							<div className="text-sm">
								<p className="font-medium text-yellow-800">
									{timer.accumulatedDamage > 90
										? "Critical: Seek shade immediately!"
										: timer.accumulatedDamage > 75
											? "Warning: Consider seeking shade soon"
											: "Caution: Monitor your exposure time"}
								</p>
								<p className="text-yellow-700 mt-1">
									{timer.accumulatedDamage > 90
										? "You are at high risk of sunburn. Move to shade and apply more sunscreen."
										: "Your sun exposure is getting significant. Consider taking a break in the shade."}
								</p>
							</div>
						</div>
					</div>
				)}

				{timer.accumulatedDamage < 25 && timer.isRunning && (
					<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex items-start space-x-2">
							<CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
							<div className="text-sm">
								<p className="font-medium text-green-800">
									You're doing great!
								</p>
								<p className="text-green-700">
									Your current sun exposure is within safe limits. Enjoy your
									time outdoors!
								</p>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
