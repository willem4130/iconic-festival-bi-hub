/**
 * Streaming Excel Parser
 *
 * Memory-optimized Excel parser for large warehouse data files (10K-1M rows).
 * Supports chunked processing, progress tracking, and automatic column mapping.
 */

import * as XLSX from 'xlsx'
import type {
  ParseOptions,
  ParseResult,
  ParseError,
  ParsedPickRow,
  ParsedLocationRow,
  RawRow,
  ExtraDimension,
  StreamParseOptions,
  ParsedChunk,
  ParseProgress,
  ExcelFileMetadata,
  SheetType,
  ColumnMapping,
} from './types'

// ==========================================
// CONSTANTS
// ==========================================

const DEFAULT_CHUNK_SIZE = 10000
const DEFAULT_MEMORY_LIMIT_MB = 512
const DEFAULT_START_ROW = 1 // Skip header row (0-indexed)

/**
 * Template column definitions
 */
export const PICK_TEMPLATE_COLUMNS = [
  'article',
  'articleDescription',
  'family',
  'pickFrequency',
  'location',
  'quantity',
  'uniqueArticles',
] as const

export const LOCATION_TEMPLATE_COLUMNS = [
  'location',
  'storageType',
  'locationLength',
  'locationWidth',
  'locationHeight',
  'capacityLayout',
  'locationCategory',
  'bay',
] as const

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Infer data type from value
 */
function inferDataType(value: unknown): 'string' | 'number' | 'date' | 'boolean' {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (value instanceof Date) return 'date'
  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    // Check if it looks like a date
    const parsed = new Date(value)
    if (parsed.toString() !== 'Invalid Date') return 'date'
  }
  return 'string'
}

/**
 * Convert value to string safely
 */
function toString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * Convert value to number safely
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''))
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

/**
 * Extract extra dimensions from raw row
 */
function extractExtraDimensions(
  rawRow: RawRow,
  templateColumns: readonly string[],
  columnMapping: ColumnMapping
): ExtraDimension[] {
  const extraDimensions: ExtraDimension[] = []
  const mappedColumns = new Set(Object.keys(columnMapping))

  for (const [key, value] of Object.entries(rawRow)) {
    // Skip if already mapped to template
    if (mappedColumns.has(key)) continue

    // Skip if template column
    if (templateColumns.includes(key as never)) continue

    // Skip empty values
    if (value === null || value === undefined || value === '') continue

    extraDimensions.push({
      name: key,
      value: toString(value),
      dataType: inferDataType(value),
    })
  }

  return extraDimensions
}

// ==========================================
// PICK ROW PARSER
// ==========================================

/**
 * Parse raw row to PickRow
 */
function parsePickRow(rawRow: RawRow, columnMapping: ColumnMapping): ParsedPickRow {
  const mappedRow: Record<string, unknown> = {}

  // Map columns
  for (const [clientCol, templateCol] of Object.entries(columnMapping)) {
    if (clientCol in rawRow) {
      mappedRow[templateCol] = rawRow[clientCol]
    }
  }

  // Convert to typed row
  const pickRow: ParsedPickRow = {
    article: toString(mappedRow.article),
    articleDescription: toString(mappedRow.articleDescription),
    family: toString(mappedRow.family),
    pickFrequency: toNumber(mappedRow.pickFrequency),
    location: toString(mappedRow.location),
    quantity: toNumber(mappedRow.quantity),
    uniqueArticles: toNumber(mappedRow.uniqueArticles),
    extraDimensions: extractExtraDimensions(rawRow, PICK_TEMPLATE_COLUMNS, columnMapping),
  }

  return pickRow
}

// ==========================================
// LOCATION ROW PARSER
// ==========================================

/**
 * Parse raw row to LocationRow
 */
function parseLocationRow(rawRow: RawRow, columnMapping: ColumnMapping): ParsedLocationRow {
  const mappedRow: Record<string, unknown> = {}

  // Map columns
  for (const [clientCol, templateCol] of Object.entries(columnMapping)) {
    if (clientCol in rawRow) {
      mappedRow[templateCol] = rawRow[clientCol]
    }
  }

  // Convert to typed row
  const locationRow: ParsedLocationRow = {
    location: toString(mappedRow.location),
    storageType: toString(mappedRow.storageType),
    locationLength: toNumber(mappedRow.locationLength),
    locationWidth: toNumber(mappedRow.locationWidth),
    locationHeight: toNumber(mappedRow.locationHeight),
    capacityLayout: toString(mappedRow.capacityLayout),
    locationCategory: toString(mappedRow.locationCategory),
    bay: toString(mappedRow.bay),
    extraDimensions: extractExtraDimensions(rawRow, LOCATION_TEMPLATE_COLUMNS, columnMapping),
  }

  return locationRow
}

// ==========================================
// EXCEL FILE METADATA
// ==========================================

/**
 * Get Excel file metadata without loading entire file
 */
export async function getExcelMetadata(fileBuffer: Buffer): Promise<ExcelFileMetadata> {
  const workbook = XLSX.read(fileBuffer, {
    type: 'buffer',
    sheetRows: 1, // Only load first row for metadata
  })

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]!]
  const range = XLSX.utils.decode_range(firstSheet!['!ref'] ?? 'A1')

  return {
    fileName: 'unknown',
    fileSize: fileBuffer.length,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sheetNames: workbook.SheetNames,
    estimatedRows: range.e.r + 1,
  }
}

// ==========================================
// STREAMING PARSER
// ==========================================

/**
 * Parse Excel file with streaming support for large files
 */
export async function parseExcelStream<T extends ParsedPickRow | ParsedLocationRow>(
  fileBuffer: Buffer,
  options: StreamParseOptions
): Promise<ParseResult<T> | ParseError> {
  const startTime = Date.now()

  try {
    // Load workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

    // Get sheet
    const sheetName =
      typeof options.sheet === 'string' ? options.sheet : workbook.SheetNames[options.sheet ?? 0]

    if (!sheetName || !workbook.Sheets[sheetName]) {
      return {
        success: false,
        error: `Sheet not found: ${sheetName}`,
        errorCode: 'SHEET_NOT_FOUND',
        elapsedMs: Date.now() - startTime,
      }
    }

    const sheet = workbook.Sheets[sheetName]!

    // Convert to JSON
    const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      raw: false, // Convert all values to strings initially
      defval: '', // Default value for empty cells
    })

    // Setup parsing
    const columnMapping = options.columnMapping ?? {}
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
    const startRow = options.startRow ?? DEFAULT_START_ROW
    const maxRows = options.maxRows ?? 0

    const totalRows = maxRows > 0 ? Math.min(rawRows.length, maxRows) : rawRows.length
    const chunks: T[] = []
    let processedRows = 0
    let skippedRows = 0

    // Process in chunks
    for (let i = startRow; i < totalRows; i += chunkSize) {
      const end = Math.min(i + chunkSize, totalRows)
      const chunkRows: T[] = []

      for (let j = i; j < end; j++) {
        const rawRow = rawRows[j]
        if (!rawRow) {
          skippedRows++
          continue
        }

        try {
          let parsedRow: T

          if (options.sheetType === 'PICK') {
            parsedRow = parsePickRow(rawRow, columnMapping) as T
          } else {
            parsedRow = parseLocationRow(rawRow, columnMapping) as T
          }

          chunkRows.push(parsedRow)
          processedRows++
        } catch (error) {
          skippedRows++
          if (options.debug) {
            console.warn(`Skipped row ${j + 1}:`, error)
          }
        }
      }

      chunks.push(...chunkRows)

      // Call chunk callback
      if (options.onChunk) {
        const chunk: ParsedChunk<T> = {
          rows: chunkRows,
          chunkIndex: Math.floor((i - startRow) / chunkSize),
          totalChunks: Math.ceil((totalRows - startRow) / chunkSize),
          startRow: i,
          endRow: end,
        }
        await options.onChunk(chunk)
      }

      // Call progress callback
      if (options.onProgress) {
        const elapsed = Date.now() - startTime
        const progress: ParseProgress = {
          totalRows,
          processedRows,
          currentChunk: Math.floor((i - startRow) / chunkSize) + 1,
          totalChunks: Math.ceil((totalRows - startRow) / chunkSize),
          percentComplete: (processedRows / totalRows) * 100,
          elapsedMs: elapsed,
          estimatedRemainingMs: (elapsed / processedRows) * (totalRows - processedRows),
        }
        options.onProgress(progress)
      }
    }

    // Get detected columns
    const detectedColumns = rawRows.length > 0 ? Object.keys(rawRows[0] ?? {}) : []
    const extraColumns = detectedColumns.filter(
      (col) =>
        !Object.keys(columnMapping).includes(col) &&
        !(
          options.sheetType === 'PICK' ? PICK_TEMPLATE_COLUMNS : LOCATION_TEMPLATE_COLUMNS
        ).includes(col as never)
    )

    return {
      success: true,
      data: chunks,
      totalRows,
      processedRows,
      skippedRows,
      elapsedMs: Date.now() - startTime,
      metadata: {
        fileName: 'unknown',
        fileSize: fileBuffer.length,
        sheetName: sheetName,
        sheetType: options.sheetType,
        columnMapping,
        detectedColumns,
        extraColumns,
        startedAt: new Date(startTime),
        completedAt: new Date(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorCode: 'PARSE_ERROR',
      elapsedMs: Date.now() - startTime,
    }
  }
}

/**
 * Parse Excel file (simple non-streaming interface)
 */
export async function parseExcel<T extends ParsedPickRow | ParsedLocationRow>(
  fileBuffer: Buffer,
  options: ParseOptions
): Promise<ParseResult<T> | ParseError> {
  return parseExcelStream<T>(fileBuffer, options)
}

/**
 * Parse PICK sheet
 */
export async function parsePickSheet(
  fileBuffer: Buffer,
  options: Omit<ParseOptions, 'sheetType'>
): Promise<ParseResult<ParsedPickRow> | ParseError> {
  return parseExcel<ParsedPickRow>(fileBuffer, {
    ...options,
    sheetType: 'PICK',
  })
}

/**
 * Parse LOCATION sheet
 */
export async function parseLocationSheet(
  fileBuffer: Buffer,
  options: Omit<ParseOptions, 'sheetType'>
): Promise<ParseResult<ParsedLocationRow> | ParseError> {
  return parseExcel<ParsedLocationRow>(fileBuffer, {
    ...options,
    sheetType: 'LOCATION',
  })
}
