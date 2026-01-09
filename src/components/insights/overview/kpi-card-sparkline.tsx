'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SparklineData {
  value: number
  date?: string
}

interface KPICardSparklineProps {
  title: string
  value: string
  icon: LucideIcon
  description?: string
  loading?: boolean
  trend?: {
    value: number
    label: string
  }
  sparklineData?: SparklineData[]
  className?: string
}

function Sparkline({ data, className }: { data: SparklineData[]; className?: string }) {
  const { path } = useMemo(() => {
    if (!data.length) return { path: '', minY: 0, maxY: 0 }

    const values = data.map((d) => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const width = 100
    const height = 24
    const padding = 2

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding
      const y = height - ((d.value - min) / range) * (height - padding * 2) - padding
      return `${x},${y}`
    })

    return {
      path: `M ${points.join(' L ')}`,
      minY: min,
      maxY: max,
    }
  }, [data])

  if (!data.length) return null

  // Determine trend color based on first vs last value
  const trendUp = data.length > 1 && data[data.length - 1]!.value > data[0]!.value
  const strokeColor = trendUp ? '#22c55e' : data.length > 1 ? '#ef4444' : '#6b7280'

  return (
    <svg viewBox="0 0 100 24" className={cn('h-6 w-full', className)} preserveAspectRatio="none">
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function KPICardSparkline({
  title,
  value,
  icon: Icon,
  description,
  loading,
  trend,
  sparklineData,
  className,
}: KPICardSparklineProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null
  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-600'
      : trend.value < 0
        ? 'text-red-600'
        : 'text-muted-foreground'
    : ''

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend && TrendIcon && (
            <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>
                {trend.value > 0 ? '+' : ''}
                {trend.value.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {sparklineData && sparklineData.length > 1 && (
          <div className="mt-3">
            <Sparkline data={sparklineData} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
