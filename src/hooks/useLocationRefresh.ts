import { useEffect } from "react";
import { useAppStore } from "../store";
import { fetchWeatherData } from "../services/weather";

export function useLocationRefresh() {
	const { geolocation, setGeolocationStatus, setWeather, setGeolocationError } =
		useAppStore();

	useEffect(() => {
		// If we have a saved location but no weather data, refresh the weather
		if (
			geolocation.status === "completed" &&
			geolocation.position &&
			!geolocation.weather
		) {
			const refreshWeather = async () => {
				try {
					setGeolocationStatus("fetching_weather");
					const weather = await fetchWeatherData(geolocation.position!);
					setWeather(weather);
				} catch (error) {
					setGeolocationError(
						error instanceof Error
							? error.message
							: "Failed to refresh weather data",
					);
				}
			};

			refreshWeather();
		}
	}, [
		geolocation.status,
		geolocation.position,
		geolocation.weather,
		setGeolocationStatus,
		setWeather,
		setGeolocationError,
	]);
}
