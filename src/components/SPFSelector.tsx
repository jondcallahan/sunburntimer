import { Check, Sun } from "lucide-react";
import { SPFLevel, SPF_CONFIG } from "../types";
import { useAppStore } from "../store";
import { CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { SelectableCard } from "./ui/selectable-card";

interface SPFOptionProps {
	level: SPFLevel;
	selected: boolean;
	onSelect: (level: SPFLevel) => void;
}

function SPFOption({ level, selected, onSelect }: SPFOptionProps) {
	const config = SPF_CONFIG[level];

	return (
		<SelectableCard
			selected={selected}
			onClick={() => onSelect(level)}
			aria-label={`Select ${config.label} sunscreen protection`}
		>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
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
		</SelectableCard>
	);
}

export function SPFSelector() {
	const { spfLevel, setSPFLevel } = useAppStore();

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
