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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { EChartsWrapper } from '@/components/charts'
import {
  Ticket,
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Users,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  CreditCard,
  ExternalLink,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function TicketingPage() {
  const [days, setDays] = useState(30)

  // Get Weeztix connection status
  const { data: connectionStatus, isLoading: statusLoading } =
    api.weeztix.getConnectionStatus.useQuery()

  // Get events
  const { data: eventsData, isLoading: eventsLoading } = api.weeztix.getEvents.useQuery(
    { status: 'all', limit: 50 },
    { enabled: connectionStatus?.connected }
  )

  // Get analytics
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch,
  } = api.weeztix.getAnalytics.useQuery({ days }, { enabled: connectionStatus?.connected })

  // Sync mutation
  const syncMutation = api.weeztix.syncData.useMutation({
    onSuccess: () => refetch(),
  })

  // Daily sales trend chart
  const salesTrendChart: EChartsOption = useMemo(() => {
    if (!analytics?.dailySalesTrend?.length) {
      return { title: { text: 'No sales data available', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        formatter: (params: unknown) => {
          const p = params as Array<{
            name: string
            value: number
            seriesName: string
            color: string
          }>
          let result = `<strong>${p[0]?.name}</strong><br/>`
          for (const item of p) {
            const value =
              item.seriesName === 'Revenue'
                ? `€${item.value.toFixed(2)}`
                : item.value.toLocaleString()
            result += `<span style="color:${item.color}">${item.seriesName}</span>: ${value}<br/>`
          }
          return result
        },
      },
      legend: {
        data: ['Tickets Sold', 'Revenue'],
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
        data: analytics.dailySalesTrend.map((d) =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Tickets',
          position: 'left',
        },
        {
          type: 'value',
          name: 'Revenue (€)',
          position: 'right',
          axisLabel: { formatter: '€{value}' },
        },
      ],
      series: [
        {
          name: 'Tickets Sold',
          type: 'bar',
          data: analytics.dailySalesTrend.map((d) => d.ticketsSold),
          itemStyle: { color: '#aa7712' },
        },
        {
          name: 'Revenue',
          type: 'line',
          yAxisIndex: 1,
          data: analytics.dailySalesTrend.map((d) => d.revenue),
          itemStyle: { color: '#22c55e' },
          smooth: true,
        },
      ],
    }
  }, [analytics])

  // Device breakdown pie chart
  const deviceChart: EChartsOption = useMemo(() => {
    if (!analytics?.breakdowns?.devices) {
      return { title: { text: 'No device data', left: 'center', top: 'center' } }
    }

    const deviceData = Object.entries(analytics.breakdowns.devices).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, left: 'center' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: deviceData,
          emphasis: {
            label: { show: true, fontWeight: 'bold' },
          },
        },
      ],
    }
  }, [analytics])

  // Payment method breakdown
  const paymentChart: EChartsOption = useMemo(() => {
    if (!analytics?.breakdowns?.paymentMethods) {
      return { title: { text: 'No payment data', left: 'center', top: 'center' } }
    }

    const paymentData = Object.entries(analytics.breakdowns.paymentMethods).map(
      ([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      })
    )

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, left: 'center' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          data: paymentData,
          emphasis: {
            label: { show: true, fontWeight: 'bold' },
          },
        },
      ],
    }
  }, [analytics])

  const isLoading = statusLoading || eventsLoading || analyticsLoading

  // Not connected state
  if (!statusLoading && !connectionStatus?.connected) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Weeztix Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your Weeztix account to view ticketing analytics and sales data.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/settings/connections">Configure Connection</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Placeholder content */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value="€--"
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            change={null}
            disabled
          />
          <KpiCard
            title="Tickets Sold"
            value="--"
            icon={<Ticket className="h-5 w-5 text-muted-foreground" />}
            change={null}
            disabled
          />
          <KpiCard
            title="Fill Rate"
            value="--%"
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            change={null}
            disabled
          />
          <KpiCard
            title="Avg Order Value"
            value="€--"
            icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
            change={null}
            disabled
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          {connectionStatus?.lastSyncAt && (
            <span className="text-xs text-muted-foreground">
              Last sync: {new Date(connectionStatus.lastSyncAt).toLocaleString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Revenue"
            value={`€${(analytics?.summary.totalRevenue ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            change={null}
          />
          <KpiCard
            title="Tickets Sold"
            value={(analytics?.summary.totalTicketsSold ?? 0).toLocaleString()}
            icon={<Ticket className="h-5 w-5 text-amber-600" />}
            change={null}
          />
          <KpiCard
            title="Fill Rate"
            value={`${analytics?.summary.fillRate ?? 0}%`}
            icon={<Users className="h-5 w-5 text-blue-600" />}
            description={`${analytics?.summary.totalTicketsSold?.toLocaleString()} / ${analytics?.summary.totalCapacity?.toLocaleString()} capacity`}
          />
          <KpiCard
            title="Avg Order Value"
            value={`€${(analytics?.summary.averageOrderValue ?? 0).toFixed(2)}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
            change={null}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Sales Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Daily Ticket Sales
              </CardTitle>
              <CardDescription>Sales trend over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <EChartsWrapper option={salesTrendChart} height={350} />
              )}
            </CardContent>
          </Card>

          {/* Top Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Top Events by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead className="text-right">Tickets Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topEvents?.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell className="text-right">
                          {event.ticketsSold.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          €{event.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {new Date(event.startDate).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!analytics?.topEvents || analytics.topEvents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No events found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          {eventsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {eventsData?.events?.map((event) => (
                <Card key={event.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      {/* Event Image */}
                      {event.imageUrl && (
                        <div className="w-full md:w-32 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                          <img
                            src={event.imageUrl}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Event Details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{event.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {event.venueName}
                              {event.venueCity ? `, ${event.venueCity}` : ''}
                            </p>
                          </div>
                          <Badge
                            variant={
                              event.status === 'active'
                                ? 'default'
                                : event.status === 'sold_out'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>
                              {event.ticketsSold.toLocaleString()} /{' '}
                              {event.totalCapacity?.toLocaleString() ?? '∞'} tickets
                            </span>
                            <span className="text-green-600 font-medium">
                              €
                              {event.totalRevenue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <Progress
                            value={
                              event.totalCapacity
                                ? (event.ticketsSold / event.totalCapacity) * 100
                                : 0
                            }
                            className="h-2"
                          />
                        </div>

                        {/* Ticket Types */}
                        <div className="flex flex-wrap gap-2">
                          {event.ticketTypes.map((tt) => (
                            <Badge key={tt.id} variant="outline" className="text-xs">
                              {tt.name}: €{tt.price} ({tt.quantitySold} sold)
                            </Badge>
                          ))}
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(event.startDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {event.endDate && (
                            <span>
                              {' '}
                              -{' '}
                              {new Date(event.endDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!eventsData?.events || eventsData.events.length === 0) && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-1">No events found</h3>
                    <p className="text-sm text-muted-foreground">
                      Sync your Weeztix data to see your events here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Breakdowns Tab */}
        <TabsContent value="breakdowns" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Device Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                  Device Breakdown
                </CardTitle>
                <CardDescription>Order distribution by device type</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <EChartsWrapper option={deviceChart} height={250} />
                )}
              </CardContent>
            </Card>

            {/* Payment Method Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Order distribution by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <EChartsWrapper option={paymentChart} height={250} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* UTM Sources */}
          {analytics?.breakdowns?.utmSources &&
            Object.keys(analytics.breakdowns.utmSources).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-purple-500" />
                    Marketing Attribution
                  </CardTitle>
                  <CardDescription>Order sources from UTM tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(analytics.breakdowns.utmSources).map(([source, count]) => (
                      <div
                        key={source}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <span className="font-medium capitalize">{source}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Header() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/insights">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-8 w-8 text-amber-500" />
            Ticketing
          </h1>
          <p className="text-muted-foreground">Weeztix sales and analytics</p>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  icon,
  change,
  description,
  disabled = false,
}: {
  title: string
  value: string
  icon: React.ReactNode
  change?: number | null
  description?: string
  disabled?: boolean
}) {
  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon}
        </div>
        <div className="mt-2">
          <span className="text-2xl font-bold">{value}</span>
          {change !== null && change !== undefined && (
            <span className={`ml-2 text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}
