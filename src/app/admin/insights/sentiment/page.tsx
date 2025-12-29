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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
  Info,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function SentimentPage() {
  const [days, setDays] = useState(30)

  const { data: connectionStatus, isLoading: statusLoading } =
    api.sentiment.getConnectionStatus.useQuery()
  const { data: stats, isLoading: statsLoading } = api.sentiment.getSentimentStats.useQuery(
    { days },
    { enabled: connectionStatus?.connected }
  )
  const { data: trends, isLoading: trendsLoading } = api.sentiment.getSentimentTrends.useQuery(
    { days },
    { enabled: connectionStatus?.connected }
  )
  const { data: alerts } = api.sentiment.getAlertsRequiringResponse.useQuery(
    { limit: 10, includeResponded: false },
    { enabled: connectionStatus?.connected }
  )

  const markAsResponded = api.sentiment.markAsResponded.useMutation({
    onSuccess: () => {
      // Refetch alerts
    },
  })

  const isLoading = statusLoading || statsLoading

  // Sentiment distribution pie chart
  const sentimentPieChart: EChartsOption = useMemo(() => {
    if (!stats?.sentimentBreakdown) {
      return { title: { text: 'No sentiment data', left: 'center', top: 'center' } }
    }

    const { sentimentBreakdown } = stats

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
              name: 'Positive',
              value: sentimentBreakdown.POSITIVE,
              itemStyle: { color: '#22c55e' },
            },
            {
              name: 'Negative',
              value: sentimentBreakdown.NEGATIVE,
              itemStyle: { color: '#ef4444' },
            },
            {
              name: 'Neutral',
              value: sentimentBreakdown.NEUTRAL,
              itemStyle: { color: '#9ca3af' },
            },
            {
              name: 'Mixed',
              value: sentimentBreakdown.MIXED,
              itemStyle: { color: '#f59e0b' },
            },
          ],
        },
      ],
    }
  }, [stats])

  // Sentiment trends line chart
  const trendChart: EChartsOption = useMemo(() => {
    if (!trends?.length) {
      return { title: { text: 'No trend data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Positive', 'Negative', 'Neutral'],
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
        data: trends.map((t) => {
          const date = new Date(t.date ?? new Date())
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }),
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'Comments',
      },
      series: [
        {
          name: 'Positive',
          type: 'line',
          smooth: true,
          data: trends.map((t) => t.positiveCount),
          itemStyle: { color: '#22c55e' },
          areaStyle: { color: 'rgba(34, 197, 94, 0.1)' },
        },
        {
          name: 'Negative',
          type: 'line',
          smooth: true,
          data: trends.map((t) => t.negativeCount),
          itemStyle: { color: '#ef4444' },
          areaStyle: { color: 'rgba(239, 68, 68, 0.1)' },
        },
        {
          name: 'Neutral',
          type: 'line',
          smooth: true,
          data: trends.map((t) => t.neutralCount),
          itemStyle: { color: '#9ca3af' },
        },
      ],
    }
  }, [trends])

  // Sentiment score trend
  const scoreChart: EChartsOption = useMemo(() => {
    if (!trends?.length) {
      return { title: { text: 'No score data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = params as Array<{ name: string; value: number }>
          return `${p[0]?.name}<br/>Sentiment Score: ${p[0]?.value.toFixed(2)}`
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: trends.map((t) => {
          const date = new Date(t.date ?? new Date())
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }),
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'Score',
        min: -1,
        max: 1,
        axisLabel: {
          formatter: (value: number) => value.toFixed(1),
        },
      },
      visualMap: {
        show: false,
        dimension: 1,
        pieces: [
          { min: -1, max: -0.1, color: '#ef4444' },
          { min: -0.1, max: 0.1, color: '#9ca3af' },
          { min: 0.1, max: 1, color: '#22c55e' },
        ],
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: trends.map((t) => t.avgSentimentScore),
          markLine: {
            data: [{ yAxis: 0 }],
            lineStyle: { type: 'dashed', color: '#9ca3af' },
          },
        },
      ],
    }
  }, [trends])

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Positive</Badge>
      case 'NEGATIVE':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Negative</Badge>
      case 'MIXED':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Mixed</Badge>
      default:
        return <Badge variant="outline">Neutral</Badge>
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
            <h1 className="text-3xl font-bold">Comment Sentiment</h1>
            <p className="text-gray-500">AI-powered sentiment analysis of comments</p>
          </div>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Connection Status */}
      {!connectionStatus?.connected && !statusLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sentiment API Not Connected</AlertTitle>
          <AlertDescription>
            Configure AWS Comprehend in settings to enable sentiment analysis.{' '}
            <Link href="/admin/settings/connections" className="underline">
              Configure now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {connectionStatus?.connected && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalComments ?? 0}</div>
                  <p className="text-xs text-muted-foreground">analyzed</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Positive Rate</CardTitle>
              <ThumbsUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.positiveRate?.toFixed(1) ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.sentimentBreakdown?.POSITIVE ?? 0} comments
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Negative Rate</CardTitle>
              <ThumbsDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.negativeRate?.toFixed(1) ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.sentimentBreakdown?.NEGATIVE ?? 0} comments
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-600">{stats?.alertsCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground">need response</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.responseRate?.toFixed(0) ?? 100}%
                  </div>
                  <p className="text-xs text-muted-foreground">alerts addressed</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {connectionStatus?.connected && (
        <Tabs defaultValue="distribution" className="space-y-4">
          <TabsList>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="score">Sentiment Score</TabsTrigger>
          </TabsList>

          <TabsContent value="distribution">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                  <CardDescription>Breakdown of comment sentiments</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[350px] w-full" />
                  ) : (
                    <EChartsWrapper option={sentimentPieChart} height={350} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Summary</CardTitle>
                  <CardDescription>Quick overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <ThumbsUp className="h-6 w-6 text-green-500" />
                      <div>
                        <p className="font-medium">Positive</p>
                        <p className="text-sm text-muted-foreground">
                          {stats?.sentimentBreakdown?.POSITIVE ?? 0} comments
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      {stats?.positiveRate?.toFixed(0) ?? 0}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-red-50">
                    <div className="flex items-center gap-3">
                      <ThumbsDown className="h-6 w-6 text-red-500" />
                      <div>
                        <p className="font-medium">Negative</p>
                        <p className="text-sm text-muted-foreground">
                          {stats?.sentimentBreakdown?.NEGATIVE ?? 0} comments
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-red-100 text-red-800">
                      {stats?.negativeRate?.toFixed(0) ?? 0}%
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Minus className="h-6 w-6 text-gray-500" />
                      <div>
                        <p className="font-medium">Neutral</p>
                        <p className="text-sm text-muted-foreground">
                          {stats?.sentimentBreakdown?.NEUTRAL ?? 0} comments
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {stats?.totalComments
                        ? (
                            ((stats.sentimentBreakdown?.NEUTRAL ?? 0) / stats.totalComments) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-6 w-6 text-amber-500" />
                      <div>
                        <p className="font-medium">Mixed</p>
                        <p className="text-sm text-muted-foreground">
                          {stats?.sentimentBreakdown?.MIXED ?? 0} comments
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      {stats?.totalComments
                        ? (
                            ((stats.sentimentBreakdown?.MIXED ?? 0) / stats.totalComments) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trends Over Time</CardTitle>
                <CardDescription>
                  Daily breakdown of positive, negative, and neutral comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={trendChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="score">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Score Trend</CardTitle>
                <CardDescription>
                  Overall sentiment score (-1 to 1, where positive is better)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={scoreChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Alerts Table */}
      {connectionStatus?.connected && alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Comments Requiring Response
            </CardTitle>
            <CardDescription>
              Negative comments with high confidence that may need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comment</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Key Phrases</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate">{alert.text}</p>
                      {alert.author && (
                        <p className="text-xs text-muted-foreground">by {alert.author}</p>
                      )}
                    </TableCell>
                    <TableCell>{getSentimentBadge(alert.sentiment)}</TableCell>
                    <TableCell>{(alert.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {alert.keyPhrases.slice(0, 3).map((phrase, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {phrase}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(alert.commentedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {alert.content?.permalinkUrl && (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={alert.content.permalinkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsResponded.mutate({ commentId: alert.commentId })}
                          disabled={markAsResponded.isPending}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Done
                        </Button>
                      </div>
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
