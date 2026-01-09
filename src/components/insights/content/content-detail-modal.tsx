'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/trpc/react'
import {
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Facebook,
  Instagram,
  ExternalLink,
  Sparkles,
  Calendar,
  BarChart3,
} from 'lucide-react'
import Image from 'next/image'

interface ContentItem {
  id: string
  externalId: string
  contentType: string
  message: string | null
  mediaUrl: string | null
  permalinkUrl: string | null
  publishedAt: Date
  account: {
    platform: {
      platform: string
    }
  }
  contentInsights: Array<{
    likes: number | null
    comments: number | null
    shares: number | null
    reach: number | null
    impressions: number | null
  }>
}

interface ContentDetailModalProps {
  content: ContentItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContentDetailModal({ content, open, onOpenChange }: ContentDetailModalProps) {
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)

  const { data: aiAnalysis, isLoading: aiLoading } = api.aiAnalysis.analyzeContent.useQuery(
    { contentId: content?.id ?? '' },
    { enabled: showAiAnalysis && !!content?.id }
  )

  if (!content) return null

  const insights = content.contentInsights[0]
  const isFacebook = content.account.platform.platform === 'FACEBOOK'
  const totalEngagement =
    (insights?.likes ?? 0) + (insights?.comments ?? 0) + (insights?.shares ?? 0)
  const engagementRate =
    insights?.reach && insights.reach > 0
      ? ((totalEngagement / insights.reach) * 100).toFixed(2)
      : 'N/A'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFacebook ? (
              <Facebook className="h-5 w-5 text-[#1877F2]" />
            ) : (
              <Instagram className="h-5 w-5 text-[#E1306C]" />
            )}
            <span>{content.contentType} Performance</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Media Preview */}
          {content.mediaUrl && (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <Image
                src={content.mediaUrl}
                alt={content.message ?? 'Post media'}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          {/* Caption */}
          {content.message && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{content.message}</p>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard icon={Eye} label="Reach" value={insights?.reach ?? 0} />
            <MetricCard icon={BarChart3} label="Impressions" value={insights?.impressions ?? 0} />
            <MetricCard icon={Heart} label="Likes" value={insights?.likes ?? 0} />
            <MetricCard icon={MessageSquare} label="Comments" value={insights?.comments ?? 0} />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Share2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">
                {(insights?.shares ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Shares</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">{totalEngagement.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Engagement</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-lg font-semibold">{engagementRate}%</div>
              <div className="text-xs text-muted-foreground">Engagement Rate</div>
            </div>
          </div>

          {/* Published Date & Link */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Published:{' '}
              {new Date(content.publishedAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {content.permalinkUrl && (
              <a
                href={content.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                View original
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* AI Analysis Section */}
          <Card>
            <CardContent className="pt-4">
              {!showAiAnalysis ? (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowAiAnalysis(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Get AI Analysis
                </Button>
              ) : aiLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Analyzing content...
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">AI Analysis</span>
                  </div>

                  {aiAnalysis.whyItWorked && (
                    <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-1 text-green-700 dark:text-green-400">
                        Why It Worked
                      </h4>
                      <p className="text-sm text-green-600 dark:text-green-300">
                        {aiAnalysis.whyItWorked}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.whyItFailed && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">
                        Why It Underperformed
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        {aiAnalysis.whyItFailed}
                      </p>
                    </div>
                  )}

                  {aiAnalysis.keyFactors && aiAnalysis.keyFactors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-blue-600">Key Factors</h4>
                      <ul className="text-sm space-y-1">
                        {aiAnalysis.keyFactors.map((factor: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiAnalysis.improvementSuggestions &&
                    aiAnalysis.improvementSuggestions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-amber-600">
                          Improvement Suggestions
                        </h4>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.improvementSuggestions.map(
                            (suggestion: string, i: number) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-amber-500">→</span>
                                {suggestion}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {aiAnalysis.similarSuccessfulContent &&
                    aiAnalysis.similarSuccessfulContent.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-purple-600">
                          Similar Successful Content
                        </h4>
                        <ul className="text-sm space-y-1">
                          {aiAnalysis.similarSuccessfulContent.map((content: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-500">★</span>
                              {content}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to generate analysis</p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  const formatted =
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000
        ? `${(value / 1000).toFixed(1)}K`
        : value.toLocaleString()

  return (
    <div className="text-center p-4 bg-muted/50 rounded-lg">
      <Icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
      <div className="text-2xl font-bold">{formatted}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
