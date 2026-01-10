// Structured prompts for Claude AI analysis

import type { InsightsData, ContentData } from './types'

/**
 * Generate data quality notes based on the actual data availability
 */
function getDataQualityNotes(data: InsightsData): string {
  const notes: string[] = []
  const warnings: string[] = []

  // Check for sparse daily data
  const daysWithReach = data.dailyData.filter((d) => d.reach > 0).length
  const daysWithEngagement = data.dailyData.filter((d) => d.engagement > 0).length
  const daysWithFollowers = data.dailyData.filter((d) => d.followers > 0).length

  if (daysWithReach < data.days * 0.5) {
    notes.push(`Only ${daysWithReach}/${data.days} days have reach data recorded`)
  }
  if (daysWithEngagement < data.days * 0.5) {
    notes.push(`Only ${daysWithEngagement}/${data.days} days have engagement data recorded`)
  }

  // CRITICAL: Check follower tracking data quality
  const hasReliableFollowerGrowthData = daysWithFollowers >= 7 // Need at least a week of data
  if (!hasReliableFollowerGrowthData) {
    warnings.push(
      `⚠️ FOLLOWER GROWTH DATA IS UNRELIABLE: Only ${daysWithFollowers} days have follower data. DO NOT make conclusions about follower growth, "zero growth alerts", or "weak conversion to followers" - we simply don't have enough historical data to measure this accurately.`
    )
  }

  // Check for zero metrics
  if (data.metrics.totalReach === 0) {
    notes.push('No reach data available for this period')
  }
  if (data.metrics.totalEngagement === 0) {
    notes.push('No engagement data available for this period')
  }
  if (data.metrics.totalFollowers === 0) {
    notes.push('Follower count not available')
  }
  if (
    data.metrics.newFollowers === 0 &&
    data.metrics.totalFollowers > 0 &&
    hasReliableFollowerGrowthData
  ) {
    notes.push('New followers is 0 over the measured period')
  } else if (data.metrics.newFollowers === 0 && data.metrics.totalFollowers > 0) {
    warnings.push(
      '⚠️ New followers shows 0 but this is likely due to LIMITED DATA COLLECTION, not actual zero growth. DO NOT alert about "zero follower growth" or make recommendations based on this metric.'
    )
  }

  // Check content data
  if (data.topContent.length === 0) {
    notes.push('No content performance data available')
  }

  // Build output with warnings first (most important)
  const output: string[] = []

  if (warnings.length > 0) {
    output.push('⚠️ CRITICAL DATA LIMITATIONS:')
    output.push(...warnings.map((w) => w))
    output.push('')
  }

  if (notes.length > 0) {
    output.push('Data notes:')
    output.push(...notes.map((n) => `- ${n}`))
  }

  if (output.length === 0) {
    return 'Data quality: Good - all key metrics are available for analysis.'
  }

  return output.join('\n')
}

export const SYSTEM_PROMPT = `You are an expert social media analyst for a festival/event brand.
Analyze performance data and provide actionable insights. Be concise, specific, and data-driven.
Always relate insights to the festival/entertainment industry context.
Format responses as valid JSON matching the requested schema.

CRITICAL DATA QUALITY RULES - YOU MUST FOLLOW THESE:
1. If the data includes a "⚠️ CRITICAL DATA LIMITATIONS" warning, you MUST respect it completely.
2. NEVER generate "Zero Follower Growth Alert" or similar warnings unless you have confirmed reliable follower tracking data (7+ days).
3. NEVER claim "weak conversion from discovery to community" or "audience retention challenge" based on follower growth if the data quality warning indicates limited follower data.
4. "New Followers" showing 0 usually means DATA WAS NOT COLLECTED, not that there was actually zero growth.
5. Focus your analysis on metrics that ARE reliably measured: reach, engagement, content performance.
6. When data is sparse or unreliable, acknowledge the limitation instead of making alarming claims.
7. It's better to say "insufficient data to assess follower growth" than to falsely alert about zero growth.`

export function buildQuickInsightsPrompt(data: InsightsData): string {
  const dataQuality = getDataQualityNotes(data)

  return `Analyze this social media performance data and provide 3-5 quick insights.

Data for the last ${data.days} days (${data.platform}):
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Total Engagement: ${data.metrics.totalEngagement.toLocaleString()}
- Total Followers: ${data.metrics.totalFollowers.toLocaleString()}
- New Followers: ${data.metrics.newFollowers.toLocaleString()}
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%

Top performing content types: ${data.topContent.length > 0 ? data.topContent.map((c) => c.type).join(', ') : 'No content data'}
Average top content reach: ${data.topContent.length > 0 ? Math.round(data.topContent.reduce((sum, c) => sum + c.reach, 0) / data.topContent.length).toLocaleString() : 'N/A'}

${dataQuality}

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
  const avgDailyReach =
    data.dailyData.length > 0 ? Math.round(data.metrics.totalReach / data.dailyData.length) : 0
  const avgDailyEngagement =
    data.dailyData.length > 0 ? Math.round(data.metrics.totalEngagement / data.dailyData.length) : 0
  const dataQuality = getDataQualityNotes(data)

  return `Provide COMPREHENSIVE strategic advice for a festival brand's social media.

Focus Area: ${focus.toUpperCase()}
Platform: ${data.platform}

Current Performance (${data.days} days):
- Total Followers: ${data.metrics.totalFollowers.toLocaleString()}
- New Followers: +${data.metrics.newFollowers.toLocaleString()} (${data.metrics.totalFollowers > 0 ? ((data.metrics.newFollowers / data.metrics.totalFollowers) * 100).toFixed(1) : 0}% growth)
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Average Daily Reach: ${avgDailyReach.toLocaleString()}
- Total Engagement: ${data.metrics.totalEngagement.toLocaleString()}
- Average Daily Engagement: ${avgDailyEngagement.toLocaleString()}
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%

${dataQuality}

Top Performing Content:
${data.topContent.map((c, i) => `${i + 1}. ${c.type} - Reach: ${c.reach.toLocaleString()}, Engagement: ${c.engagement.toLocaleString()}${c.caption ? `\n   Caption: "${c.caption.slice(0, 80)}..."` : ''}`).join('\n')}

Bottom Performing Content:
${data.bottomContent.map((c, i) => `${i + 1}. ${c.type} - Reach: ${c.reach.toLocaleString()}, Engagement: ${c.engagement.toLocaleString()}`).join('\n')}

Industry Benchmarks for Festival Brands:
- Good Engagement Rate: 3-6%
- Great Engagement Rate: 6%+
- Good Follower Growth Rate: 2-5% monthly
- Average Reach per Post: 20-35% of followers

Respond with detailed JSON:
{
  "summary": "3-4 sentence strategic overview of current performance and key focus areas",
  "performanceGrade": "A" | "B" | "C" | "D" | "F",
  "benchmarkComparison": {
    "vsIndustry": "How this account compares to festival industry averages",
    "vsPreviousPeriod": "Inferred trend direction and momentum",
    "areasAboveAverage": ["Area 1", "Area 2"],
    "areasBelowAverage": ["Area 1", "Area 2"]
  },
  "topOpportunities": [
    {
      "title": "Opportunity title",
      "description": "Detailed explanation of what to do and why it will work",
      "expectedImpact": "+X% metric improvement",
      "effort": "low" | "medium" | "high",
      "priority": 1,
      "steps": ["Step 1", "Step 2", "Step 3"]
    }
  ],
  "quickWins": [
    {
      "action": "Specific action to take",
      "impact": "Expected result",
      "timeToImplement": "15 minutes"
    }
  ],
  "riskAssessment": [
    {
      "risk": "Identified risk or vulnerability",
      "severity": "low" | "medium" | "high",
      "mitigation": "How to address it"
    }
  ],
  "growthProjections": {
    "conservative": "Expected outcome with minimal changes",
    "moderate": "Expected outcome with recommended changes",
    "aggressive": "Expected outcome with full strategy implementation",
    "keyAssumptions": ["Assumption 1", "Assumption 2"]
  },
  "contentCalendarSuggestions": [
    {
      "dayOfWeek": "Monday",
      "contentType": "Reel",
      "theme": "Behind the scenes prep",
      "caption": "Sample caption idea for this day/theme",
      "bestTime": "6:00 PM"
    }
  ],
  "competitorInsights": ["Insight about what competitors are doing well", "Opportunity to differentiate"],
  "keyMetricsToTrack": [
    {
      "metric": "Metric name",
      "currentValue": "Current value",
      "targetValue": "30-day target",
      "importance": "Why this metric matters for ${focus}"
    }
  ]
}

Provide specific, actionable, data-driven recommendations tailored to festival/event marketing. Include at least 3 opportunities, 3 quick wins, and 2 risks.`
}

export function buildNarrativeReportPrompt(
  data: InsightsData,
  month: number,
  year: number
): string {
  const monthName = new Date(year, month - 1).toLocaleString('en', {
    month: 'long',
  })
  const dataQuality = getDataQualityNotes(data)

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

${dataQuality}

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
  const dataQuality = getDataQualityNotes(data)

  return `Analyze posting patterns and provide COMPREHENSIVE posting recommendations for a festival brand.

Platform: ${data.platform}
Analysis Period: ${data.days} days

Performance Data:
- Total Reach: ${data.metrics.totalReach.toLocaleString()}
- Total Engagement: ${data.metrics.totalEngagement.toLocaleString()}
- Engagement Rate: ${data.metrics.engagementRate.toFixed(2)}%
- Followers: ${data.metrics.totalFollowers.toLocaleString()}

${dataQuality}

Top performing content:
${data.topContent.map((c, i) => `${i + 1}. ${c.type} - Reach: ${c.reach.toLocaleString()}, Engagement: ${c.engagement.toLocaleString()}${c.caption ? ` - Caption preview: "${c.caption.slice(0, 50)}..."` : ''}`).join('\n')}

Bottom performing content:
${data.bottomContent.map((c, i) => `${i + 1}. ${c.type} - Reach: ${c.reach.toLocaleString()}, Engagement: ${c.engagement.toLocaleString()}`).join('\n')}

Consider:
- Festival/event audience (18-35 year olds, music lovers, party-goers)
- Weekend vs weekday engagement patterns
- Event announcement and hype building timing
- Seasonal event marketing cycles
- Platform-specific algorithm preferences

Respond with detailed JSON:
{
  "bestPostingTime": {
    "dayOfWeek": "Tuesday",
    "hour": 19,
    "timezone": "CET",
    "reasoning": "Your audience shows highest engagement during evening commute hours..."
  },
  "secondaryPostingTimes": [
    { "dayOfWeek": "Thursday", "hour": 20, "engagementPotential": "high" },
    { "dayOfWeek": "Saturday", "hour": 12, "engagementPotential": "medium" }
  ],
  "weeklySchedule": [
    {
      "day": "Monday",
      "postCount": 1,
      "bestTimes": [18, 20],
      "contentType": "Carousel",
      "theme": "Week kickoff / Throwback highlights"
    },
    {
      "day": "Tuesday",
      "postCount": 2,
      "bestTimes": [12, 19],
      "contentType": "Reel",
      "theme": "Artist spotlight / Music content"
    },
    {
      "day": "Wednesday",
      "postCount": 1,
      "bestTimes": [19],
      "contentType": "Story",
      "theme": "Behind the scenes / Team content"
    },
    {
      "day": "Thursday",
      "postCount": 2,
      "bestTimes": [12, 20],
      "contentType": "Post",
      "theme": "Lineup teasers / Announcements"
    },
    {
      "day": "Friday",
      "postCount": 2,
      "bestTimes": [17, 21],
      "contentType": "Reel",
      "theme": "Weekend vibes / Hype content"
    },
    {
      "day": "Saturday",
      "postCount": 1,
      "bestTimes": [12, 18],
      "contentType": "User content / Memories",
      "theme": "Community highlights"
    },
    {
      "day": "Sunday",
      "postCount": 1,
      "bestTimes": [11, 19],
      "contentType": "Carousel",
      "theme": "Weekly recap / Countdown"
    }
  ],
  "optimalContentType": "Reel",
  "contentMix": [
    {
      "type": "Reels",
      "percentage": 40,
      "description": "Short-form video for maximum reach and algorithm boost",
      "examples": ["Artist announcement reveals", "Festival aftermovie clips", "Dance/vibe compilations"]
    },
    {
      "type": "Carousels",
      "percentage": 25,
      "description": "Multi-image posts for lineup reveals and detailed info",
      "examples": ["Full lineup reveal", "Stage by stage breakdown", "Festival guide slides"]
    },
    {
      "type": "Stories",
      "percentage": 20,
      "description": "Daily engagement and real-time updates",
      "examples": ["Polls and Q&As", "Countdown stickers", "Quick updates"]
    },
    {
      "type": "Single Posts",
      "percentage": 15,
      "description": "Key announcements and hero content",
      "examples": ["Ticket sale announcement", "Headliner reveal", "Important info"]
    }
  ],
  "suggestedHashtags": ["#festival2025", "#festivalseason", "#musicfestival", "#livemusic", "#festivallife"],
  "hashtagStrategy": {
    "branded": ["#IconicFestival", "#Iconic2025", "#IconicMoments"],
    "trending": ["#festivalseason", "#summervibes", "#musicfestival"],
    "niche": ["#electronicmusic", "#housemusiclovers", "#technofamily"],
    "community": ["#festivalfamily", "#festivalcrew", "#festivalsquad"],
    "usage": "Use 8-12 hashtags per post. Always include 2-3 branded hashtags first, followed by 3-4 trending hashtags, and 3-4 niche/community hashtags. Rotate hashtags to avoid shadowban."
  },
  "captionTemplates": [
    {
      "type": "Announcement",
      "template": "[HOOK] + [NEWS] + [CTA] + [HASHTAGS]",
      "example": "IT'S OFFICIAL ⚡\\n\\n[Artist Name] is joining us at Iconic Festival 2025!\\n\\nWho's ready to experience this live? Drop a 🔥 below!\\n\\n🎫 Tickets in bio\\n\\n#IconicFestival #Iconic2025",
      "tips": ["Start with an attention-grabbing hook", "Use emojis strategically", "Include clear call-to-action", "Keep it under 150 characters for preview"]
    },
    {
      "type": "Engagement",
      "template": "[QUESTION] + [CONTEXT] + [CTA]",
      "example": "Which stage are you heading to first? 🤔\\n\\n🎵 Main Stage - Big room bangers\\n🌊 Beach Stage - Deep house vibes\\n🌲 Forest Stage - Techno sanctuary\\n\\nComment your answer below! 👇",
      "tips": ["Ask a specific question", "Give options to make it easy to engage", "Use emoji bullets for readability"]
    },
    {
      "type": "Hype Building",
      "template": "[COUNTDOWN] + [EXCITEMENT] + [URGENCY]",
      "example": "⏰ 30 DAYS TO GO\\n\\nCan you feel it? The bass is calling...\\n\\nLimited tickets remaining - don't miss out!\\n\\n🎫 Link in bio",
      "tips": ["Create urgency", "Build emotional connection", "Always include link reminder"]
    },
    {
      "type": "Behind The Scenes",
      "template": "[PEEK] + [STORY] + [TEASE]",
      "example": "POV: You just walked into our production office 👀\\n\\nThe team is working around the clock to bring you the most epic stage designs yet...\\n\\nStay tuned for the big reveal 🔜",
      "tips": ["Make followers feel special/insider", "Build anticipation", "Humanize the brand"]
    }
  ],
  "audienceInsights": {
    "peakActivityHours": [12, 18, 19, 20, 21],
    "preferredContentTypes": ["Reels", "Carousels", "Stories"],
    "engagementPatterns": "Your audience engages most during lunch breaks (12-13h) and evening hours (18-21h). Weekend engagement is steady but lower than weekday evenings. Video content receives 3x more engagement than static posts.",
    "demographicNotes": "Primarily 18-35 year olds with interest in music festivals, nightlife, and travel. High engagement from urban areas. Strong international following suggests posting at multiple peak times."
  },
  "platformSpecificTips": [
    {
      "tip": "Post Reels during peak hours (18-21h) for maximum initial reach - the algorithm favors early engagement velocity",
      "impact": "high",
      "category": "timing"
    },
    {
      "tip": "Use trending audio in Reels within the first 48 hours of it trending for 2-3x reach boost",
      "impact": "high",
      "category": "content"
    },
    {
      "tip": "Respond to comments within the first hour to boost post visibility in the algorithm",
      "impact": "high",
      "category": "engagement"
    },
    {
      "tip": "Use Instagram's Collab feature with artists and partners to double your reach",
      "impact": "high",
      "category": "growth"
    },
    {
      "tip": "Pin your best performing Reel and your next event announcement to your profile grid",
      "impact": "medium",
      "category": "content"
    },
    {
      "tip": "Use location tags for festival venue and major cities to increase discoverability",
      "impact": "medium",
      "category": "growth"
    },
    {
      "tip": "Create hashtag variations (mix of sizes) - 3 large (1M+), 5 medium (100K-1M), 4 small (<100K)",
      "impact": "medium",
      "category": "hashtags"
    },
    {
      "tip": "Post Stories consistently (3-5 per day) to stay at the front of followers' feeds",
      "impact": "medium",
      "category": "timing"
    },
    {
      "tip": "Use interactive Story stickers (polls, questions, countdowns) to boost engagement signals",
      "impact": "medium",
      "category": "engagement"
    },
    {
      "tip": "Save and share user-generated content to build community and encourage more UGC",
      "impact": "medium",
      "category": "growth"
    }
  ],
  "engagementPrediction": 3500,
  "confidence": 0.82
}

Tailor all recommendations specifically for festival/event marketing. Be detailed and actionable.`
}
