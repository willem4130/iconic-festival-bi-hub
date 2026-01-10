'use client'

import { TrendingUp, Zap, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FocusArea = 'growth' | 'engagement' | 'reach'

interface FocusSelectorProps {
  value: FocusArea
  onChange: (value: FocusArea) => void
  disabled?: boolean
}

const focusOptions: Array<{
  value: FocusArea
  label: string
  description: string
  icon: typeof TrendingUp
  color: string
  bgColor: string
  borderColor: string
}> = [
  {
    value: 'growth',
    label: 'Growth',
    description: 'Grow your audience and follower base',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-500 ring-green-200',
  },
  {
    value: 'engagement',
    label: 'Engagement',
    description: 'Maximize likes, comments & shares',
    icon: Zap,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
    borderColor: 'border-amber-500 ring-amber-200',
  },
  {
    value: 'reach',
    label: 'Reach',
    description: 'Expand visibility and impressions',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-500 ring-blue-200',
  },
]

export function FocusSelector({ value, onChange, disabled }: FocusSelectorProps) {
  return (
    <div className="w-full">
      <label className="mb-2 block text-sm font-medium text-muted-foreground">Analysis Focus</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {focusOptions.map((option) => {
          const Icon = option.icon
          const isSelected = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'relative flex flex-col items-center rounded-lg border-2 p-4 text-center transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                disabled && 'cursor-not-allowed opacity-50',
                isSelected
                  ? cn(option.bgColor, option.borderColor, 'ring-2')
                  : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div
                  className={cn(
                    'absolute right-2 top-2 h-2 w-2 rounded-full',
                    option.value === 'growth' && 'bg-green-500',
                    option.value === 'engagement' && 'bg-amber-500',
                    option.value === 'reach' && 'bg-blue-500'
                  )}
                />
              )}

              {/* Icon */}
              <div
                className={cn(
                  'mb-2 flex h-10 w-10 items-center justify-center rounded-full',
                  isSelected ? option.bgColor : 'bg-muted'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isSelected ? option.color : 'text-muted-foreground')}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'text-sm font-semibold',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {option.label}
              </span>

              {/* Description */}
              <span className="mt-1 text-xs text-muted-foreground">{option.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
