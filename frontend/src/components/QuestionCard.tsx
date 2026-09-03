import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bookmark, BookmarkCheck, CornerDownLeft, Lightbulb } from 'lucide-react'
import * as React from 'react'
import { AnswerFeedback, type FeedbackState } from '@/components/AnswerFeedback'
import { BlankText } from '@/components/BlankText'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MasteryRecord, Question } from '@/lib/types'
import { MASTERY_THRESHOLD } from '@/lib/types'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  record: MasteryRecord
  feedback: FeedbackState | null
  isLast: boolean
  cramMode?: boolean
  hintLevel: 0 | 1 | 2 | 3
  bookmarked: boolean
  showKeyboardHints: boolean
  enterSubmits: boolean
  onSubmit: (value: string | number[] | string[]) => void
  onNext: () => void
  onRevealHint: () => void
  onToggleBookmark: () => void
}

function HintPanel({
  hintLevel,
  answer,
  alternatives,
}: {
  hintLevel: 0 | 1 | 2 | 3
  answer: string
  alternatives: string[]
}) {
  if (hintLevel === 0) return null
  const words = answer.split(/\s+/)
  const wordCount = words.length
  const firstLetter = answer[0]?.toUpperCase() ?? ''
  const shown =
    hintLevel >= 3
      ? answer
      : hintLevel >= 2
        ? `${firstLetter}${'_ '.repeat(Math.max(3, answer.length - 2)).trim()}`
        : hintLevel >= 1
          ? `${wordCount} word${wordCount === 1 ? '' : 's'}${alternatives.length > 1 ? ` · ${alternatives.length} accepted answers` : ''}`
          : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2 text-[13px] text-[hsl(36_70%_25%)]"
    >
      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Hint</p>
        <p className="tabular font-mono text-[13px]">{shown}</p>
      </div>
    </motion.div>
  )
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  record,
  feedback,
  isLast,
  cramMode,
  hintLevel,
  bookmarked,
  showKeyboardHints,
  enterSubmits,
  onSubmit,
  onNext,
  onRevealHint,
  onToggleBookmark,
}: QuestionCardProps) {
  const [typed, setTyped] = React.useState('')
  const [multiValues, setMultiValues] = React.useState<string[]>([])
  const [activeBlank, setActiveBlank] = React.useState(0)
  const [selected, setSelected] = React.useState<number[]>([])
  const [boolChoice, setBoolChoice] = React.useState<boolean | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const nextRef = React.useRef<HTMLButtonElement>(null)
  const answered = feedback !== null

  // Initialize state for each new question.
  React.useEffect(() => {
    setTyped('')
    setSelected([])
    setBoolChoice(null)
    setActiveBlank(0)
    if (question.type === 'multi') {
      setMultiValues(new Array(question.blankCount ?? 2).fill(''))
    } else {
      setMultiValues([])
    }
    const id = requestAnimationFrame(() => {
      if (question.type === 'typed' || question.type === 'multi') {
        inputRef.current?.focus()
      }
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  React.useEffect(() => {
    if (answered) {
      const id = requestAnimationFrame(() => nextRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [answered])

  const submitTyped = () => {
    if (answered) return
    if (question.type === 'boolean') {
      if (boolChoice === null) return
      onSubmit(boolChoice ? 'true' : 'false')
      return
    }
    if (question.type === 'mcq') {
      if (!selected.length) return
      onSubmit(selected)
      return
    }
    if (question.type === 'multi') {
      if (multiValues.some((v) => !v.trim())) return
      onSubmit(multiValues)
      return
    }
    if (!typed.trim()) return
    onSubmit(typed)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!enterSubmits) return
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (answered) onNext()
    else submitTyped()
  }

  const toggleOption = (idx: number) => {
    if (answered) return
    const multi = (question.answerIndices?.length ?? 1) > 1
    if (multi) {
      setSelected((s) => (s.includes(idx) ? s.filter((i) => i !== idx) : [...s, idx]))
    } else {
      setSelected([idx])
      // Auto-submit after a short delay so the user sees the selection.
      setTimeout(() => onSubmit([idx]), 160)
    }
  }

  const isMultiBlank = question.type === 'multi'
  const blankCount = question.blankCount ?? 1
  const filledAnswers =
    answered && (question.type === 'typed' || question.type === 'multi')
      ? question.type === 'multi'
        ? (question.alternatives as string[][]).map((a) => a[0])
        : [question.answer]
      : undefined

  // Badge label
  const typeBadge = {
    typed: 'Fill in the blank',
    mcq: (question.answerIndices?.length ?? 1) > 1 ? 'Select all that apply' : 'Multiple choice',
    boolean: 'True or False',
    multi: `Fill ${blankCount} blanks`,
  }[question.type]

  return (
    <motion.section
      key={question.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[360px] flex-col rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:min-h-[400px] sm:p-7"
      aria-labelledby="question-heading"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary-soft-ink uppercase">
          {typeBadge}
        </span>
        <span className="tabular text-[12px] text-ink-faint">
          {questionNumber} of {totalQuestions}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {record.mastered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-[hsl(36_82%_32%)]">
              ★ Mastered
            </span>
          ) : record.streak > 0 ? (
            <span className="text-[11px] font-medium text-ink-faint">
              {record.streak}/{MASTERY_THRESHOLD} to mastery
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onToggleBookmark}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
            className={bookmarked ? 'text-gold' : 'text-ink-faint'}
          >
            {bookmarked ? (
              <BookmarkCheck className="size-4" fill="currentColor" aria-hidden="true" />
            ) : (
              <Bookmark className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <h2
        id="question-heading"
        className="mt-5 mb-auto text-[19px] leading-[1.7] font-medium text-balance text-ink sm:text-[22px] sm:leading-[1.75]"
      >
        <BlankText
          text={question.prompt}
          active={!answered}
          filledAnswers={filledAnswers}
          activeBlankIndex={isMultiBlank && !answered ? activeBlank : undefined}
          indexed={isMultiBlank}
        />
      </h2>

      {/* --- Input region --- */}
      <div className="mt-6">
        {question.type === 'boolean' && !answered && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              variant={boolChoice === true ? 'primary' : 'secondary'}
              onClick={() => setBoolChoice(true)}
              className="h-14 text-[15px] font-semibold"
            >
              True
            </Button>
            <Button
              size="lg"
              variant={boolChoice === false ? 'danger' : 'secondary'}
              onClick={() => setBoolChoice(false)}
              className="h-14 text-[15px] font-semibold"
            >
              False
            </Button>
          </div>
        )}

        {question.type === 'mcq' && question.options && !answered && (
          <ul className="grid gap-2.5" role="listbox" aria-multiselectable={(question.answerIndices?.length ?? 1) > 1}>
            {question.options.map((opt, i) => {
              const isSel = selected.includes(i)
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    onClick={() => toggleOption(i)}
                    className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left text-[15px] transition-colors ${
                      isSel
                        ? 'border-primary bg-primary-soft text-primary-soft-ink'
                        : 'border-line bg-card hover:border-line-strong hover:bg-card-muted'
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-md border text-[12px] font-bold ${
                        isSel ? 'border-primary bg-primary text-primary-ink' : 'border-line-strong text-ink-faint'
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {question.type === 'multi' && !answered && (
          <div className="space-y-2.5">
            {multiValues.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-md border text-[12px] font-bold ${
                    activeBlank === i
                      ? 'border-primary bg-primary text-primary-ink'
                      : 'border-line-strong text-ink-faint'
                  }`}
                >
                  {i + 1}
                </span>
                <Input
                  ref={i === 0 || i === activeBlank ? inputRef : undefined}
                  value={val}
                  onChange={(e) => {
                    const next = [...multiValues]
                    next[i] = e.target.value
                    setMultiValues(next)
                  }}
                  onFocus={() => setActiveBlank(i)}
                  onKeyDown={(e) => {
                    handleKeyDown(e)
                    if (e.key === 'Tab' && !e.shiftKey && i < blankCount - 1) {
                      e.preventDefault()
                      setActiveBlank(i + 1)
                      // Focus next input on next tick
                      setTimeout(() => {
                        const inputs = document.querySelectorAll<HTMLInputElement>(
                          '[data-multi-input]',
                        )
                        inputs[i + 1]?.focus()
                      }, 0)
                    }
                  }}
                  data-multi-input
                  placeholder={`Blank ${i + 1}...`}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-12"
                />
              </div>
            ))}
          </div>
        )}

        {question.type === 'typed' && (
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Input
              id="answer-input"
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              readOnly={answered}
              aria-describedby="answer-hint"
              className="h-12 shrink-0 sm:flex-1"
            />
            {!answered && (
              <Button
                size="lg"
                onClick={submitTyped}
                disabled={!typed.trim()}
                className="sm:w-auto sm:px-5"
                block
              >
                Submit <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        )}

        {!answered && question.type === 'typed' && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[12px] text-ink-faint">
              {showKeyboardHints && enterSubmits && (
                <span className="hidden items-center gap-1 sm:flex">
                  <CornerDownLeft className="size-3.5" aria-hidden="true" /> Press Enter to submit
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onRevealHint} disabled={hintLevel >= 3}>
              <Lightbulb aria-hidden="true" />
              {hintLevel === 0
                ? 'Hint'
                : hintLevel === 1
                  ? 'More hint'
                  : hintLevel === 2
                    ? 'Reveal answer'
                    : 'Answer revealed'}
            </Button>
          </div>
        )}

        {!answered && (question.type === 'boolean' || question.type === 'multi' || question.type === 'mcq') && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onRevealHint} disabled={hintLevel >= 3}>
              <Lightbulb aria-hidden="true" />
              {hintLevel === 0
                ? 'Hint'
                : hintLevel === 1
                  ? 'More hint'
                  : hintLevel === 2
                    ? 'Reveal answer'
                    : 'Answer revealed'}
            </Button>
          </div>
        )}

        {question.type === 'boolean' && !answered && (
          <div className="mt-3">
            <Button
              size="lg"
              onClick={submitTyped}
              disabled={boolChoice === null}
              block
            >
              Submit <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        )}

        {question.type === 'mcq' && !answered && (question.answerIndices?.length ?? 1) > 1 && (
          <Button
            size="lg"
            className="mt-3"
            onClick={submitTyped}
            disabled={!selected.length}
            block
          >
            Submit
            <ArrowRight aria-hidden="true" />
          </Button>
        )}

        {question.type === 'multi' && !answered && (
          <div className="mt-3">
            <Button size="lg" onClick={submitTyped} block>
              Submit <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {!answered && question.type !== 'mcq' && hintLevel > 0 && (
        <HintPanel hintLevel={hintLevel} answer={question.answer} alternatives={Array.isArray(question.alternatives) && question.alternatives.every((a): a is string => typeof a === 'string') ? (question.alternatives as string[]) : [question.answer]} />
      )}

      <AnimatePresence initial={false}>
        {feedback && <AnswerFeedback feedback={feedback} />}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.06 }}
          >
            <Button ref={nextRef} size="lg" block className="mt-4" onClick={onNext}>
              {cramMode
                ? feedback?.correct
                  ? 'Next Question'
                  : 'Got it — try again later'
                : isLast
                  ? 'See Results'
                  : 'Next Question'}
              <ArrowRight aria-hidden="true" />
            </Button>
            {showKeyboardHints && enterSubmits && (
              <p className="mt-2 text-center text-[12px] text-ink-faint">
                <span className="kbd">Enter</span> continues
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
