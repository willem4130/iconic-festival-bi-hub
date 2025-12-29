/**
 * Visual Crossing Weather API Types
 * @see https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
 */

export interface WeatherApiConfig {
  apiKey: string
  defaultLocation?: string // e.g., "Amsterdam,Netherlands"
}

export interface WeatherConditions {
  datetime: string // "2025-01-15" or "2025-01-15T14:00:00"
  datetimeEpoch: number

  // Temperature (Celsius)
  temp: number
  tempmax?: number
  tempmin?: number
  feelslike: number
  feelslikemax?: number
  feelslikemin?: number

  // Atmospheric
  humidity: number
  pressure: number // hPa
  dew: number

  // Wind
  windspeed: number // km/h
  windgust?: number
  winddir: number // degrees

  // Visibility & clouds
  visibility: number // km
  cloudcover: number // percentage

  // Precipitation
  precip: number // mm
  precipprob: number // percentage
  preciptype?: string[] // ["rain", "snow", etc.]
  snow?: number // cm
  snowdepth?: number

  // Solar
  uvindex: number
  sunrise?: string
  sunset?: string
  solarradiation?: number
  solarenergy?: number

  // Conditions
  conditions: string // "Partially cloudy", "Rain", etc.
  description?: string
  icon: string // "partly-cloudy-day", "rain", etc.

  // Moon (daily only)
  moonphase?: number

  // Hours (daily only, contains hourly data)
  hours?: WeatherConditions[]
}

export interface WeatherApiResponse {
  queryCost: number
  latitude: number
  longitude: number
  resolvedAddress: string
  address: string
  timezone: string
  tzoffset: number
  days: WeatherConditions[]
  currentConditions?: WeatherConditions
  alerts?: WeatherAlert[]
}

export interface WeatherAlert {
  event: string
  headline: string
  description: string
  ends?: string
  onset?: string
  id: string
  language: string
  link: string
}

export interface WeatherForecast {
  location: string
  timezone: string
  current: WeatherConditions | null
  forecast: WeatherConditions[]
  alerts: WeatherAlert[]
}

export interface HistoricalWeather {
  location: string
  timezone: string
  data: WeatherConditions[]
}

export interface WeatherSyncResult {
  location: string
  daysStored: number
  dateRange: {
    from: string
    to: string
  }
}

// Weather condition icons for UI
export const WEATHER_ICONS: Record<string, string> = {
  'clear-day': '01d',
  'clear-night': '01n',
  'partly-cloudy-day': '02d',
  'partly-cloudy-night': '02n',
  cloudy: '03d',
  fog: '50d',
  wind: '50d',
  rain: '10d',
  'showers-day': '09d',
  'showers-night': '09n',
  snow: '13d',
  'snow-showers-day': '13d',
  'snow-showers-night': '13n',
  thunder: '11d',
  'thunder-rain': '11d',
  'thunder-showers-day': '11d',
  'thunder-showers-night': '11n',
}

// Weather condition categories for correlation analysis
export type WeatherCategory = 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy'

export function categorizeWeather(icon: string): WeatherCategory {
  if (icon.includes('clear')) return 'clear'
  if (icon.includes('cloud') || icon.includes('partly')) return 'cloudy'
  if (icon.includes('rain') || icon.includes('shower')) return 'rainy'
  if (icon.includes('thunder')) return 'stormy'
  if (icon.includes('snow')) return 'snowy'
  if (icon.includes('fog')) return 'foggy'
  return 'cloudy' // default
}

// Temperature buckets for analysis
export type TempBucket = 'cold' | 'cool' | 'mild' | 'warm' | 'hot'

export function categorizeTempCelsius(temp: number): TempBucket {
  if (temp < 5) return 'cold'
  if (temp < 12) return 'cool'
  if (temp < 18) return 'mild'
  if (temp < 25) return 'warm'
  return 'hot'
}
