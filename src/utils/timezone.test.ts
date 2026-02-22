import { describe, it, expect } from "bun:test";
import {
	formatInTimeZone,
	getHoursInTimezone,
	getFractionalHoursInTimezone,
} from "./timezone";

describe("Timezone Utilities", () => {
	// A known UTC instant: 2026-06-15T18:30:00Z
	const utcDate = new Date("2026-06-15T18:30:00Z");

	describe("getHoursInTimezone", () => {
		it("should return correct hour for UTC", () => {
			expect(getHoursInTimezone(utcDate, "UTC")).toBe(18);
		});

		it("should return correct hour for America/Denver (UTC-6 in summer)", () => {
			expect(getHoursInTimezone(utcDate, "America/Denver")).toBe(12);
		});

		it("should return correct hour for Asia/Tokyo (UTC+9)", () => {
			expect(getHoursInTimezone(utcDate, "Asia/Tokyo")).toBe(3); // next day 3 AM
		});

		it("should handle midnight correctly", () => {
			const midnight = new Date("2026-06-15T06:00:00Z"); // midnight in Denver (UTC-6)
			expect(getHoursInTimezone(midnight, "America/Denver")).toBe(0);
		});
	});

	describe("getFractionalHoursInTimezone", () => {
		it("should return fractional hours", () => {
			// 18:30 UTC = 12:30 Denver
			const result = getFractionalHoursInTimezone(utcDate, "America/Denver");
			expect(result).toBe(12.5);
		});

		it("should return whole hours when minutes are 0", () => {
			const wholeHour = new Date("2026-06-15T18:00:00Z");
			const result = getFractionalHoursInTimezone(wholeHour, "UTC");
			expect(result).toBe(18);
		});
	});

	describe("formatInTimeZone", () => {
		it("should format time in the given timezone", () => {
			// 18:30 UTC = 12:30 PM Denver
			const result = formatInTimeZone(utcDate, "America/Denver", "h:mm a");
			expect(result).toBe("12:30 PM");
		});

		it("should format morning time correctly", () => {
			const morning = new Date("2026-06-15T14:15:00Z"); // 8:15 AM Denver
			const result = formatInTimeZone(morning, "America/Denver", "h:mm a");
			expect(result).toBe("8:15 AM");
		});

		it("should handle different timezones for the same instant", () => {
			const utcResult = formatInTimeZone(utcDate, "UTC", "h:mm a");
			const tokyoResult = formatInTimeZone(utcDate, "Asia/Tokyo", "h:mm a");
			expect(utcResult).toBe("6:30 PM");
			expect(tokyoResult).toBe("3:30 AM");
		});
	});
});
