import { motion } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FeedbackState {
  correct: boolean
  answer: string
  masteredNow: boolean
}

interface AnswerFeedbackProps {
  feedback: FeedbackState
}

export function AnswerFeedback({ feedback }: AnswerFeedbackProps) {
  const { correct, answer, masteredNow } = feedback

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -6, height: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div
        className={cn(
          'mt-4 flex items-start gap-3 rounded-[var(--radius-sm)] border p-4',
          correct
            ? 'border-success-border bg-success-soft'
            : 'border-danger-border bg-danger-soft',
        )}
      >
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-full text-white',
            correct ? 'bg-success' : 'bg-danger',
          )}
        >
          {correct ? (
            <Check className="size-4" strokeWidth={3} aria-hidden="true" />
          ) : (
            <X className="size-4" strokeWidth={3} aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[15px] leading-tight font-semibold',
              correct ? 'text-success' : 'text-danger',
            )}
          >
            {correct ? 'Correct!' : 'Wrong.'}
          </p>

          {correct ? (
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Great work — <span className="font-medium text-ink">{answer}</span>
            </p>
          ) : (
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
              The correct answer is:{' '}
              <span className="font-semibold text-ink break-words">{answer}</span>
            </p>
          )}

          {masteredNow && (
            <motion.p
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 }}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-soft px-2.5 py-1 text-[12px] font-medium text-[hsl(36_82%_32%)]"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              Mastered — 3 correct in a row
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
