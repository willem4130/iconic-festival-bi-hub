'use client'

import { api } from '@/trpc/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInsights } from '../insights-context'
import { cn } from '@/lib/utils'

interface AIQuickInsightsProps {
  className?: string
}

export function AIQuickInsights({ className }: AIQuickInsightsProps) {
  const { platform, days } = useInsights()

  const {
    data: insights,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = api.aiAnalysis.getQuickInsights.useQuery(
    { platform: platform as 'all' | 'facebook' | 'instagram', days },
    {
      staleTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
    }
  )

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Insights</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Analyzing...
          </Badge>
        </div>
        <div className="grid gap-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Insights</span>
          </div>
        </div>
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Unable to generate insights
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {error?.message ?? 'Please ensure the Claude API is configured correctly.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!insights?.length) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Insights</span>
          </div>
        </div>
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Not enough data to generate insights. Sync more data to get AI-powered recommendations.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Insights</span>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          <Sparkles className="h-3 w-3" />
          Powered by Claude
        </Badge>
      </div>
      <div className="grid gap-2">
        {insights.map((insight, index) => {
          const TrendIcon =
            insight.trend === 'up' ? TrendingUp : insight.trend === 'down' ? TrendingDown : Minus
          const trendColor =
            insight.trend === 'up'
              ? 'text-green-600'
              : insight.trend === 'down'
                ? 'text-red-600'
                : 'text-muted-foreground'

          return (
            <Card key={index} className="bg-muted/30 hover:bg-muted/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{insight.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{insight.title}</p>
                      {insight.trend && (
                        <TrendIcon className={cn('h-3 w-3 flex-shrink-0', trendColor)} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {insight.description}
                    </p>
                    {insight.metric && (
                      <Badge variant="outline" className="mt-1.5 text-xs">
                        {insight.metric}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
