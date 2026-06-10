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

interface WeatherIconRule {
	match: (weatherCode: number) => boolean;
	Icon: LucideIcon;
	className: string;
}

const inRange = (code: number, min: number, max: number) =>
	code >= min && code <= max;

const WEATHER_ICON_RULES: WeatherIconRule[] = [
	{ match: (code) => code === 0, Icon: Sun, className: "text-sun" },
	{
		match: (code) => code === 1 || code === 2,
		Icon: CloudSun,
		className: "text-sun",
	},
	{ match: (code) => code === 3, Icon: Cloud, className: "text-slate-500" },
	{
		match: (code) =>
			code === 13 || code === 17 || code === 29 || inRange(code, 95, 99),
		Icon: CloudLightning,
		className: "text-violet-600",
	},
	{ match: (code) => code === 18, Icon: Wind, className: "text-slate-500" },
	{ match: (code) => code === 19, Icon: Tornado, className: "text-slate-700" },
	{
		match: (code) =>
			inRange(code, 10, 12) || code === 28 || inRange(code, 40, 49),
		Icon: CloudFog,
		className: "text-slate-500",
	},
	{
		match: (code) =>
			inRange(code, 20, 21) || inRange(code, 24, 25) || inRange(code, 50, 59),
		Icon: CloudDrizzle,
		className: "text-sky-600",
	},
	{
		match: (code) =>
			inRange(code, 60, 67) ||
			inRange(code, 80, 82) ||
			inRange(code, 91, 92) ||
			code === 94,
		Icon: CloudRain,
		className: "text-sky-700",
	},
	{
		match: (code) =>
			inRange(code, 22, 23) ||
			inRange(code, 36, 39) ||
			inRange(code, 68, 78) ||
			inRange(code, 83, 86) ||
			code === 93,
		Icon: CloudSnow,
		className: "text-cyan-700",
	},
	{
		match: (code) => code === 27 || code === 79 || inRange(code, 87, 90),
		Icon: CloudHail,
		className: "text-cyan-800",
	},
	{
		match: (code) => inRange(code, 4, 9),
		Icon: Wind,
		className: "text-stone-500",
	},
];

const DEFAULT_WEATHER_ICON: WeatherIconDetails = {
	Icon: Cloud,
	className: "text-primary",
};

export function getWeatherIconDetails(
	weatherCode?: number,
): WeatherIconDetails {
	if (!Number.isFinite(weatherCode)) {
		return DEFAULT_WEATHER_ICON;
	}

	const code = Math.trunc(weatherCode as number);
	const rule = WEATHER_ICON_RULES.find((entry) => entry.match(code));

	return rule
		? { Icon: rule.Icon, className: rule.className }
		: DEFAULT_WEATHER_ICON;
}
