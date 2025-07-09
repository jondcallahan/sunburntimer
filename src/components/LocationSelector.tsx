import { MapPin, Loader2, AlertCircle, CheckCircle, Cloud, Edit } from 'lucide-react'
import { useAppStore } from '../store'
import { getCurrentPosition, reverseGeocode, formatElevation } from '../services/geolocation'
import { fetchWeatherData } from '../services/weather'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'

export function LocationSelector() {
  const {
    geolocation,
    setGeolocationStatus,
    setPosition,
    setWeather,
    setGeolocationError
  } = useAppStore()


  const handleCurrentLocation = async () => {
    try {
      setGeolocationStatus('fetching_location')

      const position = await getCurrentPosition()
      const {placeName, countryCode} = await reverseGeocode(position)
      setPosition(position, placeName, countryCode)

      setGeolocationStatus('fetching_weather')
      const weather = await fetchWeatherData(position)
      setWeather(weather)

    } catch (error) {
      setGeolocationError(error instanceof Error ? error.message : 'Failed to get location')
    }
  }


  const renderStatus = () => {
    switch (geolocation.status) {
      case 'blank':
        return (
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Choose your location to get weather data</p>
            </CardContent>
          </Card>
        )

      case 'fetching_location':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <span className="font-medium text-blue-900">Getting your location...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs opacity-50"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Cloud className="w-8 h-8 text-gray-300" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Weather</p>
                      <p className="text-sm text-muted-foreground">Loading...</p>
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
        )

      case 'fetching_weather':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <span className="font-medium text-blue-900">Fetching weather data...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="text-xs opacity-50"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Weather</p>
                      <p className="text-sm text-muted-foreground">Loading...</p>
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
        )

      case 'completed':
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <span className="font-medium text-green-900">{geolocation.placeName}</span>
                {geolocation.weather && (
                  <p className="text-sm text-green-700">
                    {formatElevation(geolocation.weather.elevation, geolocation.countryCode || 'US')} elevation
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGeolocationStatus('blank')
                }}
                className="text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>

            {geolocation.weather && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Cloud className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Current Weather</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(geolocation.weather.current.temp)}°F, UV Index: {geolocation.weather.current.uvi}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {Math.round(geolocation.weather.current.temp)}°
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {geolocation.weather.current.weather[0]?.description || 'Clear'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )

      case 'error':
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
        )

      default:
        return null
    }
  }

  const isLoading = geolocation.status === 'fetching_location' || geolocation.status === 'fetching_weather'

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
      </div>

      {renderStatus()}
    </div>
  )
}