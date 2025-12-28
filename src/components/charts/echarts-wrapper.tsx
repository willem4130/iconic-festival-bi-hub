'use client'

import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption, ECharts } from 'echarts'

interface EChartsWrapperProps {
  option: EChartsOption
  height?: string | number
  className?: string
  theme?: 'light' | 'dark'
  onChartReady?: (chart: ECharts) => void
}

export function EChartsWrapper({
  option,
  height = 400,
  className = '',
  theme = 'light',
  onChartReady,
}: EChartsWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInstance = useRef<ECharts | null>(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current, theme)
    onChartReady?.(chartInstance.current)

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chartInstance.current?.dispose()
    }
  }, [theme, onChartReady])

  useEffect(() => {
    if (chartInstance.current && option) {
      chartInstance.current.setOption(option, true)
    }
  }, [option])

  return (
    <div
      ref={chartRef}
      className={className}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    />
  )
}
