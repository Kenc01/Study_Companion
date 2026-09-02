import type * as React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  /** Tailwind max-width class for the inner column. */
  width?: 'home' | 'form' | 'quiz'
  className?: string
}

const WIDTHS: Record<NonNullable<AppShellProps['width']>, string> = {
  home: 'max-w-[1100px]',
  form: 'max-w-[900px]',
  quiz: 'max-w-[850px]',
}

export function AppShell({ children, width = 'home', className }: AppShellProps) {
  return (
    <div className="min-h-dvh w-full px-4 pt-6 pb-16 sm:px-6 sm:pt-10 lg:px-8">
      <div className={cn('mx-auto w-full', WIDTHS[width], className)}>{children}</div>
    </div>
  )
}
