/**
 * Weather API module - Visual Crossing integration
 *
 * Provides weather data for correlation analysis with social media engagement.
 * Uses Visual Crossing API for historical and forecast weather data.
 *
 * @example
 * ```typescript
 * import { createWeatherClientFromEnv } from '@/lib/weather-api'
 *
 * const client = createWeatherClientFromEnv()
 * if (client) {
 *   const forecast = await client.getForecast('Amsterdam,Netherlands', 7)
 *   console.log(forecast.current?.temp) // Current temperature in Celsius
 * }
 * ```
 */

export { WeatherApiClient, WeatherApiError, createWeatherClientFromEnv } from './client'

export type {
  WeatherApiConfig,
  WeatherApiResponse,
  WeatherConditions,
  WeatherAlert,
  WeatherForecast,
  HistoricalWeather,
  WeatherSyncResult,
  WeatherCategory,
  TempBucket,
} from './types'

export { WEATHER_ICONS, categorizeWeather, categorizeTempCelsius } from './types'
