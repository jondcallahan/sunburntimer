import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  CalculationResult,
  GeolocationState,
  Position,
  WeatherData,
} from "./types";
import { FitzpatrickType, SPFLevel, SweatLevel } from "./types";

interface AppStore extends AppState {
  // Actions
  setSkinType: (skinType: FitzpatrickType) => void;
  setSPFLevel: (spfLevel: SPFLevel) => void;
  setSweatLevel: (sweatLevel: SweatLevel) => void;
  setGeolocationStatus: (status: GeolocationState["status"]) => void;
  setPosition: (position: Position, placeName?: string) => void;
  setWeather: (weather: WeatherData) => void;
  setGeolocationError: (error: string) => void;
  setCalculation: (calculation: CalculationResult) => void;
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
          sweatLevel: spfLevel !== SPFLevel.NONE && !state.sweatLevel
            ? SweatLevel.LOW
            : state.sweatLevel,
        })),

      setSweatLevel: (sweatLevel) => set((state) => ({ ...state, sweatLevel })),

      setGeolocationStatus: (status) =>
        set((state) => ({
          ...state,
          geolocation: { ...state.geolocation, status, error: undefined },
        })),

      setPosition: (position, placeName) =>
        set((state) => ({
          ...state,
          geolocation: {
            ...state.geolocation,
            position,
            placeName,
            error: undefined,
          },
        })),

      setWeather: (weather) =>
        set((state) => ({
          ...state,
          geolocation: {
            ...state.geolocation,
            weather,
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
        geolocation:
          state.geolocation.status === "completed" && state.geolocation.position
            ? {
              status: "completed" as const,
              position: state.geolocation.position,
              placeName: state.geolocation.placeName,
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
