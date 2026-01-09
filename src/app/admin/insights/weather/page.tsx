'use client'

import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EChartsWrapper } from '@/components/charts'
import {
  ArrowLeft,
  Cloud,
  Sun,
  CloudRain,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function WeatherCorrelationPage() {
  const [days, setDays] = useState(90)

  // Use OAuth connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  const { data, isLoading } = api.metaInsights.getWeatherCorrelation.useQuery(
    { days },
    { enabled: isConnected }
  )

  // Weather vs engagement bar chart
  const weatherEngagementChart: EChartsOption = useMemo(() => {
    if (!data?.weatherSummary.length) {
      return { title: { text: 'No weather data available', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const p = params as Array<{ name: string; value: number; seriesName: string }>
          let result = `<strong>${p[0]?.name}</strong><br/>`
          for (const item of p) {
            result += `${item.seriesName}: ${item.value.toLocaleString()}<br/>`
          }
          return result
        },
      },
      legend: {
        data: ['Avg Engagement', 'Avg Reach'],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.weatherSummary.map((w) => w.weather),
        axisLabel: { rotate: 0 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString(),
        },
      },
      series: [
        {
          name: 'Avg Engagement',
          type: 'bar',
          data: data.weatherSummary.map((w) => w.avgEngagement),
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Avg Reach',
          type: 'bar',
          data: data.weatherSummary.map((w) => w.avgReach),
          itemStyle: { color: '#22c55e' },
        },
      ],
    }
  }, [data])

  // Temperature vs engagement chart
  const temperatureChart: EChartsOption = useMemo(() => {
    if (!data?.temperatureSummary.length) {
      return { title: { text: 'No temperature data available', left: 'center', top: 'center' } }
    }

    const colors = ['#60a5fa', '#93c5fd', '#a7f3d0', '#fcd34d', '#fb923c', '#ef4444']

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: data.temperatureSummary.map((t) => t.range),
      },
      yAxis: {
        type: 'value',
        name: 'Avg Engagement',
      },
      series: [
        {
          type: 'bar',
          data: data.temperatureSummary.map((t, i) => ({
            value: t.avgEngagement,
            itemStyle: {
              color: colors[i % colors.length],
            },
          })),
          label: {
            show: true,
            position: 'top',
            formatter: '{c}',
          },
        },
      ],
    }
  }, [data])

  // Scatter plot: Temperature vs Engagement
  const scatterChart: EChartsOption = useMemo(() => {
    if (!data?.correlationData.length) {
      return { title: { text: 'No correlation data available', left: 'center', top: 'center' } }
    }

    // Group data by weather type for different colored series
    const weatherTypes = ['Clear', 'Clouds', 'Rain', 'Snow', 'Other']
    const weatherColors: Record<string, string> = {
      Clear: '#fcd34d',
      Clouds: '#94a3b8',
      Rain: '#3b82f6',
      Snow: '#e5e7eb',
      Other: '#8b5cf6',
    }

    const groupedData = new Map<string, Array<[number, number]>>()
    for (const type of weatherTypes) {
      groupedData.set(type, [])
    }

    for (const d of data.correlationData) {
      const type = weatherTypes.includes(d.weatherMain) ? d.weatherMain : 'Other'
      groupedData.get(type)?.push([d.temperature, d.engagement])
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{a}<br/>Temp: {c0}°C, Engagement: {c1}',
      },
      legend: {
        data: weatherTypes.filter((t) => (groupedData.get(t)?.length ?? 0) > 0),
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Temperature (°C)',
        nameLocation: 'middle',
        nameGap: 30,
      },
      yAxis: {
        type: 'value',
        name: 'Engagement',
        axisLabel: {
          formatter: (value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString(),
        },
      },
      series: weatherTypes
        .filter((type) => (groupedData.get(type)?.length ?? 0) > 0)
        .map((type) => ({
          name: type,
          type: 'scatter' as const,
          symbolSize: 10,
          data: groupedData.get(type),
          itemStyle: {
            color: weatherColors[type],
          },
        })),
    }
  }, [data])

  // Rain impact chart
  const rainImpactChart: EChartsOption = useMemo(() => {
    if (!data?.rainImpact) {
      return { title: { text: 'No rain data available', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'item',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{c} days',
          },
          data: [
            {
              name: 'Dry Days',
              value: data.rainImpact.dryDaysCount,
              itemStyle: { color: '#fcd34d' },
            },
            {
              name: 'Rainy Days',
              value: data.rainImpact.rainyDaysCount,
              itemStyle: { color: '#3b82f6' },
            },
          ],
        },
      ],
    }
  }, [data])

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'Clear':
        return <Sun className="h-4 w-4 text-yellow-500" />
      case 'Clouds':
        return <Cloud className="h-4 w-4 text-gray-500" />
      case 'Rain':
      case 'Drizzle':
        return <CloudRain className="h-4 w-4 text-blue-500" />
      default:
        return <Cloud className="h-4 w-4 text-gray-400" />
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  // Find best/worst weather
  const bestWeather = data?.weatherSummary[0]
  const worstWeather = data?.weatherSummary[data.weatherSummary.length - 1]

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Insights
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Weather Correlation</h1>
            <p className="text-gray-500">How weather affects social media engagement</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your Facebook and Instagram accounts to view weather correlation insights.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/settings/connections">Configure Connection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Insights
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Weather Correlation</h1>
            <p className="text-gray-500">How weather affects social media engagement</p>
          </div>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!data?.hasData && !isLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No Weather Data</AlertTitle>
          <AlertDescription>
            Weather data needs to be synced to see correlation insights. Configure a weather API
            (like OpenWeatherMap) and sync historical data to enable this feature.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Insights */}
      {data?.hasData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Weather</p>
                  <div className="flex items-center gap-2">
                    {bestWeather && getWeatherIcon(bestWeather.weather)}
                    <span className="text-lg font-bold">{bestWeather?.weather ?? 'N/A'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatNumber(bestWeather?.avgEngagement ?? 0)} engagement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Worst Weather</p>
                  <div className="flex items-center gap-2">
                    {worstWeather && getWeatherIcon(worstWeather.weather)}
                    <span className="text-lg font-bold">{worstWeather?.weather ?? 'N/A'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatNumber(worstWeather?.avgEngagement ?? 0)} engagement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Droplets className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rain Impact</p>
                  <span className="text-lg font-bold">
                    {data.rainImpact.rainyDaysAvgEngagement > data.rainImpact.dryDaysAvgEngagement
                      ? '+'
                      : ''}
                    {Math.round(
                      ((data.rainImpact.rainyDaysAvgEngagement -
                        data.rainImpact.dryDaysAvgEngagement) /
                        Math.max(data.rainImpact.dryDaysAvgEngagement, 1)) *
                        100
                    )}
                    %
                  </span>
                  <p className="text-xs text-muted-foreground">vs dry days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <Thermometer className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Points</p>
                  <span className="text-lg font-bold">{data.correlationData.length}</span>
                  <p className="text-xs text-muted-foreground">days analyzed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="weather" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weather">By Weather Type</TabsTrigger>
          <TabsTrigger value="temperature">By Temperature</TabsTrigger>
          <TabsTrigger value="scatter">Temperature Scatter</TabsTrigger>
          <TabsTrigger value="rain">Rain Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <CardTitle>Engagement by Weather Condition</CardTitle>
              <CardDescription>Average engagement and reach for each weather type</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={weatherEngagementChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="temperature">
          <Card>
            <CardHeader>
              <CardTitle>Engagement by Temperature Range</CardTitle>
              <CardDescription>How temperature affects social media activity</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={temperatureChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scatter">
          <Card>
            <CardHeader>
              <CardTitle>Temperature vs Engagement</CardTitle>
              <CardDescription>
                Each point represents a day (colored by weather type)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={scatterChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rain">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Rainy vs Dry Days</CardTitle>
                <CardDescription>Distribution of weather days</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <EChartsWrapper option={rainImpactChart} height={300} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rain Impact Summary</CardTitle>
                <CardDescription>Engagement comparison</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <Sun className="h-6 w-6 text-yellow-500" />
                    <div>
                      <p className="font-medium">Dry Days</p>
                      <p className="text-sm text-muted-foreground">
                        {data?.rainImpact.dryDaysCount} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatNumber(data?.rainImpact.dryDaysAvgEngagement ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">avg engagement</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3">
                    <CloudRain className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="font-medium">Rainy Days</p>
                      <p className="text-sm text-muted-foreground">
                        {data?.rainImpact.rainyDaysCount} days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {formatNumber(data?.rainImpact.rainyDaysAvgEngagement ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">avg engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Weather Summary Table */}
      {data?.weatherSummary && data.weatherSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weather Performance Summary</CardTitle>
            <CardDescription>Detailed breakdown by weather condition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">Weather</th>
                    <th className="py-3 text-right font-medium">Days</th>
                    <th className="py-3 text-right font-medium">Avg Temp</th>
                    <th className="py-3 text-right font-medium">Avg Engagement</th>
                    <th className="py-3 text-right font-medium">Avg Reach</th>
                    <th className="py-3 text-center font-medium">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weatherSummary.map((w, i) => {
                    const maxEngagement = data.weatherSummary[0]?.avgEngagement ?? 1
                    const performance = (w.avgEngagement / maxEngagement) * 100
                    return (
                      <tr key={w.weather} className="border-b last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {getWeatherIcon(w.weather)}
                            <span className="font-medium">{w.weather}</span>
                          </div>
                        </td>
                        <td className="py-3 text-right">{w.days}</td>
                        <td className="py-3 text-right">{w.avgTemp}°C</td>
                        <td className="py-3 text-right font-medium">
                          {formatNumber(w.avgEngagement)}
                        </td>
                        <td className="py-3 text-right">{formatNumber(w.avgReach)}</td>
                        <td className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              i === 0
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : i === data.weatherSummary.length - 1
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : ''
                            }
                          >
                            {Math.round(performance)}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
