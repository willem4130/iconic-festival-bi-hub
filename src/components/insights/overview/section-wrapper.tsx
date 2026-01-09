'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  title: string
  description?: string
  icon?: LucideIcon
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  headerAction?: React.ReactNode
}

export function SectionWrapper({
  title,
  description,
  icon: Icon,
  defaultOpen = true,
  children,
  className,
  headerAction,
}: SectionWrapperProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn('space-y-2', className)}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-auto items-center gap-2 p-0 hover:bg-transparent"
              >
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                  <div className="text-left">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {description && (
                      <p className="text-sm font-normal text-muted-foreground">{description}</p>
                    )}
                  </div>
                </div>
              </Button>
            </CollapsibleTrigger>
            {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
