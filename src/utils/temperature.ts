import type { TemperatureUnit } from "../types";

const FAHRENHEIT_WEATHER_COUNTRY_CODES = new Set([
	"BS",
	"BZ",
	"KY",
	"PR",
	"PW",
	"US",
]);

export function getTemperatureUnitForCountry(
	countryCode?: string,
): TemperatureUnit {
	if (!countryCode) return "celsius";

	return FAHRENHEIT_WEATHER_COUNTRY_CODES.has(countryCode.toUpperCase())
		? "fahrenheit"
		: "celsius";
}

function getTemperatureUnitLabel(unit: TemperatureUnit): "F" | "C" {
	return unit === "fahrenheit" ? "F" : "C";
}

export function formatTemperature(
	temperature: number,
	unit: TemperatureUnit,
): string {
	return `${Math.round(temperature)}°${getTemperatureUnitLabel(unit)}`;
}
