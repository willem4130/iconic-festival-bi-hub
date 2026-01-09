'use client'

import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Play,
  Image as ImageIcon,
  Film,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  Facebook,
  Instagram,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Trophy,
  Sparkles,
  BarChart3,
  Crown,
  ThumbsDown,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useInsights, PlatformToggle } from '@/components/insights'
import {
  ContentTabs,
  type ContentTab,
  EngagementTrendsChart,
  ContentDetailModal,
} from '@/components/insights/content'

type SortOption = 'recent' | 'reach' | 'engagement' | 'likes' | 'comments'
type ViewMode = 'grid' | 'list'

export default function ContentPage() {
  const { platform } = useInsights()
  const [activeTab, setActiveTab] = useState<ContentTab>('browse')
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all')
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  // Fetch content
  const {
    data: allContent,
    isLoading,
    refetch,
  } = api.metaInsights.getStoredContent.useQuery(
    { limit: 100, orderBy: 'publishedAt' },
    { enabled: isConnected }
  )

  // AI Strategic Advice for AI tab
  const { data: strategicAdvice, isLoading: aiLoading } =
    api.aiAnalysis.getStrategicAdvice.useQuery(
      { platform, focus: 'engagement', days: 30 },
      { enabled: isConnected && activeTab === 'ai' }
    )

  // Sync mutations
  const syncPagePosts = api.metaAuth.syncPagePosts.useMutation({ onSuccess: () => refetch() })
  const syncInstagramMedia = api.metaAuth.syncInstagramMedia.useMutation({
    onSuccess: () => refetch(),
  })

  const isSyncing = syncPagePosts.isPending || syncInstagramMedia.isPending

  // Filter content by platform
  const platformFiltered = useMemo(() => {
    if (!allContent) return []
    if (platform === 'all') return allContent
    const platformFilter = platform === 'facebook' ? 'FACEBOOK' : 'INSTAGRAM'
    return allContent.filter((c) => c.account.platform.platform === platformFilter)
  }, [allContent, platform])

  // Filter by content type
  const typeFiltered = useMemo(() => {
    if (contentTypeFilter === 'all') return platformFiltered
    return platformFiltered.filter((c) => c.contentType === contentTypeFilter)
  }, [platformFiltered, contentTypeFilter])

  // Sort content
  const content = useMemo(() => {
    const sorted = [...typeFiltered]
    switch (sortBy) {
      case 'recent':
        return sorted.sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
      case 'reach':
        return sorted.sort(
          (a, b) => (b.contentInsights[0]?.reach ?? 0) - (a.contentInsights[0]?.reach ?? 0)
        )
      case 'engagement':
        return sorted.sort((a, b) => {
          const aEng = getEngagement(a)
          const bEng = getEngagement(b)
          return bEng - aEng
        })
      case 'likes':
        return sorted.sort(
          (a, b) => (b.contentInsights[0]?.likes ?? 0) - (a.contentInsights[0]?.likes ?? 0)
        )
      case 'comments':
        return sorted.sort(
          (a, b) => (b.contentInsights[0]?.comments ?? 0) - (a.contentInsights[0]?.comments ?? 0)
        )
      default:
        return sorted
    }
  }, [typeFiltered, sortBy])

  // Ranked content for rankings tab
  const rankedContent = useMemo(() => {
    const sorted = [...platformFiltered].sort((a, b) => getEngagement(b) - getEngagement(a))
    return {
      top5: sorted.slice(0, 5),
      bottom5: sorted.slice(-5).reverse(),
    }
  }, [platformFiltered])

  // Chart data for performance tab
  const chartData = useMemo(() => {
    return platformFiltered.map((c) => ({
      id: c.id,
      publishedAt: c.publishedAt,
      contentType: c.contentType,
      likes: c.contentInsights[0]?.likes ?? 0,
      comments: c.contentInsights[0]?.comments ?? 0,
      shares: c.contentInsights[0]?.shares ?? 0,
      reach: c.contentInsights[0]?.reach ?? 0,
    }))
  }, [platformFiltered])

  // Get unique content types
  const contentTypes = useMemo(() => {
    if (!platformFiltered) return []
    const types = new Set(platformFiltered.map((c) => c.contentType))
    return Array.from(types)
  }, [platformFiltered])

  // Calculate summary stats
  const stats = useMemo(() => {
    if (!content.length)
      return { totalPosts: 0, totalReach: 0, totalEngagement: 0, avgEngagement: 0 }

    const totalPosts = content.length
    const totalReach = content.reduce((sum, c) => sum + (c.contentInsights[0]?.reach ?? 0), 0)
    const totalEngagement = content.reduce((sum, c) => sum + getEngagement(c), 0)

    return {
      totalPosts,
      totalReach,
      totalEngagement,
      avgEngagement: totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0,
    }
  }, [content])

  const handleContentClick = (item: ContentItem) => {
    setSelectedContent(item)
    setModalOpen(true)
  }

  const handleSync = () => {
    const accounts = oauthStatus?.accounts ?? []
    const fbAccount = accounts.find((a) => a.platform === 'FACEBOOK')
    const igAccount = accounts.find((a) => a.platform === 'INSTAGRAM')
    if (fbAccount) syncPagePosts.mutate({ accountId: fbAccount.id, limit: 50 })
    if (igAccount) syncInstagramMedia.mutate({ accountId: igAccount.id, limit: 50 })
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Performance</h1>
            <p className="text-muted-foreground">Analyze your posts and media engagement</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your accounts to view content performance.
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
      {/* Sticky Header */}
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
              <h1 className="text-3xl font-bold tracking-tight">Content Performance</h1>
              <p className="text-muted-foreground">Analyze your posts and media engagement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PlatformToggle />
            <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Posts"
          value={stats.totalPosts}
          icon={ImageIcon}
          loading={isLoading}
        />
        <SummaryCard
          title="Total Reach"
          value={formatNumber(stats.totalReach)}
          icon={Eye}
          loading={isLoading}
        />
        <SummaryCard
          title="Total Engagement"
          value={formatNumber(stats.totalEngagement)}
          icon={Heart}
          loading={isLoading}
        />
        <SummaryCard
          title="Avg. Engagement"
          value={stats.avgEngagement.toLocaleString()}
          icon={TrendingUp}
          loading={isLoading}
          description="per post"
        />
      </div>

      {/* Content Tabs */}
      <ContentTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {{
          browse: (
            <>
              {/* Browse Controls */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Content Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {contentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="reach">Highest Reach</SelectItem>
                    <SelectItem value="engagement">Most Engagement</SelectItem>
                    <SelectItem value="likes">Most Likes</SelectItem>
                    <SelectItem value="comments">Most Comments</SelectItem>
                  </SelectContent>
                </Select>

                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="grid" className="px-3">
                      <LayoutGrid className="h-4 w-4" />
                    </TabsTrigger>
                    <TabsTrigger value="list" className="px-3">
                      <List className="h-4 w-4" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Content Grid/List */}
              {isLoading ? (
                <div
                  className={
                    viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
                  }
                >
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton
                          className={viewMode === 'grid' ? 'h-48 w-full mb-4' : 'h-24 w-24'}
                        />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : content.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Content Found</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {platform !== 'all'
                        ? `No ${platform === 'facebook' ? 'Facebook' : 'Instagram'} content synced yet.`
                        : 'Sync your content to see performance metrics.'}
                    </p>
                    <Button onClick={handleSync} disabled={isSyncing}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sync Content Now
                    </Button>
                  </CardContent>
                </Card>
              ) : viewMode === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {content.map((item, index) => (
                    <ContentCard
                      key={item.id}
                      item={item}
                      rank={sortBy === 'engagement' ? index + 1 : undefined}
                      avgEngagement={stats.avgEngagement}
                      onClick={() => handleContentClick(item)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {content.map((item) => (
                        <ContentRow
                          key={item.id}
                          item={item}
                          avgEngagement={stats.avgEngagement}
                          onClick={() => handleContentClick(item)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ),

          performance: <EngagementTrendsChart data={chartData} isLoading={isLoading} />,

          rankings: (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top 5 Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>Your best performing content by engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : rankedContent.top5.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No content available</p>
                  ) : (
                    <div className="space-y-3">
                      {rankedContent.top5.map((item, index) => (
                        <RankedContentRow
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          type="top"
                          onClick={() => handleContentClick(item)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bottom 5 Performers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-muted-foreground" />
                    Needs Improvement
                  </CardTitle>
                  <CardDescription>Content that could use optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : rankedContent.bottom5.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No content available</p>
                  ) : (
                    <div className="space-y-3">
                      {rankedContent.bottom5.map((item, index) => (
                        <RankedContentRow
                          key={item.id}
                          item={item}
                          rank={platformFiltered.length - index}
                          type="bottom"
                          onClick={() => handleContentClick(item)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ),

          ai: (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    AI Strategic Insights
                  </CardTitle>
                  <CardDescription>
                    Claude AI analysis of your content performance and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aiLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ) : strategicAdvice ? (
                    <div className="space-y-6">
                      {strategicAdvice.summary && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm">{strategicAdvice.summary}</p>
                        </div>
                      )}

                      {strategicAdvice.topOpportunities &&
                        strategicAdvice.topOpportunities.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              Top Opportunities
                            </h4>
                            <div className="space-y-3">
                              {strategicAdvice.topOpportunities.map((opp, i) => (
                                <div key={i} className="p-3 bg-muted/30 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm">{opp.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {opp.effort} effort
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{opp.description}</p>
                                  <p className="text-xs text-green-600 mt-1">
                                    Expected: {opp.expectedImpact}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {strategicAdvice.contentCalendarSuggestions &&
                        strategicAdvice.contentCalendarSuggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-blue-500" />
                              Content Calendar Suggestions
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {strategicAdvice.contentCalendarSuggestions.map((sug, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm"
                                >
                                  <span className="font-medium">{sug.dayOfWeek}:</span>
                                  <span className="text-muted-foreground">{sug.contentType}</span>
                                  <span className="text-xs text-blue-600">- {sug.theme}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {strategicAdvice.competitorInsights &&
                        strategicAdvice.competitorInsights.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-purple-500" />
                              Competitor Insights
                            </h4>
                            <ul className="space-y-2">
                              {strategicAdvice.competitorInsights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <span className="text-purple-500 mt-0.5">★</span>
                                  <span>{insight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Unable to generate AI insights. Make sure you have content synced.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Get Post-Level Analysis</CardTitle>
                  <CardDescription>
                    Click on any content card to get detailed AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Navigate to the Browse tab and click on any post to open the detail modal, then
                    click &quot;Get AI Analysis&quot; for personalized recommendations.
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('browse')}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Go to Browse
                  </Button>
                </CardContent>
              </Card>
            </div>
          ),
        }}
      </ContentTabs>

      {/* Content Detail Modal */}
      <ContentDetailModal content={selectedContent} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}

// Helper function
function getEngagement(item: ContentItem): number {
  const insights = item.contentInsights[0]
  return (insights?.likes ?? 0) + (insights?.comments ?? 0) + (insights?.shares ?? 0)
}

// Content Card Component (Grid View) with AI badge
function ContentCard({
  item,
  rank,
  avgEngagement,
  onClick,
}: {
  item: ContentItem
  rank?: number
  avgEngagement: number
  onClick: () => void
}) {
  const insights = item.contentInsights[0]
  const isFacebook = item.account.platform.platform === 'FACEBOOK'
  const engagement = getEngagement(item)
  const performanceLevel =
    engagement > avgEngagement * 1.5 ? 'high' : engagement < avgEngagement * 0.5 ? 'low' : 'average'

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Media Preview */}
      <div className="relative aspect-square bg-muted">
        {item.mediaUrl ? (
          <Image
            src={item.mediaUrl}
            alt={item.message ?? 'Post media'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {item.contentType === 'VIDEO' ? (
              <Film className="h-12 w-12 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        {/* Platform Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur">
            {isFacebook ? (
              <Facebook className="h-3 w-3 text-[#1877F2]" />
            ) : (
              <Instagram className="h-3 w-3 text-[#E1306C]" />
            )}
            {item.contentType}
          </Badge>
        </div>
        {/* Performance Badge */}
        <div className="absolute top-2 right-2">
          {performanceLevel === 'high' && (
            <Badge className="gap-1 bg-green-500">
              <TrendingUp className="h-3 w-3" />
              High
            </Badge>
          )}
          {performanceLevel === 'low' && (
            <Badge variant="destructive" className="gap-1">
              <TrendingDown className="h-3 w-3" />
              Low
            </Badge>
          )}
        </div>
        {/* Rank Badge */}
        {rank && rank <= 3 && (
          <div className="absolute bottom-2 left-2">
            <Badge
              className={`gap-1 ${
                rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-amber-600'
              }`}
            >
              <Trophy className="h-3 w-3" />#{rank}
            </Badge>
          </div>
        )}
        {/* Video indicator */}
        {item.contentType === 'VIDEO' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/50 p-3">
              <Play className="h-8 w-8 text-white fill-white" />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Caption */}
        <p className="text-sm line-clamp-2 mb-3 min-h-[2.5rem]">{item.message ?? 'No caption'}</p>

        {/* Engagement Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Heart className="h-4 w-4" />
              {(insights?.likes ?? 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {(insights?.comments ?? 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Share2 className="h-4 w-4" />
              {(insights?.shares ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Reach & Date */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatNumber(insights?.reach ?? 0)} reach
          </span>
          <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Content Row Component (List View)
function ContentRow({
  item,
  avgEngagement,
  onClick,
}: {
  item: ContentItem
  avgEngagement: number
  onClick: () => void
}) {
  const insights = item.contentInsights[0]
  const isFacebook = item.account.platform.platform === 'FACEBOOK'
  const engagement = getEngagement(item)
  const performanceLevel =
    engagement > avgEngagement * 1.5 ? 'high' : engagement < avgEngagement * 0.5 ? 'low' : 'average'

  return (
    <div
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.mediaUrl ? (
          <Image
            src={item.mediaUrl}
            alt={item.message ?? 'Post media'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {item.contentType === 'VIDEO' ? (
              <Film className="h-6 w-6 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="gap-1 text-xs">
            {isFacebook ? (
              <Facebook className="h-3 w-3 text-[#1877F2]" />
            ) : (
              <Instagram className="h-3 w-3 text-[#E1306C]" />
            )}
            {item.contentType}
          </Badge>
          {performanceLevel === 'high' && (
            <Badge className="gap-1 bg-green-500 text-xs">
              <TrendingUp className="h-3 w-3" />
            </Badge>
          )}
          {performanceLevel === 'low' && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <TrendingDown className="h-3 w-3" />
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(item.publishedAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm line-clamp-1">{item.message ?? 'No caption'}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="font-semibold">{formatNumber(insights?.reach ?? 0)}</div>
          <div className="text-xs text-muted-foreground">Reach</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{(insights?.likes ?? 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Likes</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{(insights?.comments ?? 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Comments</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{(insights?.shares ?? 0).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Shares</div>
        </div>
      </div>

      {/* External Link */}
      {item.permalinkUrl && (
        <a
          href={item.permalinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-muted rounded-md"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </a>
      )}
    </div>
  )
}

// Ranked Content Row for Rankings tab
function RankedContentRow({
  item,
  rank,
  type,
  onClick,
}: {
  item: ContentItem
  rank: number
  type: 'top' | 'bottom'
  onClick: () => void
}) {
  const isFacebook = item.account.platform.platform === 'FACEBOOK'
  const engagement = getEngagement(item)

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Rank */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          type === 'top'
            ? rank === 1
              ? 'bg-yellow-100 text-yellow-700'
              : rank === 2
                ? 'bg-gray-100 text-gray-700'
                : rank === 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {rank}
      </div>

      {/* Thumbnail */}
      <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-muted">
        {item.mediaUrl ? (
          <Image
            src={item.mediaUrl}
            alt={item.message ?? 'Post media'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {isFacebook ? (
            <Facebook className="h-3 w-3 text-[#1877F2]" />
          ) : (
            <Instagram className="h-3 w-3 text-[#E1306C]" />
          )}
          <span className="text-xs text-muted-foreground">{item.contentType}</span>
        </div>
        <p className="text-sm line-clamp-1">{item.message ?? 'No caption'}</p>
      </div>

      {/* Engagement */}
      <div className="text-right">
        <div className="font-semibold">{engagement.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">engagement</div>
      </div>
    </div>
  )
}

// Summary Card Component
function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
  description,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  loading?: boolean
  description?: string
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
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
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

// Type for content items
type ContentItem = {
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
