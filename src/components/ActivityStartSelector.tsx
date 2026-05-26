import { useEffect, useMemo } from "react";
import { CalendarClock, Clock, SunMedium } from "lucide-react";
import { haptic } from "ios-haptics";
import { useAppStore } from "../store";
import {
	ACTIVITY_START_STEP_MINUTES,
	createForecastOffsetStart,
	formatActivityStartLabel,
	formatForecastDate,
	getForecastStartWindow,
	getPresetOffsetMinutes,
	resolveActivityStartDate,
	snapOffsetMinutes,
} from "../utils/activity-start";
import { Button } from "./ui/button";

const PRESETS = [
	{ key: "laterToday", label: "Later today" },
	{ key: "tomorrowMorning", label: "Tomorrow morning" },
	{ key: "tomorrowAfternoon", label: "Tomorrow afternoon" },
] as const;

export function ActivityStartSelector() {
	const { activityStart, geolocation, setActivityStart } = useAppStore();
	const weather = geolocation.weather;
	const renderTimeMs = Date.now();

	const baseTimeMs =
		activityStart.mode === "forecastOffset"
			? activityStart.baseTimeMs
			: renderTimeMs;

	const forecastWindow = useMemo(() => {
		if (!weather) return undefined;
		return getForecastStartWindow(weather, baseTimeMs);
	}, [weather, baseTimeMs]);

	const timezone = weather?.timezone;
	const selectedOffset =
		activityStart.mode === "forecastOffset"
			? activityStart.offsetMinutes
			: (forecastWindow?.minOffsetMinutes ?? 0);
	const selectedStepIndex = Math.round(
		(selectedOffset - (forecastWindow?.minOffsetMinutes ?? 0)) /
			ACTIVITY_START_STEP_MINUTES,
	);

	useEffect(() => {
		if (
			!weather ||
			!forecastWindow ||
			activityStart.mode !== "forecastOffset"
		) {
			return;
		}

		const snappedOffset = snapOffsetMinutes(
			activityStart.offsetMinutes,
			forecastWindow,
		);
		if (snappedOffset !== activityStart.offsetMinutes) {
			setActivityStart({
				...activityStart,
				offsetMinutes: snappedOffset,
			});
		}
	}, [activityStart, forecastWindow, setActivityStart, weather]);

	if (!weather || !timezone || !forecastWindow) {
		return (
			<p className="text-sm text-slate-600">
				Choose a location first so the forecast timeline can be loaded.
			</p>
		);
	}

	const selectedDate = resolveActivityStartDate(activityStart);
	const forecastEndLabel = formatForecastDate(
		forecastWindow.forecastEnd,
		timezone,
	);
	const selectedLabel = formatActivityStartLabel(activityStart, timezone);
	const placeLabel = geolocation.placeName ?? "Selected location";
	const sliderStepCount = Math.max(
		0,
		Math.floor(
			(forecastWindow.maxOffsetMinutes - forecastWindow.minOffsetMinutes) /
				ACTIVITY_START_STEP_MINUTES,
		),
	);

	const chooseNow = () => {
		haptic();
		setActivityStart({ mode: "now" });
	};

	const chooseOffset = (offsetMinutes: number) => {
		haptic();
		setActivityStart(
			createForecastOffsetStart(offsetMinutes, weather, renderTimeMs),
		);
	};

	const updateStepIndex = (stepIndex: number) => {
		haptic();
		const base =
			activityStart.mode === "forecastOffset"
				? activityStart.baseTimeMs
				: renderTimeMs;
		const offsetMinutes =
			forecastWindow.minOffsetMinutes + stepIndex * ACTIVITY_START_STEP_MINUTES;
		setActivityStart(createForecastOffsetStart(offsetMinutes, weather, base));
	};

	const isNowSelected = activityStart.mode === "now";

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant={isNowSelected ? "default" : "outline"}
					onClick={chooseNow}
				>
					<Clock className="size-4" />
					Now
				</Button>
				{PRESETS.map((preset) => {
					const offset = getPresetOffsetMinutes(
						preset.key,
						timezone,
						forecastWindow,
						renderTimeMs,
					);
					const selected =
						activityStart.mode === "forecastOffset" &&
						offset !== undefined &&
						Math.abs(activityStart.offsetMinutes - offset) <
							ACTIVITY_START_STEP_MINUTES;

					return (
						<Button
							key={preset.key}
							type="button"
							variant={selected ? "default" : "outline"}
							onClick={() => offset !== undefined && chooseOffset(offset)}
							disabled={offset === undefined}
						>
							{preset.key === "laterToday" ? (
								<SunMedium className="size-4" />
							) : (
								<CalendarClock className="size-4" />
							)}
							{preset.label}
						</Button>
					);
				})}
			</div>

			<div className="rounded-md border border-stone-200 bg-white/70 p-4">
				<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-medium text-slate-700">Start time</p>
						<p className="text-2xl font-bold tabular-nums text-slate-900">
							{selectedLabel}
						</p>
						<p className="mt-1 text-sm text-slate-500">{placeLabel}</p>
					</div>
					<p className="text-sm text-slate-500">
						Forecast through {forecastEndLabel}
					</p>
				</div>

				<input
					type="range"
					min={0}
					max={sliderStepCount}
					step={1}
					value={selectedStepIndex}
					onChange={(event) =>
						updateStepIndex(Number(event.currentTarget.value))
					}
					aria-label="Start exposure time"
					aria-valuetext={selectedLabel}
					title=""
					className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>

				<div className="mt-3 grid grid-cols-3 text-xs text-slate-500">
					<span>Now</span>
					<span className="text-center">
						{formatOffsetLabel(forecastWindow.maxOffsetMinutes / 2)}
					</span>
					<span className="text-right">{forecastEndLabel}</span>
				</div>
			</div>

			{activityStart.mode === "forecastOffset" && (
				<p className="sr-only">
					Planning for {formatForecastDate(selectedDate, timezone)} in{" "}
					{placeLabel}.
				</p>
			)}
		</div>
	);
}

function formatOffsetLabel(offsetMinutes: number): string {
	const hours = Math.round(offsetMinutes / 60);
	if (hours < 24) {
		return `${hours}h`;
	}

	return `${Math.round(hours / 24)}d`;
}
