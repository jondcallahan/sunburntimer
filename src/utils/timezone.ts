/**
 * Format a Date object in a specific IANA timezone.
 * Supports format tokens: h (12-hour), hh, mm, a/aa (AM/PM), H (24-hour), HH
 */
export function formatInTimeZone(
	date: Date,
	timezone: string,
	formatStr: string,
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

	return formatStr
		.replace("h:mm", `${hour12}:${minute}`)
		.replace("a", dayPeriod);
}

/**
 * Get hours (0-23) of a Date in a specific timezone.
 */
export function getHoursInTimezone(date: Date, timezone: string): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "numeric",
		hour12: false,
	}).formatToParts(date);
	const hour = parts.find((p) => p.type === "hour")?.value || "0";
	return Number.parseInt(hour, 10) % 24;
}

/**
 * Get fractional hours (e.g. 14.5 for 2:30 PM) of a Date in a specific timezone.
 */
export function getFractionalHoursInTimezone(
	date: Date,
	timezone: string,
): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		hour: "numeric",
		minute: "numeric",
		hour12: false,
	}).formatToParts(date);
	const hour =
		Number.parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10) %
		24;
	const minute = Number.parseInt(
		parts.find((p) => p.type === "minute")?.value || "0",
		10,
	);
	return hour + minute / 60;
}
