import { afterEach, describe, expect, it } from "bun:test";
import handler from "./google-weather";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GOOGLE_MAPS_API_KEY;

afterEach(() => {
	globalThis.fetch = originalFetch;
	if (originalApiKey === undefined) {
		delete process.env.GOOGLE_MAPS_API_KEY;
	} else {
		process.env.GOOGLE_MAPS_API_KEY = originalApiKey;
	}
});

function createRequest(path: string): Request {
	return new Request(`https://sunburntimer.test${path}`);
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

describe("/api/google-weather", () => {
	it("rejects invalid coordinates", async () => {
		process.env.GOOGLE_MAPS_API_KEY = "test-key";

		const response = await handler(
			createRequest("/api/google-weather?latitude=500&longitude=-97"),
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Valid latitude and longitude are required",
		});
	});

	it("normalizes Google weather responses to WeatherData", async () => {
		process.env.GOOGLE_MAPS_API_KEY = "test-key";
		globalThis.fetch = async (input) => {
			const url = getFetchUrl(input);

			if (url.includes("forecast/hours")) {
				return jsonResponse({
					forecastHours: [
						{
							interval: { startTime: "2026-05-26T16:00:00Z" },
							temperature: { degrees: 76.4 },
							uvIndex: 4,
							weatherCondition: {
								iconBaseUri: "https://maps.gstatic.com/weather/v1/sunny",
								type: "CLEAR",
								description: { text: "Sunny" },
							},
						},
						{
							interval: { startTime: "2026-05-26T17:00:00Z" },
							temperature: { degrees: 78.1 },
							uvIndex: 5,
							weatherCondition: {
								type: "PARTLY_CLOUDY",
								description: { text: "Partly cloudy" },
							},
						},
					],
					timeZone: { id: "America/Chicago" },
				});
			}

			if (url.includes("forecast/days")) {
				return jsonResponse({
					forecastDays: [
						{
							sunEvents: {
								sunriseTime: "2026-05-26T11:31:00Z",
								sunsetTime: "2026-05-27T01:24:00Z",
							},
						},
						{
							sunEvents: {
								sunriseTime: "2026-05-27T11:31:00Z",
								sunsetTime: "2026-05-28T01:25:00Z",
							},
						},
					],
					timeZone: { id: "America/Chicago" },
				});
			}

			return jsonResponse({
				results: [{ elevation: 160.3 }],
				status: "OK",
			});
		};

		const response = await handler(
			createRequest("/api/google-weather?latitude=30.2672&longitude=-97.7431"),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("X-Weather-Provider")).toBe("google");
		expect(body.current.uvi).toBe(4);
		expect(body.hourly.map((hour: { uvi: number }) => hour.uvi)).toEqual([
			4, 5,
		]);
		expect(body.elevation).toBe(160.3);
		expect(body.sunrise).toBe("2026-05-26T11:31:00Z");
		expect(body.timezone).toBe("America/Chicago");
	});
});
