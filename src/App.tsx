import { useEffect } from "react";
import { RefreshCw, Sun, Trash2 } from "lucide-react";
import { useAppStore, useIsReadyToCalculate } from "./store";
import { findOptimalTimeSlicing } from "./calculations";
import { SPFLevel } from "./types";
import { useLocationRefresh } from "./hooks/useLocationRefresh";
import { fetchWeatherData } from "./services/weather";

import { SkinTypeSelector } from "./components/SkinTypeSelector";
import { SPFSelector } from "./components/SPFSelector";
import { SweatLevelSelector } from "./components/SweatLevelSelector";
import { LocationSelector } from "./components/LocationSelector";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { BurnChart } from "./components/BurnChart";
import { UVChart } from "./components/UVChart";
import { StepHeader } from "./components/StepHeader";

import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { SunTimer } from "./components/SunTimer";

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
    <div className="min-h-screen bg-stone-50">
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

        {/* Step 1: Skin Type */}
        <Card className="mb-8 bg-stone-100 border-stone-200 shadow-sm">
          <CardHeader>
            <StepHeader 
              stepNumber={1}
              title="Fitzpatrick Skin Scale"
              description="Your skin's sensitivity to UV radiation. Click on your skin type."
              isCompleted={!!skinType}
            />
          </CardHeader>
          <CardContent>
            <SkinTypeSelector />
          </CardContent>
        </Card>

        {/* Step 2: Sunscreen */}
        <Card className="mb-8 bg-stone-100 border-stone-200 shadow-sm">
          <CardHeader>
            <StepHeader 
              stepNumber={2}
              title="Sunscreen Protection"
              description="Select your sunscreen SPF level. Higher SPF provides longer protection."
              isCompleted={!!spfLevel}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <SPFSelector />

            {showSweatLevel && (
              <div>
                <h4 className="font-semibold mb-3 text-slate-800">
                  Activity Level
                </h4>
                <SweatLevelSelector />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Location & Weather */}
        <Card className="mb-8 bg-stone-100 border-stone-200 shadow-sm">
          <CardHeader>
            <StepHeader 
              stepNumber={3}
              title="Time & Place"
              description="Used for cloud coverage and the angle of the sun."
              isCompleted={geolocation.status === 'completed'}
            />
          </CardHeader>
          <CardContent>
            <LocationSelector />
          </CardContent>
        </Card>

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
                <Button
                  variant="outline"
                  onClick={clearCalculation}
                  className="text-slate-700 border-stone-300 hover:bg-stone-100"
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

      </div>
    </div>
  );
}

export default App;
