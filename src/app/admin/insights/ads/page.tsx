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
import { EChartsWrapper } from '@/components/charts'
import {
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Target,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function AdPerformancePage() {
  const [days, setDays] = useState(30)

  // Use OAuth connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  const { data, isLoading, refetch } = api.metaInsights.getAdPerformance.useQuery(
    { days },
    { enabled: isConnected }
  )
  const syncCampaigns = api.metaInsights.syncAdCampaigns.useMutation({
    onSuccess: () => refetch(),
  })

  // Spend over time chart
  const spendChart: EChartsOption = useMemo(() => {
    if (!data?.dailyData.length) {
      return { title: { text: 'No ad data available', left: 'center', top: 'center' } }
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
              item.seriesName === 'Spend' || item.seriesName === 'Revenue'
                ? `$${item.value.toFixed(2)}`
                : item.value.toLocaleString()
            result += `<span style="color:${item.color}">${item.seriesName}</span>: ${value}<br/>`
          }
          return result
        },
      },
      legend: {
        data: ['Spend', 'Revenue'],
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
        data: data.dailyData.map((d) =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Amount ($)',
          axisLabel: {
            formatter: (value: number) => `$${value.toFixed(0)}`,
          },
        },
      ],
      series: [
        {
          name: 'Spend',
          type: 'bar',
          data: data.dailyData.map((d) => d.spend),
          itemStyle: { color: '#ef4444' },
        },
        {
          name: 'Revenue',
          type: 'bar',
          data: data.dailyData.map((d) => d.conversionValue),
          itemStyle: { color: '#22c55e' },
        },
      ],
    }
  }, [data])

  // Performance metrics chart (CTR, CPC)
  const performanceChart: EChartsOption = useMemo(() => {
    if (!data?.dailyData.length) {
      return { title: { text: 'No ad data available', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Impressions', 'Clicks', 'Conversions'],
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
        data: data.dailyData.map((d) =>
          new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        ),
        axisLabel: { rotate: 45 },
        boundaryGap: false,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Impressions',
          position: 'left',
          axisLabel: {
            formatter: (value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString(),
          },
        },
        {
          type: 'value',
          name: 'Clicks/Conversions',
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Impressions',
          type: 'line',
          smooth: true,
          data: data.dailyData.map((d) => d.impressions),
          itemStyle: { color: '#3b82f6' },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: 'Clicks',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: data.dailyData.map((d) => d.clicks),
          itemStyle: { color: '#f59e0b' },
        },
        {
          name: 'Conversions',
          type: 'line',
          smooth: true,
          yAxisIndex: 1,
          data: data.dailyData.map((d) => d.conversions),
          itemStyle: { color: '#22c55e' },
        },
      ],
    }
  }, [data])

  // Campaign pie chart
  const campaignPieChart: EChartsOption = useMemo(() => {
    if (!data?.campaigns.length) {
      return { title: { text: 'No campaigns', left: 'center', top: 'center' } }
    }

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ${c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'center',
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          data: data.campaigns.map((c, i) => ({
            name: c.name,
            value: c.spend,
            itemStyle: {
              color: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 6],
            },
          })),
        },
      ],
    }
  }, [data])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DELETED':
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getObjectiveIcon = (objective: string) => {
    switch (objective) {
      case 'TRAFFIC':
        return <MousePointer className="h-3 w-3" />
      case 'CONVERSIONS':
      case 'SALES':
        return <ShoppingCart className="h-3 w-3" />
      case 'AWARENESS':
        return <Eye className="h-3 w-3" />
      default:
        return <Target className="h-3 w-3" />
    }
  }

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
            <h1 className="text-3xl font-bold">Ad Performance</h1>
            <p className="text-gray-500">Campaign spend, ROAS, and conversion metrics</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your Facebook and Instagram accounts to view ad performance metrics.
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
            <h1 className="text-3xl font-bold">Ad Performance</h1>
            <p className="text-gray-500">Campaign spend, ROAS, and conversion metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncCampaigns.mutate()}
            disabled={syncCampaigns.isPending}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncCampaigns.isPending ? 'animate-spin' : ''}`}
            />
            Sync Campaigns
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Spend"
          value={formatCurrency(data?.summary.totalSpend ?? 0)}
          icon={DollarSign}
          description={`Last ${days} days`}
          loading={isLoading}
          color="red"
        />
        <KPICard
          title="Revenue"
          value={formatCurrency(data?.summary.totalConversionValue ?? 0)}
          icon={ShoppingCart}
          description="Conversion value"
          loading={isLoading}
          color="green"
        />
        <KPICard
          title="ROAS"
          value={`${(data?.summary.roas ?? 0).toFixed(2)}x`}
          icon={TrendingUp}
          description="Return on ad spend"
          loading={isLoading}
          color={(data?.summary.roas ?? 0) >= 1 ? 'green' : 'red'}
        />
        <KPICard
          title="Conversions"
          value={formatNumber(data?.summary.totalConversions ?? 0)}
          icon={Target}
          description={`Avg CPA: ${formatCurrency((data?.summary.totalSpend ?? 0) / Math.max(data?.summary.totalConversions ?? 1, 1))}`}
          loading={isLoading}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Impressions</div>
            <div className="text-2xl font-bold">
              {formatNumber(data?.summary.totalImpressions ?? 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              CPM: {formatCurrency(data?.summary.avgCpm ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Reach</div>
            <div className="text-2xl font-bold">{formatNumber(data?.summary.totalReach ?? 0)}</div>
            <div className="text-xs text-muted-foreground">Unique users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Clicks</div>
            <div className="text-2xl font-bold">{formatNumber(data?.summary.totalClicks ?? 0)}</div>
            <div className="text-xs text-muted-foreground">
              CPC: {formatCurrency(data?.summary.avgCpc ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">CTR</div>
            <div className="text-2xl font-bold">{(data?.summary.avgCtr ?? 0).toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground">Click-through rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="spend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spend">Spend & Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Split</TabsTrigger>
        </TabsList>

        <TabsContent value="spend">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spend vs Revenue</CardTitle>
              <CardDescription>Ad spend and conversion value over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={spendChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Impressions, Clicks & Conversions</CardTitle>
              <CardDescription>Daily performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={performanceChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Spend by Campaign</CardTitle>
              <CardDescription>Budget allocation across campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <EChartsWrapper option={campaignPieChart} height={400} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Detailed metrics for each campaign</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.campaigns.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Objective</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {getObjectiveIcon(campaign.objective)}
                          {campaign.objective}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(campaign.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.impressions)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                      <TableCell className="text-right">{campaign.ctr.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.cpc)}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.conversions)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={campaign.roas >= 1 ? 'text-green-600' : 'text-red-600'}>
                          {campaign.roas.toFixed(2)}x
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No campaign data available. Sync your Meta Ads account to see performance data.
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
  color,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  loading?: boolean
  color?: 'red' | 'green' | 'blue'
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

  const colorClass = color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
