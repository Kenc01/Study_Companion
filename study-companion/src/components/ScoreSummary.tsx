import { motion, useReducedMotion } from 'framer-motion'
import { Check, Flame, Star, X } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

interface ScoreSummaryProps {
  correct: number
  wrong: number
  total: number
  mastered: number
  bestStreak: number
}

function ScoreRing({ percent, correct, total }: { percent: number; correct: number; total: number }) {
  const reduce = useReducedMotion()
  const size = 168
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const tone =
    percent === 100 ? 'hsl(var(--gold))' : percent >= 70 ? 'hsl(var(--success))' : percent >= 40 ? 'hsl(var(--primary))' : 'hsl(var(--danger))'

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--page-deep))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (percent / 100) * circumference }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tabular text-[30px] leading-none font-semibold">
          {correct}
          <span className="text-ink-faint"> / {total}</span>
        </span>
        <span className="tabular mt-1.5 text-[15px] font-medium text-ink-soft">{percent}%</span>
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-sm)] border border-line bg-card-muted px-3.5 py-3',
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-card">{icon}</span>
      <div className="min-w-0">
        <p className="tabular text-[16px] leading-tight font-semibold">{value}</p>
        <p className="truncate text-[12px] text-ink-faint">{label}</p>
      </div>
    </div>
  )
}

export function ScoreSummary({ correct, wrong, total, mastered, bestStreak }: ScoreSummaryProps) {
  const percent = total ? Math.round((correct / total) * 100) : 0

  return (
    <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:p-7">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <ScoreRing percent={percent} correct={correct} total={total} />
        <div className="grid w-full flex-1 grid-cols-2 gap-2.5">
          <Metric
            icon={<Check className="size-[18px] text-success" aria-hidden="true" />}
            label="Correct answers"
            value={correct}
            className="border-success-border/50 bg-success-soft/50"
          />
          <Metric
            icon={<X className="size-[18px] text-danger" aria-hidden="true" />}
            label="Wrong answers"
            value={wrong}
            className="border-danger-border/50 bg-danger-soft/50"
          />
          <Metric
            icon={<Star className="size-[18px] text-gold" fill="currentColor" aria-hidden="true" />}
            label="Mastered in this deck"
            value={mastered}
            className="border-gold/25 bg-gold-soft/60"
          />
          <Metric
            icon={<Flame className="size-[18px] text-[hsl(22_88%_50%)]" aria-hidden="true" />}
            label="Best streak"
            value={bestStreak}
          />
        </div>
      </div>
    </div>
  )
}
