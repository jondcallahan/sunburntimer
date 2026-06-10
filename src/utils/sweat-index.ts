import type { TemperatureUnit } from "../types";

export const SWEAT_INDEX_BANDS = [
	{
		min: 160,
		rangeLabel: "160+",
		label: "Oppressive",
		description: "Extremely hot and humid",
		badgeClassName: "bg-red-100 text-red-800 border-red-200",
		textClassName: "text-red-700",
	},
	{
		min: 150,
		rangeLabel: "150-159",
		label: "Very muggy",
		description: "Very hot and sticky",
		badgeClassName: "bg-orange-100 text-orange-800 border-orange-200",
		textClassName: "text-orange-700",
	},
	{
		min: 140,
		rangeLabel: "140-149",
		label: "Muggy",
		description: "Hot and humid",
		badgeClassName: "bg-amber-100 text-amber-800 border-amber-200",
		textClassName: "text-amber-700",
	},
	{
		min: 130,
		rangeLabel: "130-139",
		label: "Warm",
		description: "Warm and slightly humid",
		badgeClassName: "bg-yellow-100 text-yellow-800 border-yellow-200",
		textClassName: "text-yellow-700",
	},
	{
		min: Number.NEGATIVE_INFINITY,
		rangeLabel: "<130",
		label: "Comfortable",
		description: "Pleasant to be outside",
		badgeClassName: "bg-emerald-100 text-emerald-800 border-emerald-200",
		textClassName: "text-emerald-700",
	},
] as const;

export type SweatIndexBand = (typeof SWEAT_INDEX_BANDS)[number];

export interface SweatIndexDetails {
	value: number;
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
	const band =
		SWEAT_INDEX_BANDS.find((entry) => value >= entry.min) ??
		SWEAT_INDEX_BANDS[SWEAT_INDEX_BANDS.length - 1];

	return {
		value,
		label: band.label,
		description: band.description,
		badgeClassName: band.badgeClassName,
		textClassName: band.textClassName,
	};
}
