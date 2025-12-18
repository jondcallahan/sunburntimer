import { Check, Droplets, AlertTriangle } from "lucide-react";
import { SweatLevel, SWEAT_CONFIG } from "../types";
import { useAppStore } from "../store";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

interface SweatLevelOptionProps {
	level: SweatLevel;
	selected: boolean;
	onSelect: (level: SweatLevel) => void;
}

function SweatLevelOption({
	level,
	selected,
	onSelect,
}: SweatLevelOptionProps) {
	const config = SWEAT_CONFIG[level];

	const getDropletCount = (level: SweatLevel) => {
		switch (level) {
			case SweatLevel.LOW:
				return 0;
			case SweatLevel.MEDIUM:
				return 1;
			case SweatLevel.HIGH:
				return 3;
		}
	};

	const getDescription = (level: SweatLevel) => {
		switch (level) {
			case SweatLevel.LOW:
				return "Minimal activity, no sweating";
			case SweatLevel.MEDIUM:
				return "Light exercise, some sweating";
			case SweatLevel.HIGH:
				return "Heavy exercise, profuse sweating";
		}
	};

	const dropletCount = getDropletCount(level);

	return (
		// biome-ignore lint/a11y/useSemanticElements: Not going to overwrite the Card component to be a button so solve it with a11y attributes
		<Card
			className={`
        cursor-pointer transition-all duration-150 border-2
        ${
					selected
						? "border-amber-500 bg-amber-50/50 shadow-md"
						: "border-stone-200 hover:border-amber-300 hover:bg-amber-50/30"
				}
      `}
			onClick={() => onSelect(level)}
			role="button"
			tabIndex={0}
			aria-pressed={selected}
			aria-label={`Select ${config.label} sweating level`}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onSelect(level);
				}
			}}
		>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div
							className={`
              flex items-center justify-center w-12 h-12 rounded-full
              ${selected ? "bg-amber-500" : "bg-stone-100"}
            `}
						>
							<div className="flex space-x-0.5">
								{Array.from({ length: 3 }).map((_, i) => (
									<Droplets
										// biome-ignore lint/suspicious/noArrayIndexKey: we're iterating through an array of fixed length so this is fine
										key={i}
										className={`w-3 h-3 ${
											i < dropletCount
												? selected
													? "text-white"
													: "text-amber-600"
												: selected
													? "text-white/30"
													: "text-stone-300"
										}`}
									/>
								))}
							</div>
						</div>

						<div className="text-left">
							<div className="font-semibold">{config.label}</div>
							<div className="text-sm text-muted-foreground">
								{getDescription(level)}
							</div>
							{level !== SweatLevel.LOW && (
								<Badge variant="outline" className="mt-1 text-xs">
									SPF degrades after {config.startHours}h
								</Badge>
							)}
						</div>
					</div>

					{selected && (
						<div className="flex items-center justify-center w-6 h-6 bg-amber-500 rounded-full">
							<Check className="w-4 h-4 text-white" />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export function SweatLevelSelector() {
	const { sweatLevel, setSweatLevel } = useAppStore();

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				How much will you be sweating? This affects how quickly your sunscreen
				wears off.
			</p>

			<div className="space-y-3">
				{Object.values(SweatLevel).map((level) => (
					<SweatLevelOption
						key={level}
						level={level}
						selected={sweatLevel === level}
						onSelect={setSweatLevel}
					/>
				))}
			</div>

			{sweatLevel && sweatLevel !== SweatLevel.LOW && (
				<Alert>
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						<strong>Note:</strong> Your sunscreen protection will gradually
						decrease due to sweating. Consider reapplying more frequently.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
