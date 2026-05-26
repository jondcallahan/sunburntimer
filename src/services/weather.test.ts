import { describe, expect, it } from "bun:test";
import { getWeatherProviderLabel, normalizeGoogleWeatherData } from "./weather";

describe("weather providers", () => {
	it("normalizes Google hourly weather into app weather data", () => {
		const weather = normalizeGoogleWeatherData(
			{
				timeZone: { id: "America/Denver" },
				forecastHours: [
					{
						interval: { startTime: "2026-06-15T15:00:00Z" },
						temperature: { degrees: 75 },
						uvIndex: 7,
						weatherCondition: {
							type: "CLEAR",
							description: { text: "Clear" },
						},
					},
					{
						interval: { startTime: "2026-06-15T16:00:00Z" },
						temperature: { degrees: 78 },
						uvIndex: 8,
					},
				],
			},
			{
				elevation: 1609,
				sunrise: "2026-06-15T05:30",
				sunset: "2026-06-15T20:31",
				nextSunrise: "2026-06-16T05:30",
				timezone: "America/Denver",
			},
		);

		expect(weather.provider).toBe("google");
		expect(weather.current.uvi).toBe(7);
		expect(weather.hourly).toHaveLength(2);
		expect(weather.hourly[1].temp).toBe(78);
		expect(weather.timezone).toBe("America/Denver");
	});

	it("labels weather providers for compact UI display", () => {
		expect(getWeatherProviderLabel("open-meteo")).toBe("Open-Meteo");
		expect(getWeatherProviderLabel("google")).toBe("Google");
		expect(getWeatherProviderLabel(undefined)).toBe("Open-Meteo");
	});
});
