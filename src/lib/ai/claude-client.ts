// Claude AI Client with caching and rate limiting

import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/server/db'
import crypto from 'crypto'
import type {
  QuickInsight,
  PerformanceAnalysis,
  ContentComparison,
  StrategicAdvice,
  NarrativeReport,
  PostRecommendation,
} from './types'
import {
  SYSTEM_PROMPT,
  buildQuickInsightsPrompt,
  buildContentAnalysisPrompt,
  buildComparisonPrompt,
  buildStrategicAdvicePrompt,
  buildNarrativeReportPrompt,
  buildPostingTimePrompt,
} from './prompts'
import type { InsightsData, ContentData } from './types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Cache TTL in hours
const CACHE_TTL_HOURS = 1

// Helper to generate cache key
function generateCacheKey(analysisType: string, input: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(input)).digest('hex')
  return `${analysisType}:${hash}`
}

// Helper to check and get cached result
async function getCachedResult<T>(analysisType: string, inputHash: string): Promise<T | null> {
  try {
    const cached = await db.aiAnalysisCache.findUnique({
      where: {
        analysisType_inputHash: {
          analysisType,
          inputHash,
        },
      },
    })

    if (cached && cached.expiresAt > new Date()) {
      return cached.result as T
    }

    // Clean up expired cache
    if (cached) {
      await db.aiAnalysisCache.delete({
        where: { id: cached.id },
      })
    }

    return null
  } catch {
    return null
  }
}

// Helper to cache result
async function cacheResult(
  analysisType: string,
  inputHash: string,
  result: unknown
): Promise<void> {
  try {
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS)

    await db.aiAnalysisCache.upsert({
      where: {
        analysisType_inputHash: {
          analysisType,
          inputHash,
        },
      },
      update: {
        result: result as object,
        expiresAt,
      },
      create: {
        analysisType,
        inputHash,
        result: result as object,
        expiresAt,
      },
    })
  } catch (error) {
    console.error('Failed to cache AI result:', error)
  }
}

// Helper to call Claude API
async function callClaude(prompt: string, maxTokens = 2048): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0]
  if (!content) {
    throw new Error('No content in Claude response')
  }
  if (content.type === 'text') {
    return content.text
  }
  throw new Error('Unexpected response type from Claude')
}

// Helper to parse JSON from Claude response
function parseJsonResponse<T>(response: string): T {
  // Extract JSON from potential markdown code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const jsonString = jsonMatch?.[1] ?? response

  try {
    return JSON.parse(jsonString.trim()) as T
  } catch {
    throw new Error(`Failed to parse JSON response: ${response.slice(0, 200)}`)
  }
}

// Public API methods

export async function getQuickInsights(data: InsightsData): Promise<QuickInsight[]> {
  const inputHash = generateCacheKey('quick_insights', data)

  // Check cache first
  const cached = await getCachedResult<QuickInsight[]>('quick_insights', inputHash)
  if (cached) return cached

  // Call Claude
  const prompt = buildQuickInsightsPrompt(data)
  const response = await callClaude(prompt)
  const insights = parseJsonResponse<QuickInsight[]>(response)

  // Cache result
  await cacheResult('quick_insights', inputHash, insights)

  return insights
}

export async function analyzeContent(content: ContentData): Promise<PerformanceAnalysis> {
  const inputHash = generateCacheKey('content_analysis', content)

  const cached = await getCachedResult<PerformanceAnalysis>('content_analysis', inputHash)
  if (cached) return { ...cached, contentId: content.id }

  const prompt = buildContentAnalysisPrompt(content)
  const response = await callClaude(prompt)
  const analysis = parseJsonResponse<Omit<PerformanceAnalysis, 'contentId'>>(response)

  const result = { ...analysis, contentId: content.id }
  await cacheResult('content_analysis', inputHash, result)

  return result
}

export async function compareContent(
  contentA: ContentData,
  contentB: ContentData
): Promise<ContentComparison> {
  const inputHash = generateCacheKey('content_comparison', { contentA, contentB })

  const cached = await getCachedResult<ContentComparison>('content_comparison', inputHash)
  if (cached) return cached

  const prompt = buildComparisonPrompt(contentA, contentB)
  const response = await callClaude(prompt)
  const comparison = parseJsonResponse<Omit<ContentComparison, 'contentIds'>>(response)

  const result = { ...comparison, contentIds: [contentA.id, contentB.id] }
  await cacheResult('content_comparison', inputHash, result)

  return result
}

export async function getStrategicAdvice(
  data: InsightsData,
  focus: 'growth' | 'engagement' | 'reach'
): Promise<StrategicAdvice> {
  const inputHash = generateCacheKey('strategic_advice', { data, focus })

  const cached = await getCachedResult<StrategicAdvice>('strategic_advice', inputHash)
  if (cached) return cached

  const prompt = buildStrategicAdvicePrompt(data, focus)
  const response = await callClaude(prompt, 4096) // Higher token limit for detailed response
  const advice = parseJsonResponse<Omit<StrategicAdvice, 'focus'>>(response)

  const result = { ...advice, focus }
  await cacheResult('strategic_advice', inputHash, result)

  return result
}

export async function generateNarrativeReport(
  data: InsightsData,
  month: number,
  year: number
): Promise<NarrativeReport> {
  const inputHash = generateCacheKey('narrative_report', { data, month, year })

  const cached = await getCachedResult<NarrativeReport>('narrative_report', inputHash)
  if (cached) return cached

  const prompt = buildNarrativeReportPrompt(data, month, year)
  const response = await callClaude(prompt)
  const report = parseJsonResponse<Omit<NarrativeReport, 'month' | 'year'>>(response)

  const result = { ...report, month, year }
  await cacheResult('narrative_report', inputHash, result)

  return result
}

export async function getPostingRecommendations(data: InsightsData): Promise<PostRecommendation> {
  const inputHash = generateCacheKey('posting_recommendations', data)

  const cached = await getCachedResult<PostRecommendation>('posting_recommendations', inputHash)
  if (cached) return cached

  const prompt = buildPostingTimePrompt(data)
  const response = await callClaude(prompt, 6144) // Higher token limit for comprehensive recommendations
  const recommendation = parseJsonResponse<PostRecommendation>(response)

  await cacheResult('posting_recommendations', inputHash, recommendation)

  return recommendation
}
