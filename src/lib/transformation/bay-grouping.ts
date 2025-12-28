/**
 * Bay Transformation Algorithms
 *
 * Three strategies for grouping locations into bays:
 * 1. Naming Convention: Extract bay from location codes (e.g., "D11-021-11" -> "D11-021")
 * 2. Physical Proximity: Group by spatial coordinates
 * 3. Manual Mapping: User-defined bay groupings
 */

import type { ParsedLocationRow } from '../excel/types'

// ==========================================
// TYPES
// ==========================================

export type BayTransformStrategy = 'NAMING_CONVENTION' | 'PHYSICAL_PROXIMITY' | 'MANUAL_MAPPING'

export interface BayGroupingResult {
  locationCode: string
  bayCode: string
  strategy: BayTransformStrategy
  confidence: number // 0.0 - 1.0
}

export interface NamingConventionConfig {
  delimiter?: string // Default: "-"
  baySegments?: number // Number of segments for bay code (e.g., 3 for "D11-021")
  pattern?: RegExp // Custom regex pattern
}

export interface PhysicalProximityConfig {
  maxDistance?: number // Maximum distance for grouping (meters)
  useAisle?: boolean // Group by aisle first
  useArea?: boolean // Group by area first
}

export interface ManualMappingConfig {
  mappings: Record<string, string> // location -> bay
}

export type BayTransformConfig =
  | NamingConventionConfig
  | PhysicalProximityConfig
  | ManualMappingConfig

// ==========================================
// STRATEGY 1: NAMING CONVENTION
// ==========================================

/**
 * Extract bay code from location code using naming patterns
 *
 * Examples:
 * - "D11-021-11" -> "D11-021" (segments: 3, delimiter: "-")
 * - "A.01.05.03" -> "A.01.05" (segments: 3, delimiter: ".")
 * - "BAY-A-LOC-123" -> "BAY-A" (segments: 2, delimiter: "-")
 */
export function extractBayFromNamingConvention(
  locationCode: string,
  config: NamingConventionConfig = {}
): BayGroupingResult {
  const delimiter = config.delimiter ?? '-'
  const baySegments = config.baySegments ?? 3

  try {
    // Use custom pattern if provided
    if (config.pattern) {
      const match = locationCode.match(config.pattern)
      if (match && match[0]) {
        return {
          locationCode,
          bayCode: match[0],
          strategy: 'NAMING_CONVENTION',
          confidence: 1.0,
        }
      }
    }

    // Split by delimiter
    const parts = locationCode.split(delimiter)

    if (parts.length < baySegments) {
      // Not enough segments, use entire code
      return {
        locationCode,
        bayCode: locationCode,
        strategy: 'NAMING_CONVENTION',
        confidence: 0.5,
      }
    }

    // Take first N segments
    const bayCode = parts.slice(0, baySegments).join(delimiter)

    return {
      locationCode,
      bayCode,
      strategy: 'NAMING_CONVENTION',
      confidence: 1.0,
    }
  } catch (error) {
    // Fallback: use entire location code
    return {
      locationCode,
      bayCode: locationCode,
      strategy: 'NAMING_CONVENTION',
      confidence: 0.3,
    }
  }
}

// ==========================================
// STRATEGY 2: PHYSICAL PROXIMITY
// ==========================================

interface LocationWithCoordinates extends ParsedLocationRow {
  x?: number // Extracted X coordinate
  y?: number // Extracted Y coordinate
  z?: number // Extracted Z coordinate (level)
}

/**
 * Calculate Euclidean distance between two locations
 */
function calculateDistance(loc1: LocationWithCoordinates, loc2: LocationWithCoordinates): number {
  const x1 = loc1.x ?? 0
  const y1 = loc1.y ?? 0
  const z1 = loc1.z ?? 0

  const x2 = loc2.x ?? 0
  const y2 = loc2.y ?? 0
  const z2 = loc2.z ?? 0

  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2))
}

/**
 * Extract coordinates from location code (if possible)
 *
 * Attempts to parse numeric coordinates from location code.
 * Example: "D11-021-11" -> { x: 11, y: 21, z: 11 }
 */
function extractCoordinates(locationCode: string): LocationWithCoordinates | null {
  // Try to extract numbers from location code
  const numbers = locationCode.match(/\d+/g)

  if (!numbers || numbers.length < 2) {
    return null
  }

  return {
    location: locationCode,
    storageType: '',
    locationLength: 0,
    locationWidth: 0,
    locationHeight: 0,
    capacityLayout: '',
    locationCategory: '',
    bay: '',
    x: parseInt(numbers[0]!, 10),
    y: parseInt(numbers[1]!, 10),
    z: numbers[2] ? parseInt(numbers[2], 10) : 0,
  }
}

/**
 * Group locations by physical proximity using clustering
 */
export function groupByPhysicalProximity(
  locations: ParsedLocationRow[],
  config: PhysicalProximityConfig = {}
): BayGroupingResult[] {
  const maxDistance = config.maxDistance ?? 10
  const results: BayGroupingResult[] = []

  // Extract coordinates
  const locationsWithCoords = locations
    .map((loc) => {
      const coords = extractCoordinates(loc.location)
      return coords ? { ...loc, ...coords } : null
    })
    .filter((loc): loc is LocationWithCoordinates => loc !== null)

  if (locationsWithCoords.length === 0) {
    // Fallback: use naming convention
    return locations.map((loc) => extractBayFromNamingConvention(loc.location))
  }

  // Simple clustering: assign each location to nearest cluster
  const clusters: Map<string, LocationWithCoordinates[]> = new Map()
  let clusterIndex = 0

  for (const loc of locationsWithCoords) {
    let assignedCluster: string | null = null
    let minDistance = Infinity

    // Find nearest cluster
    for (const [clusterId, members] of clusters.entries()) {
      // Calculate distance to cluster centroid
      const centroid = members[0]! // Simplification: use first member
      const distance = calculateDistance(loc, centroid)

      if (distance < maxDistance && distance < minDistance) {
        assignedCluster = clusterId
        minDistance = distance
      }
    }

    // Assign to cluster or create new one
    if (assignedCluster) {
      clusters.get(assignedCluster)!.push(loc)
    } else {
      const newClusterId = `BAY-${String(clusterIndex++).padStart(3, '0')}`
      clusters.set(newClusterId, [loc])
    }
  }

  // Build results
  for (const [clusterId, members] of clusters.entries()) {
    for (const loc of members) {
      results.push({
        locationCode: loc.location,
        bayCode: clusterId,
        strategy: 'PHYSICAL_PROXIMITY',
        confidence: 0.8,
      })
    }
  }

  return results
}

// ==========================================
// STRATEGY 3: MANUAL MAPPING
// ==========================================

/**
 * Apply manual bay mapping
 */
export function applyManualMapping(
  locations: ParsedLocationRow[],
  config: ManualMappingConfig
): BayGroupingResult[] {
  return locations.map((loc) => {
    const bayCode = config.mappings[loc.location]

    if (bayCode) {
      return {
        locationCode: loc.location,
        bayCode,
        strategy: 'MANUAL_MAPPING',
        confidence: 1.0,
      }
    }

    // Fallback: use naming convention
    return extractBayFromNamingConvention(loc.location)
  })
}

// ==========================================
// UNIFIED TRANSFORMATION FUNCTION
// ==========================================

/**
 * Transform locations to bays using specified strategy
 */
export function transformLocationsToBays(
  locations: ParsedLocationRow[],
  strategy: BayTransformStrategy,
  config?: BayTransformConfig
): BayGroupingResult[] {
  switch (strategy) {
    case 'NAMING_CONVENTION':
      return locations.map((loc) =>
        extractBayFromNamingConvention(loc.location, config as NamingConventionConfig)
      )

    case 'PHYSICAL_PROXIMITY':
      return groupByPhysicalProximity(locations, config as PhysicalProximityConfig)

    case 'MANUAL_MAPPING':
      if (!config) {
        throw new Error('Manual mapping requires config with mappings')
      }
      return applyManualMapping(locations, config as ManualMappingConfig)

    default:
      throw new Error(`Unknown strategy: ${strategy}`)
  }
}

/**
 * Calculate bay metrics from grouping results
 */
export function calculateBayMetrics(
  groupingResults: BayGroupingResult[],
  locations: ParsedLocationRow[]
): Map<
  string,
  {
    bayCode: string
    locationCount: number
    locations: string[]
  }
> {
  const bayMetrics = new Map<
    string,
    {
      bayCode: string
      locationCount: number
      locations: string[]
    }
  >()

  for (const result of groupingResults) {
    const existing = bayMetrics.get(result.bayCode)

    if (existing) {
      existing.locationCount++
      existing.locations.push(result.locationCode)
    } else {
      bayMetrics.set(result.bayCode, {
        bayCode: result.bayCode,
        locationCount: 1,
        locations: [result.locationCode],
      })
    }
  }

  return bayMetrics
}

/**
 * Detect best strategy for locations
 */
export function detectBestStrategy(locations: ParsedLocationRow[]): BayTransformStrategy {
  if (locations.length === 0) {
    return 'NAMING_CONVENTION'
  }

  // Sample first few locations
  const sample = locations.slice(0, Math.min(10, locations.length))

  // Check if naming convention works well
  const hasDelimiters = sample.every(
    (loc) => loc.location.includes('-') || loc.location.includes('.')
  )

  if (hasDelimiters) {
    return 'NAMING_CONVENTION'
  }

  // Check if coordinates are extractable
  const hasCoordinates = sample.some((loc) => {
    const coords = extractCoordinates(loc.location)
    return coords !== null
  })

  if (hasCoordinates) {
    return 'PHYSICAL_PROXIMITY'
  }

  // Default to naming convention
  return 'NAMING_CONVENTION'
}
