import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

/**
 * Convert a Date to a TZDate in the given timezone.
 * TZDate is a Date subclass where .getHours(), .setHours(), format(), etc.
 * all operate in the target timezone. Chart.js and date-fns work with it natively.
 */
export function toTZDate(date: Date, timezone?: string): Date {
	if (!timezone) return date;
	return new TZDate(date.getTime(), timezone);
}

/**
 * Format a Date in a specific IANA timezone using any date-fns format string.
 */
export function formatInTimeZone(
	date: Date,
	timezone: string,
	formatStr: string,
): string {
	return format(toTZDate(date, timezone), formatStr);
}

/**
 * Get hours (0-23) of a Date in a specific timezone.
 */
export function getHoursInTimezone(date: Date, timezone: string): number {
	return toTZDate(date, timezone).getHours();
}

/**
 * Get fractional hours (e.g. 14.5 for 2:30 PM) of a Date in a specific timezone.
 */
export function getFractionalHoursInTimezone(
	date: Date,
	timezone: string,
): number {
	const tzDate = toTZDate(date, timezone);
	return tzDate.getHours() + tzDate.getMinutes() / 60;
}

function padDatePart(value: number): string {
	return value.toString().padStart(2, "0");
}

/**
 * Format a Date for an input[type="datetime-local"] in the selected place's timezone.
 */
export function formatDateTimeLocal(date: Date, timezone?: string): string {
	const displayDate = toTZDate(date, timezone);
	const year = displayDate.getFullYear();
	const month = padDatePart(displayDate.getMonth() + 1);
	const day = padDatePart(displayDate.getDate());
	const hours = padDatePart(displayDate.getHours());
	const minutes = padDatePart(displayDate.getMinutes());

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse a datetime-local value as local wall time in the selected place.
 */
export function parseDateTimeLocal(
	value: string,
	timezone?: string,
): Date | null {
	const [datePart, timePart] = value.split("T");
	if (!datePart || !timePart) return null;

	const [year, month, day] = datePart.split("-").map(Number);
	const [hours, minutes] = timePart.split(":").map(Number);
	const hasValidParts = [year, month, day, hours, minutes].every(
		Number.isFinite,
	);

	if (!hasValidParts) return null;

	if (timezone) {
		return new TZDate(year, month - 1, day, hours, minutes, 0, timezone);
	}

	return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Get the local calendar-day bounds for a Date in the selected place.
 */
export function getDayBoundsInTimeZone(
	date: Date,
	timezone?: string,
): { start: Date; end: Date } {
	const displayDate = toTZDate(date, timezone);
	const year = displayDate.getFullYear();
	const month = displayDate.getMonth();
	const day = displayDate.getDate();

	if (timezone) {
		return {
			start: new TZDate(year, month, day, 0, 0, 0, timezone),
			end: new TZDate(year, month, day, 23, 59, 59, timezone),
		};
	}

	return {
		start: new Date(year, month, day, 0, 0, 0),
		end: new Date(year, month, day, 23, 59, 59),
	};
}
