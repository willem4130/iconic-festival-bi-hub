'use client'

import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  ArrowLeft,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Facebook,
  Instagram,
  Sparkles,
  BarChart3,
  Trophy,
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Image as ImageIcon,
  Film,
  Check,
  X,
  Minus,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useInsights, PlatformToggle } from '@/components/insights'

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

export default function CompareContentPage() {
  const { platform } = useInsights()
  const [postA, setPostA] = useState<string | null>(null)
  const [postB, setPostB] = useState<string | null>(null)
  const [showAiAnalysis, setShowAiAnalysis] = useState(false)

  // Connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  // Fetch all content for selection
  const { data: allContent, isLoading: contentLoading } =
    api.metaInsights.getStoredContent.useQuery(
      { limit: 100, orderBy: 'publishedAt' },
      { enabled: isConnected }
    )

  // Filter content by platform
  const filteredContent = useMemo(() => {
    if (!allContent) return []
    if (platform === 'all') return allContent
    const platformFilter = platform === 'facebook' ? 'FACEBOOK' : 'INSTAGRAM'
    return allContent.filter((c) => c.account.platform.platform === platformFilter)
  }, [allContent, platform])

  // Get selected posts
  const selectedPostA = useMemo(
    () => filteredContent.find((c) => c.id === postA) ?? null,
    [filteredContent, postA]
  )
  const selectedPostB = useMemo(
    () => filteredContent.find((c) => c.id === postB) ?? null,
    [filteredContent, postB]
  )

  // AI Comparison
  const { data: comparison, isLoading: aiLoading } = api.aiAnalysis.compareContent.useQuery(
    { contentIds: [postA!, postB!] },
    { enabled: showAiAnalysis && !!postA && !!postB }
  )

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
              <p className="text-sm text-amber-700">Connect your accounts to compare content.</p>
            </div>
            <Button asChild>
              <Link href="/admin/settings/connections">Configure Connection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canCompare = postA && postB && postA !== postB

  return (
    <div className="space-y-6">
      <Header />

      {/* Post Selection */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PostSelector
          label="Post A"
          color="blue"
          content={filteredContent}
          selectedId={postA}
          excludeId={postB}
          onSelect={setPostA}
          isLoading={contentLoading}
        />
        <PostSelector
          label="Post B"
          color="purple"
          content={filteredContent}
          selectedId={postB}
          excludeId={postA}
          onSelect={setPostB}
          isLoading={contentLoading}
        />
      </div>

      {/* Comparison Results */}
      {canCompare && selectedPostA && selectedPostB && (
        <>
          {/* Side-by-side Preview */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PostPreview post={selectedPostA} label="A" color="blue" />
            <PostPreview post={selectedPostB} label="B" color="purple" />
          </div>

          {/* Metrics Comparison Table */}
          <MetricsComparison postA={selectedPostA} postB={selectedPostB} />

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Comparison Analysis
              </CardTitle>
              <CardDescription>
                Claude AI analyzes why one post outperformed the other
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showAiAnalysis ? (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowAiAnalysis(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Generate AI Comparison
                </Button>
              ) : aiLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Analyzing posts...
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : comparison ? (
                <div className="space-y-6">
                  {/* Winner Badge */}
                  <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <span className="font-medium">
                      Winner:{' '}
                      <span
                        className={
                          comparison.winner === postA ? 'text-blue-600' : 'text-purple-600'
                        }
                      >
                        Post {comparison.winner === postA ? 'A' : 'B'}
                      </span>
                    </span>
                  </div>

                  {/* Analysis Summary */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm">{comparison.analysis}</p>
                  </div>

                  {/* Key Differences */}
                  {comparison.keyDifferences && comparison.keyDifferences.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Key Differences
                      </h4>
                      <div className="space-y-3">
                        {comparison.keyDifferences.map((diff, i) => (
                          <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Post A</div>
                              <div className="font-medium">{diff.contentA}</div>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded flex flex-col items-center justify-center">
                              <div className="text-xs text-muted-foreground">{diff.factor}</div>
                              <ImpactBadge impact={diff.impact} />
                            </div>
                            <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                              <div className="text-xs text-muted-foreground mb-1">Post B</div>
                              <div className="font-medium">{diff.contentB}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {comparison.recommendations && comparison.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {comparison.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-500 mt-0.5">→</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to generate comparison.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!canCompare && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowUpDown className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select Two Posts to Compare</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Choose two different posts from your content library to see a side-by-side comparison
              of their performance metrics and AI-powered analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-6 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Content
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Compare Posts</h1>
            <p className="text-muted-foreground">Side-by-side analysis with AI-powered insights</p>
          </div>
        </div>
        <PlatformToggle />
      </div>
    </div>
  )
}

function PostSelector({
  label,
  color,
  content,
  selectedId,
  excludeId,
  onSelect,
  isLoading,
}: {
  label: string
  color: 'blue' | 'purple'
  content: ContentItem[]
  selectedId: string | null
  excludeId: string | null
  onSelect: (id: string | null) => void
  isLoading: boolean
}) {
  const availableContent = content.filter((c) => c.id !== excludeId)
  const borderColor = color === 'blue' ? 'border-blue-500' : 'border-purple-500'
  const bgColor =
    color === 'blue' ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-purple-50 dark:bg-purple-950/20'

  return (
    <Card className={selectedId ? borderColor : ''}>
      <CardHeader className={selectedId ? bgColor : ''}>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Badge
            variant={color === 'blue' ? 'default' : 'secondary'}
            className={color === 'purple' ? 'bg-purple-500' : ''}
          >
            {label}
          </Badge>
          Select a post to compare
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedId ?? ''} onValueChange={(v) => onSelect(v || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a post..." />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {availableContent.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  <div className="flex items-center gap-2">
                    {item.account.platform.platform === 'FACEBOOK' ? (
                      <Facebook className="h-3 w-3 text-[#1877F2]" />
                    ) : (
                      <Instagram className="h-3 w-3 text-[#E1306C]" />
                    )}
                    <span className="truncate max-w-[200px]">
                      {item.message?.slice(0, 50) ?? item.contentType}
                      {item.message && item.message.length > 50 ? '...' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  )
}

function PostPreview({
  post,
  label,
  color,
}: {
  post: ContentItem
  label: string
  color: 'blue' | 'purple'
}) {
  const isFacebook = post.account.platform.platform === 'FACEBOOK'
  const borderColor = color === 'blue' ? 'border-t-blue-500' : 'border-t-purple-500'

  return (
    <Card className={`border-t-4 ${borderColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge
            variant={color === 'blue' ? 'default' : 'secondary'}
            className={color === 'purple' ? 'bg-purple-500' : ''}
          >
            Post {label}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isFacebook ? (
              <Facebook className="h-4 w-4 text-[#1877F2]" />
            ) : (
              <Instagram className="h-4 w-4 text-[#E1306C]" />
            )}
            {post.contentType}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Media Preview */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {post.mediaUrl ? (
            <Image
              src={post.mediaUrl}
              alt={post.message ?? 'Post media'}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {post.contentType === 'VIDEO' ? (
                <Film className="h-10 w-10 text-muted-foreground" />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Caption */}
        <p className="text-sm line-clamp-3">{post.message ?? 'No caption'}</p>

        {/* Date */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function MetricsComparison({ postA, postB }: { postA: ContentItem; postB: ContentItem }) {
  const insightsA = postA.contentInsights[0]
  const insightsB = postB.contentInsights[0]

  const engagementA =
    (insightsA?.likes ?? 0) + (insightsA?.comments ?? 0) + (insightsA?.shares ?? 0)
  const engagementB =
    (insightsB?.likes ?? 0) + (insightsB?.comments ?? 0) + (insightsB?.shares ?? 0)

  const metrics = [
    {
      label: 'Reach',
      icon: Eye,
      valueA: insightsA?.reach ?? 0,
      valueB: insightsB?.reach ?? 0,
    },
    {
      label: 'Impressions',
      icon: BarChart3,
      valueA: insightsA?.impressions ?? 0,
      valueB: insightsB?.impressions ?? 0,
    },
    {
      label: 'Likes',
      icon: Heart,
      valueA: insightsA?.likes ?? 0,
      valueB: insightsB?.likes ?? 0,
    },
    {
      label: 'Comments',
      icon: MessageSquare,
      valueA: insightsA?.comments ?? 0,
      valueB: insightsB?.comments ?? 0,
    },
    {
      label: 'Shares',
      icon: Share2,
      valueA: insightsA?.shares ?? 0,
      valueB: insightsB?.shares ?? 0,
    },
    {
      label: 'Total Engagement',
      icon: BarChart3,
      valueA: engagementA,
      valueB: engagementB,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Metrics Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric) => {
            const diff = metric.valueA - metric.valueB
            const percentDiff = metric.valueB > 0 ? ((diff / metric.valueB) * 100).toFixed(1) : 0

            return (
              <div key={metric.label} className="grid grid-cols-3 gap-4 items-center">
                {/* Post A Value */}
                <div
                  className={`text-right p-3 rounded-lg ${
                    diff > 0
                      ? 'bg-blue-50 dark:bg-blue-950/30'
                      : diff < 0
                        ? 'bg-muted/30'
                        : 'bg-muted/50'
                  }`}
                >
                  <div className="text-lg font-semibold">{formatNumber(metric.valueA)}</div>
                  {diff > 0 && <div className="text-xs text-green-600">+{percentDiff}%</div>}
                </div>

                {/* Metric Label */}
                <div className="text-center">
                  <metric.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-sm font-medium">{metric.label}</div>
                </div>

                {/* Post B Value */}
                <div
                  className={`text-left p-3 rounded-lg ${
                    diff < 0
                      ? 'bg-purple-50 dark:bg-purple-950/30'
                      : diff > 0
                        ? 'bg-muted/30'
                        : 'bg-muted/50'
                  }`}
                >
                  <div className="text-lg font-semibold">{formatNumber(metric.valueB)}</div>
                  {diff < 0 && (
                    <div className="text-xs text-green-600">+{Math.abs(Number(percentDiff))}%</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ImpactBadge({ impact }: { impact: 'positive' | 'negative' | 'neutral' }) {
  if (impact === 'positive') {
    return (
      <Badge className="bg-green-500 mt-1">
        <Check className="h-3 w-3" />
      </Badge>
    )
  }
  if (impact === 'negative') {
    return (
      <Badge variant="destructive" className="mt-1">
        <X className="h-3 w-3" />
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="mt-1">
      <Minus className="h-3 w-3" />
    </Badge>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}
