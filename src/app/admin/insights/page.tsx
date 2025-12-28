'use client'

import { useMemo } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EChartsWrapper } from '@/components/charts'
import {
  Eye,
  Users,
  TrendingUp,
  Heart,
  MessageSquare,
  Share2,
  RefreshCw,
  AlertCircle,
  Facebook,
  Instagram,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF, exportKPIsToPDF } from '@/lib/export'

export default function InsightsPage() {
  const { data: connectionStatus } = api.metaInsights.getConnectionStatus.useQuery()
  const {
    data: insights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
  } = api.metaInsights.getStoredInsights.useQuery(
    { limit: 30 },
    { enabled: connectionStatus?.connected }
  )
  const { data: content, isLoading: contentLoading } = api.metaInsights.getStoredContent.useQuery(
    { limit: 10, orderBy: 'publishedAt' },
    { enabled: connectionStatus?.connected }
  )

  const syncPageInsights = api.metaInsights.syncPageInsights.useMutation({
    onSuccess: () => refetchInsights(),
  })
  const syncInstagramInsights = api.metaInsights.syncInstagramInsights.useMutation({
    onSuccess: () => refetchInsights(),
  })

  // Calculate KPIs from insights
  const kpis = useMemo(() => {
    if (!insights?.length) {
      return {
        totalReach: 0,
        totalEngagement: 0,
        totalFollowers: 0,
        newFollowers: 0,
        avgEngagementRate: 0,
      }
    }

    const latest = insights[0]
    const totalReach = insights.reduce((sum, i) => sum + (i.pageReach ?? 0), 0)
    const totalEngagement = insights.reduce((sum, i) => sum + (i.pageEngagement ?? 0), 0)
    const newFollowers = insights.reduce((sum, i) => sum + (i.pageFollowsNew ?? 0), 0)

    return {
      totalReach,
      totalEngagement,
      totalFollowers: latest?.pageFollows ?? 0,
      newFollowers,
      avgEngagementRate:
        totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : '0.00',
    }
  }, [insights])

  // Prepare chart data for reach/impressions over time
  const reachChartOption: EChartsOption = useMemo(() => {
    if (!insights?.length) {
      return {
        title: { text: 'No data available', left: 'center', top: 'center' },
      }
    }

    // Sort by date ascending
    const sortedInsights = [...insights].sort(
      (a, b) => new Date(a.date.date).getTime() - new Date(b.date.date).getTime()
    )

    const dates = sortedInsights.map((i) => new Date(i.date.date).toLocaleDateString())
    const reach = sortedInsights.map((i) => i.pageReach ?? 0)
    const impressions = sortedInsights.map((i) => i.pageImpressions ?? i.pageViews ?? 0)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Reach', 'Impressions'],
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
        data: dates,
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
          name: 'Reach',
          type: 'line',
          smooth: true,
          data: reach,
          areaStyle: { opacity: 0.2 },
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Impressions',
          type: 'line',
          smooth: true,
          data: impressions,
          areaStyle: { opacity: 0.2 },
          itemStyle: { color: '#8b5cf6' },
        },
      ],
    }
  }, [insights])

  // Follower growth chart
  const followerChartOption: EChartsOption = useMemo(() => {
    if (!insights?.length) {
      return {
        title: { text: 'No data available', left: 'center', top: 'center' },
      }
    }

    const sortedInsights = [...insights].sort(
      (a, b) => new Date(a.date.date).getTime() - new Date(b.date.date).getTime()
    )

    const dates = sortedInsights.map((i) => new Date(i.date.date).toLocaleDateString())
    const followers = sortedInsights.map((i) => i.pageFollows ?? 0)
    const newFollowers = sortedInsights.map((i) => i.pageFollowsNew ?? 0)
    const unfollows = sortedInsights.map((i) => -(i.pageUnfollows ?? 0))

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Total Followers', 'New Followers', 'Unfollows'],
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
        data: dates,
        axisLabel: { rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Total',
          position: 'left',
          axisLabel: {
            formatter: (value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString(),
          },
        },
        {
          type: 'value',
          name: 'Daily Change',
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Total Followers',
          type: 'line',
          smooth: true,
          data: followers,
          itemStyle: { color: '#10b981' },
        },
        {
          name: 'New Followers',
          type: 'bar',
          yAxisIndex: 1,
          data: newFollowers,
          itemStyle: { color: '#22c55e' },
        },
        {
          name: 'Unfollows',
          type: 'bar',
          yAxisIndex: 1,
          stack: 'change',
          data: unfollows,
          itemStyle: { color: '#ef4444' },
        },
      ],
    }
  }, [insights])

  // Engagement breakdown chart
  const engagementChartOption: EChartsOption = useMemo(() => {
    if (!insights?.length) {
      return {
        title: { text: 'No data available', left: 'center', top: 'center' },
      }
    }

    const sortedInsights = [...insights].sort(
      (a, b) => new Date(a.date.date).getTime() - new Date(b.date.date).getTime()
    )

    const dates = sortedInsights.map((i) => new Date(i.date.date).toLocaleDateString())
    const engagement = sortedInsights.map((i) => i.pageEngagement ?? 0)
    const reactions = sortedInsights.map((i) => i.pageReactions ?? 0)
    const comments = sortedInsights.map((i) => i.pageComments ?? 0)
    const shares = sortedInsights.map((i) => i.pageShares ?? 0)

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Total Engagement', 'Reactions', 'Comments', 'Shares'],
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
        data: dates,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Total Engagement',
          type: 'line',
          smooth: true,
          data: engagement,
          itemStyle: { color: '#f59e0b' },
        },
        {
          name: 'Reactions',
          type: 'bar',
          stack: 'breakdown',
          data: reactions,
          itemStyle: { color: '#ef4444' },
        },
        {
          name: 'Comments',
          type: 'bar',
          stack: 'breakdown',
          data: comments,
          itemStyle: { color: '#3b82f6' },
        },
        {
          name: 'Shares',
          type: 'bar',
          stack: 'breakdown',
          data: shares,
          itemStyle: { color: '#22c55e' },
        },
      ],
    }
  }, [insights])

  // Not connected state
  if (!connectionStatus?.connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Social Media Insights</h1>
          <p className="text-gray-500">Analytics for your Facebook and Instagram accounts</p>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your Facebook and Instagram accounts to view insights.
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

  const isSyncing = syncPageInsights.isPending || syncInstagramInsights.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Social Media Insights</h1>
          <p className="text-gray-500">Analytics for your Facebook and Instagram accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {connectionStatus.pageId && (
            <Badge variant="outline" className="gap-1">
              <Facebook className="h-3 w-3" /> Connected
            </Badge>
          )}
          {connectionStatus.instagramAccountId && (
            <Badge variant="outline" className="gap-1">
              <Instagram className="h-3 w-3" /> Connected
            </Badge>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/insights/calendar">Calendar</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/insights/comparison">Compare Platforms</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/insights/ads">Ad Performance</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/insights/weather">Weather</Link>
          </Button>
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
                  if (!insights?.length) return
                  exportToExcel(
                    insights.map((i) => ({
                      Date: new Date(i.date.date).toLocaleDateString(),
                      Platform: i.account.platform.platform,
                      Reach: i.pageReach ?? 0,
                      Impressions: i.pageImpressions ?? i.pageViews ?? 0,
                      Engagement: i.pageEngagement ?? 0,
                      Followers: i.pageFollows ?? 0,
                      NewFollowers: i.pageFollowsNew ?? 0,
                    })),
                    { filename: 'social_insights', sheetName: 'Insights' }
                  )
                }}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportKPIsToPDF(
                    [
                      { label: 'Total Followers', value: kpis.totalFollowers.toLocaleString() },
                      { label: 'New Followers', value: `+${kpis.newFollowers.toLocaleString()}` },
                      { label: 'Total Reach', value: formatNumber(kpis.totalReach) },
                      { label: 'Total Engagement', value: formatNumber(kpis.totalEngagement) },
                      { label: 'Engagement Rate', value: `${kpis.avgEngagementRate}%` },
                    ],
                    {
                      filename: 'social_insights_summary',
                      title: 'Social Media Insights',
                      subtitle: 'Last 30 Days Summary',
                    }
                  )
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export KPIs to PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (!insights?.length) return
                  exportToPDF(
                    [
                      {
                        title: 'Daily Insights',
                        data: {
                          headers: ['Date', 'Platform', 'Reach', 'Engagement', 'Followers'],
                          rows: insights
                            .slice(0, 30)
                            .map((i) => [
                              new Date(i.date.date).toLocaleDateString(),
                              i.account.platform.platform,
                              i.pageReach ?? 0,
                              i.pageEngagement ?? 0,
                              i.pageFollows ?? 0,
                            ]),
                        },
                      },
                    ],
                    {
                      filename: 'social_insights_report',
                      title: 'Social Media Insights Report',
                      subtitle: 'Daily Performance Data',
                    }
                  )
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Export Full Report (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (connectionStatus.pageId) syncPageInsights.mutate({ days: 30 })
              if (connectionStatus.instagramAccountId) syncInstagramInsights.mutate({ days: 30 })
            }}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KPICard
          title="Total Followers"
          value={kpis.totalFollowers.toLocaleString()}
          icon={Users}
          description="Current follower count"
          loading={insightsLoading}
        />
        <KPICard
          title="New Followers"
          value={`+${kpis.newFollowers.toLocaleString()}`}
          icon={TrendingUp}
          description="Last 30 days"
          loading={insightsLoading}
          positive
        />
        <KPICard
          title="Total Reach"
          value={formatNumber(kpis.totalReach)}
          icon={Eye}
          description="Last 30 days"
          loading={insightsLoading}
        />
        <KPICard
          title="Total Engagement"
          value={formatNumber(kpis.totalEngagement)}
          icon={Heart}
          description="Last 30 days"
          loading={insightsLoading}
        />
        <KPICard
          title="Engagement Rate"
          value={`${kpis.avgEngagementRate}%`}
          icon={TrendingUp}
          description="Avg. engagement/reach"
          loading={insightsLoading}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="reach" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reach">Reach & Impressions</TabsTrigger>
          <TabsTrigger value="followers">Follower Growth</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="reach">
          <Card>
            <CardHeader>
              <CardTitle>Reach & Impressions Over Time</CardTitle>
              <CardDescription>Daily unique users reached and total impressions</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={reachChartOption} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followers">
          <Card>
            <CardHeader>
              <CardTitle>Follower Growth</CardTitle>
              <CardDescription>Total followers and daily changes</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={followerChartOption} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Breakdown</CardTitle>
              <CardDescription>Reactions, comments, and shares over time</CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={engagementChartOption} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Content Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Content Performance</CardTitle>
          <CardDescription>Latest posts and their engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {contentLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : content?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Engagement</TableHead>
                  <TableHead className="text-right">Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.map((item) => {
                  const latestInsights = item.contentInsights[0]
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        {item.message ?? 'No caption'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.contentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.account.platform.platform === 'FACEBOOK' ? (
                            <Facebook className="mr-1 h-3 w-3" />
                          ) : (
                            <Instagram className="mr-1 h-3 w-3" />
                          )}
                          {item.account.platform.displayName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {latestInsights?.reach?.toLocaleString() ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {latestInsights?.likes ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {latestInsights?.comments ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {latestInsights?.shares ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No content yet. Sync your Facebook or Instagram content to see performance data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  positive,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  loading?: boolean
  positive?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${positive ? 'text-green-600' : ''}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}
