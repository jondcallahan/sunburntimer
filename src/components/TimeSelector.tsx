import { useState, useEffect, useRef } from "react";
import { Check, Clock, CalendarClock } from "lucide-react";
import { haptic } from "ios-haptics";
import { useAppStore } from "../store";
import { Card, CardContent } from "./ui/card";

export function TimeSelector() {
	const { activityStartTime, setActivityStartTime } = useAppStore();
	const isCustom = activityStartTime !== undefined;

	const inputRef = useRef<HTMLInputElement>(null);

	const [customTime, setCustomTime] = useState<string>("");

	useEffect(() => {
		// When a custom time is given, use its hour and minute
		if (activityStartTime) {
			const d = new Date(activityStartTime);
			const hours = d.getHours().toString().padStart(2, "0");
			const minutes = d.getMinutes().toString().padStart(2, "0");
			setCustomTime(`${hours}:${minutes}`);
		} else {
			// Default to current time when "Later" isn't active
			const now = new Date();
			const hours = now.getHours().toString().padStart(2, "0");
			const minutes = now.getMinutes().toString().padStart(2, "0");
			setCustomTime(`${hours}:${minutes}`);
		}
	}, [activityStartTime]);

	const handleSelectNow = () => {
		haptic();
		setActivityStartTime(undefined);
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value; // e.g. "14:30"
		setCustomTime(value);

		if (value) {
			const [hours, minutes] = value.split(":").map(Number);
			const date = new Date(); // Today
			date.setHours(hours, minutes, 0, 0);
			setActivityStartTime(date.toISOString());
		}
	};

	const handleFocusCustom = () => {
		if (!isCustom && customTime) {
			haptic();
			const [hours, minutes] = customTime.split(":").map(Number);
			const date = new Date(); // Today
			date.setHours(hours, minutes, 0, 0);
			setActivityStartTime(date.toISOString());
		}
	};

	const openPicker = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (inputRef.current) {
			try {
				inputRef.current.showPicker();
			} catch (err) {
				inputRef.current.focus();
				console.warn("showPicker not supported", err);
			}
		}
	};

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<Card
					className={`cursor-pointer transition-all duration-200 border-2 hover:scale-105 ${
						!isCustom
							? "border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5"
							: "border-border hover:border-primary/50 hover:bg-stone-50"
					}`}
					onClick={handleSelectNow}
					title="Click to start your exposure right now"
				>
					<CardContent className="p-4 flex items-center justify-between h-full">
						<div className="flex items-center space-x-2">
							<Clock className="w-5 h-5 text-amber-600" />
							<span className="font-semibold text-slate-800">Starting Now</span>
						</div>
						{!isCustom && (
							<div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
								<Check className="w-4 h-4 text-primary-foreground" />
							</div>
						)}
					</CardContent>
				</Card>

				<Card
					className={`cursor-pointer transition-all duration-200 border-2 hover:scale-105 ${
						isCustom
							? "border-primary shadow-lg ring-2 ring-primary/20 bg-primary/5"
							: "border-border hover:border-primary/50 hover:bg-stone-50"
					}`}
					onClick={handleFocusCustom}
					title="Click to select a specific time later today"
				>
					<CardContent className="p-4 flex flex-col justify-center space-y-3 h-full relative">
						<div className="flex items-center justify-between w-full">
							<div className="flex items-center space-x-2 font-semibold text-slate-800" role="button" tabIndex={0}>
								<CalendarClock className="w-5 h-5 text-amber-600" />
								<span>Plan for Later Today</span>
							</div>
							{isCustom && (
								<div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
									<Check className="w-4 h-4 text-primary-foreground" />
								</div>
							)}
						</div>
						<div className="relative group w-fit" onClick={openPicker}>
							<div className="px-4 py-2 bg-white border border-stone-200 rounded-lg shadow-sm font-semibold text-slate-800 flex items-center space-x-3 hover:border-primary/50 hover:bg-stone-50 transition-all duration-200 cursor-pointer group-hover:scale-105">
								<Clock className="w-4 h-4 text-amber-600" />
								<span>
									{(() => {
										if (!customTime) return "--:--";
										const [h, m] = customTime.split(":").map(Number);
										const d = new Date();
										d.setHours(h, m, 0, 0);
										return d.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										});
									})()}
								</span>
							</div>
							<input
								ref={inputRef}
								type="time"
								value={customTime}
								onChange={handleTimeChange}
								onFocus={handleFocusCustom}
								onClick={(e) => e.stopPropagation()}
								className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
							/>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
