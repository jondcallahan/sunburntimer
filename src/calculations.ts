import type {
  CalculationInput,
  CalculationResult,
  CalculationPoint,
  TimeSlice,
  HourlyWeather
} from './types';
import {
  SweatLevel,
  CALCULATION_CONSTANTS,
  SKIN_TYPE_CONFIG,
  SPF_CONFIG,
  SWEAT_CONFIG,
  TIME_CONSTANTS,
  SPF_CONSTANTS,
  TIME_SLICE_OPTIONS
} from './types';

// Core sunburn calculation formula
function calculateBurnTime(
  uvIndex: number,
  skinTypeCoeff: number,
  spfCoeff: number,
  sliceMinutes: number
): number {
  const safeUV = Math.max(CALCULATION_CONSTANTS.MIN_UV_THRESHOLD, uvIndex * CALCULATION_CONSTANTS.UV_SCALING_FACTOR);
  const timeForFullBurn = CALCULATION_CONSTANTS.BASE_DAMAGE_TIME * skinTypeCoeff / safeUV * spfCoeff;
  const damagePercentage = sliceMinutes * TIME_CONSTANTS.PERCENTAGE_BASE / timeForFullBurn;
  
  return damagePercentage;
}

// UV interpolation (FIXED - uses proper float division)
function interpolateUV(
  startUV: number,
  endUV: number,
  sliceIndex: number,
  totalSlices: number
): number {
  const gradient = sliceIndex / totalSlices; // Fixed: proper float division
  return startUV * (SPF_CONSTANTS.BASE_COEFFICIENT - gradient) + endUV * gradient;
}

// Create time slices with UV interpolation
function createTimeSlices(
  hourlyWeather: HourlyWeather[],
  startTime: Date,
  slicesPerHour: number
): TimeSlice[] {
  const slices: TimeSlice[] = [];
  const sliceMinutes = TIME_CONSTANTS.MINUTES_PER_HOUR / slicesPerHour;

  for (let i = 0; i < hourlyWeather.length - 1; i++) {
    const currentHour = hourlyWeather[i];
    const nextHour = hourlyWeather[i + 1];

    for (let j = 0; j < slicesPerHour; j++) {
      const sliceTime = new Date(currentHour.dt * TIME_CONSTANTS.MILLISECONDS_PER_SECOND + j * sliceMinutes * TIME_CONSTANTS.SECONDS_PER_MINUTE * TIME_CONSTANTS.MILLISECONDS_PER_SECOND);

      if (sliceTime >= startTime) {
        const interpolatedUV = interpolateUV(
          currentHour.uvi,
          nextHour.uvi,
          j,
          slicesPerHour
        );

        slices.push({
          datetime: sliceTime,
          uvIndex: interpolatedUV
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
  timeElapsed: number // hours since application
): number {
  if (sweatLevel === SweatLevel.LOW || baseSPF === SPF_CONSTANTS.BASE_COEFFICIENT) {
    return baseSPF;
  }

  const config = SWEAT_CONFIG[sweatLevel];

  if (timeElapsed <= config.startHours) {
    return baseSPF;
  }

  if (timeElapsed >= config.startHours + config.durationHours) {
    return SPF_CONSTANTS.MIN_PROTECTION_FACTOR;
  }

  const degradationProgress = (timeElapsed - config.startHours) / config.durationHours;
  const remainingProtection = baseSPF * (1.0 - degradationProgress);

  return Math.max(SPF_CONSTANTS.MIN_PROTECTION_FACTOR, remainingProtection);
}

// Check stopping conditions
function shouldStopCalculation(
  totalDamage: number,
  currentTime: Date,
  pointCount: number
): boolean {
  if (totalDamage >= CALCULATION_CONSTANTS.DAMAGE_THRESHOLD) {
    return true;
  }

  const hour = currentTime.getHours();
  if (pointCount > CALCULATION_CONSTANTS.MIN_POINTS_FOR_EVENING_STOP && hour >= CALCULATION_CONSTANTS.EVENING_CUTOFF_HOUR) {
    return true;
  }

  return false;
}

// Generate safety advice
function generateAdvice(input: CalculationInput, points: CalculationPoint[]): string[] {
  const advice: string[] = [];

  if (input.spfLevel !== 'NONE') {
    advice.push('Reapply sunscreen after swimming or excessive sweating');
  }

  const lastPoint = points[points.length - 1];
  if (!lastPoint) return advice;

  if (lastPoint.totalDamageAtStart < CALCULATION_CONSTANTS.SAFETY_THRESHOLD) {
    if (input.spfLevel === 'NONE') {
      return advice;
    } else {
      advice.push('With these precautions you can spend the rest of the day out in the sun, enjoy! ☀️');
    }
  } else {
    if (input.spfLevel === 'NONE') {
      advice.push('You should try again with sunscreen');
    } else if (input.spfLevel === 'SPF_100') {
      advice.push('Limit your time in the sun today');
    } else {
      advice.push('Try using a stronger sunscreen or limit your time in the sun today');
    }
  }

  return advice;
}

// Main calculation function
function calculateBurnTimeWithSlices(
  input: CalculationInput,
  slicesPerHour: number
): CalculationResult {
  const sliceMinutes = TIME_CONSTANTS.MINUTES_PER_HOUR / slicesPerHour;
  const timeSlices = createTimeSlices(input.weather.hourly, input.currentTime, slicesPerHour);

  const points: CalculationPoint[] = [];
  let totalDamage = 0;
  let pointCount = 0;

  for (const slice of timeSlices) {
    const hoursElapsed = (slice.datetime.getTime() - input.currentTime.getTime()) / TIME_CONSTANTS.MILLISECONDS_PER_HOUR;
    const spfAtTime = calculateSPFAtTime(
      SPF_CONFIG[input.spfLevel].coefficient,
      input.sweatLevel,
      hoursElapsed
    );

    const skinCoeff = SKIN_TYPE_CONFIG[input.skinType].coefficient;
    const damagePercent = calculateBurnTime(slice.uvIndex, skinCoeff, spfAtTime, sliceMinutes);

    const point: CalculationPoint = {
      slice,
      burnCost: damagePercent,
      totalDamageAtStart: totalDamage
    };

    points.push(point);
    totalDamage += damagePercent;
    pointCount++;

    if (shouldStopCalculation(totalDamage, slice.datetime, pointCount)) {
      break;
    }
  }

  return {
    startTime: timeSlices[0]?.datetime,
    burnTime: totalDamage >= CALCULATION_CONSTANTS.DAMAGE_THRESHOLD ? 
      points[points.length - 1]?.slice.datetime : undefined,
    points,
    timeSlices: slicesPerHour,
    advice: generateAdvice(input, points)
  };
}

// Find optimal time slicing
export function findOptimalTimeSlicing(input: CalculationInput): CalculationResult {
  const sliceOptions = TIME_SLICE_OPTIONS; // 2, 5, 10, 15 minute intervals

  for (const slicesPerHour of sliceOptions) {
    const result = calculateBurnTimeWithSlices(input, slicesPerHour);

    if (result.points.length <= CALCULATION_CONSTANTS.MAX_CALCULATION_POINTS) {
      return result;
    }
  }

  return calculateBurnTimeWithSlices(input, TIME_SLICE_OPTIONS[TIME_SLICE_OPTIONS.length - 1]); // Fallback to most detailed slicing
}