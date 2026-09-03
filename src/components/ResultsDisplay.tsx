import { useMemo } from "react";
import { Sun, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "./ui/card";
import type { CalculationResult, EnvironmentalBurnTimes } from "../types";
import { CALCULATION_CONSTANTS } from "../types";
import {
	formatInTimeZone,
	getHoursInTimezone,
	toTZDate,
} from "../utils/timezone";
import { formatDuration } from "../lib/utils";

interface ResultsDisplayProps {
	result: CalculationResult;
	timezone?: string;
}

/**
 * True when burnTime falls on a later calendar day than startTime
 * in the weather location's timezone (not the browser's local TZ).
 */
function isNextCalendarDay(
	startTime: Date,
	burnTime: Date,
	timezone?: string,
): boolean {
	if (timezone) {
		const startDay = formatInTimeZone(startTime, timezone, "yyyy-MM-dd");
		const burnDay = formatInTimeZone(burnTime, timezone, "yyyy-MM-dd");
		return burnDay !== startDay;
	}
	// Fallback: full local calendar date (not getDate() alone — that collides across months)
	const start = toTZDate(startTime);
	const burn = toTZDate(burnTime);
	return (
		start.getFullYear() !== burn.getFullYear() ||
		start.getMonth() !== burn.getMonth() ||
		start.getDate() !== burn.getDate()
	);
}

/** Format a scenario burn duration, or "unlikely" if no burn / past local midnight. */
function formatScenarioDuration(
	startTime: Date | undefined,
	burnTime: Date | undefined,
	timezone?: string,
): string {
	if (
		!startTime ||
		!burnTime ||
		isNextCalendarDay(startTime, burnTime, timezone)
	) {
		return "unlikely";
	}
	return formatDuration(burnTime.getTime() - startTime.getTime());
}

function hasAnyEnvironmentalScenario(
	times: EnvironmentalBurnTimes | undefined,
): boolean {
	return !!(times?.shade || times?.sand || times?.snow);
}

function formatBurnClock(burnTime: Date, timezone?: string): string {
	if (timezone) {
		return formatInTimeZone(burnTime, timezone, "h:mm a");
	}
	return format(burnTime, "h:mm a");
}

export function ResultsDisplay({ result, timezone }: ResultsDisplayProps) {
	const { burnTime, startTime, points, advice, environmentalBurnTimes } =
		result;

	const finalDamage = useMemo(() => {
		if (points.length === 0) return 0;
		const lastPoint = points[points.length - 1];
		return lastPoint.totalDamageAtStart + lastPoint.burnCost;
	}, [points]);

	const safeTime = useMemo(() => {
		if (!startTime || !burnTime) return null;

		if (isNextCalendarDay(startTime, burnTime, timezone)) {
			return "unlikely";
		}

		const diffMs = burnTime.getTime() - startTime.getTime();
		return formatDuration(diffMs);
	}, [startTime, burnTime, timezone]);

	const environmentalLabels = useMemo(() => {
		if (!startTime || !hasAnyEnvironmentalScenario(environmentalBurnTimes)) {
			return null;
		}
		// Prefer main result startTime so labels stay aligned with "Safe for…"
		return {
			shade: formatScenarioDuration(
				startTime,
				environmentalBurnTimes?.shade,
				timezone,
			),
			sand: formatScenarioDuration(
				startTime,
				environmentalBurnTimes?.sand,
				timezone,
			),
			snow: formatScenarioDuration(
				startTime,
				environmentalBurnTimes?.snow,
				timezone,
			),
		};
	}, [startTime, environmentalBurnTimes, timezone]);

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

		// Check if burn occurs during high UV hours (before 6 PM local to weather site)
		const burnHour = burnTime
			? timezone
				? getHoursInTimezone(burnTime, timezone)
				: burnTime.getHours()
			: 0;
		const isHighUVPeriod = burnTime
			? burnHour < CALCULATION_CONSTANTS.EVENING_RISK_CUTOFF_HOUR
			: true;

		// High risk only if all conditions are met
		return isDamageHigh && isQuickBurn && isHighUVPeriod;
	}, [finalDamage, safeTime, burnTime, startTime, timezone]);

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="text-center space-y-4">
					{/* Main Message */}
					<div className="flex flex-col items-center gap-3">
						{isHighRisk ? (
							<Sun className="w-8 h-8 text-sun" />
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
											? `Use sunscreen by ${formatBurnClock(burnTime, timezone)}, sun damage may occur after`
											: `Until ${formatBurnClock(burnTime, timezone)}`}
									</p>
									{environmentalLabels && (
										<p className="text-sm tabular-nums text-slate-500 mt-2">
											Full shade: {environmentalLabels.shade} • Beach:{" "}
											{environmentalLabels.sand} • Snow:{" "}
											{environmentalLabels.snow}
										</p>
									)}
								</div>
							) : (
								<div>
									<p className="text-2xl font-bold text-green-600">
										Sunburn unlikely
									</p>
									{environmentalLabels &&
										(environmentalLabels.snow !== "unlikely" ||
											environmentalLabels.sand !== "unlikely") && (
											<p className="text-sm tabular-nums text-slate-500 mt-2">
												Full shade: {environmentalLabels.shade} • Beach:{" "}
												{environmentalLabels.sand} • Snow:{" "}
												{environmentalLabels.snow}
											</p>
										)}
								</div>
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
