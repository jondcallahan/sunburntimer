import type {
	CalculationInput,
	CalculationResult,
	CalculationPoint,
	TimeSlice,
	HourlyWeather,
} from "./types";
import {
	SweatLevel,
	SPFLevel,
	CALCULATION_CONSTANTS,
	SKIN_TYPE_CONFIG,
	SPF_CONFIG,
	SWEAT_CONFIG,
	TIME_SLICE_OPTIONS,
} from "./types";

// Numeric helpers
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function isSafelyBelow(
	a: number,
	b: number,
	tol = CALCULATION_CONSTANTS.FLOAT_TOLERANCE,
): boolean {
	return a < b - tol;
}

function crossesThreshold(
	prev: number,
	next: number,
	threshold: number,
	tol = CALCULATION_CONSTANTS.THRESHOLD_TOLERANCE,
): boolean {
	return prev < threshold - tol && next >= threshold - tol;
}

// Core sunburn calculation formula
function calculateBurnTime(
	uvIndex: number,
	skinTypeCoeff: number,
	spfCoeff: number,
	sliceMinutes: number,
): number {
	const safeUV = Math.max(
		CALCULATION_CONSTANTS.MIN_UV_THRESHOLD,
		uvIndex * CALCULATION_CONSTANTS.UV_SCALING_FACTOR,
	);
	const timeForFullBurn =
		((CALCULATION_CONSTANTS.BASE_DAMAGE_TIME * skinTypeCoeff) / safeUV) *
		spfCoeff;
	const damagePercentage = (sliceMinutes * 100.0) / timeForFullBurn;

	return damagePercentage;
}

// UV interpolation (FIXED - uses proper float division)
function interpolateUV(
	startUV: number,
	endUV: number,
	sliceIndex: number,
	totalSlices: number,
): number {
	// Supports fractional sliceIndex for midpoint sampling
	const gradient = sliceIndex / totalSlices;
	return startUV * (1.0 - gradient) + endUV * gradient;
}

// Create time slices with UV interpolation
function createTimeSlices(
	hourlyWeather: HourlyWeather[],
	startTime: Date,
	slicesPerHour: number,
): TimeSlice[] {
	const slices: TimeSlice[] = [];
	const sliceMinutes = 60 / slicesPerHour;

	for (let i = 0; i < hourlyWeather.length - 1; i++) {
		const currentHour = hourlyWeather[i];
		const nextHour = hourlyWeather[i + 1];

		for (let j = 0; j < slicesPerHour; j++) {
			const sliceTime = new Date(
				currentHour.dt * 1000 + (j + 1) * sliceMinutes * 60000,
			);

			if (sliceTime >= startTime) {
				// Sample UV at slice midpoint for better integration accuracy
				const interpolatedUV = interpolateUV(
					currentHour.uvi,
					nextHour.uvi,
					j + 0.5,
					slicesPerHour,
				);

				slices.push({
					datetime: sliceTime,
					uvIndex: interpolatedUV,
				});
			}
		}
	}

	return slices;
}

// Calculate SPF degradation over time
function calculateSPFAtTime(
	baseSPF: number,
	sweatLevel: SweatLevel,
	timeElapsed: number, // hours since application
): number {
	if (sweatLevel === SweatLevel.LOW || baseSPF === 1.0) {
		return baseSPF;
	}

	const config = SWEAT_CONFIG[sweatLevel];

	if (timeElapsed <= config.startHours) {
		return baseSPF;
	}

	if (timeElapsed >= config.startHours + config.durationHours) {
		return 1.0;
	}

	const degradationProgress =
		(timeElapsed - config.startHours) / config.durationHours;
	const remainingProtection = baseSPF * (1.0 - degradationProgress);

	return Math.max(1.0, remainingProtection);
}

// Check stopping conditions
function shouldStopCalculation(currentTime: Date, pointCount: number): boolean {
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

	if (input.spfLevel !== SPFLevel.NONE) {
		advice.push(
			"Reapply sunscreen every 2 hours, after swimming, or excessive sweating",
		);
	}

	const lastPoint = points[points.length - 1];
	if (!lastPoint) return advice;

	const finalDamage = lastPoint.totalDamageAtStart + lastPoint.burnCost;
	if (
		isSafelyBelow(
			finalDamage,
			CALCULATION_CONSTANTS.SAFETY_THRESHOLD,
			CALCULATION_CONSTANTS.THRESHOLD_TOLERANCE,
		)
	) {
		if (input.spfLevel === SPFLevel.NONE) {
			return advice;
		} else {
			advice.push(
				"With these precautions you can spend the rest of the day out in the sun, enjoy! ☀️",
			);
		}
	} else {
		if (input.spfLevel === SPFLevel.NONE) {
			advice.push("You should try again with sunscreen");
		} else if (input.spfLevel === SPFLevel.SPF_50_PLUS) {
			advice.push("Limit your time in the sun today");
		} else {
			advice.push(
				"Try using a stronger sunscreen or limit your time in the sun today",
			);
		}
	}

	return advice;
}

// Main calculation function - processes time slices to find burn time
// TODO: This function is complex (140 lines) and should be refactored into smaller functions
// See refactoring-notes.md for detailed breakdown suggestions
function calculateBurnTimeWithSlices(
	input: CalculationInput,
	slicesPerHour: number,
): CalculationResult {
	const sliceMinutes = 60 / slicesPerHour;
	const timeSlices = createTimeSlices(
		input.weather.hourly,
		input.currentTime,
		slicesPerHour,
	);

	const points: CalculationPoint[] = [];
	let totalDamage = 0;
	let pointCount = 0;
	let burnTime: Date | undefined;

	let isFirstSlice = true;

	for (const slice of timeSlices) {
		// Safety net: prevent infinite loops with max calculation points
		if (pointCount >= CALCULATION_CONSTANTS.MAX_CALCULATION_POINTS) {
			break;
		}

		// Skip calculation for low UV periods (< 2.0 UV index)
		if (slice.uvIndex < CALCULATION_CONSTANTS.MEANINGFUL_UV_THRESHOLD) {
			const point: CalculationPoint = {
				slice,
				burnCost: 0, // No meaningful damage at low UV
				totalDamageAtStart: totalDamage,
			};
			points.push(point);
			pointCount++;
			// After the first processed slice (even if low UV), subsequent slices are full-length
			isFirstSlice = false;
			continue;
		}

		// Prorate first partial slice if starting mid-slice
		// effectiveSliceMinutes = actual time spent in this slice (may be less than full slice for first slice)
		const effectiveSliceMinutes = isFirstSlice
			? clamp(
					(slice.datetime.getTime() - input.currentTime.getTime()) / 60000,
					0,
					sliceMinutes,
				)
			: sliceMinutes;

		const hoursElapsed =
			(slice.datetime.getTime() - input.currentTime.getTime()) /
			(1000 * 60 * 60);
		const spfConfig = SPF_CONFIG[input.spfLevel] || SPF_CONFIG[SPFLevel.NONE];
		const spfAtTime = calculateSPFAtTime(
			spfConfig.coefficient,
			input.sweatLevel,
			hoursElapsed,
		);

		const skinCoeff = SKIN_TYPE_CONFIG[input.skinType].coefficient;
		const damagePercent = calculateBurnTime(
			slice.uvIndex,
			skinCoeff,
			spfAtTime,
			effectiveSliceMinutes,
		);

		// Skip slices with zero or negligible damage to prevent division by zero
		if (damagePercent <= CALCULATION_CONSTANTS.FLOAT_TOLERANCE) {
			const point: CalculationPoint = {
				slice,
				burnCost: 0,
				totalDamageAtStart: totalDamage,
			};
			points.push(point);
			pointCount++;
			isFirstSlice = false;
			continue;
		}

		// Check if damage threshold would be reached during this slice
		const damageBeforeSlice = totalDamage;
		const damageAfterSlice = totalDamage + damagePercent;

		if (
			crossesThreshold(
				damageBeforeSlice,
				damageAfterSlice,
				CALCULATION_CONSTANTS.DAMAGE_THRESHOLD,
				CALCULATION_CONSTANTS.THRESHOLD_TOLERANCE,
			)
		) {
			// Interpolate the exact time when threshold is reached within this slice
			// TODO: Extract this interpolation logic into a separate function for clarity
			const damageNeeded =
				CALCULATION_CONSTANTS.DAMAGE_THRESHOLD - damageBeforeSlice;
			const sliceDamageRatio = Math.min(damageNeeded / damagePercent, 1.0); // Fraction of slice when threshold reached
			const sliceDurationMs = effectiveSliceMinutes * 60 * 1000;
			const burnTimeOffsetMs = sliceDurationMs * sliceDamageRatio;

			// burnTime = slice start + (fraction of slice duration)
			burnTime = new Date(
				slice.datetime.getTime() - sliceDurationMs + burnTimeOffsetMs,
			);

			// Add a point at the interpolated burn time
			const interpolatedPoint: CalculationPoint = {
				slice: {
					...slice,
					datetime: burnTime,
				},
				burnCost: damageNeeded,
				totalDamageAtStart: damageBeforeSlice,
			};
			points.push(interpolatedPoint);
			totalDamage = CALCULATION_CONSTANTS.DAMAGE_THRESHOLD;
			pointCount++;
			break;
		}

		const point: CalculationPoint = {
			slice,
			burnCost: damagePercent,
			totalDamageAtStart: totalDamage,
		};

		points.push(point);
		totalDamage += damagePercent;
		pointCount++;
		isFirstSlice = false;

		if (shouldStopCalculation(slice.datetime, pointCount)) {
			break;
		}
	}

	return {
		startTime: input.currentTime,
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
    const sliceOptions = TIME_SLICE_OPTIONS; // 2, 5, 10, 15 minute intervals

    // Prefer the highest resolution that both fits within the point cap
    // and finds a burn time. If a configuration fits within the cap but
    // doesn't find a burn time (likely due to truncation), keep searching
    // with coarser slicing to cover a longer real-time window.
    let fallback: CalculationResult | undefined;

    for (const slicesPerHour of sliceOptions) {
        const result = calculateBurnTimeWithSlices(input, slicesPerHour);

        // Always remember the first result within the cap as a fallback
        if (
            result.points.length <= CALCULATION_CONSTANTS.MAX_CALCULATION_POINTS &&
            !fallback
        ) {
            fallback = result;
        }

        // If within cap AND we found a burn time, return immediately
        if (
            result.points.length <= CALCULATION_CONSTANTS.MAX_CALCULATION_POINTS &&
            result.burnTime
        ) {
            return result;
        }
        // Otherwise, try a coarser slicing option to extend the time horizon
    }

    // If none of the options produced a burn time within the cap,
    // return the best available within-cap result (may indicate "unlikely").
    if (fallback) return fallback;

    // As a last resort, compute with the coarsest option.
    return calculateBurnTimeWithSlices(input, sliceOptions[sliceOptions.length - 1]);
}
