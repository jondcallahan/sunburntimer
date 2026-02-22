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
