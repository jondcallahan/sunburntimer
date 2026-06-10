import type { TemperatureUnit } from "../types";

export type SweatIndexLevel =
  | "easy"
  | "warm"
  | "sweaty"
  | "verySweaty"
  | "oppressive";

interface SweatIndexDetails {
  value: number;
  level: SweatIndexLevel;
  label: string;
  description: string;
  badgeClassName: string;
  textClassName: string;
}

function toFahrenheit(temperature: number, unit: TemperatureUnit): number {
  return unit === "fahrenheit" ? temperature : (temperature * 9) / 5 + 32;
}

export function calculateSweatIndex(
  temperature: number,
  dewPoint: number,
  unit: TemperatureUnit,
): number {
  return Math.round(
    toFahrenheit(temperature, unit) + toFahrenheit(dewPoint, unit),
  );
}

export function getSweatIndexDetails(value: number): SweatIndexDetails {
  if (value >= 160) {
    return {
      value,
      level: "oppressive",
      label: "Oppressive",
      description: "Oppressive workout conditions",
      badgeClassName: "bg-red-100 text-red-800 border-red-200",
      textClassName: "text-red-700",
    };
  }

  if (value >= 150) {
    return {
      value,
      level: "verySweaty",
      label: "Very sweaty",
      description: "Very sweaty conditions",
      badgeClassName: "bg-orange-100 text-orange-800 border-orange-200",
      textClassName: "text-orange-700",
    };
  }

  if (value >= 140) {
    return {
      value,
      level: "sweaty",
      label: "Sweaty",
      description: "Sweaty workout conditions",
      badgeClassName: "bg-amber-100 text-amber-800 border-amber-200",
      textClassName: "text-amber-700",
    };
  }

  if (value >= 130) {
    return {
      value,
      level: "warm",
      label: "Warm",
      description: "Warm workout conditions",
      badgeClassName: "bg-yellow-100 text-yellow-800 border-yellow-200",
      textClassName: "text-yellow-700",
    };
  }

  return {
    value,
    level: "easy",
    label: "Easy",
    description: "Pleasant workout conditions",
    badgeClassName: "bg-emerald-100 text-emerald-800 border-emerald-200",
    textClassName: "text-emerald-700",
  };
}
