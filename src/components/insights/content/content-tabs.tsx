'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, BarChart3, Trophy, Sparkles } from 'lucide-react'

export type ContentTab = 'browse' | 'performance' | 'rankings' | 'ai'

interface ContentTabsProps {
  activeTab: ContentTab
  onTabChange: (tab: ContentTab) => void
  children: {
    browse: React.ReactNode
    performance: React.ReactNode
    rankings: React.ReactNode
    ai: React.ReactNode
  }
}

export function ContentTabs({ activeTab, onTabChange, children }: ContentTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ContentTab)}>
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="browse" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Browse</span>
        </TabsTrigger>
        <TabsTrigger value="performance" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Performance</span>
        </TabsTrigger>
        <TabsTrigger value="rankings" className="gap-2">
          <Trophy className="h-4 w-4" />
          <span className="hidden sm:inline">Rankings</span>
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI Analysis</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="browse" className="mt-0">
        {children.browse}
      </TabsContent>
      <TabsContent value="performance" className="mt-0">
        {children.performance}
      </TabsContent>
      <TabsContent value="rankings" className="mt-0">
        {children.rankings}
      </TabsContent>
      <TabsContent value="ai" className="mt-0">
        {children.ai}
      </TabsContent>
    </Tabs>
  )
}
