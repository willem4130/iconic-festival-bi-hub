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
  TrendingUp,
  Cloud,
  Hash,
  MessageSquare,
  Link2,
  Lightbulb,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { EChartsOption } from 'echarts'
import Link from 'next/link'

export default function CorrelationsPage() {
  const [days, setDays] = useState(90)

  const { data: fullReport, isLoading } = api.correlations.getFullInsightsReport.useQuery({
    days,
  })

  // Weather correlation gauge chart
  const weatherGaugeChart: EChartsOption = useMemo(() => {
    const correlation = fullReport?.weather?.correlations?.temperatureVsEngagement?.coefficient ?? 0

    return {
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: -1,
          max: 1,
          splitNumber: 4,
          pointer: {
            show: true,
            length: '60%',
            width: 6,
          },
          axisLine: {
            lineStyle: {
              width: 20,
              color: [
                [0.25, '#ef4444'],
                [0.5, '#f59e0b'],
                [0.75, '#22c55e'],
                [1, '#3b82f6'],
              ],
            },
          },
          axisTick: {
            show: false,
          },
          splitLine: {
            length: 15,
            lineStyle: {
              width: 2,
              color: '#999',
            },
          },
          axisLabel: {
            distance: 25,
            formatter: (value: number) => {
              if (value === -1) return 'Strong -'
              if (value === 0) return '0'
              if (value === 1) return 'Strong +'
              return ''
            },
          },
          detail: {
            valueAnimation: true,
            formatter: (value: number) => `r = ${value.toFixed(2)}`,
            fontSize: 16,
            offsetCenter: [0, '70%'],
          },
          data: [{ value: correlation }],
        },
      ],
    }
  }, [fullReport])

  // Hashtag color performance chart
  const hashtagColorChart: EChartsOption = useMemo(() => {
    if (!fullReport?.hashtags?.colorCorrelation) {
      return { title: { text: 'No hashtag data', left: 'center', top: 'center' } }
    }

    const { colorCorrelation } = fullReport.hashtags

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
        type: 'category',
        data: ['Trending (Green)', 'Gaining (Blue)', 'Overused (Red)'],
      },
      yAxis: {
        type: 'value',
        name: 'Avg Engagement Rate',
        axisLabel: {
          formatter: '{value}%',
        },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: colorCorrelation.green.avgEngagement, itemStyle: { color: '#22c55e' } },
            { value: colorCorrelation.blue.avgEngagement, itemStyle: { color: '#3b82f6' } },
            { value: colorCorrelation.red.avgEngagement, itemStyle: { color: '#ef4444' } },
          ],
          label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
          },
        },
      ],
    }
  }, [fullReport])

  // Sentiment impact chart
  const sentimentImpactChart: EChartsOption = useMemo(() => {
    if (!fullReport?.sentiment?.sentimentImpact) {
      return { title: { text: 'No sentiment data', left: 'center', top: 'center' } }
    }

    const { sentimentImpact } = fullReport.sentiment

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
        type: 'category',
        data: ['High Positive', 'Neutral', 'High Negative'],
      },
      yAxis: {
        type: 'value',
        name: 'Avg Follower Growth',
      },
      series: [
        {
          type: 'bar',
          data: [
            {
              value: sentimentImpact.highPositiveDays.avgFollowerGrowth,
              itemStyle: { color: '#22c55e' },
            },
            {
              value: sentimentImpact.neutralDays.avgFollowerGrowth,
              itemStyle: { color: '#9ca3af' },
            },
            {
              value: sentimentImpact.highNegativeDays.avgFollowerGrowth,
              itemStyle: { color: '#ef4444' },
            },
          ],
          label: {
            show: true,
            position: 'top',
            formatter: '{c}',
          },
        },
      ],
    }
  }, [fullReport])

  // Attribution ROI chart
  const attributionChart: EChartsOption = useMemo(() => {
    if (!fullReport?.attribution?.byPlatform) {
      return { title: { text: 'No attribution data', left: 'center', top: 'center' } }
    }

    const { byPlatform } = fullReport.attribution

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: ['Facebook', 'Instagram'],
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
        data: ['Clicks', 'Conversions', 'Conv. Rate (%)'],
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: 'Facebook',
          type: 'bar',
          data: [
            byPlatform.facebook.clicks,
            byPlatform.facebook.conversions,
            byPlatform.facebook.rate,
          ],
          itemStyle: { color: '#1877F2' },
        },
        {
          name: 'Instagram',
          type: 'bar',
          data: [
            byPlatform.instagram.clicks,
            byPlatform.instagram.conversions,
            byPlatform.instagram.rate,
          ],
          itemStyle: { color: '#E1306C' },
        },
      ],
    }
  }, [fullReport])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case 'strong':
        return <Badge className="bg-green-100 text-green-800">Strong</Badge>
      case 'moderate':
        return <Badge className="bg-blue-100 text-blue-800">Moderate</Badge>
      case 'weak':
        return <Badge className="bg-amber-100 text-amber-800">Weak</Badge>
      default:
        return <Badge variant="outline">None</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Priority</Badge>
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium Priority</Badge>
      default:
        return <Badge variant="outline">Low Priority</Badge>
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
            <h1 className="text-3xl font-bold">Cross-Data Correlations</h1>
            <p className="text-gray-500">
              Discover relationships between weather, hashtags, sentiment, and conversions
            </p>
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

      {/* Key Insights Cards */}
      {fullReport?.keyInsights && fullReport.keyInsights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Key Insights
            </CardTitle>
            <CardDescription>AI-generated insights from your data</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fullReport.keyInsights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Correlation Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weather Impact</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : fullReport?.weather ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {fullReport.weather.correlations.temperatureVsEngagement.coefficient.toFixed(2)}
                  </span>
                  {getStrengthBadge(
                    fullReport.weather.correlations.temperatureVsEngagement.strength
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Temperature vs Engagement</p>
              </>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hashtag Performance</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : fullReport?.hashtags?.topPerformers?.[0] ? (
              <>
                <div className="text-2xl font-bold truncate">
                  {fullReport.hashtags.topPerformers[0].hashtag}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Top performer ({fullReport.hashtags.topPerformers[0].avgEngagementRate.toFixed(1)}
                  % engagement)
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sentiment Impact</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : fullReport?.sentiment ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {fullReport.sentiment.correlation.coefficient.toFixed(2)}
                  </span>
                  {getStrengthBadge(fullReport.sentiment.correlation.strength)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sentiment vs Follower Growth</p>
              </>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attribution ROI</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : fullReport?.attribution ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {fullReport.attribution.byPlatform.facebook.rate >
                    fullReport.attribution.byPlatform.instagram.rate
                      ? 'Facebook'
                      : 'Instagram'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Best converting platform</p>
              </>
            ) : (
              <p className="text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Charts */}
      <Tabs defaultValue="weather" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="weather">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Temperature-Engagement Correlation</CardTitle>
                <CardDescription>How strongly temperature affects engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <EChartsWrapper option={weatherGaugeChart} height={300} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weather Insights</CardTitle>
                <CardDescription>Key findings from weather analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fullReport?.weather?.insights?.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50">
                    <Info className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    <span>{insight}</span>
                  </div>
                ))}
                {fullReport?.weather?.recommendations?.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                    <span>{rec}</span>
                  </div>
                ))}
                {!fullReport?.weather && !isLoading && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Weather Data</AlertTitle>
                    <AlertDescription>
                      Sync weather data to see correlations with engagement.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="hashtags">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Hashtag Color Performance</CardTitle>
                <CardDescription>
                  Average engagement by RiteTag color classification
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <EChartsWrapper option={hashtagColorChart} height={350} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top & Bottom Performers</CardTitle>
                <CardDescription>Best and worst hashtags by engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {fullReport?.hashtags ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-green-600 mb-2 flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4" /> Top Performers
                      </h4>
                      <div className="space-y-2">
                        {fullReport.hashtags.topPerformers.slice(0, 5).map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded bg-green-50"
                          >
                            <span className="font-medium">{h.hashtag}</span>
                            <Badge className="bg-green-100 text-green-800">
                              {h.avgEngagementRate.toFixed(2)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-600 mb-2 flex items-center gap-1">
                        <ArrowDownRight className="h-4 w-4" /> Worst Performers
                      </h4>
                      <div className="space-y-2">
                        {fullReport.hashtags.worstPerformers.slice(0, 5).map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded bg-red-50"
                          >
                            <span className="font-medium">{h.hashtag}</span>
                            <Badge className="bg-red-100 text-red-800">
                              {h.avgEngagementRate.toFixed(2)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Hashtag Data</AlertTitle>
                    <AlertDescription>
                      Link hashtags to content to see performance correlations.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sentiment">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Impact on Growth</CardTitle>
                <CardDescription>Average follower growth by sentiment level</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <EChartsWrapper option={sentimentImpactChart} height={350} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sentiment Correlation</CardTitle>
                <CardDescription>Relationship between sentiment and growth</CardDescription>
              </CardHeader>
              <CardContent>
                {fullReport?.sentiment ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Correlation Coefficient</span>
                        <span className="font-bold text-2xl">
                          {fullReport.sentiment.correlation.coefficient.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Strength</span>
                        {getStrengthBadge(fullReport.sentiment.correlation.strength)}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50">
                      <p className="text-sm">{fullReport.sentiment.correlation.insight}</p>
                    </div>
                    {fullReport.sentiment.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-green-50">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Sentiment Data</AlertTitle>
                    <AlertDescription>
                      Analyze comment sentiment to see growth correlations.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attribution">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Attribution Comparison</CardTitle>
                <CardDescription>Clicks and conversions by platform</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <EChartsWrapper option={attributionChart} height={350} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attribution Insights</CardTitle>
                <CardDescription>Key findings from attribution analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {fullReport?.attribution ? (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: '#1877F2' }}
                          />
                          <span className="font-medium">Facebook</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-bold">
                              {formatNumber(fullReport.attribution.byPlatform.facebook.clicks)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversions</p>
                            <p className="font-bold">
                              {fullReport.attribution.byPlatform.facebook.conversions}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-bold">
                              {fullReport.attribution.byPlatform.facebook.rate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-pink-50 border border-pink-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: '#E1306C' }}
                          />
                          <span className="font-medium">Instagram</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">Clicks</p>
                            <p className="font-bold">
                              {formatNumber(fullReport.attribution.byPlatform.instagram.clicks)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversions</p>
                            <p className="font-bold">
                              {fullReport.attribution.byPlatform.instagram.conversions}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rate</p>
                            <p className="font-bold">
                              {fullReport.attribution.byPlatform.instagram.rate.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {fullReport.attribution.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-green-50">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Attribution Data</AlertTitle>
                    <AlertDescription>
                      Create tracked links to see attribution correlations.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      {fullReport?.actionItems && fullReport.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Recommended Actions
            </CardTitle>
            <CardDescription>Data-driven recommendations to improve performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Expected Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fullReport.actionItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell className="font-medium">{item.action}</TableCell>
                    <TableCell className="text-muted-foreground">{item.expectedImpact}</TableCell>
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
