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
  AtSign,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Info,
  ExternalLink,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Star,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function MentionsPage() {
  const [days, setDays] = useState(30)
  const [sentimentFilter, setSentimentFilter] = useState<
    'positive' | 'negative' | 'neutral' | undefined
  >()

  const { data: connectionStatus, isLoading: statusLoading } =
    api.socialListening.getConnectionStatus.useQuery()
  const { data: summary, isLoading: summaryLoading } = api.socialListening.getSummary.useQuery(
    { days },
    { enabled: connectionStatus?.connected }
  )
  const { data: mentions } = api.socialListening.getMentions.useQuery(
    { limit: 20, days, sentiment: sentimentFilter },
    { enabled: connectionStatus?.connected }
  )
  const { data: alerts } = api.socialListening.getAlerts.useQuery(
    { limit: 10 },
    { enabled: connectionStatus?.connected }
  )
  const { data: influencers } = api.socialListening.getInfluencerMentions.useQuery(
    { limit: 10, days },
    { enabled: connectionStatus?.connected }
  )
  const { data: platformData } = api.socialListening.getMentionsByPlatform.useQuery(
    { days },
    { enabled: connectionStatus?.connected }
  )

  const syncMentions = api.socialListening.syncMentions.useMutation()
  const markAsResponded = api.socialListening.markAsResponded.useMutation()

  const isLoading = statusLoading || summaryLoading

  // Platform distribution chart
  const platformChart: EChartsOption = useMemo(() => {
    if (!summary?.platformBreakdown) {
      return { title: { text: 'No platform data', left: 'center', top: 'center' } }
    }

    const platforms = Object.entries(summary.platformBreakdown)
    const colors: Record<string, string> = {
      facebook: '#1877F2',
      instagram: '#E1306C',
      twitter: '#1DA1F2',
      youtube: '#FF0000',
      reddit: '#FF4500',
      news: '#4B5563',
      blog: '#8B5CF6',
      forum: '#10B981',
      web: '#6B7280',
      tiktok: '#000000',
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
          data: platforms.map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: count,
            itemStyle: { color: colors[name] ?? '#9CA3AF' },
          })),
        },
      ],
    }
  }, [summary])

  // Sentiment breakdown by platform
  const sentimentByPlatformChart: EChartsOption = useMemo(() => {
    if (!platformData?.length) {
      return { title: { text: 'No sentiment data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
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
        data: platformData.map((p) => p.platform.charAt(0).toUpperCase() + p.platform.slice(1)),
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Positive',
          type: 'bar',
          stack: 'total',
          data: platformData.map((p) => p.positive),
          itemStyle: { color: '#22c55e' },
        },
        {
          name: 'Negative',
          type: 'bar',
          stack: 'total',
          data: platformData.map((p) => p.negative),
          itemStyle: { color: '#ef4444' },
        },
        {
          name: 'Neutral',
          type: 'bar',
          stack: 'total',
          data: platformData.map((p) => p.neutral),
          itemStyle: { color: '#9ca3af' },
        },
      ],
    }
  }, [platformData])

  // Keywords chart
  const keywordsChart: EChartsOption = useMemo(() => {
    if (!summary?.topKeywords?.length) {
      return { title: { text: 'No keyword data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'category',
        data: summary.topKeywords.map((k) => k.keyword).reverse(),
      },
      series: [
        {
          type: 'bar',
          data: summary.topKeywords.map((k) => k.count).reverse(),
          itemStyle: {
            color: '#3b82f6',
            borderRadius: [0, 4, 4, 0],
          },
        },
      ],
    }
  }, [summary])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Positive</Badge>
      case 'negative':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Negative</Badge>
      default:
        return <Badge variant="outline">Neutral</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
      default:
        return <Badge variant="outline">Low</Badge>
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
            <h1 className="text-3xl font-bold">Social Listening</h1>
            <p className="text-gray-500">Monitor brand mentions across the web</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMentions.mutate({ days: 7 })}
            disabled={syncMentions.isPending || !connectionStatus?.connected}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMentions.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Select
            value={sentimentFilter ?? 'all'}
            onValueChange={(v) =>
              setSentimentFilter(
                v === 'all' ? undefined : (v as 'positive' | 'negative' | 'neutral')
              )
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sentiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
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
      </div>

      {/* Connection Status */}
      {!connectionStatus?.connected && !statusLoading && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Social Listening Not Connected</AlertTitle>
          <AlertDescription>
            Configure Brand24 API in settings to enable social listening.{' '}
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
              <CardTitle className="text-sm font-medium">Total Mentions</CardTitle>
              <AtSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.totalMentions ?? 0}</div>
                  <p className="text-xs text-muted-foreground">in {days} days</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reach</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatNumber(summary?.totalReach ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">potential impressions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
              {(summary?.sentimentScore ?? 0) >= 0 ? (
                <ThumbsUp className="h-4 w-4 text-green-500" />
              ) : (
                <ThumbsDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div
                    className={`text-2xl font-bold ${
                      (summary?.sentimentScore ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {(summary?.sentimentScore ?? 0) >= 0 ? '+' : ''}
                    {summary?.sentimentScore?.toFixed(0) ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {summary?.sentimentBreakdown?.positive ?? 0} positive /{' '}
                    {summary?.sentimentBreakdown?.negative ?? 0} negative
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Influencer Mentions</CardTitle>
              <Star className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summary?.influencerMentions ?? 0}</div>
                  <p className="text-xs text-muted-foreground">high-profile mentions</p>
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
                  <div className="text-2xl font-bold text-amber-600">
                    {summary?.alertsCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">need response</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {connectionStatus?.connected && (
        <Tabs defaultValue="platforms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="platforms">By Platform</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment by Platform</TabsTrigger>
            <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
          </TabsList>

          <TabsContent value="platforms">
            <Card>
              <CardHeader>
                <CardTitle>Mentions by Platform</CardTitle>
                <CardDescription>Distribution of brand mentions across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={platformChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sentiment">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment by Platform</CardTitle>
                <CardDescription>Sentiment breakdown for each platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={sentimentByPlatformChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords">
            <Card>
              <CardHeader>
                <CardTitle>Top Keywords</CardTitle>
                <CardDescription>Most frequently mentioned keywords</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={keywordsChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Alerts Section */}
      {connectionStatus?.connected && alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Mentions Requiring Response
            </CardTitle>
            <CardDescription>High-priority mentions that may need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Mention</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{alert.platform}</p>
                        <p className="text-xs text-muted-foreground">{alert.sourceName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate">{alert.text}</p>
                      {alert.authorName && (
                        <p className="text-xs text-muted-foreground">
                          by {alert.authorName}
                          {alert.isInfluencer && (
                            <Star className="ml-1 inline h-3 w-3 text-amber-500" />
                          )}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{getSentimentBadge(alert.sentiment)}</TableCell>
                    <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                    <TableCell>{formatNumber(alert.reach ?? 0)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(alert.mentionedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {alert.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={alert.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsResponded.mutate({ mentionId: alert.id })}
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

      {/* Influencer Mentions */}
      {connectionStatus?.connected && influencers && influencers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Influencer Mentions
            </CardTitle>
            <CardDescription>High-profile accounts that mentioned your brand</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Influencer</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Mention</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map((influencer) => (
                  <TableRow key={influencer.id}>
                    <TableCell>
                      <Badge variant="outline">{influencer.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{influencer.authorName}</p>
                        {influencer.authorHandle && (
                          <p className="text-xs text-muted-foreground">
                            @{influencer.authorHandle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(influencer.authorFollowers ?? 0)}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">{influencer.text}</TableCell>
                    <TableCell>{getSentimentBadge(influencer.sentiment)}</TableCell>
                    <TableCell>{formatNumber(influencer.reach ?? 0)}</TableCell>
                    <TableCell>
                      {influencer.url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={influencer.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Mentions Table */}
      {connectionStatus?.connected && mentions && mentions.mentions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Mentions</CardTitle>
            <CardDescription>Latest brand mentions ({mentions.total} total)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Mention</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentions.mentions.map((mention) => (
                  <TableRow key={mention.id}>
                    <TableCell>
                      <Badge variant="outline">{mention.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{mention.authorName ?? 'Unknown'}</p>
                        {mention.authorHandle && (
                          <p className="text-xs text-muted-foreground">@{mention.authorHandle}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{mention.text}</TableCell>
                    <TableCell>{getSentimentBadge(mention.sentiment)}</TableCell>
                    <TableCell>{formatNumber(mention.reach ?? 0)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(mention.mentionedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {mention.url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={mention.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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
