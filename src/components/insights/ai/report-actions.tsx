'use client'

import { useState } from 'react'
import { Save, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaveReportDialog } from './save-report-dialog'
import {
  exportStrategicAdviceToPDF,
  exportNarrativeReportToPDF,
  exportPostingRecsToPDF,
} from '@/lib/export/ai-reports'
import type { StrategicAdvice, NarrativeReport, PostRecommendation } from '@/lib/ai/types'

type ReportType = 'strategic' | 'report' | 'recommendations'

interface ReportActionsProps {
  reportType: ReportType
  platform: 'facebook' | 'instagram' | 'all'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any // StrategicAdvice | NarrativeReport | PostRecommendation
  // For strategic
  focusArea?: 'growth' | 'engagement' | 'reach'
  // For report
  month?: number
  year?: number
  // For recommendations
  days?: number
  // Save handler
  onSave: (params: {
    title: string
    notes?: string
    reportType: ReportType
    platform: 'facebook' | 'instagram' | 'all'
    focusArea?: 'growth' | 'engagement' | 'reach'
    month?: number
    year?: number
    days?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: any
  }) => Promise<void>
  disabled?: boolean
}

export function ReportActions({
  reportType,
  platform,
  data,
  focusArea,
  month,
  year,
  days,
  onSave,
  disabled,
}: ReportActionsProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const getDefaultTitle = () => {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1)

    switch (reportType) {
      case 'strategic':
        return `Strategic Analysis - ${platformLabel} - ${date}`
      case 'report': {
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ]
        const monthName = month ? monthNames[month - 1] : 'Unknown'
        return `Monthly Report - ${monthName} ${year}`
      }
      case 'recommendations':
        return `Posting Tips - ${platformLabel} - ${date}`
    }
  }

  const handleExportPDF = () => {
    setExporting(true)
    try {
      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1)

      switch (reportType) {
        case 'strategic':
          exportStrategicAdviceToPDF(data as StrategicAdvice, {
            filename: `Strategic_Analysis_${platform}`,
            title: 'Strategic Analysis',
            subtitle: focusArea
              ? `Focus: ${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)}`
              : undefined,
            platform: platformLabel,
          })
          break

        case 'report': {
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
          const monthName = month ? monthNames[month - 1] : 'Unknown'
          exportNarrativeReportToPDF(data as NarrativeReport, {
            filename: `Monthly_Report_${monthName}_${year}`,
            title: 'Monthly Performance Report',
            subtitle: `${monthName} ${year}`,
            platform: platformLabel,
          })
          break
        }

        case 'recommendations':
          exportPostingRecsToPDF(data as PostRecommendation, {
            filename: `Posting_Tips_${platform}`,
            title: 'Posting Recommendations',
            subtitle: days ? `Based on ${days} days of data` : undefined,
            platform: platformLabel,
          })
          break
      }
    } finally {
      setExporting(false)
    }
  }

  const handleSave = async (title: string, notes?: string) => {
    await onSave({
      title,
      notes,
      reportType,
      platform,
      focusArea,
      month,
      year,
      days,
      content: data,
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={disabled}
        >
          <Save className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={disabled || exporting}
        >
          <FileDown className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>

      <SaveReportDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSave}
        defaultTitle={getDefaultTitle()}
        reportType={reportType}
      />
    </>
  )
}
