'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EChartsWrapper } from '@/components/charts'
import type { EChartsOption } from 'echarts'

interface ContentDataPoint {
  id: string
  publishedAt: Date
  contentType: string
  likes: number
  comments: number
  shares: number
  reach: number
}

interface EngagementTrendsChartProps {
  data: ContentDataPoint[]
  isLoading?: boolean
}

export function EngagementTrendsChart({ data, isLoading }: EngagementTrendsChartProps) {
  const chartOption = useMemo<EChartsOption>(() => {
    if (!data.length) return {}

    // Sort by date
    const sorted = [...data].sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    )

    const dates = sorted.map((d) =>
      new Date(d.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )
    const likes = sorted.map((d) => d.likes)
    const comments = sorted.map((d) => d.comments)
    const shares = sorted.map((d) => d.shares)
    const reach = sorted.map((d) => d.reach)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Likes', 'Comments', 'Shares', 'Reach'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Engagement',
          position: 'left',
          axisLabel: {
            formatter: (value: number) => {
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
              return value.toString()
            },
          },
        },
        {
          type: 'value',
          name: 'Reach',
          position: 'right',
          axisLabel: {
            formatter: (value: number) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
              return value.toString()
            },
          },
        },
      ],
      series: [
        {
          name: 'Likes',
          type: 'line',
          data: likes,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#ec4899' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: 'Comments',
          type: 'line',
          data: comments,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#8b5cf6' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: 'Shares',
          type: 'line',
          data: shares,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#06b6d4' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: 'Reach',
          type: 'bar',
          yAxisIndex: 1,
          data: reach,
          barWidth: '40%',
          itemStyle: { color: 'rgba(59, 130, 246, 0.3)' },
        },
      ],
    }
  }, [data])

  // Content type breakdown chart
  const typeBreakdownOption = useMemo<EChartsOption>(() => {
    if (!data.length) return {}

    const typeStats = data.reduce(
      (acc, item) => {
        const type = item.contentType || 'OTHER'
        if (!acc[type]) {
          acc[type] = { count: 0, engagement: 0, reach: 0 }
        }
        acc[type].count++
        acc[type].engagement += item.likes + item.comments + item.shares
        acc[type].reach += item.reach
        return acc
      },
      {} as Record<string, { count: number; engagement: number; reach: number }>
    )

    const types = Object.keys(typeStats)
    const counts = types.map((t) => typeStats[t]?.count ?? 0)
    const avgEngagement = types.map((t) => {
      const stat = typeStats[t]
      return stat && stat.count > 0 ? Math.round(stat.engagement / stat.count) : 0
    })

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Post Count', 'Avg Engagement'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: types,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Count',
          position: 'left',
        },
        {
          type: 'value',
          name: 'Engagement',
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Post Count',
          type: 'bar',
          data: counts,
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Avg Engagement',
          type: 'bar',
          yAxisIndex: 1,
          data: avgEngagement,
          itemStyle: { color: '#10b981' },
        },
      ],
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No content data available for charts</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>Track likes, comments, shares, and reach for each post</CardDescription>
        </CardHeader>
        <CardContent>
          <EChartsWrapper option={chartOption} height={300} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Type Performance</CardTitle>
          <CardDescription>
            Compare post count and average engagement by content type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EChartsWrapper option={typeBreakdownOption} height={250} />
        </CardContent>
      </Card>
    </div>
  )
}
