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
  Link2,
  MousePointer,
  Target,
  DollarSign,
  Info,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function AttributionPage() {
  const [days, setDays] = useState(30)
  const [campaign, setCampaign] = useState<string | undefined>(undefined)

  const { data: connectionStatus, isLoading: statusLoading } =
    api.linkTracking.getConnectionStatus.useQuery()
  const { data: report, isLoading: reportLoading } = api.linkTracking.getAttributionReport.useQuery(
    { days, campaign },
    { enabled: connectionStatus?.connected }
  )
  const { data: links, isLoading: linksLoading } = api.linkTracking.getLinks.useQuery(
    { limit: 20, campaign },
    { enabled: connectionStatus?.connected }
  )
  const { data: campaigns } = api.linkTracking.getCampaigns.useQuery(undefined, {
    enabled: connectionStatus?.connected,
  })

  const isLoading = statusLoading || reportLoading

  // Platform comparison chart
  const platformChart: EChartsOption = useMemo(() => {
    if (!report) {
      return { title: { text: 'No data available', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Clicks', 'Conversions'],
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
        data: ['Facebook', 'Instagram'],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Clicks',
          type: 'bar',
          data: [report.byPlatform.facebook, report.byPlatform.instagram],
          itemStyle: { color: '#1877F2' },
        },
        {
          name: 'Conversions',
          type: 'bar',
          data: [report.byPlatform.facebook, report.byPlatform.instagram].map((_, i) =>
            i === 0
              ? Math.round(report.byPlatform.facebook * (report.conversionRate / 100))
              : Math.round(report.byPlatform.instagram * (report.conversionRate / 100))
          ),
          itemStyle: { color: '#22c55e' },
        },
      ],
    }
  }, [report])

  // Content type (medium) performance chart
  const mediumChart: EChartsOption = useMemo(() => {
    if (!report) {
      return { title: { text: 'No data available', left: 'center', top: 'center' } }
    }

    const mediums = ['Post', 'Story', 'Reel', 'Ad', 'Bio']
    const clicks = [
      report.byMedium.post,
      report.byMedium.story,
      report.byMedium.reel,
      report.byMedium.ad,
      report.byMedium.bio,
    ]
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981']

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} clicks ({d}%)',
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
          label: {
            show: false,
          },
          data: mediums.map((name, i) => ({
            name,
            value: clicks[i],
            itemStyle: { color: colors[i] },
          })),
        },
      ],
    }
  }, [report])

  // Device breakdown chart
  const deviceChart: EChartsOption = useMemo(() => {
    if (!report?.byDevice) {
      return { title: { text: 'No device data', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'item',
      },
      series: [
        {
          type: 'pie',
          radius: '70%',
          data: [
            { name: 'Mobile', value: report.byDevice.mobile, itemStyle: { color: '#3b82f6' } },
            { name: 'Desktop', value: report.byDevice.desktop, itemStyle: { color: '#8b5cf6' } },
            { name: 'Tablet', value: report.byDevice.tablet, itemStyle: { color: '#f59e0b' } },
          ],
          label: {
            formatter: '{b}\n{d}%',
          },
        },
      ],
    }
  }, [report])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
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
            <h1 className="text-3xl font-bold">Link Attribution</h1>
            <p className="text-gray-500">Track link clicks and conversions from social media</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaigns && campaigns.length > 0 && (
            <Select
              value={campaign ?? 'all'}
              onValueChange={(v) => setCampaign(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <AlertTitle>Link Tracking Not Connected</AlertTitle>
          <AlertDescription>
            Configure Short.io API in settings to enable link tracking and attribution.{' '}
            <Link href="/admin/settings/connections" className="underline">
              Configure now
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      {connectionStatus?.connected && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatNumber(report?.totalClicks ?? 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(report?.uniqueClicks ?? 0)} unique
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{report?.conversions ?? 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {(report?.conversionRate ?? 0).toFixed(1)}% rate
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversion Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.conversionValue ?? 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">total revenue</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tracked Links</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {linksLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{links?.total ?? 0}</div>
                  <p className="text-xs text-muted-foreground">active links</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {connectionStatus?.connected && (
        <Tabs defaultValue="platform" className="space-y-4">
          <TabsList>
            <TabsTrigger value="platform">By Platform</TabsTrigger>
            <TabsTrigger value="medium">By Content Type</TabsTrigger>
            <TabsTrigger value="device">By Device</TabsTrigger>
          </TabsList>

          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>Clicks and conversions by social platform</CardDescription>
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

          <TabsContent value="medium">
            <Card>
              <CardHeader>
                <CardTitle>Content Type Breakdown</CardTitle>
                <CardDescription>
                  Click distribution across post types (post, story, reel, ad, bio)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : (
                  <EChartsWrapper option={mediumChart} height={400} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="device">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Device Distribution</CardTitle>
                  <CardDescription>Clicks by device type</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <EChartsWrapper option={deviceChart} height={300} />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Summary</CardTitle>
                  <CardDescription>Click breakdown</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-6 w-6 text-blue-500" />
                      <div>
                        <p className="font-medium">Mobile</p>
                        <p className="text-sm text-muted-foreground">
                          {report?.byDevice?.mobile ?? 0} clicks
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {report?.totalClicks
                        ? Math.round(((report.byDevice?.mobile ?? 0) / report.totalClicks) * 100)
                        : 0}
                      %
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-6 w-6 text-purple-500" />
                      <div>
                        <p className="font-medium">Desktop</p>
                        <p className="text-sm text-muted-foreground">
                          {report?.byDevice?.desktop ?? 0} clicks
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {report?.totalClicks
                        ? Math.round(((report.byDevice?.desktop ?? 0) / report.totalClicks) * 100)
                        : 0}
                      %
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-3">
                      <Tablet className="h-6 w-6 text-amber-500" />
                      <div>
                        <p className="font-medium">Tablet</p>
                        <p className="text-sm text-muted-foreground">
                          {report?.byDevice?.tablet ?? 0} clicks
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {report?.totalClicks
                        ? Math.round(((report.byDevice?.tablet ?? 0) / report.totalClicks) * 100)
                        : 0}
                      %
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Top Links Table */}
      {connectionStatus?.connected && links && links.links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Tracked Links</CardTitle>
            <CardDescription>Most clicked tracked links</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">
                          {link.title ?? link.shortCode}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {link.shortUrl}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {link.utmCampaign ? (
                        <Badge variant="outline">{link.utmCampaign}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {link.utmSource ? (
                        <Badge
                          variant="secondary"
                          className={
                            link.utmSource.toLowerCase() === 'facebook'
                              ? 'bg-blue-100 text-blue-800'
                              : link.utmSource.toLowerCase() === 'instagram'
                                ? 'bg-pink-100 text-pink-800'
                                : ''
                          }
                        >
                          {link.utmSource}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(link.totalClicks)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={link.originalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Top Links by Performance */}
      {connectionStatus?.connected && report?.topLinks && report.topLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Links</CardTitle>
            <CardDescription>Links with the most clicks in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Short URL</TableHead>
                  <TableHead>Original URL</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topLinks.map((link, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{link.shortUrl}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {link.originalUrl}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(link.clicks)}</TableCell>
                    <TableCell className="text-right">{link.conversions}</TableCell>
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
