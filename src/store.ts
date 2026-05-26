import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	AppState,
	CalculationResult,
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
	type UnitSystem,
	DEFAULT_UNIT_SYSTEM,
	type StartTimeMode,
	DEFAULT_START_TIME_MODE,
	type ExposureGoal,
	DEFAULT_EXPOSURE_GOAL,
	DEFAULT_PLANNED_DURATION_MINUTES,
} from "./types";

interface AppStore extends AppState {
	// Actions
	setSkinType: (skinType: FitzpatrickType) => void;
	setSPFLevel: (spfLevel: SPFLevel) => void;
	setSweatLevel: (sweatLevel: SweatLevel) => void;
	setUnitSystem: (unitSystem: UnitSystem) => void;
	setStartTimeMode: (startTimeMode: StartTimeMode) => void;
	setPlannedStartTime: (plannedStartTime: string) => void;
	setPlannedDurationMinutes: (plannedDurationMinutes: number) => void;
	setExposureGoal: (exposureGoal: ExposureGoal) => void;
	setWeatherProvider: (weatherProvider: WeatherProvider) => void;
	setGeolocationStatus: (status: GeolocationState["status"]) => void;
	setPosition: (
		position: Position,
		placeName?: string,
		countryCode?: string,
	) => void;
	setWeather: (weather: WeatherData) => void;
	setGeolocationError: (error: string) => void;
	setCalculation: (calculation: CalculationResult) => void;
	clearCalculation: () => void;
	reset: () => void;
}

const initialState: AppState = {
	unitSystem: DEFAULT_UNIT_SYSTEM,
	startTimeMode: DEFAULT_START_TIME_MODE,
	plannedDurationMinutes: DEFAULT_PLANNED_DURATION_MINUTES,
	exposureGoal: DEFAULT_EXPOSURE_GOAL,
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

			setUnitSystem: (unitSystem) => set((state) => ({ ...state, unitSystem })),

			setStartTimeMode: (startTimeMode) =>
				set((state) => ({ ...state, startTimeMode })),

			setPlannedStartTime: (plannedStartTime) =>
				set((state) => ({ ...state, plannedStartTime })),

			setPlannedDurationMinutes: (plannedDurationMinutes) =>
				set((state) => ({ ...state, plannedDurationMinutes })),

			setExposureGoal: (exposureGoal) =>
				set((state) => ({ ...state, exposureGoal })),

			setWeatherProvider: (weatherProvider) =>
				set((state) => ({
					...state,
					weatherProvider,
					calculation: undefined,
					geolocation: {
						...state.geolocation,
						weather: undefined,
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
				set((state) => ({ ...state, calculation })),

			clearCalculation: () =>
				set((state) => ({ ...state, calculation: undefined })),

			reset: () => set(initialState),
		}),
		{
			name: "sunburntimer-storage",
			partialize: (state) => ({
				skinType: state.skinType,
				spfLevel: state.spfLevel,
				sweatLevel: state.sweatLevel,
				unitSystem: state.unitSystem,
				startTimeMode: state.startTimeMode,
				plannedStartTime: state.plannedStartTime,
				plannedDurationMinutes: state.plannedDurationMinutes,
				exposureGoal: state.exposureGoal,
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
