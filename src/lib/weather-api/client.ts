/**
 * Visual Crossing Weather API Client
 * @see https://www.visualcrossing.com/resources/documentation/weather-api/timeline-weather-api/
 */

import type {
  WeatherApiConfig,
  WeatherApiResponse,
  WeatherForecast,
  HistoricalWeather,
  WeatherConditions,
} from './types'

export class WeatherApiError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode: number) {
    super(message)
    this.name = 'WeatherApiError'
    this.code = code
    this.statusCode = statusCode
  }
}

export class WeatherApiClient {
  private apiKey: string
  private defaultLocation: string
  private baseUrl =
    'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline'

  constructor(config: WeatherApiConfig) {
    this.apiKey = config.apiKey
    this.defaultLocation = config.defaultLocation ?? 'Amsterdam,Netherlands'
  }

  /**
   * Make a request to the Visual Crossing API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`
    const separator = endpoint.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}key=${this.apiKey}&unitGroup=metric&include=days,hours,alerts,current`

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new WeatherApiError(
        errorText || `HTTP ${response.status}`,
        'API_ERROR',
        response.status
      )
    }

    return response.json() as Promise<T>
  }

  /**
   * Get current weather and forecast for a location
   * @param location - Location string (e.g., "Amsterdam,Netherlands" or "52.3676,4.9041")
   * @param days - Number of forecast days (1-15, default 7)
   */
  async getForecast(location?: string, days: number = 7): Promise<WeatherForecast> {
    const loc = location ?? this.defaultLocation

    // Visual Crossing uses "next{days}days" syntax
    const endpoint = `${encodeURIComponent(loc)}/next${Math.min(days, 15)}days`
    const data = await this.request<WeatherApiResponse>(endpoint)

    return {
      location: data.resolvedAddress,
      timezone: data.timezone,
      current: data.currentConditions ?? null,
      forecast: data.days,
      alerts: data.alerts ?? [],
    }
  }

  /**
   * Get historical weather data for a date range
   * @param location - Location string
   * @param startDate - Start date (YYYY-MM-DD or Date object)
   * @param endDate - End date (YYYY-MM-DD or Date object)
   */
  async getHistoricalWeather(
    startDate: Date | string,
    endDate: Date | string,
    location?: string
  ): Promise<HistoricalWeather> {
    const loc = location ?? this.defaultLocation
    const start = this.formatDate(startDate)
    const end = this.formatDate(endDate)

    const endpoint = `${encodeURIComponent(loc)}/${start}/${end}`
    const data = await this.request<WeatherApiResponse>(endpoint)

    return {
      location: data.resolvedAddress,
      timezone: data.timezone,
      data: data.days,
    }
  }

  /**
   * Get weather for a specific date
   * @param date - Date (YYYY-MM-DD or Date object)
   * @param location - Location string
   */
  async getWeatherForDate(
    date: Date | string,
    location?: string
  ): Promise<WeatherConditions | null> {
    const loc = location ?? this.defaultLocation
    const dateStr = this.formatDate(date)

    const endpoint = `${encodeURIComponent(loc)}/${dateStr}`
    const data = await this.request<WeatherApiResponse>(endpoint)

    return data.days[0] ?? null
  }

  /**
   * Get current conditions only
   */
  async getCurrentConditions(location?: string): Promise<WeatherConditions | null> {
    const loc = location ?? this.defaultLocation

    // today endpoint returns current conditions
    const endpoint = `${encodeURIComponent(loc)}/today`
    const data = await this.request<WeatherApiResponse>(endpoint)

    return data.currentConditions ?? null
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      // Validate format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new WeatherApiError('Invalid date format. Use YYYY-MM-DD', 'INVALID_DATE', 400)
      }
      return date
    }
    return date.toISOString().split('T')[0]!
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getCurrentConditions()
      return true
    } catch {
      return false
    }
  }

  /**
   * Get location coordinates from address
   */
  get location(): string {
    return this.defaultLocation
  }
}

/**
 * Create a WeatherApiClient from environment variables
 */
export function createWeatherClientFromEnv(): WeatherApiClient | null {
  const apiKey = process.env.VISUAL_CROSSING_API_KEY
  const location = process.env.VISUAL_CROSSING_LOCATION ?? 'Amsterdam,Netherlands'

  if (!apiKey) {
    console.warn('Weather API: VISUAL_CROSSING_API_KEY not configured')
    return null
  }

  return new WeatherApiClient({
    apiKey,
    defaultLocation: location,
  })
}
