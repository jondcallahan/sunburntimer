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
		<Card
			className={`
        cursor-pointer transition-all duration-200 hover:scale-105 border-2
        ${
					selected
						? "border-primary shadow-lg ring-2 ring-primary/20"
						: "border-border hover:border-primary/50"
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
					<div className="flex items-center space-x-4">
						<div
							className={`
              flex items-center justify-center w-12 h-12 rounded-full
              ${selected ? "bg-primary" : "bg-muted"}
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
													? "text-primary-foreground"
													: "text-primary"
												: selected
													? "text-primary-foreground/30"
													: "text-muted-foreground/30"
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
						<div className="flex items-center justify-center w-6 h-6 bg-primary rounded-full">
							<Check className="w-4 h-4 text-primary-foreground" />
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

			<div className="space-y-4">
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
