'use client'

import Link from 'next/link'
import { History, Trash2, FileText, Target, Lightbulb, ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'

interface SavedReportsSheetProps {
  children?: React.ReactNode
}

const reportTypeConfig = {
  strategic: {
    label: 'Strategic',
    icon: Target,
    color: 'bg-amber-100 text-amber-800',
  },
  report: {
    label: 'Monthly',
    icon: FileText,
    color: 'bg-blue-100 text-blue-800',
  },
  recommendations: {
    label: 'Tips',
    icon: Lightbulb,
    color: 'bg-purple-100 text-purple-800',
  },
}

const platformColors = {
  facebook: 'bg-blue-50 text-blue-700',
  instagram: 'bg-pink-50 text-pink-700',
  all: 'bg-gray-50 text-gray-700',
}

export function SavedReportsSheet({ children }: SavedReportsSheetProps) {
  const { data, isLoading, refetch } = api.aiAnalysis.listSavedReports.useQuery({
    limit: 10,
  })

  const deleteMutation = api.aiAnalysis.deleteSavedReport.useMutation({
    onSuccess: () => {
      void refetch()
    },
  })

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this report?')) {
      deleteMutation.mutate({ id })
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm">
            <History className="mr-2 h-4 w-4" />
            Saved Reports
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Saved Reports
          </SheetTitle>
          <SheetDescription>Your recently saved AI analysis reports</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !data?.reports.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
              <p>No saved reports yet</p>
              <p className="text-sm">Save an analysis to see it here</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="space-y-3 pr-4">
                  {data.reports.map((report) => {
                    const config =
                      reportTypeConfig[report.reportType as keyof typeof reportTypeConfig]
                    const Icon = config?.icon ?? FileText

                    return (
                      <div
                        key={report.id}
                        className="group relative rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <h4 className="font-medium text-sm truncate">{report.title}</h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <Badge variant="secondary" className={cn('text-xs', config?.color)}>
                                {config?.label}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  platformColors[report.platform as keyof typeof platformColors]
                                )}
                              >
                                {report.platform}
                              </Badge>
                              {report.focusArea && (
                                <Badge variant="outline" className="text-xs">
                                  {report.focusArea}
                                </Badge>
                              )}
                            </div>

                            {report.notes && (
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                                {report.notes}
                              </p>
                            )}

                            <p className="mt-2 text-xs text-muted-foreground">
                              {formatDate(report.createdAt)}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(report.id, e)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {data.total > 10 && (
                <div className="mt-4 pt-4 border-t">
                  <Link href="/admin/insights/ai/saved">
                    <Button variant="outline" className="w-full">
                      View All {data.total} Reports
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
