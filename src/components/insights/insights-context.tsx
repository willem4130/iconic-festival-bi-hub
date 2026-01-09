'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type Platform = 'all' | 'facebook' | 'instagram'
export type ViewMode = 'overview' | 'detailed'
export type ChartMode = 'overlay' | 'separate'

interface InsightsContextValue {
  // Platform selection
  platform: Platform
  setPlatform: (platform: Platform) => void

  // View modes
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  chartMode: ChartMode
  setChartMode: (mode: ChartMode) => void

  // Time range
  days: number
  setDays: (days: number) => void

  // Content filters
  contentType: string | null
  setContentType: (type: string | null) => void

  // Date range
  startDate: string | null
  endDate: string | null
  setDateRange: (start: string | null, end: string | null) => void

  // Utility
  resetFilters: () => void
}

const InsightsContext = createContext<InsightsContextValue | null>(null)

export function useInsights() {
  const context = useContext(InsightsContext)
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider')
  }
  return context
}

export function InsightsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [platform, setPlatformState] = useState<Platform>(
    (searchParams.get('platform') as Platform) ?? 'all'
  )
  const [viewMode, setViewModeState] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) ?? 'overview'
  )
  const [chartMode, setChartModeState] = useState<ChartMode>(
    (searchParams.get('chart') as ChartMode) ?? 'overlay'
  )
  const [days, setDaysState] = useState<number>(parseInt(searchParams.get('days') ?? '30', 10))
  const [contentType, setContentTypeState] = useState<string | null>(
    searchParams.get('contentType')
  )
  const [startDate, setStartDate] = useState<string | null>(searchParams.get('start'))
  const [endDate, setEndDate] = useState<string | null>(searchParams.get('end'))

  // Update URL when state changes
  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === '' ||
          value === 'all' ||
          value === 'overview' ||
          value === 'overlay' ||
          value === '30'
        ) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const setPlatform = useCallback(
    (newPlatform: Platform) => {
      setPlatformState(newPlatform)
      updateURL({ platform: newPlatform })
    },
    [updateURL]
  )

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode)
      updateURL({ view: mode })
    },
    [updateURL]
  )

  const setChartMode = useCallback(
    (mode: ChartMode) => {
      setChartModeState(mode)
      updateURL({ chart: mode })
    },
    [updateURL]
  )

  const setDays = useCallback(
    (newDays: number) => {
      setDaysState(newDays)
      updateURL({ days: newDays.toString() })
    },
    [updateURL]
  )

  const setContentType = useCallback(
    (type: string | null) => {
      setContentTypeState(type)
      updateURL({ contentType: type })
    },
    [updateURL]
  )

  const setDateRange = useCallback(
    (start: string | null, end: string | null) => {
      setStartDate(start)
      setEndDate(end)
      updateURL({ start, end })
    },
    [updateURL]
  )

  const resetFilters = useCallback(() => {
    setPlatformState('all')
    setViewModeState('overview')
    setChartModeState('overlay')
    setDaysState(30)
    setContentTypeState(null)
    setStartDate(null)
    setEndDate(null)
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  // Sync state from URL on mount and navigation
  useEffect(() => {
    setPlatformState((searchParams.get('platform') as Platform) ?? 'all')
    setViewModeState((searchParams.get('view') as ViewMode) ?? 'overview')
    setChartModeState((searchParams.get('chart') as ChartMode) ?? 'overlay')
    setDaysState(parseInt(searchParams.get('days') ?? '30', 10))
    setContentTypeState(searchParams.get('contentType'))
    setStartDate(searchParams.get('start'))
    setEndDate(searchParams.get('end'))
  }, [searchParams])

  return (
    <InsightsContext.Provider
      value={{
        platform,
        setPlatform,
        viewMode,
        setViewMode,
        chartMode,
        setChartMode,
        days,
        setDays,
        contentType,
        setContentType,
        startDate,
        endDate,
        setDateRange,
        resetFilters,
      }}
    >
      {children}
    </InsightsContext.Provider>
  )
}
