import { Info } from "lucide-react";
import type { WeatherData } from "../types";
import {
	calculateSweatIndex,
	getSweatIndexDetails,
} from "../utils/sweat-index";
import { formatTemperature } from "../utils/temperature";
import { getWeatherIconDetails } from "../utils/weather-icon";
import { Card, CardContent } from "./ui/card";

interface CurrentConditionsCardProps {
	weather: WeatherData;
}

export function CurrentConditionsCard({ weather }: CurrentConditionsCardProps) {
	const currentWeather = weather.current.weather[0];
	const currentDewPoint = weather.current.dewPoint;
	const weatherIcon = getWeatherIconDetails(currentWeather?.id);
	const WeatherIcon = weatherIcon.Icon;
	const sweatIndex =
		currentDewPoint === undefined
			? null
			: getSweatIndexDetails(
					calculateSweatIndex(
						weather.current.temp,
						currentDewPoint,
						weather.temperatureUnit,
					),
				);

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex items-center space-x-4">
						<WeatherIcon
							className={`w-8 h-8 shrink-0 ${weatherIcon.className}`}
						/>
						<div>
							<p className="text-sm text-muted-foreground">Current Weather</p>
							<p className="text-sm font-medium capitalize">
								{currentWeather?.description || "Clear"}
							</p>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3 sm:min-w-72">
						<div>
							<p className="text-xs font-medium text-muted-foreground">Temp</p>
							<p className="text-xl font-bold tabular-nums">
								{formatTemperature(
									weather.current.temp,
									weather.temperatureUnit,
								)}
							</p>
						</div>
						{currentDewPoint !== undefined && (
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Dew point
								</p>
								<p className="text-xl font-bold tabular-nums">
									{formatTemperature(currentDewPoint, weather.temperatureUnit)}
								</p>
							</div>
						)}
						<div>
							<p className="text-xs font-medium text-muted-foreground">
								UV Index
							</p>
							<p className="text-xl font-bold tabular-nums">
								{weather.current.uvi}
							</p>
						</div>
						{sweatIndex && (
							<div>
								<div className="flex items-center gap-1">
									<p className="text-xs font-medium text-muted-foreground">
										Sweat Index
									</p>
									<Info
										className="h-3.5 w-3.5 text-muted-foreground"
										aria-label="Sweat Index is an outdoor comfort score based on temperature and dew point in Fahrenheit. Higher values mean hotter, muggier air."
									>
										<title>
											Sweat Index is an outdoor comfort score based on
											temperature and dew point in Fahrenheit. Higher values
											mean hotter, muggier air.
										</title>
									</Info>
								</div>
								<p className="text-xl font-bold tabular-nums">
									{sweatIndex.value}
								</p>
								<p
									className={`text-xs font-medium ${sweatIndex.textClassName}`}
								>
									{sweatIndex.description}
								</p>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
