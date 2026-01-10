'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Trash2,
  FileText,
  Target,
  Lightbulb,
  FileDown,
  Calendar,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'
import {
  exportStrategicAdviceToPDF,
  exportNarrativeReportToPDF,
  exportPostingRecsToPDF,
} from '@/lib/export/ai-reports'
import type { StrategicAdvice, NarrativeReport, PostRecommendation } from '@/lib/ai/types'

const reportTypeConfig = {
  strategic: {
    label: 'Strategic Advice',
    icon: Target,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  report: {
    label: 'Monthly Report',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  recommendations: {
    label: 'Posting Tips',
    icon: Lightbulb,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
}

const platformColors = {
  facebook: 'bg-blue-50 text-blue-700 border-blue-200',
  instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  all: 'bg-gray-50 text-gray-700 border-gray-200',
}

export default function SavedReportsPage() {
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const pageSize = 12

  const { data, isLoading, refetch } = api.aiAnalysis.listSavedReports.useQuery({
    reportType:
      typeFilter === 'all' ? undefined : (typeFilter as 'strategic' | 'report' | 'recommendations'),
    limit: pageSize,
    offset: page * pageSize,
  })

  const deleteMutation = api.aiAnalysis.deleteSavedReport.useMutation({
    onSuccess: () => {
      void refetch()
      setDeleteId(null)
    },
  })

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId })
    }
  }

  const handleExport = (report: NonNullable<typeof data>['reports'][number]) => {
    const platformLabel = report.platform.charAt(0).toUpperCase() + report.platform.slice(1)
    const content = report.content as unknown

    switch (report.reportType) {
      case 'strategic':
        exportStrategicAdviceToPDF(content as StrategicAdvice, {
          filename: `Strategic_Analysis_${report.platform}`,
          title: report.title,
          subtitle: report.focusArea
            ? `Focus: ${report.focusArea.charAt(0).toUpperCase() + report.focusArea.slice(1)}`
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
        const monthName = report.month ? monthNames[report.month - 1] : 'Unknown'
        exportNarrativeReportToPDF(content as NarrativeReport, {
          filename: `Monthly_Report_${monthName}_${report.year}`,
          title: report.title,
          platform: platformLabel,
        })
        break
      }

      case 'recommendations':
        exportPostingRecsToPDF(content as PostRecommendation, {
          filename: `Posting_Tips_${report.platform}`,
          title: report.title,
          subtitle: report.days ? `Based on ${report.days} days of data` : undefined,
          platform: platformLabel,
        })
        break
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/insights/ai">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Saved Reports</h1>
            <p className="text-muted-foreground">{data?.total ?? 0} saved AI analysis reports</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v)
                  setPage(0)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="strategic">Strategic Advice</SelectItem>
                  <SelectItem value="report">Monthly Report</SelectItem>
                  <SelectItem value="recommendations">Posting Tips</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !data?.reports.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No saved reports</h3>
            <p className="mt-1 text-muted-foreground">
              {typeFilter !== 'all'
                ? 'No reports found for this filter. Try a different type.'
                : 'Save an AI analysis report to see it here.'}
            </p>
            <Link href="/admin/insights/ai" className="mt-4 inline-block">
              <Button>Go to AI Analysis</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.reports.map((report) => {
              const config = reportTypeConfig[report.reportType as keyof typeof reportTypeConfig]
              const Icon = config?.icon ?? FileText

              return (
                <Card key={report.id} className="group relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            config?.color
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge variant="outline" className={cn('text-xs', config?.color)}>
                          {config?.label}
                        </Badge>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          platformColors[report.platform as keyof typeof platformColors]
                        )}
                      >
                        {report.platform}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 line-clamp-2 text-base">{report.title}</CardTitle>
                    {report.focusArea && (
                      <CardDescription className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Focus: {report.focusArea}
                      </CardDescription>
                    )}
                    {report.month && report.year && (
                      <CardDescription className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(report.year, report.month - 1).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {report.notes && (
                      <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                        {report.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Saved {formatDate(report.createdAt)}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleExport(report)}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Export PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
