/**
 * AI Report PDF Export Utilities
 * Exports Strategic Advice, Narrative Reports, and Posting Recommendations to PDF
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { StrategicAdvice, NarrativeReport, PostRecommendation } from '@/lib/ai/types'

// ============================================
// Types
// ============================================

export interface AiReportPDFOptions {
  filename: string
  title: string
  subtitle?: string
  platform: string
  generatedAt?: Date
}

// ============================================
// Helper Functions
// ============================================

const BRAND_COLOR: [number, number, number] = [170, 119, 18] // Iconic gold #aa7712

function getGradeColor(grade: string): [number, number, number] {
  switch (grade) {
    case 'A':
      return [34, 197, 94] // Green
    case 'B':
      return [59, 130, 246] // Blue
    case 'C':
      return [251, 191, 36] // Yellow
    case 'D':
      return [249, 115, 22] // Orange
    case 'F':
      return [239, 68, 68] // Red
    default:
      return [107, 114, 128] // Gray
  }
}

function formatDate(date?: Date): string {
  return (date ?? new Date()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function addHeader(doc: jsPDF, title: string, subtitle?: string, platform?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text(title, 14, 20)

  // Platform badge
  if (platform) {
    const platformText = platform.charAt(0).toUpperCase() + platform.slice(1)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(platformText, pageWidth - 14, 20, { align: 'right' })
  }

  let yPos = 28

  // Subtitle
  if (subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(75, 85, 99)
    doc.text(subtitle, 14, yPos)
    yPos += 8
  }

  // Generated date
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text(`Generated: ${formatDate()}`, 14, yPos)

  return yPos + 12
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    doc.setTextColor(...BRAND_COLOR)
    doc.text('Iconic Festival BI Hub', 14, pageHeight - 10)
  }
}

function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text(title, 14, yPos)
  return yPos + 8
}

function addParagraph(doc: jsPDF, text: string, yPos: number, maxWidth: number): number {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(55, 65, 81)
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, 14, yPos)
  return yPos + lines.length * 5 + 5
}

function checkPageBreak(doc: jsPDF, yPos: number, neededSpace: number): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (yPos + neededSpace > pageHeight - 20) {
    doc.addPage()
    return 20
  }
  return yPos
}

// ============================================
// Strategic Advice PDF Export
// ============================================

export function exportStrategicAdviceToPDF(
  advice: StrategicAdvice,
  options: AiReportPDFOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - 28

  let yPos = addHeader(doc, options.title, options.subtitle, options.platform)

  // Performance Grade - Large display
  const gradeColor = getGradeColor(advice.performanceGrade)
  doc.setFillColor(...gradeColor)
  doc.roundedRect(pageWidth - 44, 14, 30, 30, 3, 3, 'F')
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(advice.performanceGrade, pageWidth - 29, 35, { align: 'center' })
  doc.setTextColor(0)

  // Summary
  yPos = addSectionTitle(doc, 'Strategic Summary', yPos)
  yPos = addParagraph(doc, advice.summary, yPos, contentWidth)
  yPos += 5

  // Benchmark Comparison
  if (advice.benchmarkComparison) {
    yPos = checkPageBreak(doc, yPos, 40)
    yPos = addSectionTitle(doc, 'Benchmark Comparison', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Comparison', 'Assessment']],
      body: [
        ['vs Industry', advice.benchmarkComparison.vsIndustry],
        ['vs Previous Period', advice.benchmarkComparison.vsPreviousPeriod],
      ],
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Quick Wins
  if (advice.quickWins?.length) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Quick Wins', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Action', 'Impact', 'Time']],
      body: advice.quickWins.map((w) => [w.action, w.impact, w.timeToImplement]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Top Opportunities
  if (advice.topOpportunities?.length) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addSectionTitle(doc, 'Top Opportunities', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Opportunity', 'Expected Impact', 'Effort']],
      body: advice.topOpportunities.map((o, i) => [
        o.priority ?? i + 1,
        o.title,
        o.expectedImpact,
        o.effort.toUpperCase(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 70 }, 2: { cellWidth: 50 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Risk Assessment
  if (advice.riskAssessment?.length) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Risk Assessment', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Risk', 'Severity', 'Mitigation']],
      body: advice.riskAssessment.map((r) => [r.risk, r.severity.toUpperCase(), r.mitigation]),
      theme: 'striped',
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Growth Projections
  if (advice.growthProjections) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Growth Projections', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Scenario', 'Projection']],
      body: [
        ['Conservative', advice.growthProjections.conservative],
        ['Moderate', advice.growthProjections.moderate],
        ['Aggressive', advice.growthProjections.aggressive],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Key Metrics to Track
  if (advice.keyMetricsToTrack?.length) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Key Metrics to Track', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Current', 'Target', 'Importance']],
      body: advice.keyMetricsToTrack.map((m) => [
        m.metric,
        m.currentValue,
        m.targetValue,
        m.importance,
      ]),
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter(doc)

  const date = new Date().toISOString().split('T')[0]
  doc.save(`${options.filename}_${date}.pdf`)
}

// ============================================
// Narrative Report PDF Export
// ============================================

export function exportNarrativeReportToPDF(
  report: NarrativeReport,
  options: AiReportPDFOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const contentWidth = doc.internal.pageSize.getWidth() - 28
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const monthName = monthNames[report.month - 1] ?? 'Unknown'

  let yPos = addHeader(
    doc,
    options.title,
    `${monthName} ${report.year} • ${options.platform}`,
    options.platform
  )

  // Summary
  yPos = addSectionTitle(doc, 'Executive Summary', yPos)
  yPos = addParagraph(doc, report.summary, yPos, contentWidth)
  yPos += 5

  // Highlights
  if (report.highlights?.length) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Key Highlights', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Highlight', 'Metric', 'Context']],
      body: report.highlights.map((h) => [h.title, h.metric, h.context]),
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Challenges
  if (report.challenges?.length) {
    yPos = checkPageBreak(doc, yPos, 40)
    yPos = addSectionTitle(doc, 'Challenges', yPos)

    report.challenges.forEach((challenge) => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(55, 65, 81)
      doc.text(`• ${challenge}`, 18, yPos)
      yPos += 6
    })
    yPos += 5
  }

  // Recommendations
  if (report.recommendations?.length) {
    yPos = checkPageBreak(doc, yPos, 40)
    yPos = addSectionTitle(doc, 'Recommendations', yPos)

    report.recommendations.forEach((rec) => {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(55, 65, 81)
      doc.text(`• ${rec}`, 18, yPos)
      yPos += 6
    })
    yPos += 5
  }

  // Outlook
  if (report.outlook) {
    yPos = checkPageBreak(doc, yPos, 30)
    yPos = addSectionTitle(doc, 'Outlook', yPos)

    // Outlook box with gradient-like appearance
    doc.setFillColor(254, 243, 199) // Light amber
    doc.roundedRect(14, yPos, contentWidth, 20, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(146, 64, 14)
    const outlookLines = doc.splitTextToSize(report.outlook, contentWidth - 10)
    doc.text(outlookLines, 19, yPos + 7)
  }

  addFooter(doc)

  const date = new Date().toISOString().split('T')[0]
  doc.save(`${options.filename}_${date}.pdf`)
}

// ============================================
// Posting Recommendations PDF Export
// ============================================

export function exportPostingRecsToPDF(
  recs: PostRecommendation,
  options: AiReportPDFOptions
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()

  let yPos = addHeader(doc, options.title, options.subtitle, options.platform)

  // Best Posting Time - Highlight box
  if (recs.bestPostingTime) {
    doc.setFillColor(239, 246, 255) // Light blue
    doc.roundedRect(14, yPos, pageWidth - 28, 25, 2, 2, 'F')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(59, 130, 246)
    doc.text('BEST POSTING TIME', 19, yPos + 8)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    doc.text(
      `${recs.bestPostingTime.dayOfWeek} at ${recs.bestPostingTime.hour}:00 ${recs.bestPostingTime.timezone}`,
      19,
      yPos + 18
    )

    yPos += 32
  }

  // Weekly Schedule
  if (recs.weeklySchedule?.length) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addSectionTitle(doc, 'Weekly Schedule', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Day', 'Posts', 'Best Times', 'Content Type', 'Theme']],
      body: recs.weeklySchedule.map((s) => [
        s.day,
        s.postCount,
        s.bestTimes.map((t) => `${t}:00`).join(', '),
        s.contentType,
        s.theme,
      ]),
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 12 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Content Mix
  if (recs.contentMix?.length) {
    yPos = checkPageBreak(doc, yPos, 50)
    yPos = addSectionTitle(doc, 'Recommended Content Mix', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Type', '%', 'Description']],
      body: recs.contentMix.map((c) => [c.type, `${c.percentage}%`, c.description]),
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 15 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Hashtag Strategy
  if (recs.hashtagStrategy) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addSectionTitle(doc, 'Hashtag Strategy', yPos)

    const hashtagData: [string, string][] = []
    if (recs.hashtagStrategy.branded?.length) {
      hashtagData.push(['Branded', recs.hashtagStrategy.branded.join(' ')])
    }
    if (recs.hashtagStrategy.trending?.length) {
      hashtagData.push(['Trending', recs.hashtagStrategy.trending.join(' ')])
    }
    if (recs.hashtagStrategy.niche?.length) {
      hashtagData.push(['Niche', recs.hashtagStrategy.niche.join(' ')])
    }
    if (recs.hashtagStrategy.community?.length) {
      hashtagData.push(['Community', recs.hashtagStrategy.community.join(' ')])
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Category', 'Hashtags']],
      body: hashtagData,
      theme: 'striped',
      headStyles: { fillColor: [236, 72, 153], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 4 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 30 } },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 5

    if (recs.hashtagStrategy.usage) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      const usageLines = doc.splitTextToSize(recs.hashtagStrategy.usage, pageWidth - 28)
      doc.text(usageLines, 14, yPos + 5)
      yPos += usageLines.length * 4 + 10
    }
  }

  // Platform Tips
  if (recs.platformSpecificTips?.length) {
    yPos = checkPageBreak(doc, yPos, 60)
    yPos = addSectionTitle(doc, 'Platform Tips', yPos)

    autoTable(doc, {
      startY: yPos,
      head: [['Tip', 'Impact', 'Category']],
      body: recs.platformSpecificTips
        .slice(0, 10)
        .map((t) => [t.tip, t.impact.toUpperCase(), t.category]),
      theme: 'striped',
      headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
      styles: { fontSize: 8, cellPadding: 3 },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 20 }, 2: { cellWidth: 25 } },
    })
  }

  addFooter(doc)

  const date = new Date().toISOString().split('T')[0]
  doc.save(`${options.filename}_${date}.pdf`)
}
