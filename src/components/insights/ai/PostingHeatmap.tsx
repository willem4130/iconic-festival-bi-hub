'use client'

import { useMemo } from 'react'
import { EChartsWrapper } from '@/components/charts/echarts-wrapper'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'

interface PostingHeatmapProps {
  weeklySchedule: Array<{
    day: string
    postCount: number
    bestTimes: number[]
    contentType: string
    theme: string
  }>
  bestPostingTime: {
    dayOfWeek: string
    hour: number
  }
  secondaryPostingTimes?: Array<{
    dayOfWeek: string
    hour: number
    engagementPotential: 'high' | 'medium' | 'low'
  }>
}

// Map day names to indices (Monday = 0, Sunday = 6)
const DAY_MAP: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Hours to display (6 AM to 11 PM for typical posting times)
const HOUR_RANGE = { start: 6, end: 23 }
const HOURS = Array.from(
  { length: HOUR_RANGE.end - HOUR_RANGE.start + 1 },
  (_, i) => HOUR_RANGE.start + i
)

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}${suffix}`
}

export function PostingHeatmap({
  weeklySchedule,
  bestPostingTime,
  secondaryPostingTimes = [],
}: PostingHeatmapProps) {
  const chartOption = useMemo((): EChartsOption => {
    // Create heatmap data: [hour_index, day_index, value]
    // Value: 0 = not recommended, 1 = secondary, 2 = good, 3 = best
    const heatmapData: [number, number, number][] = []

    // Initialize all cells to 0
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      for (let hourIdx = 0; hourIdx < HOURS.length; hourIdx++) {
        heatmapData.push([hourIdx, dayIdx, 0])
      }
    }

    // Mark best times from weekly schedule (value = 2)
    weeklySchedule.forEach((schedule) => {
      const dayIdx = DAY_MAP[schedule.day]
      if (dayIdx === undefined) return

      schedule.bestTimes.forEach((hour) => {
        if (hour >= HOUR_RANGE.start && hour <= HOUR_RANGE.end) {
          const hourIdx = hour - HOUR_RANGE.start
          const existingIdx = heatmapData.findIndex((d) => d[0] === hourIdx && d[1] === dayIdx)
          if (existingIdx !== -1) {
            heatmapData[existingIdx] = [hourIdx, dayIdx, 2]
          }
        }
      })
    })

    // Mark secondary posting times (value = 1)
    secondaryPostingTimes.forEach((time) => {
      const dayIdx = DAY_MAP[time.dayOfWeek]
      if (dayIdx === undefined) return

      if (time.hour >= HOUR_RANGE.start && time.hour <= HOUR_RANGE.end) {
        const hourIdx = time.hour - HOUR_RANGE.start
        const existingIdx = heatmapData.findIndex((d) => d[0] === hourIdx && d[1] === dayIdx)
        const existing = heatmapData[existingIdx]
        if (existingIdx !== -1 && existing && existing[2] < 2) {
          const value =
            time.engagementPotential === 'high'
              ? 2
              : time.engagementPotential === 'medium'
                ? 1.5
                : 1
          heatmapData[existingIdx] = [hourIdx, dayIdx, value]
        }
      }
    })

    // Mark THE best posting time (value = 3)
    const bestDayIdx = DAY_MAP[bestPostingTime.dayOfWeek]
    if (
      bestDayIdx !== undefined &&
      bestPostingTime.hour >= HOUR_RANGE.start &&
      bestPostingTime.hour <= HOUR_RANGE.end
    ) {
      const hourIdx = bestPostingTime.hour - HOUR_RANGE.start
      const existingIdx = heatmapData.findIndex((d) => d[0] === hourIdx && d[1] === bestDayIdx)
      if (existingIdx !== -1) {
        heatmapData[existingIdx] = [hourIdx, bestDayIdx, 3]
      }
    }

    return {
      tooltip: {
        position: 'top',
        formatter: (params) => {
          // Handle both single item and array
          const item = Array.isArray(params) ? params[0] : params
          if (!item || typeof item !== 'object' || !('data' in item)) return ''

          const data = item.data as [number, number, number]
          const hourIdx = data[0]
          const dayIdx = data[1]
          const value = data[2]

          const hour = HOURS[hourIdx] ?? 12
          const day = DAY_LABELS[dayIdx] ?? 'Unknown'

          let level = 'Not recommended'
          if (value === 3) level = 'Best time to post'
          else if (value >= 2) level = 'Recommended'
          else if (value >= 1) level = 'Secondary option'

          return `<div style="text-align: center">
            <strong>${day} at ${formatHour(hour)}</strong><br/>
            <span style="color: ${value >= 2 ? '#22c55e' : value >= 1 ? '#f59e0b' : '#9ca3af'}">${level}</span>
          </div>`
        },
      },
      grid: {
        top: 30,
        bottom: 60,
        left: 50,
        right: 30,
      },
      xAxis: {
        type: 'category',
        data: HOURS.map(formatHour),
        splitArea: { show: true },
        axisLabel: {
          fontSize: 10,
          rotate: 45,
        },
      },
      yAxis: {
        type: 'category',
        data: DAY_LABELS,
        splitArea: { show: true },
        axisLabel: {
          fontSize: 11,
        },
      },
      visualMap: {
        min: 0,
        max: 3,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: {
          color: ['#f3f4f6', '#fde68a', '#86efac', '#22c55e'],
        },
        text: ['Best', 'Not recommended'],
        textStyle: {
          fontSize: 10,
        },
      },
      series: [
        {
          name: 'Posting Times',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
        },
      ],
    }
  }, [weeklySchedule, bestPostingTime, secondaryPostingTimes])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Optimal Posting Times Heatmap
        </CardTitle>
        <CardDescription>
          Visual overview of the best times to post based on your audience engagement patterns.
          Darker green indicates higher engagement potential.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EChartsWrapper option={chartOption} height={280} />
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-500" />
            Best time
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-300" />
            Recommended
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-200" />
            Secondary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100" />
            Not recommended
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
