// Structured prompts for Claude AI analysis

import type { InsightsData, ContentData } from './types'

export const SYSTEM_PROMPT = `You are an expert social media analyst for a festival/event brand.
Analyze performance data and provide actionable insights. Be concise, specific, and data-driven.
Always relate insights to the festival/entertainment industry context.
Format responses as valid JSON matching the requested schema.`

export function buildQuickInsightsPrompt(data: InsightsData): string {
  return `Analyze this social media performance data and provide 3-5 quick insights.

Data for the last ${data.days} days (${data.platform}):
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Total Engagement: ${data.metrics.totalEngagement.toLocaleString()}
- Total Followers: ${data.metrics.totalFollowers.toLocaleString()}
- New Followers: ${data.metrics.newFollowers.toLocaleString()}
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%

Top performing content types: ${data.topContent.map((c) => c.type).join(', ')}
Average top content reach: ${Math.round(data.topContent.reduce((sum, c) => sum + c.reach, 0) / data.topContent.length).toLocaleString()}

Respond with JSON array of insights:
[
  {
    "emoji": "🎯",
    "title": "Short title (max 5 words)",
    "description": "One sentence insight with specific numbers",
    "metric": "Optional key metric",
    "trend": "up" | "down" | "neutral"
  }
]

Focus on actionable insights for a festival brand. Be specific with numbers.`
}

export function buildContentAnalysisPrompt(content: ContentData): string {
  const engagement = content.metrics.likes + content.metrics.comments + content.metrics.shares
  const engagementRate = content.metrics.reach > 0 ? (engagement / content.metrics.reach) * 100 : 0

  return `Analyze this ${content.platform} ${content.contentType} post performance:

Caption: "${content.caption ?? 'No caption'}"
Published: ${content.publishedAt}
Hashtags: ${content.hashtags?.join(', ') ?? 'None'}

Metrics:
- Reach: ${content.metrics.reach.toLocaleString()}
- Likes: ${content.metrics.likes.toLocaleString()}
- Comments: ${content.metrics.comments.toLocaleString()}
- Shares: ${content.metrics.shares.toLocaleString()}
- Engagement Rate: ${engagementRate.toFixed(2)}%

Respond with JSON:
{
  "whyItWorked": "If engagement rate > 3%, explain success factors",
  "whyItFailed": "If engagement rate < 1%, explain issues",
  "keyFactors": ["Factor 1", "Factor 2"],
  "improvementSuggestions": ["Suggestion 1", "Suggestion 2"]
}

Be specific to festival/event marketing context.`
}

export function buildComparisonPrompt(contentA: ContentData, contentB: ContentData): string {
  return `Compare these two social media posts:

POST A (${contentA.platform} ${contentA.contentType}):
- Caption: "${contentA.caption ?? 'No caption'}"
- Reach: ${contentA.metrics.reach.toLocaleString()}
- Engagement: ${(contentA.metrics.likes + contentA.metrics.comments + contentA.metrics.shares).toLocaleString()}
- Published: ${contentA.publishedAt}

POST B (${contentB.platform} ${contentB.contentType}):
- Caption: "${contentB.caption ?? 'No caption'}"
- Reach: ${contentB.metrics.reach.toLocaleString()}
- Engagement: ${(contentB.metrics.likes + contentB.metrics.comments + contentB.metrics.shares).toLocaleString()}
- Published: ${contentB.publishedAt}

Respond with JSON:
{
  "winner": "A" | "B",
  "analysis": "2-3 sentences explaining why one outperformed",
  "keyDifferences": [
    {
      "factor": "Factor name",
      "contentA": "How A did",
      "contentB": "How B did",
      "impact": "positive" | "negative" | "neutral"
    }
  ],
  "recommendations": ["What to do differently next time"]
}`
}

export function buildStrategicAdvicePrompt(
  data: InsightsData,
  focus: 'growth' | 'engagement' | 'reach'
): string {
  return `Provide strategic advice for a festival brand's social media.

Focus: ${focus.toUpperCase()}

Current metrics (${data.days} days):
- Followers: ${data.metrics.totalFollowers.toLocaleString()} (+${data.metrics.newFollowers.toLocaleString()} new)
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%

Top content types: ${data.topContent.map((c) => c.type).join(', ')}

Respond with JSON:
{
  "summary": "2-3 sentence overview of current performance",
  "topOpportunities": [
    {
      "title": "Opportunity title",
      "description": "What to do and why",
      "expectedImpact": "e.g., +15% engagement",
      "effort": "low" | "medium" | "high"
    }
  ],
  "contentCalendarSuggestions": [
    {
      "dayOfWeek": "Monday",
      "contentType": "Reel",
      "theme": "Behind the scenes prep"
    }
  ]
}

Tailor advice to festival/entertainment industry.`
}

export function buildNarrativeReportPrompt(
  data: InsightsData,
  month: number,
  year: number
): string {
  const monthName = new Date(year, month - 1).toLocaleString('en', {
    month: 'long',
  })

  return `Write a monthly social media performance report for ${monthName} ${year}.

Platform: ${data.platform}
Period: ${data.days} days

Metrics:
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Total Engagement: ${data.metrics.totalEngagement.toLocaleString()}
- Followers: ${data.metrics.totalFollowers.toLocaleString()} (+${data.metrics.newFollowers.toLocaleString()})
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%

Top content reach: ${data.topContent[0]?.reach?.toLocaleString() ?? 'N/A'}
Bottom content reach: ${data.bottomContent[0]?.reach?.toLocaleString() ?? 'N/A'}

Respond with JSON:
{
  "summary": "Executive summary paragraph (3-4 sentences)",
  "highlights": [
    {
      "title": "Highlight title",
      "metric": "Key number",
      "context": "Why this matters"
    }
  ],
  "challenges": ["Challenge 1", "Challenge 2"],
  "recommendations": ["Action 1", "Action 2"],
  "outlook": "1-2 sentences on what to focus on next month"
}

Write in a professional but engaging tone for festival marketing.`
}

export function buildPostingTimePrompt(data: InsightsData): string {
  return `Analyze posting patterns and recommend optimal posting times.

Platform: ${data.platform}
Top performing content:
${data.topContent.map((c, i) => `${i + 1}. ${c.type} - Reach: ${c.reach.toLocaleString()}, Engagement: ${c.engagement.toLocaleString()}`).join('\n')}

Consider:
- Festival audience (18-35 year olds)
- Weekend engagement patterns
- Event announcement timing

Respond with JSON:
{
  "bestPostingTime": {
    "dayOfWeek": "Tuesday",
    "hour": 19,
    "timezone": "CET"
  },
  "optimalContentType": "Reel",
  "suggestedHashtags": ["#festival", "#music"],
  "engagementPrediction": 3.5,
  "confidence": 0.75
}`
}
