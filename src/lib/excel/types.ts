/**
 * Excel Processing Type Definitions
 *
 * Type definitions for the warehouse pick optimizer Excel parsing system.
 * Supports streaming large files (10K-1M rows) with memory optimization.
 */

// ==========================================
// TEMPLATE SCHEMA TYPES
// ==========================================

/**
 * PICK sheet template (7 required columns)
 */
export interface PickRow {
  article: string
  articleDescription: string
  family: string
  pickFrequency: number
  location: string
  quantity: number
  uniqueArticles: number
}

/**
 * LOCATION sheet template (8 required columns)
 */
export interface LocationRow {
  location: string
  storageType: string
  locationLength: number
  locationWidth: number
  locationHeight: number
  capacityLayout: string // Format: "0.25-0.25-0.25-0.25" (must sum to 1.0)
  locationCategory: string
  bay: string
}

/**
 * Extra dimensions beyond template requirements
 */
export interface ExtraDimension {
  name: string
  value: string
  dataType: 'string' | 'number' | 'date' | 'boolean'
}

// ==========================================
// PARSING TYPES
// ==========================================

/**
 * Raw Excel row (before mapping)
 */
export type RawRow = Record<string, string | number | boolean | Date | null>

/**
 * Parsed Excel row with extra dimensions
 */
export interface ParsedPickRow extends PickRow {
  extraDimensions?: ExtraDimension[]
}

export interface ParsedLocationRow extends LocationRow {
  extraDimensions?: ExtraDimension[]
}

/**
 * Sheet type identifier
 */
export type SheetType = 'PICK' | 'LOCATION'

/**
 * Excel parsing options
 */
export interface ParseOptions {
  /** Sheet name or index to parse */
  sheet?: string | number
  /** Sheet type (PICK or LOCATION) */
  sheetType: SheetType
  /** Column mapping configuration */
  columnMapping?: ColumnMapping
  /** Maximum rows to parse (0 = unlimited) */
  maxRows?: number
  /** Start row index (0-based, default: 1 to skip header) */
  startRow?: number
  /** Chunk size for streaming (default: 10000) */
  chunkSize?: number
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Column mapping (client column name -> template column name)
 */
export type ColumnMapping = Record<string, string>

/**
 * Detected column mapping with confidence score
 */
export interface DetectedMapping {
  clientColumn: string
  templateColumn: string
  confidence: number // 0.0 - 1.0
  reason: string
}

/**
 * Auto-detection result
 */
export interface AutoDetectionResult {
  sheetType: SheetType
  mappings: DetectedMapping[]
  unmappedColumns: string[] // Client columns not mapped
  missingColumns: string[] // Required template columns not found
  confidence: number // Overall confidence (0.0 - 1.0)
}

// ==========================================
// PARSING RESULT TYPES
// ==========================================

/**
 * Chunk of parsed rows
 */
export interface ParsedChunk<T = ParsedPickRow | ParsedLocationRow> {
  rows: T[]
  chunkIndex: number
  totalChunks: number
  startRow: number
  endRow: number
}

/**
 * Parsing progress update
 */
export interface ParseProgress {
  totalRows: number
  processedRows: number
  currentChunk: number
  totalChunks: number
  percentComplete: number
  elapsedMs: number
  estimatedRemainingMs: number
}

/**
 * Parsing result (success)
 */
export interface ParseResult<T = ParsedPickRow | ParsedLocationRow> {
  success: true
  data: T[]
  totalRows: number
  processedRows: number
  skippedRows: number
  elapsedMs: number
  metadata: ParseMetadata
}

/**
 * Parsing result (error)
 */
export interface ParseError {
  success: false
  error: string
  errorCode: string
  rowNumber?: number
  columnName?: string
  elapsedMs: number
}

/**
 * Parsing metadata
 */
export interface ParseMetadata {
  fileName: string
  fileSize: number
  sheetName: string
  sheetType: SheetType
  columnMapping: ColumnMapping
  detectedColumns: string[]
  extraColumns: string[]
  startedAt: Date
  completedAt: Date
}

// ==========================================
// VALIDATION TYPES
// ==========================================

/**
 * Validation error
 */
export interface ValidationError {
  severity: 'ERROR' | 'WARNING' | 'INFO'
  errorCode: string
  errorMessage: string
  rowNumber?: number
  columnName?: string
  affectedValue?: string
  suggestedFix?: string
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  totalIssues: number
}

// ==========================================
// CAPACITY LAYOUT TYPES
// ==========================================

/**
 * Parsed capacity layout
 */
export interface ParsedCapacityLayout {
  raw: string // Original string (e.g., "0.25-0.25-0.25-0.25")
  values: number[] // Parsed array [0.25, 0.25, 0.25, 0.25]
  sum: number // Sum of values (must be 1.0)
  isValid: boolean // true if sum = 1.0
  error?: string // Error message if invalid
}

// ==========================================
// STREAMING TYPES
// ==========================================

/**
 * Stream processor callback
 */
export type StreamCallback<T> = (chunk: ParsedChunk<T>) => Promise<void> | void

/**
 * Progress callback
 */
export type ProgressCallback = (progress: ParseProgress) => void

/**
 * Streaming parse options
 */
export interface StreamParseOptions extends ParseOptions {
  /** Callback for each chunk */
  onChunk?: StreamCallback<ParsedPickRow | ParsedLocationRow>
  /** Callback for progress updates */
  onProgress?: ProgressCallback
  /** Memory limit in MB (default: 512) */
  memoryLimitMB?: number
}

// ==========================================
// EXCEL FILE TYPES
// ==========================================

/**
 * Excel file metadata
 */
export interface ExcelFileMetadata {
  fileName: string
  fileSize: number
  mimeType: string
  sheetNames: string[]
  estimatedRows: number
  createdAt?: Date
  modifiedAt?: Date
}

/**
 * Excel workbook (minimal interface)
 */
export interface ExcelWorkbook {
  SheetNames: string[]
  Sheets: Record<string, unknown>
}

// ==========================================
// EXPORT TYPES
// ==========================================

/**
 * Export options
 */
export interface ExportOptions {
  /** Include extra dimensions */
  includeExtraDimensions?: boolean
  /** Sheet name for export */
  sheetName?: string
  /** File format */
  format?: 'xlsx' | 'csv'
  /** Include validation errors sheet */
  includeValidationSheet?: boolean
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean
  fileName: string
  fileSize: number
  downloadUrl?: string
  error?: string
}
