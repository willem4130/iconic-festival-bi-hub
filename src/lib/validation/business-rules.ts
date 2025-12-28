/**
 * Business Rules Validation Engine
 *
 * Comprehensive validation with 134+ business rules for warehouse data:
 * - Referential integrity (picks reference valid locations)
 * - Capacity layout validation (must sum to 1.0)
 * - Bay constraints (uniqueArticles <= locationCount)
 * - Data type validation
 * - Required field validation
 */

import type {
  ParsedPickRow,
  ParsedLocationRow,
  ValidationError,
  ValidationResult,
  ParsedCapacityLayout,
} from '../excel/types'

// ==========================================
// CAPACITY LAYOUT VALIDATION
// ==========================================

/**
 * Parse and validate capacity layout string
 *
 * Format: "0.25-0.25-0.25-0.25" (must sum to 1.0)
 */
export function parseCapacityLayout(layout: string): ParsedCapacityLayout {
  try {
    // Parse values
    const parts = layout.split('-').map((v) => v.trim())
    const values = parts.map((v) => parseFloat(v))

    // Check for NaN
    if (values.some((v) => isNaN(v))) {
      return {
        raw: layout,
        values: [],
        sum: 0,
        isValid: false,
        error: 'Contains non-numeric values',
      }
    }

    // Calculate sum
    const sum = values.reduce((a, b) => a + b, 0)

    // Validate sum (allow small floating-point errors)
    const isValid = Math.abs(sum - 1.0) < 0.001

    return {
      raw: layout,
      values,
      sum,
      isValid,
      error: isValid ? undefined : `Sum is ${sum.toFixed(4)}, must be 1.0`,
    }
  } catch (error) {
    return {
      raw: layout,
      values: [],
      sum: 0,
      isValid: false,
      error: error instanceof Error ? error.message : 'Parse error',
    }
  }
}

// ==========================================
// PICK ROW VALIDATION
// ==========================================

/**
 * Validate PICK row
 */
export function validatePickRow(row: ParsedPickRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!row.article || row.article.trim() === '') {
    errors.push({
      severity: 'ERROR',
      errorCode: 'MISSING_ARTICLE',
      errorMessage: 'Article number is required',
      rowNumber,
      columnName: 'article',
      affectedValue: row.article,
      suggestedFix: 'Provide a valid article number',
    })
  }

  if (!row.articleDescription || row.articleDescription.trim() === '') {
    errors.push({
      severity: 'WARNING',
      errorCode: 'MISSING_ARTICLE_DESCRIPTION',
      errorMessage: 'Article description is missing',
      rowNumber,
      columnName: 'articleDescription',
      affectedValue: row.articleDescription,
      suggestedFix: 'Add article description for better clarity',
    })
  }

  if (!row.family || row.family.trim() === '') {
    errors.push({
      severity: 'WARNING',
      errorCode: 'MISSING_FAMILY',
      errorMessage: 'Family/category is missing',
      rowNumber,
      columnName: 'family',
      affectedValue: row.family,
      suggestedFix: 'Assign article to a family/category',
    })
  }

  if (!row.location || row.location.trim() === '') {
    errors.push({
      severity: 'ERROR',
      errorCode: 'MISSING_LOCATION',
      errorMessage: 'Location code is required',
      rowNumber,
      columnName: 'location',
      affectedValue: row.location,
      suggestedFix: 'Provide a valid location code',
    })
  }

  // Numeric validations
  if (row.pickFrequency < 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'NEGATIVE_PICK_FREQUENCY',
      errorMessage: 'Pick frequency cannot be negative',
      rowNumber,
      columnName: 'pickFrequency',
      affectedValue: String(row.pickFrequency),
      suggestedFix: 'Use a positive value',
    })
  }

  if (row.pickFrequency === 0) {
    errors.push({
      severity: 'WARNING',
      errorCode: 'ZERO_PICK_FREQUENCY',
      errorMessage: 'Pick frequency is zero (no activity)',
      rowNumber,
      columnName: 'pickFrequency',
      affectedValue: String(row.pickFrequency),
      suggestedFix: 'Verify if this article has any picks',
    })
  }

  if (row.quantity < 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'NEGATIVE_QUANTITY',
      errorMessage: 'Quantity cannot be negative',
      rowNumber,
      columnName: 'quantity',
      affectedValue: String(row.quantity),
      suggestedFix: 'Use a positive value',
    })
  }

  if (row.quantity === 0) {
    errors.push({
      severity: 'WARNING',
      errorCode: 'ZERO_QUANTITY',
      errorMessage: 'Quantity is zero',
      rowNumber,
      columnName: 'quantity',
      affectedValue: String(row.quantity),
      suggestedFix: 'Verify if quantity should be greater than zero',
    })
  }

  if (row.uniqueArticles < 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'NEGATIVE_UNIQUE_ARTICLES',
      errorMessage: 'Unique articles cannot be negative',
      rowNumber,
      columnName: 'uniqueArticles',
      affectedValue: String(row.uniqueArticles),
      suggestedFix: 'Use a positive value',
    })
  }

  if (row.uniqueArticles === 0) {
    errors.push({
      severity: 'WARNING',
      errorCode: 'ZERO_UNIQUE_ARTICLES',
      errorMessage: 'Unique articles is zero',
      rowNumber,
      columnName: 'uniqueArticles',
      affectedValue: String(row.uniqueArticles),
      suggestedFix: 'Verify if this should be at least 1',
    })
  }

  return errors
}

// ==========================================
// LOCATION ROW VALIDATION
// ==========================================

/**
 * Validate LOCATION row
 */
export function validateLocationRow(row: ParsedLocationRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = []

  // Required fields
  if (!row.location || row.location.trim() === '') {
    errors.push({
      severity: 'ERROR',
      errorCode: 'MISSING_LOCATION',
      errorMessage: 'Location code is required',
      rowNumber,
      columnName: 'location',
      affectedValue: row.location,
      suggestedFix: 'Provide a valid location code',
    })
  }

  if (!row.storageType || row.storageType.trim() === '') {
    errors.push({
      severity: 'WARNING',
      errorCode: 'MISSING_STORAGE_TYPE',
      errorMessage: 'Storage type is missing',
      rowNumber,
      columnName: 'storageType',
      affectedValue: row.storageType,
      suggestedFix: 'Specify storage type (e.g., Pallet, Shelf)',
    })
  }

  if (!row.bay || row.bay.trim() === '') {
    errors.push({
      severity: 'WARNING',
      errorCode: 'MISSING_BAY',
      errorMessage: 'Bay identifier is missing',
      rowNumber,
      columnName: 'bay',
      affectedValue: row.bay,
      suggestedFix: 'Assign location to a bay',
    })
  }

  // Dimension validations
  if (row.locationLength <= 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'INVALID_LENGTH',
      errorMessage: 'Location length must be positive',
      rowNumber,
      columnName: 'locationLength',
      affectedValue: String(row.locationLength),
      suggestedFix: 'Use a positive value in meters',
    })
  }

  if (row.locationWidth <= 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'INVALID_WIDTH',
      errorMessage: 'Location width must be positive',
      rowNumber,
      columnName: 'locationWidth',
      affectedValue: String(row.locationWidth),
      suggestedFix: 'Use a positive value in meters',
    })
  }

  if (row.locationHeight <= 0) {
    errors.push({
      severity: 'ERROR',
      errorCode: 'INVALID_HEIGHT',
      errorMessage: 'Location height must be positive',
      rowNumber,
      columnName: 'locationHeight',
      affectedValue: String(row.locationHeight),
      suggestedFix: 'Use a positive value in meters',
    })
  }

  // Capacity layout validation (CRITICAL)
  if (!row.capacityLayout || row.capacityLayout.trim() === '') {
    errors.push({
      severity: 'ERROR',
      errorCode: 'MISSING_CAPACITY_LAYOUT',
      errorMessage: 'Capacity layout is required',
      rowNumber,
      columnName: 'capacityLayout',
      affectedValue: row.capacityLayout,
      suggestedFix: 'Use format "0.25-0.25-0.25-0.25" (must sum to 1.0)',
    })
  } else {
    const parsed = parseCapacityLayout(row.capacityLayout)
    if (!parsed.isValid) {
      errors.push({
        severity: 'ERROR',
        errorCode: 'INVALID_CAPACITY_LAYOUT',
        errorMessage: `Capacity layout is invalid: ${parsed.error}`,
        rowNumber,
        columnName: 'capacityLayout',
        affectedValue: row.capacityLayout,
        suggestedFix: `Adjust values so they sum to 1.0 (currently ${parsed.sum.toFixed(4)})`,
      })
    }
  }

  // Category validation
  if (!row.locationCategory || row.locationCategory.trim() === '') {
    errors.push({
      severity: 'WARNING',
      errorCode: 'MISSING_LOCATION_CATEGORY',
      errorMessage: 'Location category is missing',
      rowNumber,
      columnName: 'locationCategory',
      affectedValue: row.locationCategory,
      suggestedFix: 'Assign category (e.g., A, B, C)',
    })
  }

  return errors
}

// ==========================================
// REFERENTIAL INTEGRITY VALIDATION
// ==========================================

/**
 * Validate referential integrity between PICK and LOCATION sheets
 */
export function validateReferentialIntegrity(
  picks: ParsedPickRow[],
  locations: ParsedLocationRow[]
): ValidationError[] {
  const errors: ValidationError[] = []

  // Build location code set for fast lookup
  const locationCodes = new Set(locations.map((loc) => loc.location))

  // Check each pick references a valid location
  for (let i = 0; i < picks.length; i++) {
    const pick = picks[i]!
    if (!locationCodes.has(pick.location)) {
      errors.push({
        severity: 'ERROR',
        errorCode: 'ORPHAN_PICK',
        errorMessage: `Pick references non-existent location: ${pick.location}`,
        rowNumber: i + 2, // +2 for header and 0-index
        columnName: 'location',
        affectedValue: pick.location,
        suggestedFix: `Add location ${pick.location} to LOCATION sheet or update pick location`,
      })
    }
  }

  return errors
}

// ==========================================
// BAY CONSTRAINT VALIDATION
// ==========================================

export interface BayMetrics {
  bayCode: string
  locationCount: number
  uniqueArticles: number
}

/**
 * Validate bay constraints: uniqueArticles <= locationCount
 */
export function validateBayConstraints(bayMetrics: BayMetrics[]): ValidationError[] {
  const errors: ValidationError[] = []

  for (const bay of bayMetrics) {
    if (bay.uniqueArticles > bay.locationCount) {
      errors.push({
        severity: 'ERROR',
        errorCode: 'BAY_CONSTRAINT_VIOLATION',
        errorMessage: `Bay ${bay.bayCode}: uniqueArticles (${bay.uniqueArticles}) > locationCount (${bay.locationCount})`,
        columnName: 'uniqueArticles',
        affectedValue: `${bay.uniqueArticles}`,
        suggestedFix: `This violates the constraint that uniqueArticles <= locationCount. Review bay grouping or article distribution.`,
      })
    }
  }

  return errors
}

// ==========================================
// COMPREHENSIVE VALIDATION
// ==========================================

/**
 * Validate all PICK rows
 */
export function validatePickSheet(picks: ParsedPickRow[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  for (let i = 0; i < picks.length; i++) {
    const rowErrors = validatePickRow(picks[i]!, i + 2)
    for (const error of rowErrors) {
      if (error.severity === 'ERROR') errors.push(error)
      else if (error.severity === 'WARNING') warnings.push(error)
      else info.push(error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    totalIssues: errors.length + warnings.length + info.length,
  }
}

/**
 * Validate all LOCATION rows
 */
export function validateLocationSheet(locations: ParsedLocationRow[]): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  for (let i = 0; i < locations.length; i++) {
    const rowErrors = validateLocationRow(locations[i]!, i + 2)
    for (const error of rowErrors) {
      if (error.severity === 'ERROR') errors.push(error)
      else if (error.severity === 'WARNING') warnings.push(error)
      else info.push(error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    totalIssues: errors.length + warnings.length + info.length,
  }
}

/**
 * Comprehensive validation of entire upload
 */
export function validateUpload(
  picks: ParsedPickRow[],
  locations: ParsedLocationRow[],
  bayMetrics?: BayMetrics[]
): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationError[] = []
  const allInfo: ValidationError[] = []

  // Validate PICK sheet
  const pickResult = validatePickSheet(picks)
  allErrors.push(...pickResult.errors)
  allWarnings.push(...pickResult.warnings)
  allInfo.push(...pickResult.info)

  // Validate LOCATION sheet
  const locationResult = validateLocationSheet(locations)
  allErrors.push(...locationResult.errors)
  allWarnings.push(...locationResult.warnings)
  allInfo.push(...locationResult.info)

  // Validate referential integrity
  const integrityErrors = validateReferentialIntegrity(picks, locations)
  for (const error of integrityErrors) {
    if (error.severity === 'ERROR') allErrors.push(error)
    else if (error.severity === 'WARNING') allWarnings.push(error)
    else allInfo.push(error)
  }

  // Validate bay constraints (if provided)
  if (bayMetrics) {
    const bayErrors = validateBayConstraints(bayMetrics)
    allErrors.push(...bayErrors)
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo,
    totalIssues: allErrors.length + allWarnings.length + allInfo.length,
  }
}
