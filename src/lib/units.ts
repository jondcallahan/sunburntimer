import { UnitSystem, type UnitSystem as UnitSystemType } from "../types";

export function formatTemperature(
	fahrenheit: number,
	unitSystem: UnitSystemType,
): string {
	if (unitSystem === UnitSystem.METRIC) {
		const celsius = ((fahrenheit - 32) * 5) / 9;
		return `${Math.round(celsius)}°C`;
	}

	return `${Math.round(fahrenheit)}°F`;
}

export function formatElevation(
	meters: number,
	unitSystem: UnitSystemType,
): string {
	if (unitSystem === UnitSystem.IMPERIAL) {
		const feet = Math.round(meters * 3.28084);
		return `${feet.toLocaleString()} ft`;
	}

	return `${Math.round(meters).toLocaleString()} m`;
}

export function getDistanceLabel(unitSystem: UnitSystemType): string {
	return unitSystem === UnitSystem.METRIC ? "km" : "mi";
}
