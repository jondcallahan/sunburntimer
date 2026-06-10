import { useAppStore } from "../store";
import {
	calculateSweatIndex,
	getSweatIndexDetails,
} from "../utils/sweat-index";

export function useSweatIndex() {
	const weather = useAppStore((s) => s.geolocation.weather);
	if (!weather || weather.current.dewPoint === undefined) return null;

	const value = calculateSweatIndex(
		weather.current.temp,
		weather.current.dewPoint,
		weather.temperatureUnit,
	);

	return getSweatIndexDetails(value);
}
