'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Lightbulb,
  BarChart3,
  FileText,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Star,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useInsights, PlatformToggle } from '@/components/insights'
import {
  FocusSelector,
  ReportActions,
  SavedReportsSheet,
  type FocusArea,
} from '@/components/insights/ai'
import { useToast } from '@/hooks/use-toast'
type ActiveTab = 'strategic' | 'report' | 'recommendations'

export default function AIAnalysisPage() {
  const { platform } = useInsights()
  const [activeTab, setActiveTab] = useState<ActiveTab>('strategic')
  const [focusArea, setFocusArea] = useState<FocusArea>('engagement')
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  // Parse report month
  const { month, year } = useMemo(() => {
    const [y, m] = reportMonth.split('-')
    return { month: parseInt(m ?? '1'), year: parseInt(y ?? '2025') }
  }, [reportMonth])

  // AI Queries
  const {
    data: strategicAdvice,
    isLoading: strategicLoading,
    isError: strategicError,
    refetch: refetchStrategic,
  } = api.aiAnalysis.getStrategicAdvice.useQuery(
    { platform, focus: focusArea, days: 30 },
    {
      enabled: isConnected && activeTab === 'strategic',
      retry: 2,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    }
  )

  const {
    data: narrativeReport,
    isLoading: reportLoading,
    isError: reportError,
    refetch: refetchReport,
  } = api.aiAnalysis.generateNarrativeReport.useQuery(
    { platform, month, year },
    {
      enabled: isConnected && activeTab === 'report',
      retry: 2,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    }
  )

  const {
    data: postingRecs,
    isLoading: recsLoading,
    isError: recsError,
    refetch: refetchRecs,
  } = api.aiAnalysis.getPostingRecommendations.useQuery(
    { platform, days: 30 },
    {
      enabled: isConnected && activeTab === 'recommendations',
      retry: 2,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    }
  )

  // Save report mutation
  const { toast } = useToast()
  const saveReportMutation = api.aiAnalysis.saveReport.useMutation({
    onSuccess: () => {
      toast({
        title: 'Report saved',
        description: 'Your AI analysis has been saved successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSaveReport = async (params: {
    title: string
    notes?: string
    reportType: 'strategic' | 'report' | 'recommendations'
    platform: 'facebook' | 'instagram' | 'all'
    focusArea?: FocusArea
    month?: number
    year?: number
    days?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any
  }) => {
    await saveReportMutation.mutateAsync({
      title: params.title,
      notes: params.notes,
      reportType: params.reportType,
      platform: params.platform,
      focusArea: params.focusArea,
      month: params.month,
      year: params.year,
      days: params.days,
      content: params.content as Record<string, unknown>,
    })
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">Connect your accounts to use AI analysis.</p>
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
      <Header />

      {/* Intro Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
            <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Claude AI Analysis
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Get AI-powered insights, strategic recommendations, and performance analysis based on
              your social media data. All analysis is generated by Claude and tailored to your
              specific content and metrics.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strategic" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Strategic Advice</span>
            <span className="sm:hidden">Strategy</span>
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Monthly Report</span>
            <span className="sm:hidden">Report</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Posting Tips</span>
            <span className="sm:hidden">Tips</span>
          </TabsTrigger>
        </TabsList>

        {/* Strategic Advice Tab */}
        <TabsContent value="strategic" className="space-y-6 mt-6">
          {/* Focus Selector - Large Cards */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <FocusSelector
                  value={focusArea}
                  onChange={setFocusArea}
                  disabled={strategicLoading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStrategic()}
                  className="self-start sm:self-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {strategicLoading ? (
            <LoadingState message="Generating strategic advice..." analysisType="strategic" />
          ) : strategicError ? (
            <ErrorState
              message="Failed to generate strategic advice. The AI service may be temporarily unavailable."
              onRetry={() => refetchStrategic()}
            />
          ) : strategicAdvice ? (
            <div className="space-y-6">
              {/* Performance Overview */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Performance Grade */}
                {strategicAdvice.performanceGrade && (
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200">
                    <CardContent className="pt-6 text-center">
                      <div className="text-xs font-medium uppercase text-purple-600 mb-2">
                        Performance Grade
                      </div>
                      <div
                        className={`text-6xl font-bold ${
                          strategicAdvice.performanceGrade === 'A'
                            ? 'text-green-600'
                            : strategicAdvice.performanceGrade === 'B'
                              ? 'text-blue-600'
                              : strategicAdvice.performanceGrade === 'C'
                                ? 'text-amber-600'
                                : 'text-red-600'
                        }`}
                      >
                        {strategicAdvice.performanceGrade}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Benchmark Comparison */}
                {strategicAdvice.benchmarkComparison && (
                  <Card className="md:col-span-2">
                    <CardContent className="pt-6">
                      <div className="text-xs font-medium uppercase text-muted-foreground mb-3">
                        Benchmark Comparison
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="p-2 bg-muted/50 rounded">
                          <div className="text-xs text-muted-foreground">vs Industry</div>
                          <p className="text-sm">
                            {strategicAdvice.benchmarkComparison.vsIndustry}
                          </p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <div className="text-xs text-muted-foreground">Trend</div>
                          <p className="text-sm">
                            {strategicAdvice.benchmarkComparison.vsPreviousPeriod}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {strategicAdvice.benchmarkComparison.areasAboveAverage?.map((area, i) => (
                          <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                            ↑ {area}
                          </Badge>
                        ))}
                        {strategicAdvice.benchmarkComparison.areasBelowAverage?.map((area, i) => (
                          <Badge key={i} className="bg-red-100 text-red-800 text-xs">
                            ↓ {area}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Strategic Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{strategicAdvice.summary}</p>
                </CardContent>
              </Card>

              {/* Quick Wins */}
              {strategicAdvice.quickWins && strategicAdvice.quickWins.length > 0 && (
                <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <Zap className="h-5 w-5 text-green-500" />
                      Quick Wins
                    </CardTitle>
                    <CardDescription>
                      High-impact actions you can implement immediately
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {strategicAdvice.quickWins.map((win, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="font-medium text-sm mb-1">{win.action}</div>
                          <div className="text-xs text-green-700 dark:text-green-300 mb-2">
                            {win.impact}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ⏱ {win.timeToImplement}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Opportunities */}
              {strategicAdvice.topOpportunities && strategicAdvice.topOpportunities.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Top Opportunities
                    </CardTitle>
                    <CardDescription>
                      Actionable recommendations to improve performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {strategicAdvice.topOpportunities.map((opp, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                {opp.priority ?? i + 1}
                              </span>
                              <h4 className="font-medium">{opp.title}</h4>
                            </div>
                            <EffortBadge effort={opp.effort} />
                          </div>
                          <p className="text-sm text-muted-foreground">{opp.description}</p>
                          {opp.steps && opp.steps.length > 0 && (
                            <div className="pl-4 border-l-2 border-primary/30">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Steps to implement:
                              </p>
                              <ul className="text-sm space-y-1">
                                {opp.steps.map((step, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-primary">→</span>
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">
                              {opp.expectedImpact}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Assessment */}
              {strategicAdvice.riskAssessment && strategicAdvice.riskAssessment.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Risk Assessment
                    </CardTitle>
                    <CardDescription>Potential vulnerabilities to address</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {strategicAdvice.riskAssessment.map((risk, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-sm">{risk.risk}</span>
                            <Badge
                              variant="outline"
                              className={
                                risk.severity === 'high'
                                  ? 'border-red-300 text-red-600'
                                  : risk.severity === 'medium'
                                    ? 'border-amber-300 text-amber-600'
                                    : 'border-gray-300'
                              }
                            >
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            <span className="font-medium">Mitigation:</span> {risk.mitigation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Growth Projections */}
              {strategicAdvice.growthProjections && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Growth Projections
                    </CardTitle>
                    <CardDescription>Expected outcomes with different strategies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                        <div className="text-xs font-medium text-gray-500 mb-1">Conservative</div>
                        <p className="text-sm">{strategicAdvice.growthProjections.conservative}</p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-medium text-blue-600 mb-1">
                          Moderate (Recommended)
                        </div>
                        <p className="text-sm">{strategicAdvice.growthProjections.moderate}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <div className="text-xs font-medium text-green-600 mb-1">Aggressive</div>
                        <p className="text-sm">{strategicAdvice.growthProjections.aggressive}</p>
                      </div>
                    </div>
                    {strategicAdvice.growthProjections.keyAssumptions &&
                      strategicAdvice.growthProjections.keyAssumptions.length > 0 && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          <span className="font-medium">Key assumptions:</span>{' '}
                          {strategicAdvice.growthProjections.keyAssumptions.join(' • ')}
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Content Calendar Suggestions */}
              {strategicAdvice.contentCalendarSuggestions &&
                strategicAdvice.contentCalendarSuggestions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        Content Calendar Suggestions
                      </CardTitle>
                      <CardDescription>Optimal content schedule based on your data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                        {strategicAdvice.contentCalendarSuggestions.map((sug, i) => (
                          <div
                            key={i}
                            className="p-3 bg-muted/50 rounded-lg border border-transparent hover:border-primary/20 transition-colors"
                          >
                            <div className="font-medium text-sm mb-1">{sug.dayOfWeek}</div>
                            <Badge variant="secondary" className="text-xs mb-2">
                              {sug.contentType}
                            </Badge>
                            <p className="text-xs text-muted-foreground mb-1">{sug.theme}</p>
                            {sug.bestTime && (
                              <div className="text-xs text-blue-600">⏰ {sug.bestTime}</div>
                            )}
                            {sug.caption && (
                              <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                                "{sug.caption}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Key Metrics to Track */}
              {strategicAdvice.keyMetricsToTrack &&
                strategicAdvice.keyMetricsToTrack.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                        Key Metrics to Track
                      </CardTitle>
                      <CardDescription>Focus on these metrics to measure success</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {strategicAdvice.keyMetricsToTrack.map((metric, i) => (
                          <div key={i} className="p-3 bg-muted/50 rounded-lg">
                            <div className="font-medium text-sm mb-2">{metric.metric}</div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Current:</span>
                              <span className="font-medium">{metric.currentValue}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Target:</span>
                              <span className="font-medium text-green-600">
                                {metric.targetValue}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{metric.importance}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Competitor Insights */}
              {strategicAdvice.competitorInsights &&
                strategicAdvice.competitorInsights.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        Competitor Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {strategicAdvice.competitorInsights.map((insight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-purple-500 mt-0.5">★</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

              {/* Save/Export Actions */}
              <div className="flex justify-end pt-4 border-t">
                <ReportActions
                  reportType="strategic"
                  platform={platform}
                  data={strategicAdvice}
                  focusArea={focusArea}
                  onSave={handleSaveReport}
                />
              </div>
            </div>
          ) : (
            <EmptyState message="Unable to generate strategic advice. Make sure you have content synced." />
          )}
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="report" className="space-y-6 mt-6">
          {/* Month Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Report for:</span>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => setReportMonth(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-background"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchReport()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>

          {reportLoading ? (
            <LoadingState message="Generating monthly report..." analysisType="report" />
          ) : reportError ? (
            <ErrorState
              message="Failed to generate monthly report. The AI service may be temporarily unavailable."
              onRetry={() => refetchReport()}
            />
          ) : narrativeReport ? (
            <div className="grid gap-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    {getMonthName(month)} {year} Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{narrativeReport.summary}</p>
                </CardContent>
              </Card>

              {/* Highlights */}
              {narrativeReport.highlights && narrativeReport.highlights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {narrativeReport.highlights.map((highlight, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-medium text-sm mb-1">{highlight.title}</h4>
                          <div className="text-2xl font-bold mb-1">{highlight.metric}</div>
                          <p className="text-xs text-muted-foreground">{highlight.context}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Challenges */}
              {narrativeReport.challenges && narrativeReport.challenges.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      Challenges
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {narrativeReport.challenges.map((challenge, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{challenge}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {narrativeReport.recommendations && narrativeReport.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {narrativeReport.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-amber-500 mt-0.5">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Outlook */}
              {narrativeReport.outlook && (
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Outlook
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{narrativeReport.outlook}</p>
                  </CardContent>
                </Card>
              )}

              {/* Save/Export Actions */}
              <div className="flex justify-end pt-4 border-t">
                <ReportActions
                  reportType="report"
                  platform={platform}
                  data={narrativeReport}
                  month={month}
                  year={year}
                  onSave={handleSaveReport}
                />
              </div>
            </div>
          ) : (
            <EmptyState message="Unable to generate report. Make sure you have data for the selected month." />
          )}
        </TabsContent>

        {/* Posting Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => refetchRecs()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {recsLoading ? (
            <LoadingState message="Analyzing posting patterns..." analysisType="recommendations" />
          ) : recsError ? (
            <ErrorState
              message="Failed to generate posting recommendations. The AI service may be temporarily unavailable."
              onRetry={() => refetchRecs()}
            />
          ) : postingRecs ? (
            <div className="space-y-6">
              {/* Top Row - Key Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Best Posting Time */}
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Best Time</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {postingRecs.bestPostingTime.dayOfWeek}
                    </div>
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatHour(postingRecs.bestPostingTime.hour)}
                    </div>
                    {postingRecs.bestPostingTime.reasoning && (
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2 line-clamp-2">
                        {postingRecs.bestPostingTime.reasoning}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Optimal Content Type */}
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Best Format</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {postingRecs.optimalContentType}
                    </div>
                    <Badge variant="outline" className="mt-2 border-purple-300 text-purple-600">
                      {Math.round(postingRecs.confidence * 100)}% confidence
                    </Badge>
                  </CardContent>
                </Card>

                {/* Engagement Prediction */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                      <Target className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Predicted Engagement</span>
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {postingRecs.engagementPrediction.toLocaleString()}
                    </div>
                    <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                      interactions per post
                    </p>
                  </CardContent>
                </Card>

                {/* Secondary Times */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase">Alternative Times</span>
                    </div>
                    {postingRecs.secondaryPostingTimes?.slice(0, 3).map((time, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span>
                          {time.dayOfWeek} {formatHour(time.hour)}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            time.engagementPotential === 'high'
                              ? 'border-green-300 text-green-600'
                              : time.engagementPotential === 'medium'
                                ? 'border-amber-300 text-amber-600'
                                : 'border-gray-300'
                          }
                        >
                          {time.engagementPotential}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Weekly Schedule */}
              {postingRecs.weeklySchedule && postingRecs.weeklySchedule.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Weekly Posting Schedule
                    </CardTitle>
                    <CardDescription>
                      Recommended posting plan for maximum engagement
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                      {postingRecs.weeklySchedule.map((day, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-lg bg-muted/50 border hover:border-primary/30 transition-colors"
                        >
                          <div className="font-semibold text-sm mb-1">{day.day}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {day.postCount} post{day.postCount > 1 ? 's' : ''}
                          </div>
                          <div className="space-y-1">
                            <Badge variant="secondary" className="text-xs w-full justify-center">
                              {day.contentType}
                            </Badge>
                            <div className="text-xs text-center text-muted-foreground">
                              {day.bestTimes?.map((h) => formatHour(h)).join(', ')}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {day.theme}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Mix */}
              {postingRecs.contentMix && postingRecs.contentMix.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                      Optimal Content Mix
                    </CardTitle>
                    <CardDescription>Recommended distribution of content types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {postingRecs.contentMix.map((content, i) => {
                        const colors = [
                          'bg-blue-500',
                          'bg-purple-500',
                          'bg-amber-500',
                          'bg-green-500',
                        ]
                        return (
                          <div key={i} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{content.type}</span>
                              <span className="text-2xl font-bold">{content.percentage}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colors[i % colors.length]} rounded-full transition-all`}
                                style={{ width: `${content.percentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{content.description}</p>
                            {content.examples && content.examples.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {content.examples.slice(0, 2).map((ex, j) => (
                                  <Badge key={j} variant="outline" className="text-xs">
                                    {ex}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hashtag Strategy */}
              {postingRecs.hashtagStrategy && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      Hashtag Strategy
                    </CardTitle>
                    <CardDescription>Organized hashtag approach for maximum reach</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Branded
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {postingRecs.hashtagStrategy.branded?.map((tag, i) => (
                            <Badge key={i} className="bg-amber-100 text-amber-800 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Trending
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {postingRecs.hashtagStrategy.trending?.map((tag, i) => (
                            <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Niche
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {postingRecs.hashtagStrategy.niche?.map((tag, i) => (
                            <Badge key={i} className="bg-blue-100 text-blue-800 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          Community
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {postingRecs.hashtagStrategy.community?.map((tag, i) => (
                            <Badge key={i} className="bg-purple-100 text-purple-800 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {postingRecs.hashtagStrategy.usage && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Pro Tip: </span>
                          {postingRecs.hashtagStrategy.usage}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Caption Templates */}
              {postingRecs.captionTemplates && postingRecs.captionTemplates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Caption Templates
                    </CardTitle>
                    <CardDescription>Ready-to-use caption structures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {postingRecs.captionTemplates.map((template, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-lg space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{template.type}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Template:</p>
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {template.template}
                            </code>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Example:</p>
                            <p className="text-sm whitespace-pre-line bg-background p-2 rounded border">
                              {template.example}
                            </p>
                          </div>
                          {template.tips && template.tips.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.tips.map((tip, j) => (
                                <span
                                  key={j}
                                  className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded"
                                >
                                  {tip}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Audience Insights */}
              {postingRecs.audienceInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Audience Insights
                    </CardTitle>
                    <CardDescription>Understanding your audience behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Peak Activity Hours</h4>
                        <div className="flex flex-wrap gap-2">
                          {postingRecs.audienceInsights.peakActivityHours?.map((hour, i) => (
                            <Badge key={i} variant="outline">
                              {formatHour(hour)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Preferred Content</h4>
                        <div className="flex flex-wrap gap-2">
                          {postingRecs.audienceInsights.preferredContentTypes?.map((type, i) => (
                            <Badge key={i} variant="secondary">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    {postingRecs.audienceInsights.engagementPatterns && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <h4 className="font-medium text-sm mb-1 text-blue-800 dark:text-blue-200">
                          Engagement Patterns
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {postingRecs.audienceInsights.engagementPatterns}
                        </p>
                      </div>
                    )}
                    {postingRecs.audienceInsights.demographicNotes && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                        <h4 className="font-medium text-sm mb-1 text-purple-800 dark:text-purple-200">
                          Demographic Notes
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          {postingRecs.audienceInsights.demographicNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Platform-Specific Tips */}
              {postingRecs.platformSpecificTips && postingRecs.platformSpecificTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Platform Tips
                    </CardTitle>
                    <CardDescription>Actionable tips to boost performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {postingRecs.platformSpecificTips.map((tip, i) => {
                        const categoryColors: Record<string, string> = {
                          timing: 'bg-blue-100 text-blue-800',
                          content: 'bg-purple-100 text-purple-800',
                          engagement: 'bg-green-100 text-green-800',
                          growth: 'bg-amber-100 text-amber-800',
                          hashtags: 'bg-pink-100 text-pink-800',
                        }
                        const impactColors: Record<string, string> = {
                          high: 'text-green-600',
                          medium: 'text-amber-600',
                          low: 'text-gray-500',
                        }
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div
                              className={`text-lg ${impactColors[tip.impact] ?? 'text-gray-500'}`}
                            >
                              {tip.impact === 'high' ? '🔥' : tip.impact === 'medium' ? '⭐' : '💡'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{tip.tip}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${categoryColors[tip.category] ?? ''}`}
                                >
                                  {tip.category}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    tip.impact === 'high'
                                      ? 'border-green-300 text-green-600'
                                      : tip.impact === 'medium'
                                        ? 'border-amber-300 text-amber-600'
                                        : ''
                                  }`}
                                >
                                  {tip.impact} impact
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Save/Export Actions */}
              <div className="flex justify-end pt-4 border-t">
                <ReportActions
                  reportType="recommendations"
                  platform={platform}
                  data={postingRecs}
                  days={30}
                  onSave={handleSaveReport}
                />
              </div>
            </div>
          ) : (
            <EmptyState message="Unable to generate recommendations. Make sure you have content synced." />
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Related Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/insights/content">
                <BarChart3 className="h-4 w-4 mr-2" />
                Content Hub
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/insights/content/compare">
                <Target className="h-4 w-4 mr-2" />
                Compare Posts
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/insights">
                <ChevronRight className="h-4 w-4 mr-2" />
                Overview
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Header() {
  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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
              <Sparkles className="h-8 w-8 text-purple-500" />
              AI Analysis
            </h1>
            <p className="text-muted-foreground">Claude-powered insights and recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SavedReportsSheet />
          <PlatformToggle />
        </div>
      </div>
    </div>
  )
}

type AnalysisType = 'strategic' | 'report' | 'recommendations'

const ANALYSIS_STEPS: Record<AnalysisType, { step: string; detail: string }[]> = {
  strategic: [
    { step: 'Gathering metrics', detail: 'Collecting reach, engagement, and follower data...' },
    { step: 'Analyzing performance', detail: 'Evaluating content performance patterns...' },
    { step: 'Benchmarking', detail: 'Comparing against industry standards...' },
    { step: 'Identifying opportunities', detail: 'Finding growth opportunities and quick wins...' },
    { step: 'Assessing risks', detail: 'Evaluating potential vulnerabilities...' },
    { step: 'Generating projections', detail: 'Creating growth forecasts...' },
    { step: 'Finalizing recommendations', detail: 'Preparing actionable insights...' },
  ],
  report: [
    { step: 'Loading monthly data', detail: 'Fetching insights for the selected period...' },
    { step: 'Calculating metrics', detail: 'Computing reach, engagement, and growth...' },
    { step: 'Analyzing top content', detail: 'Identifying best performing posts...' },
    { step: 'Identifying challenges', detail: 'Evaluating areas for improvement...' },
    { step: 'Writing summary', detail: 'Generating executive summary...' },
    { step: 'Preparing outlook', detail: 'Creating forward-looking insights...' },
  ],
  recommendations: [
    { step: 'Analyzing posting history', detail: 'Reviewing your content performance...' },
    { step: 'Identifying peak times', detail: 'Finding optimal posting windows...' },
    { step: 'Evaluating content types', detail: 'Analyzing which formats perform best...' },
    { step: 'Building weekly schedule', detail: 'Creating day-by-day content plan...' },
    {
      step: 'Crafting hashtag strategy',
      detail: 'Organizing branded, trending, and niche tags...',
    },
    { step: 'Generating caption templates', detail: 'Creating ready-to-use caption structures...' },
    { step: 'Analyzing audience', detail: 'Understanding engagement patterns...' },
    { step: 'Compiling platform tips', detail: 'Gathering actionable recommendations...' },
  ],
}

function LoadingState({
  message,
  analysisType = 'strategic',
}: {
  message: string
  analysisType?: AnalysisType
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const steps = ANALYSIS_STEPS[analysisType]

  // Progress through steps
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) return prev + 1
        return prev
      })
    }, 2500) // Move to next step every 2.5 seconds

    return () => clearInterval(stepInterval)
  }, [steps.length])

  // Track elapsed time
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardContent className="py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-purple-500" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                  Claude is analyzing your data
                </h3>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {formatTime(elapsedTime)}
            </Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isComplete = index < currentStep
              const isCurrent = index === currentStep

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800'
                      : ''
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full border-2 border-purple-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        isComplete
                          ? 'text-green-600 dark:text-green-400'
                          : isCurrent
                            ? 'text-purple-700 dark:text-purple-300'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step.step}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-purple-600 dark:text-purple-400 animate-pulse">
                        {step.detail}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  {isCurrent && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-xs">
                      In progress
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>

          {/* Tip */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs">
            <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-300">
              <span className="font-medium">Tip:</span> Complex analysis may take 15-30 seconds.
              Claude is generating detailed, personalized recommendations based on your actual data.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center max-w-md">{message}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardContent className="py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Analysis Failed</h3>
            <p className="text-sm text-red-600 dark:text-red-400 max-w-md">{message}</p>
          </div>
          <Button onClick={onRetry} variant="outline" className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Tip: AI analysis may take 15-30 seconds. If it keeps failing, try refreshing the page or
            check your internet connection.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function EffortBadge({ effort }: { effort: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <Badge variant="outline" className={colors[effort]}>
      {effort} effort
    </Badge>
  )
}

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return months[month - 1] ?? 'Unknown'
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:00 ${suffix}`
}
