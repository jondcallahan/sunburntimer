import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getUVIndexColor(uvIndex: number): {
	bg: string;
	text: string;
	border: string;
} {
	if (uvIndex < 3) {
		return {
			bg: "bg-green-100",
			text: "text-green-800",
			border: "border-green-200",
		};
	}
	if (uvIndex < 6) {
		return {
			bg: "bg-yellow-100",
			text: "text-yellow-800",
			border: "border-yellow-200",
		};
	}
	if (uvIndex < 8) {
		return {
			bg: "bg-orange-100",
			text: "text-orange-800",
			border: "border-orange-200",
		};
	}
	if (uvIndex < 11) {
		return { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" };
	}
	return {
		bg: "bg-purple-100",
		text: "text-purple-800",
		border: "border-purple-200",
	};
}

export function getAQIColor(aqi: number): {
	bg: string;
	text: string;
	border: string;
} {
	if (aqi <= 50) {
		return {
			bg: "bg-green-100",
			text: "text-green-800",
			border: "border-green-200",
		};
	}
	if (aqi <= 100) {
		return {
			bg: "bg-yellow-100",
			text: "text-yellow-800",
			border: "border-yellow-200",
		};
	}
	if (aqi <= 150) {
		return {
			bg: "bg-orange-100",
			text: "text-orange-800",
			border: "border-orange-200",
		};
	}
	if (aqi <= 200) {
		return {
			bg: "bg-red-100",
			text: "text-red-800",
			border: "border-red-200",
		};
	}
	if (aqi <= 300) {
		return {
			bg: "bg-purple-100",
			text: "text-purple-800",
			border: "border-purple-200",
		};
	}
	return {
		bg: "bg-red-900",
		text: "text-red-100",
		border: "border-red-800",
	};
}

export function formatDuration(diffMs: number): string {
	const hours = Math.floor(diffMs / (1000 * 60 * 60));
	const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (hours === 0) {
		return `${minutes} minutes`;
	} else if (minutes === 0) {
		return `${hours} hour${hours > 1 ? "s" : ""}`;
	} else {
		return `${hours}h ${minutes}m`;
	}
}

/**
 * Environmental UV multipliers based on scientific research
 * Snow: 88% reflection, Sand: 15% reflection, Shade: 50% reduction
 */
export const ENVIRONMENTAL_MULTIPLIERS = {
	SNOW: 1.88,
	SAND: 1.15,
	SHADE: 0.5,
} as const;

export function calculateEnvironmentalTimes(startTime: Date, burnTime: Date) {
	const baseDiffMs = burnTime.getTime() - startTime.getTime();

	return {
		snow: formatDuration(baseDiffMs / ENVIRONMENTAL_MULTIPLIERS.SNOW),
		sand: formatDuration(baseDiffMs / ENVIRONMENTAL_MULTIPLIERS.SAND),
		shade: formatDuration(baseDiffMs / ENVIRONMENTAL_MULTIPLIERS.SHADE),
	};
}
