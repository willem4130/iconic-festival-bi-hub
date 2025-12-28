/**
 * Column Mapping Auto-Detection
 *
 * Intelligent column mapping detector that analyzes client Excel files
 * and automatically maps columns to template schema with confidence scoring.
 */

import { PICK_TEMPLATE_COLUMNS, LOCATION_TEMPLATE_COLUMNS } from '../excel/parser'
import type { AutoDetectionResult, DetectedMapping, SheetType, RawRow } from '../excel/types'

// ==========================================
// FUZZY MATCHING DICTIONARIES
// ==========================================

/**
 * Synonym dictionaries for template columns
 */
const PICK_COLUMN_SYNONYMS: Record<string, string[]> = {
  article: [
    'article',
    'artikelnummer',
    'artikel',
    'item',
    'item_number',
    'sku',
    'product_code',
    'product_id',
    'artikelnr',
    'art_nr',
  ],
  articleDescription: [
    'articledescription',
    'description',
    'artikeloms',
    'omschrijving',
    'item_description',
    'product_description',
    'desc',
    'artikel_omschrijving',
  ],
  family: [
    'family',
    'productgroup',
    'product_group',
    'category',
    'productgroep',
    'oms_productgroep',
    'oms productgroep 1',
    'group',
  ],
  pickFrequency: [
    'pickfrequency',
    'frequency',
    'picks',
    'pick_frequency',
    'aantal_picks',
    'pickcount',
    'pick_count',
    'freq',
  ],
  location: [
    'location',
    'locatie',
    'picklocatie',
    'pick_location',
    'loc',
    'warehouse_location',
    'slot',
  ],
  quantity: ['quantity', 'qty', 'aantal', 'hoeveelheid', 'count', 'amount', 'volume'],
  uniqueArticles: [
    'uniquearticles',
    'unique_articles',
    'aantal_artikelen',
    'article_count',
    'unique_items',
  ],
}

const LOCATION_COLUMN_SYNONYMS: Record<string, string[]> = {
  location: ['location', 'locatie', 'loc', 'warehouse_location', 'slot', 'position', 'positie'],
  storageType: [
    'storagetype',
    'storage_type',
    'type',
    'slottype',
    'slot_type',
    'slot type description',
    'locatietype',
  ],
  locationLength: [
    'locationlength',
    'length',
    'lengte',
    'l',
    'location_length',
    'lengte st eenheid',
  ],
  locationWidth: ['locationwidth', 'width', 'breedte', 'w', 'location_width', 'breedte st eenheid'],
  locationHeight: [
    'locationheight',
    'height',
    'hoogte',
    'h',
    'location_height',
    'hoogte st eenheid',
  ],
  capacityLayout: ['capacitylayout', 'capacity_layout', 'layout', 'capacity', 'capaciteit'],
  locationCategory: [
    'locationcategory',
    'category',
    'categorie',
    'location_category',
    'location class',
    'location class description',
    'cat',
  ],
  bay: ['bay', 'aisle', 'gang', 'area', 'zone', 'gebied'],
}

// ==========================================
// STRING SIMILARITY
// ==========================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        )
      }
    }
  }

  return matrix[b.length]![a.length]!
}

/**
 * Calculate similarity score (0.0 - 1.0)
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(a, b)
  return 1.0 - distance / maxLen
}

/**
 * Normalize column name for comparison
 */
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// ==========================================
// AUTO-DETECTION
// ==========================================

/**
 * Find best match for template column in client columns
 */
function findBestMatch(
  templateColumn: string,
  clientColumns: string[],
  synonyms: string[],
  threshold: number
): DetectedMapping | null {
  const normalized = synonyms.map(normalizeColumnName)
  let bestMatch: DetectedMapping | null = null
  let bestScore = 0

  for (const clientCol of clientColumns) {
    const normalizedClient = normalizeColumnName(clientCol)

    // Check exact match
    if (normalized.includes(normalizedClient)) {
      return {
        clientColumn: clientCol,
        templateColumn,
        confidence: 1.0,
        reason: 'Exact match',
      }
    }

    // Check fuzzy match
    for (const synonym of normalized) {
      const score = similarity(normalizedClient, synonym)
      if (score > bestScore && score >= threshold) {
        bestScore = score
        bestMatch = {
          clientColumn: clientCol,
          templateColumn,
          confidence: score,
          reason: `Fuzzy match (${(score * 100).toFixed(0)}% similarity)`,
        }
      }
    }
  }

  return bestMatch
}

/**
 * Auto-detect column mappings for PICK sheet
 */
export function autoDetectPickMappings(
  clientColumns: string[],
  threshold = 0.7
): AutoDetectionResult {
  const mappings: DetectedMapping[] = []
  const unmappedColumns: string[] = []
  const missingColumns: string[] = []
  const mappedClientColumns = new Set<string>()

  // Find mappings for each template column
  for (const templateCol of PICK_TEMPLATE_COLUMNS) {
    const synonyms = PICK_COLUMN_SYNONYMS[templateCol] ?? [templateCol]
    const match = findBestMatch(templateCol, clientColumns, synonyms, threshold)

    if (match) {
      mappings.push(match)
      mappedClientColumns.add(match.clientColumn)
    } else {
      missingColumns.push(templateCol)
    }
  }

  // Find unmapped client columns
  for (const clientCol of clientColumns) {
    if (!mappedClientColumns.has(clientCol)) {
      unmappedColumns.push(clientCol)
    }
  }

  // Calculate overall confidence
  const requiredMapped = PICK_TEMPLATE_COLUMNS.length - missingColumns.length
  const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length || 0
  const completeness = requiredMapped / PICK_TEMPLATE_COLUMNS.length
  const confidence = (avgConfidence + completeness) / 2

  return {
    sheetType: 'PICK',
    mappings,
    unmappedColumns,
    missingColumns,
    confidence,
  }
}

/**
 * Auto-detect column mappings for LOCATION sheet
 */
export function autoDetectLocationMappings(
  clientColumns: string[],
  threshold = 0.7
): AutoDetectionResult {
  const mappings: DetectedMapping[] = []
  const unmappedColumns: string[] = []
  const missingColumns: string[] = []
  const mappedClientColumns = new Set<string>()

  // Find mappings for each template column
  for (const templateCol of LOCATION_TEMPLATE_COLUMNS) {
    const synonyms = LOCATION_COLUMN_SYNONYMS[templateCol] ?? [templateCol]
    const match = findBestMatch(templateCol, clientColumns, synonyms, threshold)

    if (match) {
      mappings.push(match)
      mappedClientColumns.add(match.clientColumn)
    } else {
      missingColumns.push(templateCol)
    }
  }

  // Find unmapped client columns
  for (const clientCol of clientColumns) {
    if (!mappedClientColumns.has(clientCol)) {
      unmappedColumns.push(clientCol)
    }
  }

  // Calculate overall confidence
  const requiredMapped = LOCATION_TEMPLATE_COLUMNS.length - missingColumns.length
  const avgConfidence = mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length || 0
  const completeness = requiredMapped / LOCATION_TEMPLATE_COLUMNS.length
  const confidence = (avgConfidence + completeness) / 2

  return {
    sheetType: 'LOCATION',
    mappings,
    unmappedColumns,
    missingColumns,
    confidence,
  }
}

/**
 * Auto-detect sheet type and mappings
 */
export function autoDetectMappings(clientColumns: string[], threshold = 0.7): AutoDetectionResult {
  // Try both sheet types
  const pickResult = autoDetectPickMappings(clientColumns, threshold)
  const locationResult = autoDetectLocationMappings(clientColumns, threshold)

  // Return the one with higher confidence
  return pickResult.confidence >= locationResult.confidence ? pickResult : locationResult
}

/**
 * Convert detection result to column mapping object
 */
export function toColumnMapping(detectionResult: AutoDetectionResult): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const detected of detectionResult.mappings) {
    mapping[detected.clientColumn] = detected.templateColumn
  }

  return mapping
}

/**
 * Detect sheet type from sample data
 */
export function detectSheetType(sampleRows: RawRow[], threshold = 0.7): SheetType {
  if (sampleRows.length === 0) return 'PICK'

  const columns = Object.keys(sampleRows[0] ?? {})
  const result = autoDetectMappings(columns, threshold)

  return result.sheetType
}
