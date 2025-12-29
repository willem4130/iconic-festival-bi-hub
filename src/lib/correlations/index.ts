/**
 * Cross-Data Correlations module
 *
 * Analyzes relationships between different data sources to generate
 * actionable insights for festival marketing optimization.
 *
 * @example
 * ```typescript
 * import { calculatePearsonCorrelation, getCorrelationStrength } from '@/lib/correlations'
 *
 * const temps = [15, 18, 22, 25, 20]
 * const engagement = [100, 120, 180, 200, 150]
 * const correlation = calculatePearsonCorrelation(temps, engagement)
 * console.log(getCorrelationStrength(correlation)) // "strong"
 * ```
 */

export type {
  CorrelationStrength,
  CorrelationResult,
  WeatherEngagementCorrelation,
  HashtagPerformanceCorrelation,
  SentimentGrowthCorrelation,
  AttributionROICorrelation,
  FullInsightsReport,
} from './types'

export {
  calculatePearsonCorrelation,
  getCorrelationStrength,
  generateCorrelationInsight,
  percentageChange,
} from './types'
