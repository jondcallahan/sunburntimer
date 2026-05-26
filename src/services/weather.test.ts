import { afterEach, describe, expect, it } from "bun:test";
import { fetchWeatherData } from "./weather";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function createForecastResponse(
	uvIndex: Array<number | null>,
	currentUvIndex: number | null = null,
) {
	return {
		elevation: 160,
		timezone: "America/Chicago",
		current: {
			time: "2026-05-26T10:45",
			temperature_2m: 75.9,
			uv_index: currentUvIndex,
			weather_code: 3,
		},
		hourly: {
			time: ["2026-05-26T10:00", "2026-05-26T11:00", "2026-05-26T12:00"],
			temperature_2m: [75, 77, 80],
			uv_index: uvIndex,
			weather_code: [3, 3, 2],
		},
		daily: {
			sunrise: ["2026-05-26T06:31", "2026-05-27T06:31"],
			sunset: ["2026-05-26T20:24", "2026-05-27T20:25"],
		},
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers: {
			"Content-Type": "application/json",
		},
	});
}

function getFetchUrl(input: Parameters<typeof fetch>[0]): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.toString();

	return input.url;
}

describe("fetchWeatherData", () => {
	it("falls back to Google weather when Open-Meteo returns no usable UV forecast", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("/api/google-weather")) {
				return jsonResponse({
					current: {
						dt: 1779810300,
						temp: 76,
						uvi: 3,
						weather: [
							{
								id: 800,
								main: "Sunny",
								description: "Sunny",
								icon: "",
							},
						],
					},
					hourly: [
						{
							dt: 1779810300,
							temp: 76,
							uvi: 3,
							weather: [
								{
									id: 800,
									main: "Sunny",
									description: "Sunny",
									icon: "",
								},
							],
						},
					],
					elevation: 160,
					sunrise: "2026-05-26T11:31:00.000Z",
					sunset: "2026-05-27T01:24:00.000Z",
					nextSunrise: "2026-05-27T11:31:00.000Z",
					timezone: "America/Chicago",
				});
			}

			return jsonResponse(createForecastResponse([null, null, null]));
		};

		const weather = await fetchWeatherData({
			latitude: 30.2672,
			longitude: -97.7431,
		});

		expect(weather.current.uvi).toBe(3);
		expect(weather.timezone).toBe("America/Chicago");
	});

	it("throws a recoverable error when Open-Meteo and Google weather are unavailable", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("/api/google-weather")) {
				return jsonResponse({ error: "Google weather unavailable" }, 502);
			}

			return jsonResponse(createForecastResponse([null, null, null]));
		};

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("Weather providers unavailable");
	});

	it("throws a recoverable error when the Google fallback returns non-JSON", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("/api/google-weather")) {
				return new Response("<html>not json</html>", {
					status: 200,
					headers: { "Content-Type": "text/html" },
				});
			}

			return jsonResponse(createForecastResponse([null, null, null]));
		};

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("Google weather fallback did not return JSON");
	});

	it("throws a recoverable error when Open-Meteo returns a partial UV forecast", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("/api/google-weather")) {
				return jsonResponse({ error: "Google weather unavailable" }, 502);
			}

			return jsonResponse(createForecastResponse([0.8, 4.5, null], 0.8));
		};

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("Weather providers unavailable");
	});

	it("throws a recoverable error when hourly UV values are unavailable", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("/api/google-weather")) {
				return jsonResponse({ error: "Google weather unavailable" }, 502);
			}

			return jsonResponse(createForecastResponse([null, null, null], 0.8));
		};

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("Weather providers unavailable");
	});

	it("returns weather when Open-Meteo returns a complete UV forecast", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("air-quality")) {
				return jsonResponse({ current: { us_aqi: 42 } });
			}

			return jsonResponse(createForecastResponse([0.8, 4.5, 6.2], 0.8));
		};

		const weather = await fetchWeatherData({
			latitude: 30.2672,
			longitude: -97.7431,
		});

		expect(weather.current.uvi).toBe(0.8);
		expect(weather.hourly.map((hour) => hour.uvi)).toEqual([0.8, 4.5, 6.2]);
		expect(weather.aqi?.us_aqi).toBe(42);
	});
});
