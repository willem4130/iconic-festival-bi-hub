/**
 * Export utilities for PDF and Excel
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================
// Excel Export
// ============================================

export interface ExcelExportOptions {
  filename: string
  sheetName?: string
  headerStyle?: boolean
}

/**
 * Export data to Excel file
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExcelExportOptions
): void {
  const { filename, sheetName = 'Sheet1' } = options

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const maxWidth = 50
  const colWidths: { wch: number }[] = []

  if (data.length > 0) {
    const firstRow = data[0]!
    const keys = Object.keys(firstRow)

    keys.forEach((key, i) => {
      const headerWidth = key.length
      const maxCellWidth = Math.max(
        ...data.map((row) => {
          const value = row[key]
          return String(value ?? '').length
        })
      )
      colWidths[i] = { wch: Math.min(Math.max(headerWidth, maxCellWidth) + 2, maxWidth) }
    })

    worksheet['!cols'] = colWidths
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0]
  const fullFilename = `${filename}_${date}.xlsx`

  // Trigger download
  XLSX.writeFile(workbook, fullFilename)
}

/**
 * Export multiple sheets to Excel
 */
export function exportMultiSheetExcel(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
  filename: string
): void {
  const workbook = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31)) // Excel sheet name limit
  }

  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `${filename}_${date}.xlsx`)
}

// ============================================
// PDF Export
// ============================================

export interface PDFExportOptions {
  filename: string
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
}

export interface PDFTableData {
  headers: string[]
  rows: (string | number)[][]
}

/**
 * Export data to PDF with tables
 */
export function exportToPDF(
  tables: Array<{ title: string; data: PDFTableData }>,
  options: PDFExportOptions
): void {
  const { filename, title, subtitle, orientation = 'portrait' } = options

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageWidth / 2, 20, { align: 'center' })

  // Subtitle
  if (subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' })
  }

  // Date
  doc.setFontSize(10)
  doc.setTextColor(128)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, subtitle ? 36 : 28, {
    align: 'center',
  })
  doc.setTextColor(0)

  let yPosition = subtitle ? 45 : 38

  // Add tables
  for (const table of tables) {
    // Table title
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(table.title, 14, yPosition)
    yPosition += 5

    autoTable(doc, {
      startY: yPosition,
      head: [table.data.headers],
      body: table.data.rows.map((row) => row.map((cell) => String(cell))),
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: 14, right: 14 },
    })

    // Update yPosition after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
      align: 'center',
    })
    doc.text('Iconic Festival BI Hub', 14, doc.internal.pageSize.getHeight() - 10)
  }

  // Download
  const date = new Date().toISOString().split('T')[0]
  doc.save(`${filename}_${date}.pdf`)
}

/**
 * Export KPIs summary to PDF
 */
export function exportKPIsToPDF(
  kpis: Array<{ label: string; value: string | number; change?: string }>,
  options: PDFExportOptions
): void {
  const doc = new jsPDF({
    orientation: options.orientation ?? 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(options.title, pageWidth / 2, 20, { align: 'center' })

  if (options.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(options.subtitle, pageWidth / 2, 28, { align: 'center' })
  }

  // Date
  doc.setFontSize(10)
  doc.setTextColor(128)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, options.subtitle ? 36 : 28, {
    align: 'center',
  })
  doc.setTextColor(0)

  // KPIs grid
  const cardWidth = (pageWidth - 40) / 2
  const cardHeight = 30
  let x = 14
  let y = options.subtitle ? 50 : 42

  kpis.forEach((kpi, index) => {
    // Card background
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F')

    // Label
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.text(kpi.label, x + 5, y + 10)

    // Value
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(String(kpi.value), x + 5, y + 22)

    // Change indicator
    if (kpi.change) {
      doc.setFontSize(9)
      const isPositive = kpi.change.startsWith('+')
      doc.setTextColor(isPositive ? 34 : 239, isPositive ? 197 : 68, isPositive ? 94 : 68)
      doc.text(kpi.change, x + cardWidth - 10, y + 22, { align: 'right' })
    }

    doc.setFont('helvetica', 'normal')

    // Move to next position
    if ((index + 1) % 2 === 0) {
      x = 14
      y += cardHeight + 8
    } else {
      x += cardWidth + 12
    }
  })

  // Download
  const date = new Date().toISOString().split('T')[0]
  doc.save(`${options.filename}_${date}.pdf`)
}
