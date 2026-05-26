import { useEffect, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { haptic } from "ios-haptics";
import { useAppStore, useIsReadyToCalculate } from "./store";
import { findOptimalTimeSlicing, recommendSPF } from "./calculations";
import {
	SPF_CONFIG,
	SPFLevel,
	SWEAT_CONFIG,
	DEFAULT_SWEAT_LEVEL,
	StartTimeMode,
} from "./types";
import { useLocationRefresh } from "./hooks/useLocationRefresh";
import { useCurrentTime } from "./hooks/useCurrentTime";
import {
	fetchWeatherData,
	getActiveWeatherProvider,
	isGoogleWeatherTestRoute,
} from "./services/weather";
import { getUVIndexColor, getAQIColor } from "./lib/utils";
import { parseDateTimeLocal } from "./utils/timezone";

import { SkinTypeSelector } from "./components/SkinTypeSelector";
import { SPFSelector } from "./components/SPFSelector";
import { SweatLevelSelector } from "./components/SweatLevelSelector";
import { LocationSelector } from "./components/LocationSelector";
import { PlanControls } from "./components/PlanControls";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { BurnChart } from "./components/BurnChart";
import { UVChart } from "./components/UVChart";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./components/ui/accordion";
import { StepHeader } from "./components/StepHeader";
import "@fontsource/tiktok-sans/latin.css";

import { Button } from "./components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SunTimer } from "./components/SunTimer";
import { RelativeTime } from "./components/RelativeTime";
import { MathExplanation } from "./components/MathExplanation";
import { SunPositionCard } from "./components/SunPositionCard";

function App() {
	const {
		skinType,
		spfLevel,
		sweatLevel,
		startTimeMode,
		plannedStartTime,
		plannedDurationMinutes,
		exposureGoal,
		weatherProvider,
		geolocation,
		calculation,
		setCalculation,
		setGeolocationStatus,
		setWeather,
		setGeolocationError,
	} = useAppStore();

	const isReadyToCalculate = useIsReadyToCalculate();
	const currentTime = useCurrentTime();

	// Check if user has pre-loaded preferences (returning user)
	const hasPreloadedPrefs = !!(skinType && spfLevel);

	// Refresh weather data for saved locations
	useLocationRefresh();

	const calculationStartTime = useMemo(() => {
		if (startTimeMode !== StartTimeMode.PLANNED || !plannedStartTime) {
			return currentTime;
		}

		const parsedStartTime = parseDateTimeLocal(
			plannedStartTime,
			geolocation.weather?.timezone,
		);

		if (!parsedStartTime || parsedStartTime.getTime() < currentTime.getTime()) {
			return currentTime;
		}

		return parsedStartTime;
	}, [
		startTimeMode,
		plannedStartTime,
		geolocation.weather?.timezone,
		currentTime,
	]);

	const calculationInput = useMemo(() => {
		if (
			!isReadyToCalculate ||
			!geolocation.weather ||
			!geolocation.placeName ||
			!skinType ||
			spfLevel === undefined
		) {
			return undefined;
		}

		return {
			weather: geolocation.weather,
			placeName: geolocation.placeName,
			currentTime: calculationStartTime,
			skinType,
			spfLevel,
			sweatLevel: sweatLevel ?? DEFAULT_SWEAT_LEVEL,
		};
	}, [
		isReadyToCalculate,
		skinType,
		spfLevel,
		sweatLevel,
		geolocation.weather,
		geolocation.placeName,
		calculationStartTime,
	]);

	// Auto-calculate when all inputs are ready
	useEffect(() => {
		if (!calculationInput) {
			return;
		}

		const result = findOptimalTimeSlicing(calculationInput);
		setCalculation(result);
	}, [calculationInput, setCalculation]);

	const spfRecommendation = useMemo(() => {
		if (!calculationInput) return undefined;
		return recommendSPF(calculationInput, plannedDurationMinutes, exposureGoal);
	}, [calculationInput, plannedDurationMinutes, exposureGoal]);

	const handleRefresh = async () => {
		if (!geolocation.position) return;

		try {
			haptic();
			setGeolocationStatus("fetching_weather");
			const activeWeatherProvider =
				isGoogleWeatherTestRoute() && weatherProvider
					? weatherProvider
					: getActiveWeatherProvider();
			const weather = await fetchWeatherData(
				geolocation.position,
				activeWeatherProvider,
			);
			haptic.confirm();
			setWeather(weather);
		} catch (error) {
			haptic.error();
			setGeolocationError(
				error instanceof Error ? error.message : "Failed to fetch weather",
			);
		}
	};

	const showSweatLevel = spfLevel !== undefined && spfLevel !== SPFLevel.NONE;

	return (
		<div className="min-h-screen bg-orange-50">
			<div className="container mx-auto max-w-5xl px-4 py-5">
				{/* Header */}
				<div className="mb-5">
					<div className="flex items-center mb-2">
						<img
							src="/favicon.svg"
							alt=""
							aria-hidden="true"
							className="mr-3 h-9 w-9"
						/>
						<h1 className="text-2xl font-bold text-slate-800">
							Sunburn Calculator
						</h1>
					</div>
					<p className="text-slate-600 mb-1">
						Estimate time to sunburn by UV index, skin type, and SPF using live
						weather.
					</p>
					<p className="text-slate-500 text-sm">
						by <span className="font-medium">SunburnTimer</span>
					</p>
				</div>

				<div className="mb-6">
					<PlanControls
						currentTime={currentTime}
						timezone={geolocation.weather?.timezone}
						recommendation={spfRecommendation}
					/>
				</div>

				{/* Steps Accordion */}
				<Accordion
					type="multiple"
					defaultValue={hasPreloadedPrefs ? [] : ["step1", "step2", "step3"]}
					className="space-y-3"
				>
					{/* Step 1: Skin Type */}
					<AccordionItem
						value="step1"
						className="bg-card border-stone-200 shadow-sm rounded-lg mb-4"
					>
						<AccordionTrigger className="px-5 py-3 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={1}
									title="Fitzpatrick Skin Scale"
									description="Your skin's sensitivity to UV radiation. Click on your skin type."
									isCompleted={!!skinType}
									hideDescription={!!skinType}
								/>
								{skinType && (
									<div className="flex items-center gap-2 mt-4 ml-12">
										<Badge variant="outline">Type {skinType}</Badge>
									</div>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-5 pb-5">
							<SkinTypeSelector />
						</AccordionContent>
					</AccordionItem>

					{/* Step 2: Sunscreen */}
					<AccordionItem
						value="step2"
						className="bg-card border-stone-200 shadow-sm rounded-lg mb-4"
					>
						<AccordionTrigger className="px-5 py-3 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={2}
									title="Sunscreen Protection"
									description="Select your sunscreen SPF level. Higher SPF provides longer protection."
									isCompleted={!!spfLevel}
									hideDescription={!!spfLevel}
								/>
								{spfLevel && (
									<div className="flex items-center gap-2 mt-4 ml-12">
										<Badge variant="outline">
											{SPF_CONFIG[spfLevel].label}
										</Badge>
										{spfLevel !== SPFLevel.NONE && sweatLevel && (
											<Badge variant="outline">
												{SWEAT_CONFIG[sweatLevel].label} activity
											</Badge>
										)}
									</div>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-5 pb-5">
							<div className="space-y-6">
								<SPFSelector />

								{showSweatLevel && (
									<div>
										<h4 className="font-semibold mb-4 text-slate-800">
											Activity Level
										</h4>
										<SweatLevelSelector />
									</div>
								)}
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Step 3: Location & Weather */}
					<AccordionItem
						value="step3"
						className="bg-card border-stone-200 shadow-sm rounded-lg mb-4"
					>
						<AccordionTrigger className="px-5 py-3 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={3}
									title="Location & Weather"
									description="Used for cloud coverage and the angle of the sun."
									isCompleted={geolocation.status === "completed"}
									isLoading={
										geolocation.status === "fetching_location" ||
										geolocation.status === "fetching_weather"
									}
									hideDescription={geolocation.status === "completed"}
								/>
								{geolocation.status === "completed" &&
									geolocation.placeName &&
									geolocation.weather && (
										<div className="flex flex-col gap-2 mt-4 ml-12">
											<div className="flex items-center gap-2 flex-wrap">
												<Badge
													variant="outline"
													className="max-w-full truncate"
												>
													{geolocation.placeName}
												</Badge>
												<Badge
													className={`${getUVIndexColor(geolocation.weather.current.uvi).bg} ${getUVIndexColor(geolocation.weather.current.uvi).text} border-0`}
												>
													UV {geolocation.weather.current.uvi}
												</Badge>
												{geolocation.weather.aqi && (
													<Badge
														className={`${getAQIColor(geolocation.weather.aqi.us_aqi).bg} ${getAQIColor(geolocation.weather.aqi.us_aqi).text} border-0`}
													>
														AQI {geolocation.weather.aqi.us_aqi}
													</Badge>
												)}
											</div>
											<RelativeTime
												timestamp={
													geolocation.lastFetched ||
													geolocation.weather.current.dt * 1000
												}
												className="text-xs text-slate-500"
											/>
										</div>
									)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-5 pb-5">
							<LocationSelector />
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				{/* Results */}
				{calculation && (
					<div className="mt-6 space-y-5">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-bold text-slate-800">
								Safe Sun Exposure Time
							</h2>
							<div className="flex space-x-2">
								<Button
									variant="outline"
									onClick={handleRefresh}
									disabled={geolocation.status === "fetching_weather"}
									className="text-slate-700 border-stone-300 hover:bg-stone-100"
								>
									<RefreshCw
										className={`w-4 h-4 mr-2 ${
											geolocation.status === "fetching_weather"
												? "animate-spin"
												: ""
										}`}
									/>
									Refresh
								</Button>
							</div>
						</div>

						<ResultsDisplay
							result={calculation}
							timezone={geolocation.weather?.timezone}
						/>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<BurnChart
								result={calculation}
								timezone={geolocation.weather?.timezone}
							/>
							<UVChart
								result={calculation}
								timezone={geolocation.weather?.timezone}
								activityStartTime={calculationStartTime}
								activityDurationMinutes={plannedDurationMinutes}
							/>
						</div>
						<SunPositionCard />
						<SunTimer result={calculation} />
					</div>
				)}

				{/* FAQ and Resources temporarily removed */}

				<div className="mt-8">
					<MathExplanation />
				</div>

				{/* Footer */}
				<footer className="mt-16 pt-8 border-t border-stone-200">
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
						<div className="flex items-center gap-4">
							<span>Made by</span>
							<a
								href="https://joncallahan.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-amber-600 transition-colors"
							>
								Jon Callahan
							</a>
							<span className="text-slate-400">+</span>
							<a
								href="https://github.com/coloboxp"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-amber-600 transition-colors"
							>
								@coloboxp additions
							</a>
						</div>
						<div className="flex items-center gap-4">
							<a
								href="https://github.com/jondcallahan/sunburntimer"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-amber-600 transition-colors"
							>
								GitHub
							</a>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default App;
