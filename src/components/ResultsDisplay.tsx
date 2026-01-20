import { useMemo } from "react";
import { Sun, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";
import type { CalculationResult } from "../types";
import { CALCULATION_CONSTANTS } from "../types";
import { formatDuration, calculateEnvironmentalTimes } from "../lib/utils";

interface ResultsDisplayProps {
	result: CalculationResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
	const { burnTime, startTime, points, advice } = result;

	const finalDamage = useMemo(() => {
		if (points.length === 0) return 0;
		const lastPoint = points[points.length - 1];
		return lastPoint.totalDamageAtStart + lastPoint.burnCost;
	}, [points]);

	const safeTime = useMemo(() => {
		if (!startTime || !burnTime) return null;

		// Check if burn time is past midnight (next day)
		const startDate = new Date(startTime);
		const burnDate = new Date(burnTime);
		const isNextDay = burnDate.getDate() !== startDate.getDate();
		const isPastMidnight = isNextDay;

		if (isPastMidnight) {
			return "unlikely";
		}

		const diffMs = burnTime.getTime() - startTime.getTime();
		return formatDuration(diffMs);
	}, [startTime, burnTime]);

	const environmentalTimes = useMemo(() => {
		if (!startTime || !burnTime || safeTime === "unlikely") return null;
		return calculateEnvironmentalTimes(startTime, burnTime);
	}, [startTime, burnTime, safeTime]);

	const isHighRisk = useMemo(() => {
		// If sunburn is unlikely, it's not high risk
		if (safeTime === "unlikely") return false;

		// Multi-factor risk assessment
		const isDamageHigh = finalDamage >= CALCULATION_CONSTANTS.SAFETY_THRESHOLD;

		// Check if burn time is within high-risk window (< 4 hours)
		const isQuickBurn =
			safeTime && burnTime && startTime
				? (burnTime.getTime() - startTime.getTime()) / (1000 * 60 * 60) <
					CALCULATION_CONSTANTS.HIGH_RISK_TIME_LIMIT_HOURS
				: false;

		// Check if burn occurs during high UV hours (before 6 PM)
		const isHighUVPeriod = burnTime
			? burnTime.getHours() < CALCULATION_CONSTANTS.EVENING_RISK_CUTOFF_HOUR
			: true;

		// High risk only if all conditions are met
		return isDamageHigh && isQuickBurn && isHighUVPeriod;
	}, [finalDamage, safeTime, burnTime, startTime]);

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="text-center space-y-4">
					{/* Main Message */}
					<div className="flex flex-col items-center gap-3">
						{isHighRisk ? (
							<Sun className="w-8 h-8 text-orange-500" />
						) : (
							<CheckCircle className="w-8 h-8 text-green-600" />
						)}
						<div className="text-center">
							{burnTime && safeTime && safeTime !== "unlikely" ? (
								<div>
									<p className="text-2xl font-bold tabular-nums text-slate-800">
										Safe for {safeTime}
									</p>
									<p className="text-slate-600 tabular-nums">
										{isHighRisk
											? `Use sunscreen by ${format(burnTime, "h:mm a")}, sun damage may occur after`
											: `Until ${format(burnTime, "h:mm a")}`}
									</p>
									{environmentalTimes && (
										<p className="text-sm tabular-nums text-slate-500 mt-2">
											Full shade: {environmentalTimes.shade} • Beach:{" "}
											{environmentalTimes.sand} • Snow:{" "}
											{environmentalTimes.snow}
										</p>
									)}
								</div>
							) : (
								<p className="text-2xl font-bold text-green-600">
									Sunburn unlikely
								</p>
							)}
						</div>
					</div>

					{/* Simple Advice */}
					{advice.length > 0 && (
						<p className="text-slate-600 text-sm max-w-md mx-auto">
							{advice[0]}
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
