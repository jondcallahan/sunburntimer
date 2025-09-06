import type {
	CalculationInput,
	CalculationResult,
	CalculationPoint,
	TimeSlice,
	HourlyWeather,
	FitzpatrickType,
} from "./types";
import {
	SweatLevel,
	SPFLevel,
	CALCULATION_CONSTANTS,
	SKIN_TYPE_CONFIG,
	SPF_CONFIG,
	SWEAT_CONFIG,
} from "./types";

// ---- Physics-grounded damage model ----
// UVI = 40 * E_ery(W/m²) -> dose per minute = 1.5 * UVI (J/m²)
// damage% per minute = (150 * UVI) / (SPF_eff * MED)
const UVI_DAMAGE_FACTOR_PER_MIN = 150;

// Derive MED (J/m²) from your existing coefficients:
// (your config's comments match MED = 80 * coefficient)
function getMedJm2(skinType: FitzpatrickType): number {
	return 80 * SKIN_TYPE_CONFIG[skinType].coefficient;
}

// Effective SPF at time offset (hours since application)
function spfAtTime(
	baseSPF: number,
	sweatLevel: SweatLevel,
	hoursFromStart: number,
): number {
	if (sweatLevel === SweatLevel.LOW || baseSPF === 1.0) return baseSPF;
	const cfg = SWEAT_CONFIG[sweatLevel];
	if (hoursFromStart <= cfg.startHours) return baseSPF;
	if (hoursFromStart >= cfg.startHours + cfg.durationHours) return 1.0;
	const progress = (hoursFromStart - cfg.startHours) / cfg.durationHours;
	const remaining = baseSPF * (1.0 - progress);
	return Math.max(1.0, remaining);
}

type SliceWindow = {
	start: Date;
	end: Date;
	uviStart: number;
	uviEnd: number;
};

// Build fixed sub-hour slices, keeping start & end UV for trapezoid integration
function createSlices(
	hourly: HourlyWeather[],
	slicesPerHour: number,
): SliceWindow[] {
	const out: SliceWindow[] = [];
	if (!hourly || hourly.length < 2) return out;
	const sliceMinutes = 60 / slicesPerHour;
	for (let i = 0; i < hourly.length - 1; i++) {
		const h0 = hourly[i];
		const h1 = hourly[i + 1];
		const baseMs = h0.dt * 1000;
		for (let j = 0; j < slicesPerHour; j++) {
			const t0 = baseMs + j * sliceMinutes * 60000;
			const t1 = baseMs + (j + 1) * sliceMinutes * 60000;
			const a0 = j / slicesPerHour;
			const a1 = (j + 1) / slicesPerHour;
			out.push({
				start: new Date(t0),
				end: new Date(t1),
				uviStart: h0.uvi * (1 - a0) + h1.uvi * a0,
				uviEnd: h0.uvi * (1 - a1) + h1.uvi * a1,
			});
		}
	}
	return out;
}

// Check stopping conditions
function shouldStopCalculation(
	totalDamage: number,
	currentTime: Date,
	pointCount: number,
): boolean {
	if (totalDamage >= CALCULATION_CONSTANTS.DAMAGE_THRESHOLD) {
		return true;
	}

	const hour = currentTime.getHours();
	if (
		pointCount > CALCULATION_CONSTANTS.MIN_POINTS_FOR_EVENING_STOP &&
		hour >= CALCULATION_CONSTANTS.EVENING_CUTOFF_HOUR
	) {
		return true;
	}

	return false;
}

// Generate safety advice
function generateAdvice(
	input: CalculationInput,
	points: CalculationPoint[],
): string[] {
	const advice: string[] = [];

	if (input.spfLevel !== "NONE") {
		advice.push(
			"Reapply sunscreen every 2 hours, after swimming, or excessive sweating",
		);
	}

	const lastPoint = points[points.length - 1];
	if (!lastPoint) return advice;

	const finalDamage =
		(lastPoint?.totalDamageAtStart ?? 0) + (lastPoint?.burnCost ?? 0);
	if (finalDamage < CALCULATION_CONSTANTS.SAFETY_THRESHOLD) {
		if (input.spfLevel === "NONE") {
			return advice;
		} else {
			advice.push(
				"With these precautions you can spend the rest of the day out in the sun, enjoy! ☀️",
			);
		}
	} else {
		if (input.spfLevel === "NONE") {
			advice.push("You should try again with sunscreen");
		} else if (input.spfLevel === "SPF_50_PLUS") {
			advice.push("Limit your time in the sun today");
		} else {
			advice.push(
				"Try using a stronger sunscreen or limit your time in the sun today",
			);
		}
	}

	return advice;
}

// Main calculation function
function calculateBurnTimeWithSlices(
	input: CalculationInput,
	slicesPerHour: number,
): CalculationResult {
	const windows = createSlices(input.weather.hourly, slicesPerHour);
	const medJm2 = getMedJm2(input.skinType);
	const baseSPF =
		SPF_CONFIG[input.spfLevel]?.coefficient ??
		SPF_CONFIG[SPFLevel.NONE].coefficient;
	const startMs = input.currentTime.getTime();
	const threshold = CALCULATION_CONSTANTS.DAMAGE_THRESHOLD;

	const points: CalculationPoint[] = [];
	let totalDamage = 0;
	let pointCount = 0;
	let burnTime: Date | undefined;

	for (const w of windows) {
		// Skip windows fully before the current time
		if (w.end.getTime() <= startMs) continue;

		// Effective window after current time
		const effStartMs = Math.max(w.start.getTime(), startMs);
		const effEndMs = w.end.getTime();
		const minutes = (effEndMs - effStartMs) / 60000;
		if (minutes <= 0) continue;

		// UV at effective start (if starting mid-slice)
		const spanMs = w.end.getTime() - w.start.getTime();
		const a = spanMs > 0 ? (effStartMs - w.start.getTime()) / spanMs : 0;
		const uviStart = w.uviStart * (1 - a) + w.uviEnd * a;
		const uviEnd = w.uviEnd;

		// SPF at endpoints (hours since application)
		const hStart = (effStartMs - startMs) / 3600000;
		const hEnd = (effEndMs - startMs) / 3600000;
		const spfStart = spfAtTime(baseSPF, input.sweatLevel, hStart);
		const spfEnd = spfAtTime(baseSPF, input.sweatLevel, hEnd);

		// Trapezoid on effective irradiance (UVI/SPF)
		const effStart = uviStart / Math.max(1, spfStart);
		const effEnd = uviEnd / Math.max(1, spfEnd);
		const effAvg = 0.5 * (effStart + effEnd);

		// Damage% added in this (possibly partial) window
		let burnCost = (UVI_DAMAGE_FACTOR_PER_MIN * effAvg * minutes) / medJm2;

		// For display, record midpoint UV
		const displaySlice: TimeSlice = {
			datetime: new Date(effStartMs),
			uvIndex: 0.5 * (uviStart + uviEnd),
		};

		// Crossing inside the window? Clamp and compute exact burnTime
		if (!burnTime && totalDamage + burnCost >= threshold) {
			const ratePerMin = burnCost / minutes; // approx uniform within window
			const minsNeeded = (threshold - totalDamage) / ratePerMin;
			burnCost = threshold - totalDamage; // clamp to reach exactly 100%
			burnTime = new Date(effStartMs + minsNeeded * 60000);
		}

		points.push({
			slice: displaySlice,
			burnCost,
			totalDamageAtStart: totalDamage,
		});
		totalDamage += burnCost;
		pointCount++;

		if (
			burnTime ||
			shouldStopCalculation(totalDamage, displaySlice.datetime, pointCount)
		) {
			break;
		}
	}

	return {
		startTime: points[0]?.slice.datetime,
		burnTime,
		points,
		timeSlices: slicesPerHour,
		advice: generateAdvice(input, points),
	};
}

// Find optimal time slicing
export function findOptimalTimeSlicing(
	input: CalculationInput,
): CalculationResult {
	const sliceOptions = [30, 12, 6, 4]; // 2, 5, 10, 15 minute intervals

	for (const slicesPerHour of sliceOptions) {
		const result = calculateBurnTimeWithSlices(input, slicesPerHour);

		if (result.points.length <= CALCULATION_CONSTANTS.MAX_CALCULATION_POINTS) {
			return result;
		}
	}

	return calculateBurnTimeWithSlices(input, 4);
}
