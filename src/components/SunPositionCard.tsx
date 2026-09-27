import { useId } from "react";
import { getDayOfYear } from "date-fns";
import { Sunrise, Sunset, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAppStore } from "../store";
import { formatInTimeZone, toTZDate } from "../utils/timezone";
import { useCurrentTime } from "../hooks/useCurrentTime";

function formatDuration(ms: number): string {
	const totalMins = Math.round(ms / (1000 * 60));
	const hours = Math.floor(totalMins / 60);
	const mins = totalMins % 60;
	if (hours === 0) {
		return `${mins}m`;
	}
	return `${hours}h ${mins}m`;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

// Sky gradient by fraction of daylight elapsed (first match wins)
const SKY_GRADIENTS = [
	[0.15, "from-rose-100 to-orange-100"], // dawn
	[0.35, "from-sky-100 to-amber-50"], // morning
	[0.65, "from-blue-50 to-sky-100"], // midday
	[0.85, "from-amber-50 to-orange-100"], // afternoon
	[Number.POSITIVE_INFINITY, "from-orange-100 to-purple-100"], // dusk
] as const;
const NIGHT_GRADIENT = "from-slate-800 to-indigo-900";

// SVG geometry: 1px of arc height per degree of peak solar elevation
const WIDTH = 280;
const HEIGHT = 100;
const HORIZON_Y = HEIGHT - 10;
const ARC_START_X = 25;
const ARC_END_X = WIDTH - 25;
const ARC_POINTS = 30;

function SunTime({
	icon: Icon,
	time,
	timezone,
}: {
	icon: LucideIcon;
	time: Date;
	timezone: string;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<Icon className="w-4 h-4 text-sun dark:text-sun-muted" />
			<span className="text-sm font-medium font-mono text-slate-700 dark:text-slate-200">
				{formatInTimeZone(time, timezone, "h:mm a")}
			</span>
		</div>
	);
}

export function SunPositionCard() {
	const { geolocation } = useAppStore();
	const now = useCurrentTime();
	const gradientId = useId();
	const glowId = useId();

	if (!geolocation.weather || !geolocation.position) {
		return null;
	}

	const { timezone } = geolocation.weather;
	const sunrise = new Date(geolocation.weather.sunrise);
	const sunset = new Date(geolocation.weather.sunset);
	const nextSunrise = geolocation.weather.nextSunrise
		? new Date(geolocation.weather.nextSunrise)
		: null;
	const daylightMs = sunset.getTime() - sunrise.getTime();

	const isDay = now >= sunrise && now <= sunset;
	// 0 = sunrise, 1 = sunset
	const progress = clamp(
		(now.getTime() - sunrise.getTime()) / daylightMs,
		0,
		1,
	);

	const countdownTarget = isDay
		? sunset
		: now < sunrise
			? sunrise
			: nextSunrise;

	// Peak solar elevation at solar noon: 90° - |latitude - declination|
	const dayOfYear = getDayOfYear(toTZDate(sunrise, timezone));
	const declination = -23.45 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);
	const maxElevation =
		90 - Math.abs(geolocation.position.latitude - declination);
	const peakHeight = clamp(maxElevation, 25, 75);

	// Solar elevation through the day roughly follows a sine curve
	const pointAt = (t: number) => ({
		x: ARC_START_X + t * (ARC_END_X - ARC_START_X),
		y: HORIZON_Y - peakHeight * Math.sin(Math.PI * t),
	});
	const arcPath = Array.from({ length: ARC_POINTS + 1 }, (_, i) => {
		const { x, y } = pointAt(i / ARC_POINTS);
		return `${x},${y}`;
	}).join(" ");
	const sun = pointAt(progress);

	const sky = isDay
		? SKY_GRADIENTS.find(([max]) => progress < max)?.[1]
		: NIGHT_GRADIENT;

	return (
		// `dark` flips the dark: variants below for the night sky
		<Card
			className={`bg-gradient-to-br ${sky} ${isDay ? "" : "dark"} border-stone-200 shadow-sm overflow-hidden transition-colors duration-1000`}
		>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-start justify-between text-slate-800 dark:text-slate-100">
					<span className="text-base font-semibold">Sun Position</span>
					<div className="flex flex-col items-end gap-0.5">
						{countdownTarget && (
							<span className="text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300">
								{isDay ? "Sunset" : "Sunrise"} in{" "}
								{formatDuration(countdownTarget.getTime() - now.getTime())}
							</span>
						)}
						<span className="text-xs font-normal tabular-nums text-slate-500 dark:text-slate-400">
							{formatDuration(daylightMs)} of daylight
						</span>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="flex justify-center">
					<svg
						width={WIDTH}
						height={HEIGHT}
						viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
						className="overflow-visible"
						role="img"
						aria-labelledby={`${gradientId}-title`}
					>
						<title id={`${gradientId}-title`}>
							Sun position visualization showing daylight hours
						</title>
						<defs>
							<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#fbbf24" />
								<stop offset="50%" stopColor="#f59e0b" />
								<stop offset="100%" stopColor="#ea580c" />
							</linearGradient>
							<radialGradient id={glowId} cx="50%" cy="50%" r="50%">
								<stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
								<stop offset="70%" stopColor="#f59e0b" stopOpacity="0.6" />
								<stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
							</radialGradient>
						</defs>

						<line
							x1="10"
							y1={HORIZON_Y}
							x2={WIDTH - 10}
							y2={HORIZON_Y}
							className="stroke-gray-300 dark:stroke-slate-600"
							strokeWidth="1"
							strokeDasharray="4 2"
						/>

						<polyline
							points={arcPath}
							fill="none"
							stroke={`url(#${gradientId})`}
							strokeWidth="4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>

						{isDay && (
							<g
								className="sun-entrance"
								style={{ transformOrigin: `${sun.x}px ${sun.y}px` }}
							>
								<circle cx={sun.x} cy={sun.y} r="18" fill={`url(#${glowId})`} />
								<circle
									cx={sun.x}
									cy={sun.y}
									r="10"
									fill="#fbbf24"
									stroke="#f59e0b"
									strokeWidth="2"
									className="sun-pulse"
								/>
							</g>
						)}
					</svg>
				</div>

				<div className="flex justify-between items-center mt-2 px-2">
					<SunTime icon={Sunrise} time={sunrise} timezone={timezone} />
					<span className="text-xs tabular-nums text-slate-500 dark:text-slate-300">
						{isDay
							? `${Math.round(progress * 100)}% through the day`
							: `Now ${formatInTimeZone(now, timezone, "h:mm a")} · Night`}
					</span>
					<SunTime icon={Sunset} time={sunset} timezone={timezone} />
				</div>
			</CardContent>
		</Card>
	);
}
