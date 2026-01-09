'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Facebook, Instagram, LayoutGrid } from 'lucide-react'
import { useInsights, type Platform } from './insights-context'

export function PlatformToggle() {
  const { platform, setPlatform } = useInsights()

  return (
    <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
      <TabsList className="h-9">
        <TabsTrigger value="all" className="gap-1.5 px-3">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">All</span>
        </TabsTrigger>
        <TabsTrigger value="facebook" className="gap-1.5 px-3">
          <Facebook className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Facebook</span>
        </TabsTrigger>
        <TabsTrigger value="instagram" className="gap-1.5 px-3">
          <Instagram className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Instagram</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
