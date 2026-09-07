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
import { getHoursInTimezone } from "./utils/timezone";

// **** Physics-grounded damage model ****
// UVI = 40 * E_ery(W/m²) -> dose per minute = 1.5 * UVI (J/m²)
// damage% per minute = (k * UVI) / (SPF_eff * MED)
// Use k = 120 to align with prior model (BASE_DAMAGE_TIME=200, UV_SCALING_FACTOR=3, MED=80*coeff).
// **This model estimates sunburn risk by calculating cumulative UV 'dose' (energy absorbed by skin) over time.
// It converts UV Index to skin-damaging energy, adjusts for sunscreen and skin sensitivity, and adds up damage percentages.**
const UVI_DAMAGE_FACTOR_PER_MIN = 120;

export const UVB_SKIN_RECOVERY = {
	// Arbabi, Gange & Parrish, J Invest Dermatol. 1983;81(1):78-82.
	// They measured normal-skin UVB recovery at 24-30h.
	// The model uses the midpoint and treats "recovered" as 95% drained.
	recoveryPeriodHours: 27,
	remainingFractionAfterRecoveryPeriod: 0.05,
} as const;

const SKIN_DAMAGE_RECOVERY_RATE_PER_MIN =
	-Math.log(UVB_SKIN_RECOVERY.remainingFractionAfterRecoveryPeriod) /
	(UVB_SKIN_RECOVERY.recoveryPeriodHours * 60);

// **Derive MED (J/m²) from your existing coefficients:
// (your config's comments match MED = 80 * coefficient)
// MED is the 'Minimal Erythemal Dose'—the UV energy threshold for skin to start reddening. Lower for fair skin.**
function getMedInJm2(skinType: FitzpatrickType): number {
	return 80 * SKIN_TYPE_CONFIG[skinType].coefficient;
}

export function recoverSkinDamagePercent(
	damagePercent: number,
	elapsedMinutes: number,
): number {
	if (damagePercent <= 0) return 0;
	if (elapsedMinutes <= 0) return damagePercent;
	return (
		damagePercent *
		Math.exp(-SKIN_DAMAGE_RECOVERY_RATE_PER_MIN * elapsedMinutes)
	);
}

function applyLeakyBucketRecovery(
	damageAtStart: number,
	damageRatePerMinute: number,
	minutes: number,
): number {
	const clampedDamageAtStart = Math.max(0, damageAtStart);
	const clampedDamageRate = Math.max(0, damageRatePerMinute);
	if (minutes <= 0) return clampedDamageAtStart;
	if (clampedDamageRate === 0) {
		return recoverSkinDamagePercent(clampedDamageAtStart, minutes);
	}
	const steadyStateDamage =
		clampedDamageRate / SKIN_DAMAGE_RECOVERY_RATE_PER_MIN;
	const decay = Math.exp(-SKIN_DAMAGE_RECOVERY_RATE_PER_MIN * minutes);
	return Math.max(
		0,
		steadyStateDamage + (clampedDamageAtStart - steadyStateDamage) * decay,
	);
}

function getMinutesToDamageThreshold(
	damageAtStart: number,
	damageRatePerMinute: number,
	threshold: number,
	maxMinutes: number,
): number | undefined {
	if (damageAtStart >= threshold) return 0;
	if (damageRatePerMinute <= 0 || maxMinutes <= 0) return undefined;

	const steadyStateDamage =
		damageRatePerMinute / SKIN_DAMAGE_RECOVERY_RATE_PER_MIN;
	if (steadyStateDamage <= threshold) return undefined;

	const ratio =
		(threshold - steadyStateDamage) / (damageAtStart - steadyStateDamage);
	if (ratio <= 0 || ratio >= 1) return undefined;

	const minutesToThreshold =
		-Math.log(ratio) / SKIN_DAMAGE_RECOVERY_RATE_PER_MIN;
	if (minutesToThreshold < 0 || minutesToThreshold > maxMinutes) {
		return undefined;
	}
	return minutesToThreshold;
}

// **Effective SPF at time offset (hours since application)
// Models sunscreen wearing off due to sweat: Starts full strength, then linearly drops to 1 (no protection) over time.**
function spfAtTime(
	baseSpfValue: number,
	sweatLevel: SweatLevel,
	hoursFromStart: number,
): number {
	if (sweatLevel === SweatLevel.LOW || baseSpfValue === 1.0)
		return baseSpfValue;
	const sweatConfig = SWEAT_CONFIG[sweatLevel];
	if (hoursFromStart <= sweatConfig.startHours) return baseSpfValue;
	if (hoursFromStart >= sweatConfig.startHours + sweatConfig.durationHours)
		return 1.0;
	const decayProgress =
		(hoursFromStart - sweatConfig.startHours) / sweatConfig.durationHours;
	const remainingSpfValue = baseSpfValue * (1.0 - decayProgress);
	return Math.max(1.0, remainingSpfValue);
}

// **Low-UV ramp: smoothstep between configured [low, high]
// At very low UV (e.g., <1), damage is negligible. This smoothly ramps up the weighting from 0 to full effect,
// avoiding overestimation in dawn/dusk or cloudy conditions. Smoothstep is a curved transition for natural feel.**
function lowUvWeight(uvi: number): number {
	const { LOW_UV_SMOOTHSTEP_ENABLED, LOW_UV_RAMP_LOW, LOW_UV_RAMP_HIGH } =
		CALCULATION_CONSTANTS;
	if (!LOW_UV_SMOOTHSTEP_ENABLED) return 1;
	const lowThreshold = LOW_UV_RAMP_LOW;
	const highThreshold = LOW_UV_RAMP_HIGH;
	if (!(highThreshold > lowThreshold)) return 1;
	const normalizedUvi = Math.max(
		0,
		Math.min(1, (uvi - lowThreshold) / (highThreshold - lowThreshold)),
	);
	return normalizedUvi * normalizedUvi * (3 - 2 * normalizedUvi); // smoothstep formula: cubic curve for smooth start/end.
}

type SliceWindow = {
	start: Date;
	end: Date;
	uviStart: number;
	uviEnd: number;
};

// **Build fixed sub-hour slices, keeping start & end UV for trapezoid integration
// Breaks hourly UV data into smaller windows (e.g., 10-min) with interpolated UV at start/end.
// This allows averaging UV changes smoothly, like connecting dots on a graph.**
function createSlices(
	hourly: HourlyWeather[],
	slicesPerHour: number,
): SliceWindow[] {
	const sliceWindows: SliceWindow[] = [];
	if (!hourly || hourly.length < 2) return sliceWindows;
	const sliceMinutes = 60 / slicesPerHour;
	for (let i = 0; i < hourly.length - 1; i++) {
		const currentHourWeather = hourly[i];
		const nextHourWeather = hourly[i + 1];
		const baseTimestampMs = currentHourWeather.dt * 1000;
		for (let j = 0; j < slicesPerHour; j++) {
			const sliceStartMs = baseTimestampMs + j * sliceMinutes * 60000;
			const sliceEndMs = baseTimestampMs + (j + 1) * sliceMinutes * 60000;
			const interpFractionStart = j / slicesPerHour;
			const interpFractionEnd = (j + 1) / slicesPerHour;
			sliceWindows.push({
				start: new Date(sliceStartMs),
				end: new Date(sliceEndMs),
				uviStart:
					currentHourWeather.uvi * (1 - interpFractionStart) +
					nextHourWeather.uvi * interpFractionStart,
				uviEnd:
					currentHourWeather.uvi * (1 - interpFractionEnd) +
					nextHourWeather.uvi * interpFractionEnd,
			});
		}
	}
	return sliceWindows;
}

// **Check stopping conditions
// Stops calc if damage hits threshold or it's evening (low UV risk) after enough points.**
function shouldStopCalculation(
	totalDamage: number,
	currentTime: Date,
	pointCount: number,
	timezone: string,
): boolean {
	if (totalDamage >= CALCULATION_CONSTANTS.DAMAGE_THRESHOLD) {
		return true;
	}
	const hour = getHoursInTimezone(currentTime, timezone);
	if (
		pointCount > CALCULATION_CONSTANTS.MIN_POINTS_FOR_EVENING_STOP &&
		hour >= CALCULATION_CONSTANTS.EVENING_CUTOFF_HOUR
	) {
		return true;
	}
	return false;
}

// **Generate safety advice
// Based on final damage and inputs, suggests reapplication or limiting exposure.**
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
	const lastCalculationPoint = points[points.length - 1];
	if (!lastCalculationPoint) return advice;
	const estimatedFinalDamage =
		(lastCalculationPoint?.totalDamageAtStart ?? 0) +
		(lastCalculationPoint?.burnCost ?? 0);
	if (estimatedFinalDamage < CALCULATION_CONSTANTS.SAFETY_THRESHOLD) {
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

// **Main calculation function
// Loops through time slices, adds damage per slice, stops at burn threshold or evening.**
function calculateBurnTimeWithSlices(
	input: CalculationInput,
	slicesPerHour: number,
): CalculationResult {
	const sliceWindows = createSlices(input.weather.hourly, slicesPerHour);
	const medInJm2 = getMedInJm2(input.skinType);
	const baseSpfValue =
		SPF_CONFIG[input.spfLevel]?.coefficient ??
		SPF_CONFIG[SPFLevel.NONE].coefficient;
	const startTimestampMs = input.currentTime.getTime();
	const threshold = CALCULATION_CONSTANTS.DAMAGE_THRESHOLD;
	const points: CalculationPoint[] = [];
	let totalDamage = 0;
	let pointCount = 0;
	let burnTime: Date | undefined;
	for (const currentSlice of sliceWindows) {
		// Skip windows fully before the current time
		if (currentSlice.end.getTime() <= startTimestampMs) continue;
		// Effective window after current time
		const effectiveStartMs = Math.max(
			currentSlice.start.getTime(),
			startTimestampMs,
		);
		const effectiveEndMs = currentSlice.end.getTime();
		const minutes = (effectiveEndMs - effectiveStartMs) / 60000;
		if (minutes <= 0) continue;
		// UV at effective start (if starting mid-slice)
		const sliceDurationMs =
			currentSlice.end.getTime() - currentSlice.start.getTime();
		const startFraction =
			sliceDurationMs > 0
				? (effectiveStartMs - currentSlice.start.getTime()) / sliceDurationMs
				: 0;
		const uviAtEffectiveStart =
			currentSlice.uviStart * (1 - startFraction) +
			currentSlice.uviEnd * startFraction;
		const uviAtEnd = currentSlice.uviEnd;
		// SPF at endpoints (hours since application)
		const hoursFromStartAtEffective =
			(effectiveStartMs - startTimestampMs) / 3600000;
		const hoursFromStartAtEnd = (effectiveEndMs - startTimestampMs) / 3600000;
		const spfAtEffectiveStart = spfAtTime(
			baseSpfValue,
			input.sweatLevel,
			hoursFromStartAtEffective,
		);
		const spfAtEnd = spfAtTime(
			baseSpfValue,
			input.sweatLevel,
			hoursFromStartAtEnd,
		);
		// Trapezoid on effective irradiance (UVI/SPF)
		// **Effective irradiance: UV strength divided by SPF, weighted for low UV. Average start/end for smooth integration.**
		const effectiveIrradianceStart =
			(uviAtEffectiveStart / Math.max(1, spfAtEffectiveStart)) *
			lowUvWeight(uviAtEffectiveStart);
		const effectiveIrradianceEnd =
			(uviAtEnd / Math.max(1, spfAtEnd)) * lowUvWeight(uviAtEnd);
		const averageEffectiveIrradiance =
			0.5 * (effectiveIrradianceStart + effectiveIrradianceEnd);
		// Damage rate for this window.
		// **Core formula: Converts average effective UV to damage %/minute based on the selected skin type's MED.**
		const damageRatePerMinute =
			(UVI_DAMAGE_FACTOR_PER_MIN * averageEffectiveIrradiance) / medInJm2;
		const damageAtEndOfSlice = applyLeakyBucketRecovery(
			totalDamage,
			damageRatePerMinute,
			minutes,
		);
		let netDamageChangeInSlice = damageAtEndOfSlice - totalDamage;
		// For display, record midpoint UV
		const displayTimeSlice: TimeSlice = {
			datetime: new Date(effectiveStartMs),
			uvIndex: 0.5 * (uviAtEffectiveStart + uviAtEnd),
		};
		// Crossing inside the window? Clamp and compute exact burnTime.
		// **The leaky bucket can recover while filling, so solve the exponential bucket equation instead of using simple addition.**
		const minutesToThreshold = getMinutesToDamageThreshold(
			totalDamage,
			damageRatePerMinute,
			threshold,
			minutes,
		);
		if (!burnTime && minutesToThreshold !== undefined) {
			netDamageChangeInSlice = threshold - totalDamage; // clamp to reach exactly 100%
			burnTime = new Date(effectiveStartMs + minutesToThreshold * 60000);
		}
		points.push({
			slice: displayTimeSlice,
			burnCost: netDamageChangeInSlice,
			totalDamageAtStart: totalDamage,
		});
		totalDamage += netDamageChangeInSlice;
		pointCount++;
		if (
			burnTime ||
			shouldStopCalculation(
				totalDamage,
				displayTimeSlice.datetime,
				pointCount,
				input.weather.timezone,
			)
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

// **Find optimal time slicing
// Tries coarser slices first (fewer points) for efficiency, falls back to finer if too many points.**
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
