import { CircleDashed, Star } from 'lucide-react'
import { BlankText } from '@/components/BlankText'
import { Progress } from '@/components/ui/progress'
import { MASTERY_THRESHOLD, type MasteryRecord, type Question } from '@/lib/types'
import { cn, plural } from '@/lib/utils'

export interface MasteryEntry {
  question: Question
  record: MasteryRecord
}

interface MasterySummaryProps {
  entries: MasteryEntry[]
}

function QuestionRow({ entry, mastered }: { entry: MasteryEntry; mastered: boolean }) {
  return (
    <li className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
      {mastered ? (
        <Star className="mt-0.5 size-4 shrink-0 text-gold" fill="currentColor" aria-hidden="true" />
      ) : (
        <CircleDashed className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-soft">
        <BlankText text={entry.question.prompt} />
      </span>
      {!mastered && (
        <span className="tabular shrink-0 rounded-full bg-page-deep px-2 py-0.5 text-[11px] font-medium text-ink-faint">
          {entry.record.streak}/{MASTERY_THRESHOLD}
        </span>
      )}
    </li>
  )
}

function Panel({
  title,
  count,
  tone,
  children,
}: {
  title: string
  count: number
  tone: 'gold' | 'neutral'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border p-4 sm:p-5',
        tone === 'gold' ? 'border-gold/25 bg-gold-soft/40' : 'border-line bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        {tone === 'gold' ? (
          <Star className="size-[18px] text-gold" fill="currentColor" aria-hidden="true" />
        ) : (
          <CircleDashed className="size-[18px] text-ink-faint" aria-hidden="true" />
        )}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="tabular ml-auto rounded-full bg-card px-2 py-0.5 text-[12px] font-semibold text-ink-soft">
          {count}
        </span>
      </div>
      <div className="mt-3 max-h-[248px] overflow-y-auto pr-1">{children}</div>
    </div>
  )
}

export function MasterySummary({ entries }: MasterySummaryProps) {
  const mastered = entries.filter((e) => e.record.mastered)
  const practice = entries.filter((e) => !e.record.mastered)
  const percent = entries.length ? Math.round((mastered.length / entries.length) * 100) : 0

  return (
    <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Mastery progress</h2>
        <p className="text-[13px] text-ink-soft">
          <span className="tabular font-semibold text-ink">{percent}%</span> ·{' '}
          {mastered.length} of {plural(entries.length, 'question')} mastered
        </p>
      </div>
      <Progress
        value={percent}
        label="Deck mastery"
        className="mt-3"
        indicatorClassName={percent === 100 ? 'bg-gold' : 'bg-primary'}
      />
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-faint">
        A question is mastered after {MASTERY_THRESHOLD} correct answers in a row. One miss resets
        its streak.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Panel title="Mastered" count={mastered.length} tone="gold">
          {mastered.length ? (
            <ul className="divide-y divide-line/70">
              {mastered.map((entry) => (
                <QuestionRow key={entry.question.id} entry={entry} mastered />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-[13px] leading-relaxed text-ink-faint">
              Nothing mastered yet — keep a question correct three times in a row to earn its star.
            </p>
          )}
        </Panel>

        <Panel title="Still needs practice" count={practice.length} tone="neutral">
          {practice.length ? (
            <ul className="divide-y divide-line/70">
              {practice.map((entry) => (
                <QuestionRow key={entry.question.id} entry={entry} mastered={false} />
              ))}
            </ul>
          ) : (
            <p className="py-2 text-[13px] leading-relaxed text-ink-faint">
              Every question in this deck is mastered. Excellent work.
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}
