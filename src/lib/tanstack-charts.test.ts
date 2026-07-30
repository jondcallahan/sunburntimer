import { describe, expect, test } from "bun:test";
import { getDateDomain } from "./tanstack-charts";

describe("getDateDomain", () => {
	test("uses a one-hour fallback for empty data", () => {
		const fallback = new Date("2026-07-30T12:00:00Z");

		expect(getDateDomain([], fallback)).toEqual([
			fallback,
			new Date("2026-07-30T13:00:00Z"),
		]);
	});

	test("pads a single timestamp by thirty minutes on each side", () => {
		const timestamp = new Date("2026-07-30T12:00:00Z");

		expect(getDateDomain([timestamp], timestamp)).toEqual([
			new Date("2026-07-30T11:30:00Z"),
			new Date("2026-07-30T12:30:00Z"),
		]);
	});

	test("finds the extent of unsorted timestamps", () => {
		const earliest = new Date("2026-07-30T09:00:00Z");
		const latest = new Date("2026-07-30T15:00:00Z");

		expect(
			getDateDomain(
				[latest, new Date("2026-07-30T12:00:00Z"), earliest],
				earliest,
			),
		).toEqual([earliest, latest]);
	});
});
