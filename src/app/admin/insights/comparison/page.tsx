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
import { EChartsWrapper } from '@/components/charts'
import {
  Eye,
  Users,
  Heart,
  ArrowLeft,
  Facebook,
  Instagram,
  FileText,
  ArrowUpRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToExcel, exportToPDF } from '@/lib/export'

export default function PlatformComparisonPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = api.metaInsights.getPlatformComparison.useQuery({ days })

  // Reach comparison chart - side by side bars
  const reachComparisonChart: EChartsOption = useMemo(() => {
    if (!data) return { title: { text: 'Loading...', left: 'center', top: 'center' } }

    const fbData = data.facebook.summary.dailyData
    const igData = data.instagram.summary.dailyData

    // Merge dates from both platforms
    const allDates = new Set([...fbData.map((d) => d.date), ...igData.map((d) => d.date)])
    const sortedDates = Array.from(allDates).sort()

    const fbReachMap = new Map(fbData.map((d) => [d.date, d.reach]))
    const igReachMap = new Map(igData.map((d) => [d.date, d.reach]))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Facebook Reach', 'Instagram Reach'],
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
        data: sortedDates.map((d) =>
          new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
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
          name: 'Facebook Reach',
          type: 'bar',
          data: sortedDates.map((d) => fbReachMap.get(d) ?? 0),
          itemStyle: { color: '#1877F2' },
          barGap: '0%',
        },
        {
          name: 'Instagram Reach',
          type: 'bar',
          data: sortedDates.map((d) => igReachMap.get(d) ?? 0),
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#833AB4' },
                { offset: 0.5, color: '#E1306C' },
                { offset: 1, color: '#F77737' },
              ],
            },
          },
        },
      ],
    }
  }, [data])

  // Engagement comparison chart - line chart overlay
  const engagementComparisonChart: EChartsOption = useMemo(() => {
    if (!data) return { title: { text: 'Loading...', left: 'center', top: 'center' } }

    const fbData = data.facebook.summary.dailyData
    const igData = data.instagram.summary.dailyData

    const allDates = new Set([...fbData.map((d) => d.date), ...igData.map((d) => d.date)])
    const sortedDates = Array.from(allDates).sort()

    const fbEngMap = new Map(fbData.map((d) => [d.date, d.engagement]))
    const igEngMap = new Map(igData.map((d) => [d.date, d.engagement]))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Facebook Engagement', 'Instagram Engagement'],
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
        data: sortedDates.map((d) =>
          new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Facebook Engagement',
          type: 'line',
          smooth: true,
          data: sortedDates.map((d) => fbEngMap.get(d) ?? 0),
          itemStyle: { color: '#1877F2' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: 'Instagram Engagement',
          type: 'line',
          smooth: true,
          data: sortedDates.map((d) => igEngMap.get(d) ?? 0),
          itemStyle: { color: '#E1306C' },
          areaStyle: { opacity: 0.1 },
        },
      ],
    }
  }, [data])

  // Follower growth comparison chart
  const followerComparisonChart: EChartsOption = useMemo(() => {
    if (!data) return { title: { text: 'Loading...', left: 'center', top: 'center' } }

    const fbData = data.facebook.summary.dailyData
    const igData = data.instagram.summary.dailyData

    const allDates = new Set([...fbData.map((d) => d.date), ...igData.map((d) => d.date)])
    const sortedDates = Array.from(allDates).sort()

    const fbFollowersMap = new Map(fbData.map((d) => [d.date, d.followers]))
    const igFollowersMap = new Map(igData.map((d) => [d.date, d.followers]))

    return {
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['Facebook Followers', 'Instagram Followers'],
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
        data: sortedDates.map((d) =>
          new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
        boundaryGap: false,
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
          name: 'Facebook Followers',
          type: 'line',
          smooth: true,
          data: sortedDates.map((d) => fbFollowersMap.get(d) ?? 0),
          itemStyle: { color: '#1877F2' },
        },
        {
          name: 'Instagram Followers',
          type: 'line',
          smooth: true,
          data: sortedDates.map((d) => igFollowersMap.get(d) ?? 0),
          itemStyle: { color: '#E1306C' },
        },
      ],
    }
  }, [data])

  // Summary KPIs comparison radar chart
  const radarChart: EChartsOption = useMemo(() => {
    if (!data) return { title: { text: 'Loading...', left: 'center', top: 'center' } }

    const fbSummary = data.facebook.summary
    const igSummary = data.instagram.summary

    // Normalize values to 0-100 scale for radar chart
    const maxReach = Math.max(fbSummary.totalReach, igSummary.totalReach) || 1
    const maxEngagement = Math.max(fbSummary.totalEngagement, igSummary.totalEngagement) || 1
    const maxFollowers = Math.max(fbSummary.latestFollowers, igSummary.latestFollowers) || 1
    const maxNewFollowers = Math.max(fbSummary.newFollowers, igSummary.newFollowers) || 1
    const maxContent = Math.max(data.facebook.contentCount, data.instagram.contentCount) || 1

    return {
      tooltip: {
        trigger: 'item',
      },
      legend: {
        data: ['Facebook', 'Instagram'],
        bottom: 0,
      },
      radar: {
        indicator: [
          { name: 'Reach', max: 100 },
          { name: 'Engagement', max: 100 },
          { name: 'Followers', max: 100 },
          { name: 'New Followers', max: 100 },
          { name: 'Content', max: 100 },
        ],
        shape: 'polygon',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [
                (fbSummary.totalReach / maxReach) * 100,
                (fbSummary.totalEngagement / maxEngagement) * 100,
                (fbSummary.latestFollowers / maxFollowers) * 100,
                (fbSummary.newFollowers / maxNewFollowers) * 100,
                (data.facebook.contentCount / maxContent) * 100,
              ],
              name: 'Facebook',
              itemStyle: { color: '#1877F2' },
              areaStyle: { opacity: 0.2 },
            },
            {
              value: [
                (igSummary.totalReach / maxReach) * 100,
                (igSummary.totalEngagement / maxEngagement) * 100,
                (igSummary.latestFollowers / maxFollowers) * 100,
                (igSummary.newFollowers / maxNewFollowers) * 100,
                (data.instagram.contentCount / maxContent) * 100,
              ],
              name: 'Instagram',
              itemStyle: { color: '#E1306C' },
              areaStyle: { opacity: 0.2 },
            },
          ],
        },
      ],
    }
  }, [data])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
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
            <h1 className="text-3xl font-bold">Platform Comparison</h1>
            <p className="text-gray-500">Facebook vs Instagram performance side-by-side</p>
          </div>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                if (!data) return
                const comparisonData = [
                  {
                    Metric: 'Total Reach',
                    Facebook: data.facebook.summary.totalReach,
                    Instagram: data.instagram.summary.totalReach,
                  },
                  {
                    Metric: 'Total Engagement',
                    Facebook: data.facebook.summary.totalEngagement,
                    Instagram: data.instagram.summary.totalEngagement,
                  },
                  {
                    Metric: 'Current Followers',
                    Facebook: data.facebook.summary.latestFollowers,
                    Instagram: data.instagram.summary.latestFollowers,
                  },
                  {
                    Metric: 'New Followers',
                    Facebook: data.facebook.summary.newFollowers,
                    Instagram: data.instagram.summary.newFollowers,
                  },
                  {
                    Metric: 'Content Count',
                    Facebook: data.facebook.contentCount,
                    Instagram: data.instagram.contentCount,
                  },
                ]
                exportToExcel(comparisonData, { filename: 'platform_comparison' })
              }}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!data) return
                exportToPDF(
                  [
                    {
                      title: 'Platform Comparison',
                      data: {
                        headers: ['Metric', 'Facebook', 'Instagram', 'Winner'],
                        rows: [
                          [
                            'Total Reach',
                            data.facebook.summary.totalReach,
                            data.instagram.summary.totalReach,
                            data.facebook.summary.totalReach > data.instagram.summary.totalReach
                              ? 'Facebook'
                              : 'Instagram',
                          ],
                          [
                            'Total Engagement',
                            data.facebook.summary.totalEngagement,
                            data.instagram.summary.totalEngagement,
                            data.facebook.summary.totalEngagement >
                            data.instagram.summary.totalEngagement
                              ? 'Facebook'
                              : 'Instagram',
                          ],
                          [
                            'Followers',
                            data.facebook.summary.latestFollowers,
                            data.instagram.summary.latestFollowers,
                            data.facebook.summary.latestFollowers >
                            data.instagram.summary.latestFollowers
                              ? 'Facebook'
                              : 'Instagram',
                          ],
                          [
                            'New Followers',
                            data.facebook.summary.newFollowers,
                            data.instagram.summary.newFollowers,
                            data.facebook.summary.newFollowers > data.instagram.summary.newFollowers
                              ? 'Facebook'
                              : 'Instagram',
                          ],
                        ],
                      },
                    },
                  ],
                  {
                    filename: 'platform_comparison',
                    title: 'Platform Comparison Report',
                    subtitle: `Facebook vs Instagram - Last ${days} Days`,
                  }
                )
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Platform Status Badges */}
      <div className="flex gap-4">
        <Card className="flex-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-[#1877F2]/10 p-3">
              <Facebook className="h-6 w-6 text-[#1877F2]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Facebook</h3>
              <p className="text-sm text-muted-foreground">
                {data?.facebook.connected ? 'Connected & synced' : 'Not connected'}
              </p>
            </div>
            {data?.facebook.connected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-gradient-to-br from-[#833AB4]/10 via-[#E1306C]/10 to-[#F77737]/10 p-3">
              <Instagram className="h-6 w-6 text-[#E1306C]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Instagram</h3>
              <p className="text-sm text-muted-foreground">
                {data?.instagram.connected ? 'Connected & synced' : 'Not connected'}
              </p>
            </div>
            {data?.instagram.connected && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ComparisonCard
          title="Total Reach"
          icon={Eye}
          fbValue={data?.facebook.summary.totalReach ?? 0}
          igValue={data?.instagram.summary.totalReach ?? 0}
          loading={isLoading}
          formatNumber={formatNumber}
        />
        <ComparisonCard
          title="Total Engagement"
          icon={Heart}
          fbValue={data?.facebook.summary.totalEngagement ?? 0}
          igValue={data?.instagram.summary.totalEngagement ?? 0}
          loading={isLoading}
          formatNumber={formatNumber}
        />
        <ComparisonCard
          title="Followers"
          icon={Users}
          fbValue={data?.facebook.summary.latestFollowers ?? 0}
          igValue={data?.instagram.summary.latestFollowers ?? 0}
          loading={isLoading}
          formatNumber={formatNumber}
        />
        <ComparisonCard
          title="Content Posted"
          icon={FileText}
          fbValue={data?.facebook.contentCount ?? 0}
          igValue={data?.instagram.contentCount ?? 0}
          loading={isLoading}
          formatNumber={formatNumber}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Normalized comparison across all metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <EChartsWrapper option={radarChart} height={350} />
            )}
          </CardContent>
        </Card>

        {/* Reach Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Reach Comparison</CardTitle>
            <CardDescription>Daily reach by platform</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <EChartsWrapper option={reachComparisonChart} height={350} />
            )}
          </CardContent>
        </Card>

        {/* Engagement Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Comparison</CardTitle>
            <CardDescription>Daily engagement trends</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <EChartsWrapper option={engagementComparisonChart} height={350} />
            )}
          </CardContent>
        </Card>

        {/* Follower Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Follower Growth</CardTitle>
            <CardDescription>Total followers over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[350px] w-full" />
            ) : (
              <EChartsWrapper option={followerComparisonChart} height={350} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics Summary</CardTitle>
          <CardDescription>Detailed comparison for the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left font-medium">Metric</th>
                    <th className="py-3 text-right font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Facebook className="h-4 w-4 text-[#1877F2]" />
                        Facebook
                      </div>
                    </th>
                    <th className="py-3 text-right font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Instagram className="h-4 w-4 text-[#E1306C]" />
                        Instagram
                      </div>
                    </th>
                    <th className="py-3 text-center font-medium">Winner</th>
                  </tr>
                </thead>
                <tbody>
                  <SummaryRow
                    label="Total Reach"
                    fb={data?.facebook.summary.totalReach ?? 0}
                    ig={data?.instagram.summary.totalReach ?? 0}
                  />
                  <SummaryRow
                    label="Total Engagement"
                    fb={data?.facebook.summary.totalEngagement ?? 0}
                    ig={data?.instagram.summary.totalEngagement ?? 0}
                  />
                  <SummaryRow
                    label="Current Followers"
                    fb={data?.facebook.summary.latestFollowers ?? 0}
                    ig={data?.instagram.summary.latestFollowers ?? 0}
                  />
                  <SummaryRow
                    label="New Followers"
                    fb={data?.facebook.summary.newFollowers ?? 0}
                    ig={data?.instagram.summary.newFollowers ?? 0}
                  />
                  <SummaryRow
                    label="Total Impressions"
                    fb={data?.facebook.summary.totalImpressions ?? 0}
                    ig={data?.instagram.summary.totalImpressions ?? 0}
                  />
                  <SummaryRow
                    label="Content Published"
                    fb={data?.facebook.contentCount ?? 0}
                    ig={data?.instagram.contentCount ?? 0}
                  />
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Comparison Card Component
function ComparisonCard({
  title,
  icon: Icon,
  fbValue,
  igValue,
  loading,
  formatNumber,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  fbValue: number
  igValue: number
  loading?: boolean
  formatNumber: (n: number) => string
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const winner = fbValue > igValue ? 'fb' : igValue > fbValue ? 'ig' : 'tie'
  const diff = Math.abs(fbValue - igValue)
  const diffPercent =
    Math.max(fbValue, igValue) > 0 ? ((diff / Math.max(fbValue, igValue)) * 100).toFixed(0) : '0'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-[#1877F2]" />
              <span className="text-sm">Facebook</span>
            </div>
            <span className={`font-semibold ${winner === 'fb' ? 'text-green-600' : ''}`}>
              {formatNumber(fbValue)}
              {winner === 'fb' && <ArrowUpRight className="inline h-3 w-3 ml-1" />}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-[#E1306C]" />
              <span className="text-sm">Instagram</span>
            </div>
            <span className={`font-semibold ${winner === 'ig' ? 'text-green-600' : ''}`}>
              {formatNumber(igValue)}
              {winner === 'ig' && <ArrowUpRight className="inline h-3 w-3 ml-1" />}
            </span>
          </div>
          {winner !== 'tie' && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {winner === 'fb' ? 'Facebook' : 'Instagram'} leads by {diffPercent}%
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Summary Row Component
function SummaryRow({ label, fb, ig }: { label: string; fb: number; ig: number }) {
  const winner = fb > ig ? 'fb' : ig > fb ? 'ig' : 'tie'
  const formatNum = (n: number) => n.toLocaleString()

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 text-sm">{label}</td>
      <td
        className={`py-3 text-right text-sm font-medium ${winner === 'fb' ? 'text-green-600' : ''}`}
      >
        {formatNum(fb)}
      </td>
      <td
        className={`py-3 text-right text-sm font-medium ${winner === 'ig' ? 'text-green-600' : ''}`}
      >
        {formatNum(ig)}
      </td>
      <td className="py-3 text-center">
        {winner === 'tie' ? (
          <Badge variant="secondary">Tie</Badge>
        ) : winner === 'fb' ? (
          <Badge className="bg-[#1877F2]">
            <Facebook className="h-3 w-3 mr-1" />
            FB
          </Badge>
        ) : (
          <Badge className="bg-[#E1306C]">
            <Instagram className="h-3 w-3 mr-1" />
            IG
          </Badge>
        )}
      </td>
    </tr>
  )
}
