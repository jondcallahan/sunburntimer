import { useMemo, useState, useEffect, useId } from "react";
import { Sunrise, Sunset, Play, Pause } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useAppStore } from "../store";
import { format } from "date-fns";
import { useCurrentTime } from "../hooks/useCurrentTime";

// Set to true to enable dev controls (play button to animate through day)
const DEV_MODE = false;

export function SunPositionCard() {
	const { geolocation } = useAppStore();
	const currentTime = useCurrentTime();
	const [isPlaying, setIsPlaying] = useState(false);
	const [demoProgress, setDemoProgress] = useState(0.5);
	const [demoSeason, setDemoSeason] = useState<"current" | "summer" | "winter">(
		"current",
	);
	const gradientId = useId();
	const glowId = useId();

	// Animation loop for dev mode - extends past 1.0 to show night
	useEffect(() => {
		if (!isPlaying) return;
		const interval = setInterval(() => {
			setDemoProgress((prev) => (prev >= 1.3 ? -0.1 : prev + 0.005));
		}, 50);
		return () => clearInterval(interval);
	}, [isPlaying]);

	const sunData = useMemo(() => {
		if (!geolocation.weather || !geolocation.position) {
			return null;
		}

		const { sunrise, sunset } = geolocation.weather;
		const sunriseTime = new Date(sunrise);
		const sunsetTime = new Date(sunset);
		const totalDuration = sunsetTime.getTime() - sunriseTime.getTime();

		// In dev mode with animation, use demoProgress
		const now = DEV_MODE
			? sunriseTime.getTime() + totalDuration * demoProgress
			: currentTime.getTime();

		// Calculate sun position (0 = sunrise, 1 = sunset)
		const currentProgress = Math.max(
			0,
			Math.min(1, (now - sunriseTime.getTime()) / totalDuration),
		);

		// Determine if it's day or night
		const isDay = now >= sunriseTime.getTime() && now <= sunsetTime.getTime();

		// Calculate daylight hours
		const daylightHours = totalDuration / (1000 * 60 * 60);
		const hours = Math.floor(daylightHours);
		const minutes = Math.round((daylightHours - hours) * 60);

		// Calculate solar zenith (max elevation) based on latitude and day of year
		// This determines how "tall" the arc should be
		const latitude = geolocation.position.latitude;

		// Allow overriding day of year for demo purposes
		let dayOfYear: number;
		if (DEV_MODE && demoSeason === "summer") {
			dayOfYear = 172; // June 21 - summer solstice
		} else if (DEV_MODE && demoSeason === "winter") {
			dayOfYear = 355; // December 21 - winter solstice
		} else {
			dayOfYear = Math.floor(
				(sunriseTime.getTime() -
					new Date(sunriseTime.getFullYear(), 0, 0).getTime()) /
					(1000 * 60 * 60 * 24),
			);
		}

		// Solar declination angle (varies from -23.45° to +23.45° throughout the year)
		const declination =
			-23.45 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365);

		// Maximum solar elevation at solar noon
		// Formula: 90° - |latitude - declination|
		const maxElevation = 90 - Math.abs(latitude - declination);

		// Normalize to 0-1 range (0° = horizon, 90° = directly overhead)
		// Clamp between 15° (very low winter sun) and 75° (high summer sun)
		const normalizedElevation = Math.max(0.2, Math.min(1, maxElevation / 75));

		return {
			sunriseTime,
			sunsetTime,
			currentProgress,
			isDay,
			daylightHours: `${hours}h ${minutes}m`,
			zenithScale: normalizedElevation,
			maxElevation: Math.round(maxElevation),
		};
	}, [
		geolocation.weather,
		geolocation.position,
		demoProgress,
		demoSeason,
		currentTime,
	]);

	if (!sunData) {
		return null;
	}

	// SVG dimensions - half arc for sun path (sunrise to sunset)
	const width = 280;
	const height = 100;
	const centerX = width / 2;
	const centerY = height - 10; // horizon line near bottom
	const startX = 25; // sunrise position
	const endX = width - 25; // sunset position
	const peakHeight = Math.round(30 + 45 * sunData.zenithScale); // arc peak scales with zenith

	const sunriseHour =
		sunData.sunriseTime.getHours() + sunData.sunriseTime.getMinutes() / 60;
	const sunsetHour =
		sunData.sunsetTime.getHours() + sunData.sunsetTime.getMinutes() / 60;

	// Current hour for sun position
	let currentHour: number;
	if (sunData.isDay) {
		currentHour =
			sunriseHour + sunData.currentProgress * (sunsetHour - sunriseHour);
	} else {
		// At night, extrapolate based on progress
		if (sunData.currentProgress < 0) {
			currentHour = sunriseHour + sunData.currentProgress * sunriseHour;
		} else {
			currentHour =
				sunsetHour +
				(sunData.currentProgress - 1) * (24 - sunsetHour + sunriseHour);
		}
	}

	// Sun position on quadratic Bezier arc (always intersects horizon at ends)
	// Map currentHour to 0-1 progress along the arc
	const arcProgress = Math.max(
		0,
		Math.min(1, (currentHour - sunriseHour) / (sunsetHour - sunriseHour)),
	);
	const t = arcProgress;
	const controlY = centerY - peakHeight * 1.3;
	const sunX =
		(1 - t) * (1 - t) * startX + 2 * (1 - t) * t * centerX + t * t * endX;
	const sunY =
		(1 - t) * (1 - t) * centerY + 2 * (1 - t) * t * controlY + t * t * centerY;

	// Generate arc as polyline points
	const arcPoints: string[] = [];
	const numPoints = 30;
	for (let i = 0; i <= numPoints; i++) {
		const pt = i / numPoints;
		const px =
			(1 - pt) * (1 - pt) * startX +
			2 * (1 - pt) * pt * centerX +
			pt * pt * endX;
		const py =
			(1 - pt) * (1 - pt) * centerY +
			2 * (1 - pt) * pt * controlY +
			pt * pt * centerY;
		arcPoints.push(`${px},${py}`);
	}
	const daylightPath = arcPoints.join(" ");

	// Dynamic background gradient based on time of day
	const getBackgroundClass = () => {
		if (!sunData.isDay) {
			// Night - dark blue/purple
			return "bg-gradient-to-br from-slate-800 to-indigo-900";
		}
		const progress = sunData.currentProgress;
		if (progress < 0.15) {
			// Dawn - pink/orange
			return "bg-gradient-to-br from-rose-100 to-orange-100";
		}
		if (progress < 0.35) {
			// Morning - light blue/yellow
			return "bg-gradient-to-br from-sky-100 to-amber-50";
		}
		if (progress < 0.65) {
			// Midday - bright blue/white
			return "bg-gradient-to-br from-blue-50 to-sky-100";
		}
		if (progress < 0.85) {
			// Afternoon - warm orange
			return "bg-gradient-to-br from-amber-50 to-orange-100";
		}
		// Dusk - orange/purple
		return "bg-gradient-to-br from-orange-100 to-purple-100";
	};

	return (
		<Card
			className={`${getBackgroundClass()} border-stone-200 shadow-sm overflow-hidden transition-colors duration-1000`}
		>
			<CardHeader className="pb-2">
				<CardTitle
					className={`flex items-center justify-between transition-colors duration-1000 ${sunData.isDay ? "text-slate-800" : "text-slate-100"}`}
				>
					<div className="flex items-center gap-2">
						<span className="text-base font-semibold">Sun Position</span>
						{DEV_MODE && (
							<>
								<button
									type="button"
									onClick={() => setIsPlaying(!isPlaying)}
									className={`p-1 rounded-full transition-colors ${sunData.isDay ? "hover:bg-black/10" : "hover:bg-white/20"}`}
									title={isPlaying ? "Pause animation" : "Play day cycle"}
								>
									{isPlaying ? (
										<Pause className="w-4 h-4" />
									) : (
										<Play className="w-4 h-4" />
									)}
								</button>
								<select
									value={demoSeason}
									onChange={(e) =>
										setDemoSeason(
											e.target.value as "current" | "summer" | "winter",
										)
									}
									className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
										sunData.isDay
											? "bg-white/50 border-slate-300 text-slate-700"
											: "bg-white/10 border-slate-500 text-slate-200"
									}`}
									title="Change season"
								>
									<option value="current">Now</option>
									<option value="summer">Summer</option>
									<option value="winter">Winter</option>
								</select>
							</>
						)}
					</div>
					<span
						className={`text-sm font-normal tabular-nums transition-colors duration-1000 ${sunData.isDay ? "text-slate-600" : "text-slate-300"}`}
					>
						{sunData.daylightHours} of daylight
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="relative flex justify-center">
					<svg
						width={width}
						height={height}
						viewBox={`0 0 ${width} ${height}`}
						className="overflow-visible"
						role="img"
						aria-labelledby={`${gradientId}-title`}
					>
						<title id={`${gradientId}-title`}>
							Sun position visualization showing daylight hours
						</title>
						{/* Horizon line */}
						<line
							x1="10"
							y1={centerY}
							x2={width - 10}
							y2={centerY}
							stroke={sunData.isDay ? "#d1d5db" : "#475569"}
							strokeWidth="1"
							strokeDasharray="4 2"
						/>

						{/* Daylight arc overlay */}
						<polyline
							points={daylightPath}
							fill="none"
							stroke={`url(#${gradientId})`}
							strokeWidth="4"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>

						{/* Gradient definition */}
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

						{/* Sun indicator */}
						{sunData.isDay && (
							<g
								className="sun-entrance"
								style={{ transformOrigin: `${sunX}px ${sunY}px` }}
							>
								{/* Outer glow */}
								<circle cx={sunX} cy={sunY} r="18" fill={`url(#${glowId})`} />
								{/* Sun circle */}
								<circle
									cx={sunX}
									cy={sunY}
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

				{/* Time labels */}
				<div className="flex justify-between items-center mt-2 px-2">
					<div className="flex items-center gap-1.5">
						<Sunrise
							className={`w-4 h-4 transition-colors duration-1000 ${sunData.isDay ? "text-amber-500" : "text-amber-400"}`}
						/>
						<span
							className={`text-sm font-medium tabular-nums transition-colors duration-1000 ${sunData.isDay ? "text-slate-700" : "text-slate-200"}`}
						>
							{format(sunData.sunriseTime, "h:mm a")}
						</span>
					</div>

					<div className="text-center">
						<span
							className={`text-xs tabular-nums transition-colors duration-1000 ${sunData.isDay ? "text-slate-500" : "text-slate-300"}`}
						>
							{sunData.isDay
								? `${Math.round(sunData.currentProgress * 100)}% through the day`
								: `Now ${format(currentTime, "h:mm a")} · Night`}
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<Sunset
							className={`w-4 h-4 transition-colors duration-1000 ${sunData.isDay ? "text-orange-500" : "text-orange-400"}`}
						/>
						<span
							className={`text-sm font-medium tabular-nums transition-colors duration-1000 ${sunData.isDay ? "text-slate-700" : "text-slate-200"}`}
						>
							{format(sunData.sunsetTime, "h:mm a")}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
