import type { Position } from '../types'

interface GeolocationOptions {
  enableHighAccuracy: boolean
  timeout: number
  maximumAge: number
}

export async function getCurrentPosition(): Promise<Position> {
  const options: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,        // 10 seconds
    maximumAge: 600000     // 10 minutes
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        const errorMessages: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'This site is not allowed to use your location. Please enable location permissions in your browser settings.',
          [error.POSITION_UNAVAILABLE]: 'Your device failed to discover your location. Please check that location services are enabled.',
          [error.TIMEOUT]: 'Your device could not determine your position in a reasonable time. Please try again.'
        }
        reject(new Error(errorMessages[error.code] || 'Your device failed to discover your location due to an unknown error.'))
      },
      options
    )
  })
}

interface BigDataCloudResponse {
  city: string;
  locality: string;
  countryName: string;
  principalSubdivision: string;
  countryCode: string;
}

export async function reverseGeocode(position: Position): Promise<string> {
  try {
    // Use BigDataCloud's free reverse geocoding API (no API key required, CORS enabled)
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.latitude}&longitude=${position.longitude}&localityLanguage=en`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed')
    }
    
    const data: BigDataCloudResponse = await response.json()
    
    // Build a human-friendly location name
    const parts: string[] = []
    
    if (data.city) {
      parts.push(data.city)
    } else if (data.locality) {
      parts.push(data.locality)
    }
    
    if (data.principalSubdivision && data.countryCode === 'US') {
      // For US locations, show state abbreviation
      parts.push(data.principalSubdivision)
    } else if (data.principalSubdivision && parts.length > 0) {
      // For other countries, show the subdivision if we have a city
      parts.push(data.principalSubdivision)
    }
    
    if (data.countryName && data.countryCode !== 'US') {
      // Show country for non-US locations
      parts.push(data.countryName)
    }
    
    if (parts.length > 0) {
      return parts.join(', ')
    }
    
    // If we got data but no usable location parts, show country at least
    if (data.countryName) {
      return data.countryName
    }
    
  } catch (error) {
    console.warn('Reverse geocoding failed:', error)
  }

  // Fallback to coordinates if geocoding fails
  return `Your Current Location (${position.latitude.toFixed(2)}°, ${position.longitude.toFixed(2)}°)`
}