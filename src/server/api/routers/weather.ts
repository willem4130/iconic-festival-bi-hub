/**
 * Weather Router - Visual Crossing API Integration
 *
 * Provides weather data sync and forecast capabilities for correlation
 * analysis with social media engagement metrics.
 */

import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import {
  createWeatherClientFromEnv,
  categorizeWeather,
  categorizeTempCelsius,
  type WeatherSyncResult,
} from '@/lib/weather-api'

import { db as prismaDb } from '@/server/db'

type PrismaClient = typeof prismaDb

/**
 * Get or create a DimDate record for a given date
 */
async function ensureDimDate(db: PrismaClient, dateStr: string): Promise<string> {
  const date = new Date(dateStr)

  // Check if exists
  const existing = await db.dimDate.findUnique({
    where: { date },
    select: { id: true },
  })

  if (existing) return existing.id

  // Calculate date parts
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const dayOfMonth = date.getDate()
  const dayOfWeek = date.getDay()
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )

  // ISO week calculation
  const jan4 = new Date(year, 0, 4)
  const startOfWeek = new Date(jan4.getTime() - ((jan4.getDay() || 7) - 1) * 86400000)
  const week = Math.ceil(((date.getTime() - startOfWeek.getTime()) / 86400000 + 1) / 7)

  // Quarter calculation
  const quarter = Math.ceil(month / 3)

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  const created = await db.dimDate.create({
    data: {
      date,
      year,
      quarter,
      month,
      week,
      dayOfMonth,
      dayOfWeek,
      dayOfYear,
      monthName: monthNames[month - 1]!,
      dayName: dayNames[dayOfWeek]!,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday: false,
      isFestivalDay: false,
    },
    select: { id: true },
  })

  return created.id
}

export const weatherRouter = createTRPCRouter({
  /**
   * Get connection status for Weather API
   */
  getConnectionStatus: protectedProcedure.query(async () => {
    const client = createWeatherClientFromEnv()

    if (!client) {
      return {
        connected: false,
        error: 'VISUAL_CROSSING_API_KEY not configured',
        location: null,
      }
    }

    try {
      const isValid = await client.validateApiKey()
      return {
        connected: isValid,
        error: isValid ? null : 'Invalid API key',
        location: client.location,
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        location: client.location,
      }
    }
  }),

  /**
   * Get current weather conditions
   */
  getCurrentWeather: protectedProcedure
    .input(
      z
        .object({
          location: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const client = createWeatherClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Weather API not configured',
        })
      }

      try {
        const current = await client.getCurrentConditions(input?.location)

        if (!current) {
          return null
        }

        return {
          temp: current.temp,
          feelsLike: current.feelslike,
          humidity: current.humidity,
          windSpeed: current.windspeed,
          conditions: current.conditions,
          icon: current.icon,
          category: categorizeWeather(current.icon),
          tempCategory: categorizeTempCelsius(current.temp),
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch weather',
        })
      }
    }),

  /**
   * Get weather forecast for upcoming days
   */
  getForecast: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(15).default(7),
        location: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const client = createWeatherClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Weather API not configured',
        })
      }

      try {
        const forecast = await client.getForecast(input.location, input.days)

        return {
          location: forecast.location,
          timezone: forecast.timezone,
          current: forecast.current
            ? {
                temp: forecast.current.temp,
                feelsLike: forecast.current.feelslike,
                humidity: forecast.current.humidity,
                conditions: forecast.current.conditions,
                icon: forecast.current.icon,
                category: categorizeWeather(forecast.current.icon),
              }
            : null,
          forecast: forecast.forecast.map((day) => ({
            date: day.datetime,
            tempMin: day.tempmin,
            tempMax: day.tempmax,
            tempAvg: day.temp,
            humidity: day.humidity,
            precipProb: day.precipprob,
            conditions: day.conditions,
            icon: day.icon,
            category: categorizeWeather(day.icon),
            tempCategory: categorizeTempCelsius(day.temp),
            sunrise: day.sunrise,
            sunset: day.sunset,
          })),
          alerts: forecast.alerts,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch forecast',
        })
      }
    }),

  /**
   * Sync historical weather data to database
   */
  syncWeather: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }): Promise<WeatherSyncResult> => {
      const client = createWeatherClientFromEnv()

      if (!client) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Weather API not configured',
        })
      }

      const location = input.location ?? client.location

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)

      try {
        const historical = await client.getHistoricalWeather(startDate, endDate, location)

        // Parse location coordinates (Visual Crossing returns resolved address)
        // Default to Amsterdam coordinates if parsing fails
        let lat = 52.3676
        let lon = 4.9041

        // Try to extract coordinates from resolved address if it contains them
        const coordMatch = historical.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/)
        if (coordMatch) {
          lat = parseFloat(coordMatch[1]!)
          lon = parseFloat(coordMatch[2]!)
        }

        let daysStored = 0

        for (const day of historical.data) {
          const dateStr = day.datetime
          const dateId = await ensureDimDate(ctx.db, dateStr)

          // Upsert weather data
          await ctx.db.factWeatherDaily.upsert({
            where: {
              dateId_locationLat_locationLon: {
                dateId,
                locationLat: lat,
                locationLon: lon,
              },
            },
            create: {
              dateId,
              locationLat: lat,
              locationLon: lon,
              locationName: location,
              tempMin: day.tempmin,
              tempMax: day.tempmax,
              tempAvg: day.temp,
              feelsLike: day.feelslike,
              humidity: Math.round(day.humidity),
              pressure: Math.round(day.pressure),
              windSpeed: day.windspeed,
              windDirection: Math.round(day.winddir),
              clouds: Math.round(day.cloudcover),
              visibility: Math.round(day.visibility * 1000), // km to meters
              weatherMain: categorizeWeather(day.icon),
              weatherDesc: day.conditions,
              weatherIcon: day.icon,
              rain: day.precip > 0 && !day.icon.includes('snow') ? day.precip : null,
              snow: day.snow ?? null,
              uvIndex: day.uvindex,
            },
            update: {
              locationName: location,
              tempMin: day.tempmin,
              tempMax: day.tempmax,
              tempAvg: day.temp,
              feelsLike: day.feelslike,
              humidity: Math.round(day.humidity),
              pressure: Math.round(day.pressure),
              windSpeed: day.windspeed,
              windDirection: Math.round(day.winddir),
              clouds: Math.round(day.cloudcover),
              visibility: Math.round(day.visibility * 1000),
              weatherMain: categorizeWeather(day.icon),
              weatherDesc: day.conditions,
              weatherIcon: day.icon,
              rain: day.precip > 0 && !day.icon.includes('snow') ? day.precip : null,
              snow: day.snow ?? null,
              uvIndex: day.uvindex,
            },
          })

          daysStored++
        }

        return {
          location,
          daysStored,
          dateRange: {
            from: startDate.toISOString().split('T')[0]!,
            to: endDate.toISOString().split('T')[0]!,
          },
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync weather',
        })
      }
    }),

  /**
   * Get stored weather data from database
   */
  getStoredWeather: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const weatherData = await ctx.db.factWeatherDaily.findMany({
        where: {
          date: {
            date: {
              gte: cutoffDate,
            },
          },
        },
        include: {
          date: {
            select: {
              date: true,
              dayName: true,
              isWeekend: true,
            },
          },
        },
        orderBy: {
          date: {
            date: 'asc',
          },
        },
      })

      return weatherData.map((w) => ({
        date: w.date.date.toISOString().split('T')[0],
        dayName: w.date.dayName,
        isWeekend: w.date.isWeekend,
        location: w.locationName,
        tempMin: w.tempMin,
        tempMax: w.tempMax,
        tempAvg: w.tempAvg,
        humidity: w.humidity,
        windSpeed: w.windSpeed,
        conditions: w.weatherDesc,
        icon: w.weatherIcon,
        category: w.weatherMain,
        rain: w.rain,
        uvIndex: w.uvIndex,
      }))
    }),

  /**
   * Get weather summary statistics
   */
  getWeatherStats: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - input.days)

      const weatherData = await ctx.db.factWeatherDaily.findMany({
        where: {
          date: {
            date: {
              gte: cutoffDate,
            },
          },
        },
        select: {
          tempAvg: true,
          tempMin: true,
          tempMax: true,
          humidity: true,
          rain: true,
          weatherMain: true,
        },
      })

      if (weatherData.length === 0) {
        return null
      }

      const temps = weatherData.map((w) => w.tempAvg).filter((t): t is number => t !== null)
      const humidity = weatherData.map((w) => w.humidity).filter((h): h is number => h !== null)

      // Count weather conditions
      const conditionCounts: Record<string, number> = {}
      for (const w of weatherData) {
        const cat = w.weatherMain ?? 'unknown'
        conditionCounts[cat] = (conditionCounts[cat] ?? 0) + 1
      }

      const rainyDays = weatherData.filter((w) => w.rain && w.rain > 0).length

      return {
        daysAnalyzed: weatherData.length,
        temperature: {
          avg: temps.reduce((a, b) => a + b, 0) / temps.length,
          min: Math.min(...temps),
          max: Math.max(...temps),
        },
        humidity: {
          avg: humidity.reduce((a, b) => a + b, 0) / humidity.length,
        },
        rainyDays,
        rainyDaysPercent: (rainyDays / weatherData.length) * 100,
        conditionBreakdown: conditionCounts,
      }
    }),
})
