import type { LucideIcon } from "lucide-react";
import {
	Cloud,
	CloudDrizzle,
	CloudFog,
	CloudHail,
	CloudLightning,
	CloudRain,
	CloudSnow,
	CloudSun,
	Sun,
	Tornado,
	Wind,
} from "lucide-react";

interface WeatherIconDetails {
	Icon: LucideIcon;
	className: string;
}

export function getWeatherIconDetails(
	weatherCode?: number,
): WeatherIconDetails {
	if (weatherCode === 0) {
		return { Icon: Sun, className: "text-sun" };
	}

	if (weatherCode === 1 || weatherCode === 2) {
		return { Icon: CloudSun, className: "text-sun" };
	}

	if (weatherCode === 3) {
		return { Icon: Cloud, className: "text-slate-500" };
	}

	if (
		weatherCode === 13 ||
		weatherCode === 17 ||
		weatherCode === 29 ||
		(weatherCode !== undefined && weatherCode >= 95 && weatherCode <= 99)
	) {
		return { Icon: CloudLightning, className: "text-violet-600" };
	}

	if (weatherCode === 18) {
		return { Icon: Wind, className: "text-slate-500" };
	}

	if (weatherCode === 19) {
		return { Icon: Tornado, className: "text-slate-700" };
	}

	if (
		(weatherCode !== undefined && weatherCode >= 10 && weatherCode <= 12) ||
		(weatherCode !== undefined && weatherCode >= 28 && weatherCode <= 29) ||
		(weatherCode !== undefined && weatherCode >= 40 && weatherCode <= 49)
	) {
		return { Icon: CloudFog, className: "text-slate-500" };
	}

	if (
		(weatherCode !== undefined && weatherCode >= 20 && weatherCode <= 21) ||
		(weatherCode !== undefined && weatherCode >= 24 && weatherCode <= 25) ||
		(weatherCode !== undefined && weatherCode >= 50 && weatherCode <= 59)
	) {
		return { Icon: CloudDrizzle, className: "text-sky-600" };
	}

	if (
		(weatherCode !== undefined && weatherCode >= 60 && weatherCode <= 67) ||
		(weatherCode !== undefined && weatherCode >= 80 && weatherCode <= 82) ||
		(weatherCode !== undefined && weatherCode >= 91 && weatherCode <= 92) ||
		weatherCode === 94
	) {
		return { Icon: CloudRain, className: "text-sky-700" };
	}

	if (
		(weatherCode !== undefined && weatherCode >= 22 && weatherCode <= 23) ||
		(weatherCode !== undefined && weatherCode >= 36 && weatherCode <= 39) ||
		(weatherCode !== undefined && weatherCode >= 68 && weatherCode <= 78) ||
		(weatherCode !== undefined && weatherCode >= 83 && weatherCode <= 86) ||
		weatherCode === 93
	) {
		return { Icon: CloudSnow, className: "text-cyan-700" };
	}

	if (
		weatherCode === 27 ||
		weatherCode === 79 ||
		(weatherCode !== undefined && weatherCode >= 87 && weatherCode <= 90)
	) {
		return { Icon: CloudHail, className: "text-cyan-800" };
	}

	if (weatherCode !== undefined && weatherCode >= 4 && weatherCode <= 9) {
		return { Icon: Wind, className: "text-stone-500" };
	}

	return { Icon: Cloud, className: "text-primary" };
}
