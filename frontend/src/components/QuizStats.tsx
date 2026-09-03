import { Check, Clock, Flame, Hourglass, Star, X } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface QuizStatsProps {
  correct: number
  wrong: number
  remaining: number
  mastered: number
  streak: number
  timeMs?: number
}

function Stat({
  icon,
  value,
  label,
  className,
  emphasis,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  className?: string
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-[var(--radius-sm)] border border-line bg-card px-2 py-2.5 text-center transition-colors sm:flex-row sm:justify-center sm:gap-2 sm:py-2',
        emphasis && 'border-gold/40 bg-gold-soft',
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="tabular text-[15px] leading-none font-semibold">{value}</span>
      </span>
      <span className="text-[11px] leading-none text-ink-faint sm:text-[12px]">{label}</span>
    </div>
  )
}

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function QuizStats({ correct, wrong, remaining, mastered, streak, timeMs }: QuizStatsProps) {
  const cols = timeMs !== undefined ? 'grid-cols-6 sm:grid-cols-6' : 'grid-cols-6 sm:grid-cols-5'
  return (
    <div className={`grid gap-2 ${cols}`} role="group" aria-label="Quiz statistics">
      <Stat
        icon={<Check className="size-4 text-success" aria-hidden="true" />}
        value={correct}
        label="Correct"
        className="col-span-2 border-success-border/60 bg-success-soft/60 sm:col-span-1"
      />
      <Stat
        icon={<X className="size-4 text-danger" aria-hidden="true" />}
        value={wrong}
        label="Wrong"
        className="col-span-2 border-danger-border/60 bg-danger-soft/60 sm:col-span-1"
      />
      <Stat
        icon={<Hourglass className="size-4 text-ink-faint" aria-hidden="true" />}
        value={remaining}
        label="Left"
        className="col-span-2 sm:col-span-1"
      />
      {timeMs !== undefined && (
        <Stat
          icon={<Clock className="size-4 text-ink-faint" aria-hidden="true" />}
          value={fmt(timeMs)}
          label="Time"
          className="col-span-3 sm:col-span-1"
        />
      )}
      <Stat
        icon={<Star className="size-4 text-gold" fill="currentColor" aria-hidden="true" />}
        value={mastered}
        label="Mastered"
        className="col-span-3 border-gold/30 bg-gold-soft/70 sm:col-span-1"
      />
      <Stat
        icon={
          <Flame
            className={cn('size-4', streak > 0 ? 'text-[hsl(22_88%_50%)]' : 'text-ink-faint')}
            aria-hidden="true"
          />
        }
        value={streak}
        label="Streak"
        emphasis={streak >= 3}
        className={`col-span-3 sm:col-span-1 ${timeMs === undefined ? 'sm:col-start-5' : ''}`}
      />
    </div>
  )
}
