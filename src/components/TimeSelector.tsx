import { haptic } from "ios-haptics";
import { CalendarClock, Check, Clock } from "lucide-react";
import { useId } from "react";
import { useAppStore } from "../store";
import { CardContent } from "./ui/card";
import { SelectableCard } from "./ui/selectable-card";

function toTimeInputValue(date: Date): string {
	return `${date.getHours().toString().padStart(2, "0")}:${date
		.getMinutes()
		.toString()
		.padStart(2, "0")}`;
}

function nextWholeHour(): Date {
	const now = new Date();
	const date = new Date(now);
	date.setMinutes(0, 0, 0);
	date.setHours(date.getHours() + 1);
	if (date.getDate() !== now.getDate()) {
		date.setTime(now.getTime());
		date.setHours(23, 59, 0, 0);
	}
	return date;
}

export function TimeSelector() {
	const { activityStartTime, setActivityStartTime } = useAppStore();
	const inputId = useId();
	const selectedTime = activityStartTime
		? new Date(activityStartTime)
		: nextWholeHour();
	const now = new Date();
	const laterTodayAvailable = selectedTime.getTime() > now.getTime();

	const selectNow = () => {
		haptic();
		setActivityStartTime(undefined);
	};

	const selectLater = () => {
		if (!laterTodayAvailable) return;
		haptic();
		setActivityStartTime(selectedTime.toISOString());
	};

	const updateTime = (value: string) => {
		if (!value) return;
		const [hours, minutes] = value.split(":").map(Number);
		const date = new Date();
		date.setHours(hours, minutes, 0, 0);
		if (date.getTime() <= Date.now()) return;
		setActivityStartTime(date.toISOString());
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<SelectableCard
				selected={!activityStartTime}
				onClick={selectNow}
				aria-label="Calculate exposure starting now"
			>
				<CardContent className="p-4 flex items-center justify-between h-full">
					<div className="flex items-center space-x-2">
						<Clock className="w-5 h-5 text-amber-600" />
						<span className="font-semibold">Starting Now</span>
					</div>
					{!activityStartTime && (
						<div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
							<Check className="w-4 h-4 text-primary-foreground" />
						</div>
					)}
				</CardContent>
			</SelectableCard>

			<SelectableCard
				selected={!!activityStartTime}
				disabled={!laterTodayAvailable}
				onClick={selectLater}
				aria-label="Calculate exposure starting later today"
			>
				<CardContent className="p-4 space-y-3 h-full">
					<div className="flex items-center justify-between">
						<label
							htmlFor={inputId}
							className="flex items-center space-x-2 font-semibold"
						>
							<CalendarClock className="w-5 h-5 text-amber-600" />
							<span>Later Today</span>
						</label>
						{activityStartTime && (
							<div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
								<Check className="w-4 h-4 text-primary-foreground" />
							</div>
						)}
					</div>
					<input
						id={inputId}
						type="time"
						min={toTimeInputValue(now)}
						value={toTimeInputValue(selectedTime)}
						disabled={!laterTodayAvailable}
						onClick={(event) => event.stopPropagation()}
						onChange={(event) => updateTime(event.target.value)}
						className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 font-semibold"
					/>
				</CardContent>
			</SelectableCard>
		</div>
	);
}
