import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	AppState,
	CalculationResult,
	EnsembleCalculationResult,
	GeolocationState,
	Position,
	WeatherData,
	WeatherProvider,
} from "./types";
import {
	type FitzpatrickType,
	SPFLevel,
	type SweatLevel,
	DEFAULT_SWEAT_LEVEL,
} from "./types";

interface AppStore extends AppState {
	// Actions
	setSkinType: (skinType: FitzpatrickType) => void;
	setSPFLevel: (spfLevel: SPFLevel) => void;
	setSweatLevel: (sweatLevel: SweatLevel) => void;
	setWeatherProvider: (weatherProvider: WeatherProvider) => void;
	setGeolocationStatus: (status: GeolocationState["status"]) => void;
	setPosition: (
		position: Position,
		placeName?: string,
		countryCode?: string,
	) => void;
	setWeather: (weather: WeatherData) => void;
	setEnsembleWeather: (weather: WeatherData[]) => void;
	setGeolocationError: (error: string) => void;
	setCalculation: (calculation: CalculationResult) => void;
	setEnsembleCalculation: (calculation: EnsembleCalculationResult) => void;
	clearCalculation: () => void;
	reset: () => void;
}

const initialState: AppState = {
	geolocation: {
		status: "blank",
	},
};

export const useAppStore = create<AppStore>()(
	persist(
		(set) => ({
			...initialState,

			setSkinType: (skinType) => set((state) => ({ ...state, skinType })),

			setSPFLevel: (spfLevel) =>
				set((state) => ({
					...state,
					spfLevel,
					// Auto-set sweat level to LOW (no sweating) when SPF is selected and no sweat level is set
					sweatLevel:
						spfLevel !== SPFLevel.NONE && !state.sweatLevel
							? DEFAULT_SWEAT_LEVEL
							: state.sweatLevel,
				})),

			setSweatLevel: (sweatLevel) => set((state) => ({ ...state, sweatLevel })),

			setWeatherProvider: (weatherProvider) =>
				set((state) => ({
					...state,
					weatherProvider,
					calculation: undefined,
					ensembleCalculation: undefined,
					geolocation: {
						...state.geolocation,
						weather: undefined,
						ensembleWeather: undefined,
						lastFetched: undefined,
						error: undefined,
					},
				})),

			setGeolocationStatus: (status) =>
				set((state) => ({
					...state,
					geolocation: { ...state.geolocation, status, error: undefined },
				})),

			setPosition: (position, placeName, countryCode) =>
				set((state) => ({
					...state,
					geolocation: {
						...state.geolocation,
						position,
						placeName,
						countryCode,
						error: undefined,
					},
				})),

			setWeather: (weather) =>
				set((state) => ({
					...state,
					geolocation: {
						...state.geolocation,
						weather,
						ensembleWeather: undefined,
						lastFetched: Date.now(),
						status: "completed",
					},
				})),

			setEnsembleWeather: (weather) =>
				set((state) => ({
					...state,
					geolocation: {
						...state.geolocation,
						weather: weather[0],
						ensembleWeather: weather,
						lastFetched: Date.now(),
						status: "completed",
					},
				})),

			setGeolocationError: (error) =>
				set((state) => ({
					...state,
					geolocation: {
						...state.geolocation,
						status: "error",
						error,
					},
				})),

			setCalculation: (calculation) =>
				set((state) => ({
					...state,
					calculation,
					ensembleCalculation: undefined,
				})),

			setEnsembleCalculation: (ensembleCalculation) =>
				set((state) => ({
					...state,
					calculation: undefined,
					ensembleCalculation,
				})),

			clearCalculation: () =>
				set((state) => ({
					...state,
					calculation: undefined,
					ensembleCalculation: undefined,
				})),

			reset: () => set(initialState),
		}),
		{
			name: "sunburntimer-storage",
			partialize: (state) => ({
				skinType: state.skinType,
				spfLevel: state.spfLevel,
				sweatLevel: state.sweatLevel,
				weatherProvider: state.weatherProvider,
				geolocation:
					state.geolocation.status === "completed" && state.geolocation.position
						? {
								status: "completed" as const,
								position: state.geolocation.position,
								placeName: state.geolocation.placeName,
								countryCode: state.geolocation.countryCode,
								// Note: weather data will be refreshed on app load
							}
						: {
								status: "blank" as const,
							},
			}),
		},
	),
);

// Selectors
export const useIsReadyToCalculate = () => {
	const { skinType, spfLevel, sweatLevel, geolocation } = useAppStore();

	return !!(
		skinType &&
		spfLevel !== undefined &&
		(spfLevel === SPFLevel.NONE || sweatLevel) &&
		geolocation.status === "completed" &&
		geolocation.weather
	);
};
