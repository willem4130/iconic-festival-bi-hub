'use client'

import { useMemo, useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Facebook,
  Instagram,
  Image,
  Video,
  FileText,
  Heart,
  Eye,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

const MONTHS = [
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

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ContentItem = {
  id: string
  contentType: string
  message: string | null
  mediaUrl: string | null
  thumbnailUrl: string | null
  platform: string
  publishedAt: Date
  reach: number | null
  engagement: number
}

type CalendarDay = {
  date: string
  items: ContentItem[]
  count: number
  totalEngagement: number
}

export default function ContentCalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [platform, setPlatform] = useState<'FACEBOOK' | 'INSTAGRAM' | undefined>(undefined)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  // Use OAuth connection status
  const { data: oauthStatus } = api.metaAuth.getConnectionStatus.useQuery()
  const isConnected = oauthStatus?.connected ?? false

  const { data, isLoading } = api.metaInsights.getContentCalendar.useQuery(
    {
      year,
      month,
      platform,
    },
    { enabled: isConnected }
  )

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay()

    // Create map of content by date
    const contentMap = new Map<string, CalendarDay>()
    if (data?.calendar) {
      for (const day of data.calendar) {
        contentMap.set(day.date, day)
      }
    }

    const weeks: Array<Array<{ day: number; date: string; content: CalendarDay | null } | null>> =
      []
    let currentWeek: Array<{ day: number; date: string; content: CalendarDay | null } | null> = []

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      currentWeek.push({
        day,
        date: dateStr,
        content: contentMap.get(dateStr) ?? null,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    }

    // Fill remaining days of last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    return weeks
  }, [year, month, data])

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear(year - 1)
    } else {
      setMonth(month - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear(year + 1)
    } else {
      setMonth(month + 1)
    }
  }

  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth() + 1)
  }

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'PHOTO':
      case 'IMAGE':
        return <Image className="h-3 w-3" />
      case 'VIDEO':
      case 'REEL':
        return <Video className="h-3 w-3" />
      default:
        return <FileText className="h-3 w-3" />
    }
  }

  const isToday = (dateStr: string) => {
    const todayStr = today.toISOString().split('T')[0]
    return dateStr === todayStr
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Insights
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <p className="text-gray-500">View published content by date</p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Meta API Not Connected</h3>
              <p className="text-sm text-amber-700">
                Connect your Facebook and Instagram accounts to view the content calendar.
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/settings/connections">Configure Connection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/insights">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Insights
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Content Calendar</h1>
            <p className="text-gray-500">View published content by date</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={platform ?? 'all'}
            onValueChange={(v) =>
              setPlatform(v === 'all' ? undefined : (v as 'FACEBOOK' | 'INSTAGRAM'))
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="FACEBOOK">Facebook</SelectItem>
              <SelectItem value="INSTAGRAM">Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-primary/10 p-3">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Posts</p>
              <p className="text-2xl font-bold">{data?.totalPosts ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-[#1877F2]/10 p-3">
              <Facebook className="h-5 w-5 text-[#1877F2]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Facebook Posts</p>
              <p className="text-2xl font-bold">{data?.facebookPosts ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="rounded-full bg-[#E1306C]/10 p-3">
              <Instagram className="h-5 w-5 text-[#E1306C]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Instagram Posts</p>
              <p className="text-2xl font-bold">{data?.instagramPosts ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">
                {MONTHS[month - 1]} {year}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          <CardDescription>Click on a day to view content details</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Days of week header */}
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {DAYS_OF_WEEK.map((day) => (
                  <div
                    key={day}
                    className="p-3 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {calendarGrid.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 border-b last:border-0">
                  {week.map((dayCell, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`min-h-[100px] border-r last:border-0 p-2 ${
                        dayCell ? 'hover:bg-muted/50 cursor-pointer' : 'bg-muted/20'
                      } ${dayCell && isToday(dayCell.date) ? 'bg-primary/5' : ''}`}
                      onClick={() => dayCell?.content && setSelectedDay(dayCell.content)}
                    >
                      {dayCell && (
                        <>
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isToday(dayCell.date) ? 'text-primary' : ''
                            }`}
                          >
                            {dayCell.day}
                          </div>
                          {dayCell.content && (
                            <div className="space-y-1">
                              {dayCell.content.items.slice(0, 3).map((item, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                                    item.platform === 'FACEBOOK'
                                      ? 'bg-[#1877F2]/10 text-[#1877F2]'
                                      : 'bg-[#E1306C]/10 text-[#E1306C]'
                                  }`}
                                >
                                  {item.platform === 'FACEBOOK' ? (
                                    <Facebook className="h-3 w-3" />
                                  ) : (
                                    <Instagram className="h-3 w-3" />
                                  )}
                                  {getContentIcon(item.contentType)}
                                </div>
                              ))}
                              {dayCell.content.items.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{dayCell.content.items.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Content for{' '}
              {selectedDay &&
                new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
            </DialogTitle>
            <DialogDescription>
              {selectedDay?.count} post{selectedDay?.count !== 1 ? 's' : ''} published
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedDay?.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    {(item.thumbnailUrl ?? item.mediaUrl) && (
                      <div className="flex-shrink-0">
                        <img
                          src={item.thumbnailUrl ?? item.mediaUrl ?? ''}
                          alt=""
                          className="h-20 w-20 object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Platform & Type */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={
                            item.platform === 'FACEBOOK'
                              ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20'
                              : 'bg-[#E1306C]/10 text-[#E1306C] border-[#E1306C]/20'
                          }
                        >
                          {item.platform === 'FACEBOOK' ? (
                            <Facebook className="h-3 w-3 mr-1" />
                          ) : (
                            <Instagram className="h-3 w-3 mr-1" />
                          )}
                          {item.platform}
                        </Badge>
                        <Badge variant="secondary">
                          {getContentIcon(item.contentType)}
                          <span className="ml-1">{item.contentType}</span>
                        </Badge>
                      </div>

                      {/* Message/Caption */}
                      {item.message && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.message}
                        </p>
                      )}

                      {/* Metrics */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {item.reach !== null && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {item.reach.toLocaleString()} reach
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {item.engagement.toLocaleString()} engagement
                        </span>
                        <span>
                          {new Date(item.publishedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
