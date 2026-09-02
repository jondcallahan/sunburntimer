import { Leaf, Snowflake, TreePine, Umbrella, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { haptic } from "ios-haptics";
import { Environment, ENVIRONMENT_CONFIG } from "../types";
import { useAppStore } from "../store";
import { cn } from "../lib/utils";

const ENVIRONMENT_ICONS: Record<Environment, LucideIcon> = {
	[Environment.SHADE]: TreePine,
	[Environment.OPEN]: Leaf,
	[Environment.WATER]: Waves,
	[Environment.SAND]: Umbrella,
	[Environment.SNOW]: Snowflake,
};

function formatMultiplier(multiplier: number): string {
	if (multiplier === 1) return "baseline";
	const percent = Math.round((multiplier - 1) * 100);
	return `${percent > 0 ? "+" : ""}${percent}% UV`;
}

export function EnvironmentSelector() {
	const { environment, setEnvironment } = useAppStore();
	const selected = environment ?? Environment.OPEN;
	const selectedConfig = ENVIRONMENT_CONFIG[selected];

	return (
		<div className="space-y-2">
			<div
				role="tablist"
				aria-label="Surroundings"
				className="inline-grid grid-cols-5 gap-0.5 p-0.5 rounded-md bg-stone-100 border border-stone-200 max-w-full"
			>
				{Object.values(Environment).map((option) => {
					const config = ENVIRONMENT_CONFIG[option];
					const Icon = ENVIRONMENT_ICONS[option];
					const isSelected = option === selected;
					return (
						<button
							key={option}
							type="button"
							role="tab"
							aria-selected={isSelected}
							aria-label={`${config.label}, ${formatMultiplier(config.uvMultiplier)}`}
							onClick={() => {
								haptic();
								setEnvironment(option);
							}}
							className={cn(
								"flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
								isSelected
									? "bg-white text-slate-900 shadow-sm"
									: "text-slate-500 hover:text-slate-800 hover:bg-white/60",
							)}
						>
							<Icon className="w-3.5 h-3.5 shrink-0" />
							<span className="hidden sm:inline truncate">{config.label}</span>
						</button>
					);
				})}
			</div>
			<p className="text-xs text-slate-500 tabular-nums">
				<span className="sm:hidden font-medium text-slate-700">
					{selectedConfig.label} ·{" "}
				</span>
				{selectedConfig.description} ·{" "}
				<span className="font-medium text-slate-700">
					{formatMultiplier(selectedConfig.uvMultiplier)}
				</span>
			</p>
		</div>
	);
}
