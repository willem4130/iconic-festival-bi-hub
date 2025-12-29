'use client'

import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Hash,
  TrendingUp,
  Eye,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function HashtagsPage() {
  const [limit] = useState(20)
  const [colorFilter, setColorFilter] = useState<'green' | 'blue' | 'red' | 'grey' | undefined>()
  const [checkHashtag, setCheckHashtag] = useState('')

  const { data: connectionStatus, isLoading: statusLoading } =
    api.hashtags.getConnectionStatus.useQuery()
  const { data: trendingHashtags, isLoading: trendingLoading } =
    api.hashtags.getTrendingHashtags.useQuery(
      { limit, color: colorFilter },
      { enabled: connectionStatus?.connected !== false }
    )
  const { data: bestPerforming, isLoading: performingLoading } =
    api.hashtags.getBestPerforming.useQuery(
      { limit: 10, minUsage: 3 },
      { enabled: connectionStatus?.connected !== false }
    )

  const { data: bannedCheck, refetch: checkBanned } = api.hashtags.checkBanned.useQuery(
    { hashtag: checkHashtag },
    { enabled: false }
  )

  const isLoading = statusLoading || trendingLoading

  // Color distribution chart
  const colorDistributionChart: EChartsOption = useMemo(() => {
    if (!trendingHashtags?.length) {
      return { title: { text: 'No hashtag data', left: 'center', top: 'center' } }
    }

    const colorCounts = { green: 0, blue: 0, red: 0, grey: 0 }
    for (const h of trendingHashtags) {
      if (h.color === 'green') colorCounts.green++
      else if (h.color === 'blue') colorCounts.blue++
      else if (h.color === 'red') colorCounts.red++
      else colorCounts.grey++
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          data: [
            {
              name: 'Trending (Green)',
              value: colorCounts.green,
              itemStyle: { color: '#22c55e' },
            },
            {
              name: 'Gaining (Blue)',
              value: colorCounts.blue,
              itemStyle: { color: '#3b82f6' },
            },
            {
              name: 'Overused (Red)',
              value: colorCounts.red,
              itemStyle: { color: '#ef4444' },
            },
            {
              name: 'Unknown (Grey)',
              value: colorCounts.grey,
              itemStyle: { color: '#9ca3af' },
            },
          ],
        },
      ],
    }
  }, [trendingHashtags])

  // Exposure vs engagement chart for best performing
  const performanceChart: EChartsOption = useMemo(() => {
    if (!bestPerforming?.length) {
      return { title: { text: 'Not enough data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: bestPerforming.map((h) => h.hashtag),
        axisLabel: { rotate: 45, interval: 0 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Engagement Rate',
          position: 'left',
          axisLabel: {
            formatter: '{value}%',
          },
        },
        {
          type: 'value',
          name: 'Times Used',
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Engagement Rate',
          type: 'bar',
          data: bestPerforming.map((h) => h.avgEngagementRate?.toFixed(2) ?? 0),
          itemStyle: { color: '#22c55e' },
        },
        {
          name: 'Times Used',
          type: 'line',
          yAxisIndex: 1,
          data: bestPerforming.map((h) => h.timesUsed),
          itemStyle: { color: '#3b82f6' },
        },
      ],
    }
  }, [bestPerforming])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getColorBadge = (color: string | null) => {
    switch (color) {
      case 'green':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Trending</Badge>
      case 'blue':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Gaining</Badge>
      case 'red':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overused</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleCheckHashtag = async () => {
    if (checkHashtag) {
      await checkBanned()
    }
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
            <h1 className="text-3xl font-bold">Hashtag Analytics</h1>
            <p className="text-gray-500">Track hashtag performance and trends</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={colorFilter ?? 'all'}
            onValueChange={(v) =>
              setColorFilter(v === 'all' ? undefined : (v as 'green' | 'blue' | 'red' | 'grey'))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Colors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              <SelectItem value="green">Trending</SelectItem>
              <SelectItem value="blue">Gaining</SelectItem>
              <SelectItem value="red">Overused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connection Status */}
      {!connectionStatus?.connected && !statusLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Hashtag API Not Connected</AlertTitle>
          <AlertDescription>
            Configure RiteTag API in settings to enable hashtag analytics.{' '}
            <Link href="/admin/settings/connections" className="underline">
              Configure now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hashtags</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{trendingHashtags?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">tracked hashtags</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trending</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {trendingHashtags?.filter((h) => h.color === 'green').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">green hashtags</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overused</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {trendingHashtags?.filter((h) => h.color === 'red').length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">avoid these</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Exposure</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(
                    trendingHashtags && trendingHashtags.length > 0
                      ? trendingHashtags.reduce((sum, h) => sum + (h.exposure ?? 0), 0) /
                          trendingHashtags.length
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">potential reach</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hashtag Checker */}
      <Card>
        <CardHeader>
          <CardTitle>Hashtag Checker</CardTitle>
          <CardDescription>Check if a hashtag is banned on Instagram</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter hashtag (without #)"
                value={checkHashtag}
                onChange={(e) => setCheckHashtag(e.target.value.replace('#', ''))}
                className="pl-9"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckHashtag()}
              />
            </div>
            <Button onClick={handleCheckHashtag} disabled={!checkHashtag}>
              Check
            </Button>
          </div>
          {bannedCheck && (
            <div className="mt-4">
              <Alert variant={bannedCheck.banned ? 'destructive' : 'default'}>
                {bannedCheck.banned ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertTitle>{bannedCheck.hashtag}</AlertTitle>
                <AlertDescription>{bannedCheck.message}</AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Color Distribution</TabsTrigger>
          <TabsTrigger value="performance">Best Performers</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Hashtag Status Distribution</CardTitle>
              <CardDescription>
                Breakdown by RiteTag color (green=trending, blue=gaining, red=overused)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={colorDistributionChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Hashtags</CardTitle>
              <CardDescription>
                Hashtags with the highest engagement rates (used 3+ times)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performingLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : bestPerforming?.length ? (
                <EChartsWrapper option={performanceChart} height={400} />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  Not enough usage data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Best Performing Hashtags Table */}
      {bestPerforming && bestPerforming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Best Performing Hashtags</CardTitle>
            <CardDescription>Based on engagement rate from your content</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hashtag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Times Used</TableHead>
                  <TableHead className="text-right">Avg Engagement</TableHead>
                  <TableHead className="text-right">Avg Reach</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestPerforming.map((hashtag) => (
                  <TableRow key={hashtag.hashtag}>
                    <TableCell className="font-medium">{hashtag.hashtag}</TableCell>
                    <TableCell>{getColorBadge(hashtag.color)}</TableCell>
                    <TableCell className="text-right">{hashtag.timesUsed}</TableCell>
                    <TableCell className="text-right">
                      {hashtag.avgEngagementRate?.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(hashtag.avgReach ?? 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {hashtag.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Trending Hashtags Table */}
      {trendingHashtags && trendingHashtags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Tracked Hashtags</CardTitle>
            <CardDescription>Sorted by exposure potential</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hashtag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Exposure</TableHead>
                  <TableHead className="text-right">Times Used</TableHead>
                  <TableHead className="text-right">Avg Engagement</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendingHashtags.map((hashtag) => (
                  <TableRow key={hashtag.id}>
                    <TableCell className="font-medium">{hashtag.hashtag}</TableCell>
                    <TableCell>{getColorBadge(hashtag.color)}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(hashtag.exposure ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">{hashtag.timesUsed}</TableCell>
                    <TableCell className="text-right">
                      {hashtag.avgEngagementRate?.toFixed(2) ?? '-'}%
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {hashtag.recommendation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
