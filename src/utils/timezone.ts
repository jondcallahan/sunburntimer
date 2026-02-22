import { TZDate } from "@date-fns/tz";

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
 * Format a Date object in a specific IANA timezone using Intl.DateTimeFormat.
 * Supports format tokens: "h:mm a" (e.g. "2:30 PM")
 */
export function formatInTimeZone(
	date: Date,
	timezone: string,
	_formatStr: string,
): string {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).formatToParts(date);

	const hour12 = parts.find((p) => p.type === "hour")?.value || "12";
	const minute = parts.find((p) => p.type === "minute")?.value || "00";
	const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "AM";

	return `${hour12}:${minute} ${dayPeriod}`;
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
