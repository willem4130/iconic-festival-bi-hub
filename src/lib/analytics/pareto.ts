/**
 * Pareto Analysis Engine
 *
 * Multi-dimensional Pareto analysis for warehouse optimization.
 * Implements 80/20 rule visualization across various dimensions:
 * - Pick frequency by article
 * - Location utilization
 * - Bay productivity
 * - Family/category analysis
 */

import type { ParsedPickRow, ParsedLocationRow } from '../excel/types'

// ==========================================
// TYPES
// ==========================================

export interface ParetoDataPoint {
  label: string // Article, location, bay, etc.
  value: number // Actual value (picks, utilization, etc.)
  percent: number // Percentage of total
  cumulative: number // Cumulative percentage
  rank: number // Rank (1-indexed)
}

export interface ParetoResult {
  dimension: string // e.g., "pickFrequency", "uniqueArticles"
  groupBy?: string // Optional grouping (e.g., "bay", "family")
  data: ParetoDataPoint[]
  totalValue: number
  pareto80Value: number // Value at 80% cumulative
  pareto80Count: number // Number of items in top 80%
  pareto80Percent: number // Percentage of items in top 80%
}

export type ParetoDimension =
  | 'pickFrequency'
  | 'uniqueArticles'
  | 'quantity'
  | 'locationUtilization'
  | 'bayProductivity'

export type ParetoGroupBy = 'article' | 'location' | 'bay' | 'family' | 'storageType'

// ==========================================
// CORE PARETO CALCULATION
// ==========================================

/**
 * Calculate Pareto analysis from raw data points
 */
export function calculatePareto(
  data: Array<{ label: string; value: number }>,
  dimension: string,
  groupBy?: string
): ParetoResult {
  // Sort by value descending
  const sorted = [...data].sort((a, b) => b.value - a.value)

  // Calculate total
  const totalValue = sorted.reduce((sum, item) => sum + item.value, 0)

  if (totalValue === 0) {
    return {
      dimension,
      groupBy,
      data: [],
      totalValue: 0,
      pareto80Value: 0,
      pareto80Count: 0,
      pareto80Percent: 0,
    }
  }

  // Build Pareto data points
  let cumulative = 0
  const paretoData: ParetoDataPoint[] = []

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!
    const percent = (item.value / totalValue) * 100
    cumulative += percent

    paretoData.push({
      label: item.label,
      value: item.value,
      percent,
      cumulative,
      rank: i + 1,
    })
  }

  // Find 80% cutoff point
  const pareto80Index = paretoData.findIndex((p) => p.cumulative >= 80)
  const pareto80Count = pareto80Index >= 0 ? pareto80Index + 1 : paretoData.length
  const pareto80Value = pareto80Index >= 0 ? paretoData[pareto80Index]!.value : 0
  const pareto80Percent = (pareto80Count / paretoData.length) * 100

  return {
    dimension,
    groupBy,
    data: paretoData,
    totalValue,
    pareto80Value,
    pareto80Count,
    pareto80Percent,
  }
}

// ==========================================
// PICK FREQUENCY PARETO
// ==========================================

/**
 * Pareto analysis by pick frequency
 */
export function calculatePickFrequencyPareto(
  picks: ParsedPickRow[],
  groupBy: 'article' | 'location' | 'family' = 'article'
): ParetoResult {
  const aggregated = new Map<string, number>()

  for (const pick of picks) {
    const key =
      groupBy === 'article' ? pick.article : groupBy === 'location' ? pick.location : pick.family

    const existing = aggregated.get(key) ?? 0
    aggregated.set(key, existing + pick.pickFrequency)
  }

  const data = Array.from(aggregated.entries()).map(([label, value]) => ({
    label,
    value,
  }))

  return calculatePareto(data, 'pickFrequency', groupBy)
}

// ==========================================
// UNIQUE ARTICLES PARETO
// ==========================================

/**
 * Pareto analysis by unique articles
 */
export function calculateUniqueArticlesPareto(
  picks: ParsedPickRow[],
  groupBy: 'location' | 'family' = 'location'
): ParetoResult {
  const aggregated = new Map<string, Set<string>>()

  for (const pick of picks) {
    const key = groupBy === 'location' ? pick.location : pick.family

    if (!aggregated.has(key)) {
      aggregated.set(key, new Set())
    }

    aggregated.get(key)!.add(pick.article)
  }

  const data = Array.from(aggregated.entries()).map(([label, articles]) => ({
    label,
    value: articles.size,
  }))

  return calculatePareto(data, 'uniqueArticles', groupBy)
}

// ==========================================
// QUANTITY PARETO
// ==========================================

/**
 * Pareto analysis by quantity
 */
export function calculateQuantityPareto(
  picks: ParsedPickRow[],
  groupBy: 'article' | 'location' | 'family' = 'article'
): ParetoResult {
  const aggregated = new Map<string, number>()

  for (const pick of picks) {
    const key =
      groupBy === 'article' ? pick.article : groupBy === 'location' ? pick.location : pick.family

    const existing = aggregated.get(key) ?? 0
    aggregated.set(key, existing + pick.quantity)
  }

  const data = Array.from(aggregated.entries()).map(([label, value]) => ({
    label,
    value,
  }))

  return calculatePareto(data, 'quantity', groupBy)
}

// ==========================================
// LOCATION UTILIZATION PARETO
// ==========================================

/**
 * Pareto analysis by location utilization
 */
export function calculateLocationUtilizationPareto(
  locations: ParsedLocationRow[],
  picks: ParsedPickRow[]
): ParetoResult {
  // Calculate utilization for each location
  const picksByLocation = new Map<string, number>()

  for (const pick of picks) {
    const existing = picksByLocation.get(pick.location) ?? 0
    picksByLocation.set(pick.location, existing + pick.pickFrequency)
  }

  const data = locations.map((loc) => {
    const pickFreq = picksByLocation.get(loc.location) ?? 0
    const capacity = loc.locationLength * loc.locationWidth * loc.locationHeight
    const utilization = capacity > 0 ? (pickFreq / capacity) * 100 : 0

    return {
      label: loc.location,
      value: utilization,
    }
  })

  return calculatePareto(data, 'locationUtilization', 'location')
}

// ==========================================
// BAY PRODUCTIVITY PARETO
// ==========================================

export interface BayData {
  bayCode: string
  locationCount: number
  uniqueArticles: number
  totalPickFrequency: number
}

/**
 * Pareto analysis by bay productivity
 */
export function calculateBayProductivityPareto(bayData: BayData[]): ParetoResult {
  const data = bayData.map((bay) => ({
    label: bay.bayCode,
    value: bay.totalPickFrequency,
  }))

  return calculatePareto(data, 'bayProductivity', 'bay')
}

// ==========================================
// COMBINED ANALYSIS
// ==========================================

/**
 * Generate comprehensive Pareto analysis across all dimensions
 */
export function generateComprehensivePareto(
  picks: ParsedPickRow[],
  locations: ParsedLocationRow[],
  bayData?: BayData[]
): {
  pickFrequencyByArticle: ParetoResult
  pickFrequencyByLocation: ParetoResult
  pickFrequencyByFamily: ParetoResult
  uniqueArticlesByLocation: ParetoResult
  uniqueArticlesByFamily: ParetoResult
  quantityByArticle: ParetoResult
  locationUtilization: ParetoResult
  bayProductivity?: ParetoResult
} {
  return {
    pickFrequencyByArticle: calculatePickFrequencyPareto(picks, 'article'),
    pickFrequencyByLocation: calculatePickFrequencyPareto(picks, 'location'),
    pickFrequencyByFamily: calculatePickFrequencyPareto(picks, 'family'),
    uniqueArticlesByLocation: calculateUniqueArticlesPareto(picks, 'location'),
    uniqueArticlesByFamily: calculateUniqueArticlesPareto(picks, 'family'),
    quantityByArticle: calculateQuantityPareto(picks, 'article'),
    locationUtilization: calculateLocationUtilizationPareto(locations, picks),
    bayProductivity: bayData ? calculateBayProductivityPareto(bayData) : undefined,
  }
}

// ==========================================
// PARETO INSIGHTS
// ==========================================

export interface ParetoInsight {
  type: 'info' | 'warning' | 'critical'
  message: string
  recommendation?: string
}

/**
 * Generate insights from Pareto analysis
 */
export function generateParetoInsights(paretoResult: ParetoResult): ParetoInsight[] {
  const insights: ParetoInsight[] = []

  // Check if 80/20 rule applies strongly
  if (paretoResult.pareto80Percent < 20) {
    insights.push({
      type: 'info',
      message: `Strong Pareto effect: ${paretoResult.pareto80Percent.toFixed(1)}% of items contribute to 80% of value`,
      recommendation: 'Focus optimization efforts on these top performers',
    })
  } else if (paretoResult.pareto80Percent > 50) {
    insights.push({
      type: 'warning',
      message: `Weak Pareto effect: ${paretoResult.pareto80Percent.toFixed(1)}% of items needed for 80% of value`,
      recommendation: 'Consider broader optimization strategy as value is more distributed',
    })
  }

  // Check for extreme concentration
  const top10Percent = Math.ceil(paretoResult.data.length * 0.1)
  const top10Value = paretoResult.data.slice(0, top10Percent).reduce((sum, p) => sum + p.percent, 0)

  if (top10Value > 50) {
    insights.push({
      type: 'critical',
      message: `Top 10% of items contribute ${top10Value.toFixed(1)}% of total value`,
      recommendation: 'High concentration risk - consider redundancy for top performers',
    })
  }

  // Check for long tail
  const bottom50Percent = Math.floor(paretoResult.data.length * 0.5)
  const bottom50Value = paretoResult.data
    .slice(-bottom50Percent)
    .reduce((sum, p) => sum + p.percent, 0)

  if (bottom50Value < 5) {
    insights.push({
      type: 'info',
      message: `Bottom 50% of items contribute only ${bottom50Value.toFixed(1)}% of value`,
      recommendation: 'Consider consolidating or eliminating low-performers to reduce complexity',
    })
  }

  return insights
}
