import { motion } from 'framer-motion'
import { Check, PartyPopper, X } from 'lucide-react'
import { BlankText } from '@/components/BlankText'
import type { AnswerLog } from '@/lib/types'

interface WrongAnswerListProps {
  logs: AnswerLog[]
}

export function WrongAnswerList({ logs }: WrongAnswerListProps) {
  const wrong = logs.filter((l) => !l.correct)

  if (!wrong.length) {
    return (
      <div className="flex flex-col items-center rounded-[var(--radius)] border border-success-border bg-success-soft px-6 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-[var(--radius-sm)] bg-card text-success">
          <PartyPopper className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-[17px] font-semibold text-success">Nothing to review</h3>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
          You answered every question correctly. Run the deck again to push these cards toward
          mastery.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {wrong.map((log, i) => {
        const number = logs.indexOf(log) + 1
        return (
          <motion.li
            key={`${log.questionId}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.24), ease: 'easeOut' }}
            className="rounded-[var(--radius)] border border-line bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-danger-soft text-[12px] font-semibold text-danger">
                {number}
              </span>
              <p className="text-[14.5px] leading-relaxed font-medium text-ink">
                <BlankText text={log.prompt} />
              </p>
            </div>

            <dl className="mt-3.5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[var(--radius-sm)] border border-danger-border/60 bg-danger-soft/60 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-danger uppercase">
                  <X className="size-3.5" aria-hidden="true" />
                  Your answer
                </dt>
                <dd className="mt-1 text-[14px] break-words text-ink">
                  {log.userAnswer || <span className="text-ink-faint italic">No answer</span>}
                </dd>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-success-border/60 bg-success-soft/60 px-3 py-2.5">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-success uppercase">
                  <Check className="size-3.5" aria-hidden="true" />
                  Correct answer
                </dt>
                <dd className="mt-1 text-[14px] font-medium break-words text-ink">{log.answer}</dd>
              </div>
            </dl>
          </motion.li>
        )
      })}
    </ul>
  )
}
