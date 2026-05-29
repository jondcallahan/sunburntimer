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
	const startTime = new Date("2026-05-26T10:00:00");

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
			time: uvIndex.map((_, index) => {
				const time = new Date(startTime);
				time.setHours(startTime.getHours() + index);
				return time.toISOString().slice(0, 16);
			}),
			temperature_2m: uvIndex.map((_, index) => 75 + index * 2),
			uv_index: uvIndex,
			weather_code: uvIndex.map((_, index) => (index % 2 === 0 ? 3 : 2)),
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
	});
}

function getFetchUrl(input: Parameters<typeof fetch>[0]): string {
	if (typeof input === "string") return input;
	if (input instanceof URL) return input.toString();

	return input.url;
}

describe("fetchWeatherData", () => {
	it("requests Celsius weather for locations outside Fahrenheit weather regions", async () => {
		let forecastUrl = "";
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("air-quality")) {
				return jsonResponse({ current: { us_aqi: 42 } });
			}

			forecastUrl = getFetchUrl(input);
			return jsonResponse(createForecastResponse([0.8, 4.5, 6.2], 0.8));
		};

		const weather = await fetchWeatherData(
			{ latitude: 48.8566, longitude: 2.3522 },
			"FR",
		);

		expect(new URL(forecastUrl).searchParams.get("temperature_unit")).toBe(
			"celsius",
		);
		expect(weather.temperatureUnit).toBe("celsius");
	});

	it("requests Fahrenheit weather for locations in Fahrenheit weather regions", async () => {
		let forecastUrl = "";
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("air-quality")) {
				return jsonResponse({ current: { us_aqi: 42 } });
			}

			forecastUrl = getFetchUrl(input);
			return jsonResponse(createForecastResponse([0.8, 4.5, 6.2], 0.8));
		};

		const weather = await fetchWeatherData(
			{ latitude: 30.2672, longitude: -97.7431 },
			"US",
		);

		expect(new URL(forecastUrl).searchParams.get("temperature_unit")).toBe(
			"fahrenheit",
		);
		expect(weather.temperatureUnit).toBe("fahrenheit");
	});

	it("throws a recoverable error when Open-Meteo returns no usable UV forecast", async () => {
		globalThis.fetch = async () =>
			jsonResponse(createForecastResponse([null, null, null]));

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("UV forecast is currently unavailable");
	});

	it("uses the contiguous hourly UV forecast when later hours are unavailable", async () => {
		globalThis.fetch = async (input) => {
			if (getFetchUrl(input).includes("air-quality")) {
				return jsonResponse({ current: { us_aqi: 42 } });
			}

			return jsonResponse(createForecastResponse([0.8, 4.5, null], 0.8));
		};

		const weather = await fetchWeatherData({
			latitude: 51.5,
			longitude: -0.25,
		});

		expect(weather.hourly.map((hour) => hour.uvi)).toEqual([0.8, 4.5]);
	});

	it("throws a recoverable error when fewer than two hourly UV values are available", async () => {
		globalThis.fetch = async () =>
			jsonResponse(createForecastResponse([0.8, null, null], 0.8));

		await expect(
			fetchWeatherData({ latitude: 51.5, longitude: -0.25 }),
		).rejects.toThrow("UV forecast is currently unavailable");
	});

	it("throws a recoverable error when hourly UV values are unavailable", async () => {
		globalThis.fetch = async () =>
			jsonResponse(createForecastResponse([null, null, null], 0.8));

		await expect(
			fetchWeatherData({ latitude: 30.2672, longitude: -97.7431 }),
		).rejects.toThrow("UV forecast is currently unavailable");
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
