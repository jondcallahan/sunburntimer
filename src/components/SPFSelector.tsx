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
			<CardContent className="p-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Badge
							variant={selected ? "default" : "secondary"}
							className="min-w-[2.5rem] justify-center text-sm font-bold"
						>
							{level === SPFLevel.NONE ? "0" : config.label.replace("SPF ", "")}
						</Badge>

						<div className="text-left">
							<div className="text-sm font-semibold">{config.label}</div>
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
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
