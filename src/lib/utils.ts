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
