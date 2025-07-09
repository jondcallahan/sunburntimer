import { useEffect } from "react";
import { RefreshCw, Sun, Trash2 } from "lucide-react";
import { useAppStore, useIsReadyToCalculate } from "./store";
import { findOptimalTimeSlicing } from "./calculations";
import { SPF_CONFIG, SPFLevel, SWEAT_CONFIG } from "./types";
import { useLocationRefresh } from "./hooks/useLocationRefresh";
import { fetchWeatherData } from "./services/weather";

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
    clearCalculation,
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
          className="space-y-4 mb-8"
        >
          {/* Step 1: Skin Type */}
          <AccordionItem value="step1">
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
          <AccordionItem value="step2">
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
          <AccordionItem value="step3">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex-1 text-left">
                <StepHeader
                  stepNumber={3}
                  title="Time & Place"
                  description="Used for cloud coverage and the angle of the sun."
                  isCompleted={geolocation.status === "completed"}
                  hideDescription={geolocation.status === "completed"}
                />
                {geolocation.status === "completed" && geolocation.placeName &&
                  geolocation.weather && (
                  <div className="flex flex-col gap-2 mt-3 ml-12">
                    <Badge variant="outline">{geolocation.placeName}</Badge>
                    <RelativeTime
                      timestamp={geolocation.lastFetched ||
                        geolocation.weather.current.dt * 1000}
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
                <Button
                  variant="outline"
                  onClick={clearCalculation}
                  className="text-slate-700 border-zinc-300 hover:bg-zinc-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Results
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

        {/* Technical Details */}
        <div className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem
              value="technical-details"
              className="bg-gradient-to-br from-zinc-50 to-zinc-100 rounded-xl overflow-hidden"
            >
              <AccordionTrigger className="px-8 py-6 hover:no-underline hover:bg-zinc-50/50 transition-colors">
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-amber-600">⚡</span>
                    Technical Details & Formula
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5">
                    Mathematical formula and scientific references
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-8">
                <div className="space-y-8 text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3 text-base">
                      Core Formula
                    </h4>
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
                      <div className="text-center mb-4">
                        <div className="font-mono text-sm bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                          <div className="text-slate-700 mb-2">
                            Time to burn (minutes) =
                          </div>
                          <div className="text-amber-700 font-semibold leading-relaxed">
                            <div className="ml-4">
                              (BASE_DAMAGE_TIME × skinTypeCoeff × spfCoeff)
                            </div>
                            <div className="ml-4">÷</div>
                            <div className="ml-4">
                              (uvIndex × UV_SCALING_FACTOR)
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-zinc-50 p-3 rounded-lg">
                          <span className="font-semibold text-slate-700">
                            BASE_DAMAGE_TIME
                          </span>
                          <span className="text-slate-600">: 200 minutes</span>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-lg">
                          <span className="font-semibold text-slate-700">
                            UV_SCALING_FACTOR
                          </span>
                          <span className="text-slate-600">: 3.0</span>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-lg">
                          <span className="font-semibold text-slate-700">
                            skinTypeCoeff
                          </span>
                          <span className="text-slate-600">
                            : varies by Fitzpatrick skin type
                          </span>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded-lg">
                          <span className="font-semibold text-slate-700">
                            spfCoeff
                          </span>
                          <span className="text-slate-600">
                            : SPF protection factor
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3 text-base">
                      Skin Type Coefficients
                    </h4>
                    <p className="text-slate-600 mb-4">
                      Based on Fitzpatrick skin types and Minimal Erythema Dose
                      (MED) values:
                    </p>
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                          <div className="font-semibold text-red-800">
                            Type I
                          </div>
                          <div className="text-red-700">Coeff: 2.5</div>
                          <div className="text-red-600 text-[10px]">
                            MED: 200 J/m²
                          </div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                          <div className="font-semibold text-orange-800">
                            Type II
                          </div>
                          <div className="text-orange-700">Coeff: 3.125</div>
                          <div className="text-orange-600 text-[10px]">
                            MED: 250 J/m²
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <div className="font-semibold text-yellow-800">
                            Type III
                          </div>
                          <div className="text-yellow-700">Coeff: 4.375</div>
                          <div className="text-yellow-600 text-[10px]">
                            MED: 350 J/m²
                          </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <div className="font-semibold text-amber-800">
                            Type IV
                          </div>
                          <div className="text-amber-700">Coeff: 5.625</div>
                          <div className="text-amber-600 text-[10px]">
                            MED: 450 J/m²
                          </div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                          <div className="font-semibold text-emerald-800">
                            Type V
                          </div>
                          <div className="text-emerald-700">Coeff: 7.5</div>
                          <div className="text-emerald-600 text-[10px]">
                            MED: 600 J/m²
                          </div>
                        </div>
                        <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg">
                          <div className="font-semibold text-teal-800">
                            Type VI
                          </div>
                          <div className="text-teal-700">Coeff: 12.5</div>
                          <div className="text-teal-600 text-[10px]">
                            MED: 1000 J/m²
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3 text-base">
                      References
                    </h4>
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <a
                          href="https://en.wikipedia.org/wiki/Fitzpatrick_scale"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
                        >
                          <span className="text-amber-600 mt-0.5">📖</span>
                          <div>
                            <div className="font-medium text-slate-800 group-hover:text-amber-700">
                              Fitzpatrick skin phototype scale
                            </div>
                            <div className="text-xs text-slate-500">
                              Wikipedia
                            </div>
                          </div>
                        </a>
                        <a
                          href="https://www.who.int/news-room/fact-sheets/detail/ultraviolet-radiation"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
                        >
                          <span className="text-amber-600 mt-0.5">🏥</span>
                          <div>
                            <div className="font-medium text-slate-800 group-hover:text-amber-700">
                              Ultraviolet radiation
                            </div>
                            <div className="text-xs text-slate-500">
                              World Health Organization
                            </div>
                          </div>
                        </a>
                        <a
                          href="https://www.epa.gov/sunsafety/uv-index-scale-0"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
                        >
                          <span className="text-amber-600 mt-0.5">🌞</span>
                          <div>
                            <div className="font-medium text-slate-800 group-hover:text-amber-700">
                              UV Index Scale
                            </div>
                            <div className="text-xs text-slate-500">
                              Environmental Protection Agency
                            </div>
                          </div>
                        </a>
                        <a
                          href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3709783/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-zinc-50 transition-colors group"
                        >
                          <span className="text-amber-600 mt-0.5">🔬</span>
                          <div>
                            <div className="font-medium text-slate-800 group-hover:text-amber-700">
                              Minimal erythema dose and skin phototype
                            </div>
                            <div className="text-xs text-slate-500">
                              National Center for Biotechnology Information
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-800 mb-3 text-base">
                      Additional Features
                    </h4>
                    <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-blue-600 mt-0.5">⏱️</span>
                          <div>
                            <div className="font-medium text-blue-800">
                              SPF Degradation
                            </div>
                            <div className="text-xs text-blue-600">
                              Time-based protection reduction by activity level
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <span className="text-purple-600 mt-0.5">📊</span>
                          <div>
                            <div className="font-medium text-purple-800">
                              UV Interpolation
                            </div>
                            <div className="text-xs text-purple-600">
                              Smooth transitions between hourly weather data
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <span className="text-red-600 mt-0.5">🛑</span>
                          <div>
                            <div className="font-medium text-red-800">
                              Safety Cutoff
                            </div>
                            <div className="text-xs text-red-600">
                              Automatic stopping at 100% burn damage
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-green-600 mt-0.5">🌤️</span>
                          <div>
                            <div className="font-medium text-green-800">
                              Weather Data
                            </div>
                             <div className="text-xs text-green-600">
                               Real-time data from Open-Meteo API
                             </div>                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

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
