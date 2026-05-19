import { format } from "date-fns";
import { CheckCircle, Sun } from "lucide-react";
import type {
	ActualWeatherProvider,
	EnsembleCalculationResult,
	ProviderCalculationResult,
} from "../types";
import { getWeatherProviderLabel } from "../services/weather";
import { formatDuration } from "../lib/utils";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

interface EnsembleResultsDisplayProps {
	ensemble: EnsembleCalculationResult;
}

function getSafeTime(result: ProviderCalculationResult): string {
	const { startTime, burnTime } = result.result;
	if (!startTime || !burnTime) {
		return "Unlikely";
	}

	if (burnTime.getDate() !== startTime.getDate()) {
		return "Unlikely";
	}

	return formatDuration(burnTime.getTime() - startTime.getTime());
}

function getRangeLabel(ensemble: EnsembleCalculationResult): string {
	const burnTimes = ensemble.providers
		.map(({ result }) => result.burnTime)
		.filter((burnTime) => burnTime !== undefined);

	if (burnTimes.length === 0) {
		return "Sunburn unlikely";
	}

	const startTime = ensemble.recommended.result.startTime;
	if (!startTime) {
		return "Sunburn unlikely";
	}

	const durations = burnTimes.map((burnTime) =>
		formatDuration(burnTime.getTime() - startTime.getTime()),
	);

	const first = durations[0];
	const last = durations[durations.length - 1];
	return first === last ? first : `${first} - ${last}`;
}

function getProviderTone(provider: ActualWeatherProvider): string {
	switch (provider) {
		case "google":
			return "bg-blue-50 text-blue-900 border-blue-200";
		case "epa":
			return "bg-green-50 text-green-900 border-green-200";
		case "open-meteo":
			return "bg-orange-50 text-orange-900 border-orange-200";
	}
}

export function EnsembleResultsDisplay({
	ensemble,
}: EnsembleResultsDisplayProps) {
	const rangeLabel = getRangeLabel(ensemble);
	const hasBurnTime = ensemble.providers.some(({ result }) => result.burnTime);
	const recommendedBurnTime = ensemble.recommended.result.burnTime;

	return (
		<Card>
			<CardContent className="pt-6">
				<div className="space-y-5">
					<div className="flex flex-col items-center gap-3 text-center">
						{hasBurnTime ? (
							<Sun className="h-8 w-8 text-orange-500" />
						) : (
							<CheckCircle className="h-8 w-8 text-green-600" />
						)}
						<div>
							<p className="text-2xl font-bold tabular-nums text-slate-800">
								{hasBurnTime ? `Safe for ${rangeLabel}` : rangeLabel}
							</p>
							{recommendedBurnTime && (
								<p className="text-slate-600 tabular-nums">
									Use the conservative estimate:{" "}
									{format(recommendedBurnTime, "h:mm a")}
								</p>
							)}
						</div>
					</div>

					<div className="grid gap-2">
						{ensemble.providers.map((providerResult) => (
							<div
								key={providerResult.provider}
								className="flex items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2"
							>
								<Badge
									variant="outline"
									className={getProviderTone(providerResult.provider)}
								>
									{getWeatherProviderLabel(providerResult.provider)}
								</Badge>
								<span className="text-sm font-medium tabular-nums text-slate-700">
									{getSafeTime(providerResult)}
								</span>
							</div>
						))}
					</div>

					<p className="text-center text-xs text-slate-500">
						Range mode runs each provider independently and uses the earliest
						burn time as the conservative estimate.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
