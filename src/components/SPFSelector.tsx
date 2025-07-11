import { Check, Sun } from "lucide-react";
import { SPFLevel, SPF_CONFIG } from "../types";
import { useAppStore } from "../store";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";

interface SPFOptionProps {
	level: SPFLevel;
	selected: boolean;
	onSelect: (level: SPFLevel) => void;
}

function SPFOption({ level, selected, onSelect }: SPFOptionProps) {
	const config = SPF_CONFIG[level];

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
			aria-label={`Select ${config.label} sunscreen protection`}
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
						<Badge
							variant={selected ? "default" : "secondary"}
							className="text-sm font-bold min-w-[2.5rem] justify-center"
						>
							{level === SPFLevel.NONE ? "0" : config.label.replace("SPF ", "")}
						</Badge>

						<div className="text-left">
							<div className="font-semibold">{config.label}</div>
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

export function SPFSelector() {
	const { spfLevel, setSPFLevel } = useAppStore();

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{Object.values(SPFLevel).map((level) => (
					<SPFOption
						key={level}
						level={level}
						selected={spfLevel === level}
						onSelect={setSPFLevel}
					/>
				))}
			</div>

			{spfLevel !== undefined && spfLevel !== SPFLevel.NONE && (
				<Alert>
					<Sun className="h-4 w-4" />
					<AlertDescription>
						<strong>Remember:</strong> Reapply sunscreen every 2 hours or after
						swimming, sweating, or towel drying.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
