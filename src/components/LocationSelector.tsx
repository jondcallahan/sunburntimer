import {
	MapPin,
	LoaderIcon,
	AlertCircle,
	CheckCircle,
	Cloud,
	Edit,
	Info,
} from "lucide-react";
import { haptic } from "ios-haptics";
import { useAppStore } from "../store";
import {
	getCurrentPosition,
	reverseGeocode,
	formatElevation,
} from "../services/geolocation";
import { fetchWeatherData } from "../services/weather";
import { LocationSearch } from "./LocationSearch";
import type { GeocodingResult } from "../services/geocoding";
import { formatTemperature } from "../utils/temperature";
import {
	calculateSweatIndex,
	getSweatIndexDetails,
} from "../utils/sweat-index";
import { getWeatherIconDetails } from "../utils/weather-icon";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

export function LocationSelector() {
	const {
		geolocation,
		setGeolocationStatus,
		setPosition,
		setWeather,
		setGeolocationError,
	} = useAppStore();
	const sweatIndex = geolocation.weather
		? getSweatIndexDetails(
				calculateSweatIndex(
					geolocation.weather.current.temp,
					geolocation.weather.current.dewPoint,
					geolocation.weather.temperatureUnit,
				),
			)
		: null;
	const currentWeather = geolocation.weather?.current.weather[0];
	const weatherIcon = getWeatherIconDetails(currentWeather?.id);
	const WeatherIcon = weatherIcon.Icon;

	const handleSearchSelect = async (result: GeocodingResult) => {
		try {
			haptic();
			const position = {
				latitude: result.latitude,
				longitude: result.longitude,
			};
			const placeName = result.admin1
				? `${result.name}, ${result.admin1}`
				: result.name;
			setPosition(position, placeName, result.countryCode);

			setGeolocationStatus("fetching_weather");
			const weather = await fetchWeatherData(position, result.countryCode);
			haptic.confirm();
			setWeather(weather);
		} catch (error) {
			haptic.error();
			setGeolocationError(
				error instanceof Error ? error.message : "Failed to fetch weather",
			);
		}
	};

	const handleCurrentLocation = async () => {
		try {
			haptic();
			setGeolocationStatus("fetching_location");

			const position = await getCurrentPosition();
			const { placeName, countryCode } = await reverseGeocode(position);
			setPosition(position, placeName, countryCode);

			setGeolocationStatus("fetching_weather");
			const weather = await fetchWeatherData(position, countryCode);
			haptic.confirm();
			setWeather(weather);
		} catch (error) {
			haptic.error();
			setGeolocationError(
				error instanceof Error ? error.message : "Failed to get location",
			);
		}
	};

	const renderStatus = () => {
		switch (geolocation.status) {
			case "blank":
				return (
					<Card>
						<CardContent className="p-8 text-center">
							<MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">
								Choose your location to get weather data
							</p>
						</CardContent>
					</Card>
				);

			case "fetching_location":
				return (
					<div className="space-y-4">
						<div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<LoaderIcon className="h-5 w-5 text-blue-600 animate-spin" />
							<div className="flex-1">
								<span className="font-medium text-blue-900">
									Getting your location...
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled
								className="text-xs opacity-50"
							>
								<Edit className="w-4 h-4 mr-2" />
								Change
							</Button>
						</div>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<Cloud className="w-8 h-8 text-gray-300" />
										<div>
											<p className="text-sm text-muted-foreground">
												Current Weather
											</p>
											<p className="text-sm text-muted-foreground">
												Loading...
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-2xl font-bold text-gray-300">--°</p>
										<p className="text-sm text-muted-foreground">Loading...</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				);

			case "fetching_weather":
				return (
					<div className="space-y-4">
						<div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
							<LoaderIcon className="h-5 w-5 text-blue-600 animate-spin" />
							<div className="flex-1">
								<span className="font-medium text-blue-900">
									Fetching weather data...
								</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								disabled
								className="text-xs opacity-50"
							>
								<Edit className="w-4 h-4 mr-2" />
								Change
							</Button>
						</div>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center space-x-4">
										<LoaderIcon className="w-8 h-8 text-primary animate-spin" />
										<div>
											<p className="text-sm text-muted-foreground">
												Current Weather
											</p>
											<p className="text-sm text-muted-foreground">
												Loading...
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-2xl font-bold text-gray-300">--°</p>
										<p className="text-sm text-muted-foreground">Loading...</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				);

			case "completed":
				return (
					<div className="space-y-4">
						<div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg border border-green-200">
							<CheckCircle className="h-5 w-5 text-green-600" />
							<div className="flex-1">
								<span className="font-medium text-green-900">
									{geolocation.placeName}
								</span>
								{geolocation.weather && (
									<p className="text-sm text-green-700">
										{formatElevation(
											geolocation.weather.elevation,
											geolocation.countryCode || "US",
										)}{" "}
										elevation
									</p>
								)}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									haptic();
									setGeolocationStatus("blank");
								}}
								className="text-xs"
							>
								<Edit className="w-4 h-4 mr-2" />
								Change
							</Button>
						</div>

						{geolocation.weather && (
							<Card>
								<CardContent className="p-4">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
										<div className="flex items-center space-x-4">
											<WeatherIcon
												className={`w-8 h-8 shrink-0 ${weatherIcon.className}`}
											/>
											<div>
												<p className="text-sm text-muted-foreground">
													Current Weather
												</p>
												<p className="text-sm font-medium capitalize">
													{currentWeather?.description || "Clear"}
												</p>
											</div>
										</div>
										<div className="grid grid-cols-2 gap-3 sm:min-w-72">
											<div>
												<p className="text-xs font-medium text-muted-foreground">
													Temp
												</p>
												<p className="text-xl font-bold tabular-nums">
													{formatTemperature(
														geolocation.weather.current.temp,
														geolocation.weather.temperatureUnit,
													)}
												</p>
											</div>
											<div>
												<p className="text-xs font-medium text-muted-foreground">
													Dew point
												</p>
												<p className="text-xl font-bold tabular-nums">
													{formatTemperature(
														geolocation.weather.current.dewPoint,
														geolocation.weather.temperatureUnit,
													)}
												</p>
											</div>
											<div>
												<p className="text-xs font-medium text-muted-foreground">
													UV Index
												</p>
												<p className="text-xl font-bold tabular-nums">
													{geolocation.weather.current.uvi}
												</p>
											</div>
											{sweatIndex && (
												<div>
													<div className="flex items-center gap-1">
														<p className="text-xs font-medium text-muted-foreground">
															Sweat Index™
														</p>
														<Info
															className="h-3.5 w-3.5 text-muted-foreground"
															aria-label="Sweat Index is temperature plus dew point, a quick workout comfort score rather than an official heat safety metric."
														>
															<title>
																Temp + dew point. A quick workout comfort score,
																not an official heat safety metric.
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
						)}
					</div>
				);

			case "error":
				return (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							<div>
								<p className="font-medium">Error</p>
								<p className="text-sm">{geolocation.error}</p>
							</div>
						</AlertDescription>
					</Alert>
				);

			default:
				return null;
		}
	};

	const isLoading =
		geolocation.status === "fetching_location" ||
		geolocation.status === "fetching_weather";

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4">
				<Button
					variant="outline"
					onClick={handleCurrentLocation}
					disabled={isLoading}
					className="h-auto p-4 border-dashed"
				>
					<MapPin className="w-5 h-5 mr-2" />
					Use Current Location
				</Button>

				<div className="flex items-center gap-3">
					<div className="flex-1 border-t border-border" />
					<span className="text-xs text-muted-foreground">or</span>
					<div className="flex-1 border-t border-border" />
				</div>

				<LocationSearch onSelect={handleSearchSelect} disabled={isLoading} />
			</div>

			{renderStatus()}
		</div>
	);
}
