import { Suspense, type ReactNode } from 'react'
import { InsightsProvider } from '@/components/insights'

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <InsightsProvider>{children}</InsightsProvider>
    </Suspense>
  )
}
