import {
	AlertTriangle,
	Clock,
	ExternalLink,
	Ruler,
	ShieldCheck,
} from "lucide-react";
import { useId, useMemo } from "react";
import { useAppStore } from "../store";
import {
	ExposureGoal,
	EXPOSURE_GOAL_CONFIG,
	SPF_CONFIG,
	StartTimeMode,
	type SPFRecommendation,
	UnitSystem,
} from "../types";
import { formatDateTimeLocal } from "../utils/timezone";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface PlanControlsProps {
	currentTime: Date;
	timezone?: string;
	recommendation?: SPFRecommendation;
}

const FORECAST_WINDOW_DAYS = 3;
const DURATION_PRESETS = [30, 60, 120, 240];
const MIN_DURATION_MINUTES = 5;
const MAX_DURATION_MINUTES = 720;

function addHours(date: Date, hours: number): Date {
	return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getDefaultPlannedStart(currentTime: Date, timezone?: string): string {
	return formatDateTimeLocal(addHours(currentTime, 1), timezone);
}

function clampDuration(value: number): number {
	if (!Number.isFinite(value)) return MIN_DURATION_MINUTES;
	return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, value));
}

function formatPlannerDuration(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return remainingMinutes === 0
		? `${hours}h`
		: `${hours}h ${remainingMinutes}m`;
}

function getRecommendationTone(status: SPFRecommendation["status"]): string {
	switch (status) {
		case "fits_goal":
			return "border-green-200 bg-green-50 text-green-900";
		case "below_goal":
			return "border-sky-200 bg-sky-50 text-sky-900";
		case "too_risky":
			return "border-orange-200 bg-orange-50 text-orange-950";
	}
}

function getRecommendationCopy(recommendation: SPFRecommendation): string {
	switch (recommendation.status) {
		case "fits_goal":
			return "Fits your selected exposure goal.";
		case "below_goal":
			return "Lower than your color goal, but safer for your skin.";
		case "too_risky":
			return "Still above the selected goal. Shorten the plan, seek shade, or cover up.";
	}
}

export function PlanControls({
	currentTime,
	timezone,
	recommendation,
}: PlanControlsProps) {
	const plannedStartId = useId();
	const plannedDurationId = useId();
	const {
		unitSystem,
		startTimeMode,
		plannedStartTime,
		plannedDurationMinutes,
		exposureGoal,
		spfLevel,
		setUnitSystem,
		setStartTimeMode,
		setPlannedStartTime,
		setPlannedDurationMinutes,
		setExposureGoal,
		setSPFLevel,
	} = useAppStore();

	const defaultPlannedStart = useMemo(
		() => getDefaultPlannedStart(currentTime, timezone),
		[currentTime, timezone],
	);
	const plannedValue = plannedStartTime || defaultPlannedStart;
	const minStart = useMemo(
		() => formatDateTimeLocal(currentTime, timezone),
		[currentTime, timezone],
	);
	const maxStart = useMemo(
		() =>
			formatDateTimeLocal(addDays(currentTime, FORECAST_WINDOW_DAYS), timezone),
		[currentTime, timezone],
	);

	const selectPlannedStart = () => {
		if (!plannedStartTime) {
			setPlannedStartTime(defaultPlannedStart);
		}
		setStartTimeMode(StartTimeMode.PLANNED);
	};

	return (
		<section className="rounded-lg border border-stone-200 bg-white/80 p-4 shadow-sm">
			<div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.8fr]">
				<div className="space-y-3">
					<Label htmlFor={plannedStartId}>
						<Clock className="size-4 text-amber-600" />
						Start
					</Label>
					<div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
						<div className="grid grid-cols-2 gap-1 rounded-md border border-stone-200 bg-stone-50 p-1">
							<Button
								type="button"
								size="sm"
								variant={
									startTimeMode === StartTimeMode.NOW ? "default" : "ghost"
								}
								onClick={() => setStartTimeMode(StartTimeMode.NOW)}
							>
								Now
							</Button>
							<Button
								type="button"
								size="sm"
								variant={
									startTimeMode === StartTimeMode.PLANNED ? "default" : "ghost"
								}
								onClick={selectPlannedStart}
							>
								Later
							</Button>
						</div>
						<Input
							id={plannedStartId}
							type="datetime-local"
							value={plannedValue}
							min={minStart}
							max={maxStart}
							disabled={startTimeMode === StartTimeMode.NOW}
							onChange={(event) => {
								setPlannedStartTime(event.target.value);
								setStartTimeMode(StartTimeMode.PLANNED);
							}}
							className="tabular-nums"
						/>
					</div>
				</div>

				<div className="space-y-3">
					<Label htmlFor={plannedDurationId}>Time outside</Label>
					<div className="grid grid-cols-[1fr_6rem] gap-2">
						<div className="grid grid-cols-4 gap-1 rounded-md border border-stone-200 bg-stone-50 p-1">
							{DURATION_PRESETS.map((minutes) => (
								<Button
									key={minutes}
									type="button"
									size="sm"
									variant={
										plannedDurationMinutes === minutes ? "default" : "ghost"
									}
									onClick={() => setPlannedDurationMinutes(minutes)}
								>
									{formatPlannerDuration(minutes)}
								</Button>
							))}
						</div>
						<Input
							id={plannedDurationId}
							type="number"
							min={MIN_DURATION_MINUTES}
							max={MAX_DURATION_MINUTES}
							step={5}
							value={plannedDurationMinutes}
							onChange={(event) =>
								setPlannedDurationMinutes(
									clampDuration(Number(event.target.value)),
								)
							}
							className="tabular-nums"
							aria-label="Minutes outside"
						/>
					</div>
				</div>

				<div className="space-y-3">
					<Label>
						<Ruler className="size-4 text-sky-700" />
						Units
					</Label>
					<div className="grid grid-cols-2 gap-1 rounded-md border border-stone-200 bg-stone-50 p-1">
						<Button
							type="button"
							size="sm"
							variant={unitSystem === UnitSystem.IMPERIAL ? "default" : "ghost"}
							onClick={() => setUnitSystem(UnitSystem.IMPERIAL)}
						>
							°F, mi
						</Button>
						<Button
							type="button"
							size="sm"
							variant={unitSystem === UnitSystem.METRIC ? "default" : "ghost"}
							onClick={() => setUnitSystem(UnitSystem.METRIC)}
						>
							°C, km
						</Button>
					</div>
				</div>
			</div>

			<div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
				<div className="space-y-3">
					<Label>Goal</Label>
					<div className="grid gap-1 rounded-md border border-stone-200 bg-stone-50 p-1 sm:grid-cols-3">
						{Object.values(ExposureGoal).map((goal) => (
							<Button
								key={goal}
								type="button"
								size="sm"
								variant={exposureGoal === goal ? "default" : "ghost"}
								onClick={() => setExposureGoal(goal)}
								className="h-auto min-h-8 whitespace-normal px-2 py-1"
							>
								{EXPOSURE_GOAL_CONFIG[goal].shortLabel}
							</Button>
						))}
					</div>
					<p className="text-xs leading-relaxed text-slate-600">
						{EXPOSURE_GOAL_CONFIG[exposureGoal].description} A tan means UV
						exposure, so this is a risk estimate, not a health promise.
					</p>
				</div>

				<div
					className={`rounded-lg border p-4 ${
						recommendation
							? getRecommendationTone(recommendation.status)
							: "border-stone-200 bg-stone-50 text-slate-700"
					}`}
				>
					<div className="flex items-start justify-between gap-3">
						<div>
							<div className="flex items-center gap-2 text-sm font-medium">
								<ShieldCheck className="size-4" />
								Recommended protection
							</div>
							{recommendation ? (
								<>
									<p className="mt-1 text-2xl font-bold tabular-nums">
										{SPF_CONFIG[recommendation.level].label}
									</p>
									<p className="text-sm">
										{getRecommendationCopy(recommendation)}
									</p>
									{spfLevel !== recommendation.level && (
										<Button
											type="button"
											size="sm"
											variant="outline"
											className="mt-3 bg-white/70"
											onClick={() => setSPFLevel(recommendation.level)}
										>
											Use {SPF_CONFIG[recommendation.level].label}
										</Button>
									)}
								</>
							) : (
								<p className="mt-2 text-sm">
									Choose skin type, location, and plan details to get an SPF
									recommendation.
								</p>
							)}
						</div>
						{recommendation && (
							<Badge variant="outline" className="bg-white/70 tabular-nums">
								{Math.round(recommendation.damage)}% dose
							</Badge>
						)}
					</div>

					{recommendation && !recommendation.forecastComplete && (
						<p className="mt-3 flex items-start gap-2 text-xs">
							<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
							The forecast does not cover the full plan.
						</p>
					)}

					<div className="mt-3 border-t border-current/15 pt-3 text-xs leading-relaxed">
						<p>
							Based on UV Index, skin type, SPF, and sweat wear-off. Reapply
							sunscreen at least every 2 hours and after sweating or swimming.
						</p>
						<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
							<a
								href="https://www.cdc.gov/skin-cancer/sun-safety/"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 underline underline-offset-2"
							>
								CDC
								<ExternalLink className="size-3" />
							</a>
							<a
								href="https://www.fda.gov/consumers/consumer-updates/tips-stay-safe-sun-sunscreen-sunglasses"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 underline underline-offset-2"
							>
								FDA
								<ExternalLink className="size-3" />
							</a>
							<a
								href="https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/how-to-select-sunscreen"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 underline underline-offset-2"
							>
								AAD
								<ExternalLink className="size-3" />
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
