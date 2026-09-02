import { motion } from 'framer-motion'
import {
  BookOpen,
  BookOpenCheck,
  Clock,
  Pencil,
  Play,
  Star,
  Trash2,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import type { TopicStats } from '@/hooks/useQuizState'
import type { Topic } from '@/lib/types'
import { formatRelative, plural } from '@/lib/utils'

const ACCENT_GRADIENTS = [
  'from-sky-500/20 to-sky-400/5',
  'from-emerald-500/20 to-emerald-400/5',
  'from-amber-500/20 to-amber-400/5',
  'from-rose-500/20 to-rose-400/5',
  'from-violet-500/20 to-violet-400/5',
  'from-teal-500/20 to-teal-400/5',
]

const ACCENT_ICONS = [
  'text-sky-600 dark:text-sky-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-rose-600 dark:text-rose-400',
  'text-violet-600 dark:text-violet-400',
  'text-teal-600 dark:text-teal-400',
]

interface TopicCardProps {
  topic: Topic
  stats: TopicStats
  index: number
  onStart: () => void
  onCram: () => void
  onReview: () => void
  onBookmarked: () => void
  onTest: () => void
  onEdit: () => void
  onDelete: () => void
}

export function TopicCard({
  topic,
  stats,
  index,
  onStart,
  onCram,
  onReview,
  onBookmarked,
  onTest,
  onEdit,
  onDelete,
}: TopicCardProps) {
  const complete = stats.masteryPct === 100 && stats.total > 0
  const color = typeof topic.color === 'number' ? topic.color % 6 : 0
  const accent = ACCENT_GRADIENTS[color]
  const iconColor = ACCENT_ICONS[color]
  const tags = (topic.tags ?? []).slice(0, 3)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={{
        duration: 0.34,
        delay: Math.min(index * 0.05, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-card shadow-[var(--shadow-soft)] transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)] focus-within:border-ring/40"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${accent}`} />
      <div className="relative flex flex-col p-5">
        <div className="flex items-start gap-3.5">
          <span className={`grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-card shadow-[var(--shadow-soft)] ${iconColor}`}>
            <BookOpen className="size-[21px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className="text-[16px] leading-snug font-semibold break-words hyphens-auto"
              title={topic.name}
            >
              {topic.name}
              {complete && (
                <Badge className="ml-2 bg-gold-soft text-[hsl(36_82%_28%)]">Complete</Badge>
              )}
            </h3>
            <p className="mt-1 text-[13px] text-ink-faint">
              {plural(stats.total, 'card')} · {formatRelative(topic.lastStudiedAt)}
            </p>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-card-muted p-2 text-center">
          <div>
            <p className="tabular text-[14px] font-semibold text-ink">{stats.due}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Due</p>
          </div>
          <div className="border-x border-line">
            <p className="tabular text-[14px] font-semibold text-gold">{stats.bookmarked}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">★</p>
          </div>
          <div>
            <p className="tabular text-[14px] font-semibold text-success">{stats.masteryPct}%</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-faint">Mastery</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
              <Star
                className="size-4 text-gold"
                fill={stats.mastered ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              Progress
            </span>
            <span className="tabular text-[13px] font-semibold text-ink">
              {stats.mastered}/{stats.total}
            </span>
          </div>
          <Progress
            value={stats.masteryPct}
            label={`${topic.name} mastery: ${stats.masteryPct} percent`}
            indicatorClassName={complete ? 'bg-gold' : 'bg-primary'}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onStart} disabled={stats.total === 0}>
            <Play aria-hidden="true" /> Study
          </Button>
          <Button size="sm" variant="secondary" onClick={onCram} disabled={stats.total === 0}>
            <Zap aria-hidden="true" /> Cram
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <Tooltip label="Review due cards">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onReview}
                disabled={stats.total === 0}
                aria-label="Start spaced review"
              >
                <BookOpenCheck aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip label="Practice test">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onTest}
                disabled={stats.total === 0}
                aria-label="Start timed practice test"
              >
                <Clock aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip label="Study bookmarked only">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onBookmarked}
                disabled={stats.bookmarked === 0}
                aria-label="Study bookmarked cards"
              >
                <Star aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip label="Edit">
              <Button variant="ghost" size="iconSm" onClick={onEdit} aria-label="Edit">
                <Pencil aria-hidden="true" />
              </Button>
            </Tooltip>
            <Tooltip label="Delete">
              <Button variant="dangerGhost" size="iconSm" onClick={onDelete} aria-label="Delete">
                <Trash2 aria-hidden="true" />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </motion.li>
  )
}
