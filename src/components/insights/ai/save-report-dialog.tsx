'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SaveReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, notes?: string) => Promise<void>
  defaultTitle: string
  reportType: 'strategic' | 'report' | 'recommendations'
  isLoading?: boolean
}

export function SaveReportDialog({
  open,
  onOpenChange,
  onSave,
  defaultTitle,
  reportType,
  isLoading,
}: SaveReportDialogProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reportTypeLabels = {
    strategic: 'Strategic Advice',
    report: 'Monthly Report',
    recommendations: 'Posting Tips',
  }

  const handleSave = async () => {
    if (!title.trim()) return

    setSaving(true)
    try {
      await onSave(title.trim(), notes.trim() || undefined)
      setTitle(defaultTitle)
      setNotes('')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Report
          </DialogTitle>
          <DialogDescription>
            Save this {reportTypeLabels[reportType]} for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q1 Strategic Analysis"
              disabled={saving || isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or context about this report..."
              rows={3}
              disabled={saving || isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || isLoading || !title.trim()}>
            {saving ? 'Saving...' : 'Save Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
