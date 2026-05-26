import { useEffect } from "react";
import { useAppStore } from "../store";
import {
	fetchWeatherData,
	getActiveWeatherProvider,
	isGoogleWeatherTestRoute,
} from "../services/weather";

export function useLocationRefresh() {
	const {
		geolocation,
		weatherProvider,
		setGeolocationStatus,
		setWeather,
		setGeolocationError,
	} = useAppStore();

	useEffect(() => {
		// If we have a saved location but no weather data, refresh the weather
		if (
			geolocation.status === "completed" &&
			geolocation.position &&
			!geolocation.weather
		) {
			const position = geolocation.position;
			const refreshWeather = async () => {
				try {
					setGeolocationStatus("fetching_weather");
					const activeWeatherProvider =
						isGoogleWeatherTestRoute() && weatherProvider
							? weatherProvider
							: getActiveWeatherProvider();
					const weather = await fetchWeatherData(
						position,
						activeWeatherProvider,
					);
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
		weatherProvider,
		setGeolocationStatus,
		setWeather,
		setGeolocationError,
	]);
}
