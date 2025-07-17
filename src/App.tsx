import { useEffect } from "react";
import { RefreshCw, Sun } from "lucide-react";
import { useAppStore, useIsReadyToCalculate } from "./store";
import { findOptimalTimeSlicing } from "./calculations";
import { SPF_CONFIG, SPFLevel, SWEAT_CONFIG } from "./types";
import { useLocationRefresh } from "./hooks/useLocationRefresh";
import { fetchWeatherData } from "./services/weather";
import { getUVIndexColor } from "./lib/utils";

import { SkinTypeSelector } from "./components/SkinTypeSelector";
import { SPFSelector } from "./components/SPFSelector";
import { SweatLevelSelector } from "./components/SweatLevelSelector";
import { LocationSelector } from "./components/LocationSelector";
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
import { TechnicalDetails } from "./components/TechnicalDetails";

import { Button } from "./components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SunTimer } from "./components/SunTimer";
import { RelativeTime } from "./components/RelativeTime";

function App() {
	const {
		skinType,
		spfLevel,
		sweatLevel,
		geolocation,
		calculation,
		setCalculation,
		setGeolocationStatus,
		setWeather,
		setGeolocationError,
	} = useAppStore();

	const isReadyToCalculate = useIsReadyToCalculate();

	// Check if user has pre-loaded preferences (returning user)
	const hasPreloadedPrefs = !!(skinType && spfLevel);

	// Refresh weather data for saved locations
	useLocationRefresh();

	// Auto-calculate when all inputs are ready
	useEffect(() => {
		if (isReadyToCalculate && geolocation.weather && geolocation.placeName) {
			const input = {
				weather: geolocation.weather,
				placeName: geolocation.placeName,
				currentTime: new Date(),
				skinType: skinType!,
				spfLevel: spfLevel!,
				sweatLevel: sweatLevel!,
			};

			const result = findOptimalTimeSlicing(input);
			setCalculation(result);
		}
	}, [
		isReadyToCalculate,
		skinType,
		spfLevel,
		sweatLevel,
		geolocation.weather,
		geolocation.placeName,
		setCalculation,
	]);

	const handleRefresh = async () => {
		if (!geolocation.position) return;

		try {
			setGeolocationStatus("fetching_weather");
			const weather = await fetchWeatherData(geolocation.position);
			setWeather(weather);
		} catch (error) {
			setGeolocationError(
				error instanceof Error
					? error.message
					: "Failed to refresh weather data",
			);
		}
	};

	const showSweatLevel = spfLevel !== undefined && spfLevel !== SPFLevel.NONE;

	return (
		<div className="min-h-screen bg-orange-50">
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="flex items-center justify-center mb-4">
						<Sun className="w-8 h-8 text-amber-600 mr-3" />
						<h1 className="text-3xl font-bold text-slate-800">SunburnTimer</h1>
					</div>
					<p className="text-slate-600">
						Calculate safe sun exposure time based on your skin type,
						protection, and real-time weather
					</p>
				</div>

				{/* Steps Accordion */}
				<Accordion
					type="multiple"
					defaultValue={hasPreloadedPrefs ? [] : ["step1", "step2", "step3"]}
					className="space-y-4"
				>
					{/* Step 1: Skin Type */}
					<AccordionItem value="step1" className="shadow-sm rounded-lg mb-4">
						<AccordionTrigger className="px-6 py-4 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={1}
									title="Fitzpatrick Skin Scale"
									description="Your skin's sensitivity to UV radiation. Click on your skin type."
									isCompleted={!!skinType}
									hideDescription={!!skinType}
								/>
								{skinType && (
									<div className="flex items-center gap-2 mt-3 ml-12">
										<Badge variant="outline">Type {skinType}</Badge>
									</div>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-6 pb-6">
							<SkinTypeSelector />
						</AccordionContent>
					</AccordionItem>

					{/* Step 2: Sunscreen */}
					<AccordionItem value="step2" className="shadow-sm rounded-lg mb-4">
						<AccordionTrigger className="px-6 py-4 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={2}
									title="Sunscreen Protection"
									description="Select your sunscreen SPF level. Higher SPF provides longer protection."
									isCompleted={!!spfLevel}
									hideDescription={!!spfLevel}
								/>
								{spfLevel && (
									<div className="flex items-center gap-2 mt-3 ml-12">
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
						<AccordionContent className="px-6 pb-6">
							<div className="space-y-6">
								<SPFSelector />

								{showSweatLevel && (
									<div>
										<h4 className="font-semibold mb-3 text-slate-800">
											Activity Level
										</h4>
										<SweatLevelSelector />
									</div>
								)}
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Step 3: Location & Weather */}
					<AccordionItem value="step3" className="shadow-sm rounded-lg mb-4">
						<AccordionTrigger className="px-6 py-4 hover:no-underline">
							<div className="flex-1 text-left">
								<StepHeader
									stepNumber={3}
									title="Time & Place"
									description="Used for cloud coverage and the angle of the sun."
									isCompleted={geolocation.status === "completed"}
									hideDescription={geolocation.status === "completed"}
								/>
								{geolocation.status === "completed" &&
									geolocation.placeName &&
									geolocation.weather && (
										<div className="flex flex-col gap-2 mt-3 ml-12">
											<div className="flex items-center gap-2">
												<Badge variant="outline">{geolocation.placeName}</Badge>
												<Badge
													className={`${getUVIndexColor(geolocation.weather.current.uvi).bg} ${getUVIndexColor(geolocation.weather.current.uvi).text} border-0`}
												>
													UV {geolocation.weather.current.uvi}
												</Badge>
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
						<AccordionContent className="px-6 pb-6">
							<LocationSelector />
						</AccordionContent>
					</AccordionItem>
				</Accordion>

				{/* Results */}
				{calculation && (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-slate-800">Results</h2>
							<div className="flex space-x-2">
								<Button
									variant="outline"
									onClick={handleRefresh}
									disabled={geolocation.status === "fetching_weather"}
									className="text-slate-700 border-zinc-300 hover:bg-zinc-100"
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

						<ResultsDisplay result={calculation} />
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<BurnChart result={calculation} />
							<UVChart result={calculation} />
						</div>
						<SunTimer result={calculation} />
					</div>
				)}

				<TechnicalDetails />

				{/* Footer */}
				<footer className="mt-8 pt-8 border-t border-zinc-200">
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
							<a
								href="https://buymeacoffee.com/joncallahan"
								target="_blank"
								rel="noopener noreferrer"
								className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
							>
								☕ Buy me a coffee
							</a>
						</div>
					</div>
				</footer>
			</div>
		</div>
	);
}

export default App;
