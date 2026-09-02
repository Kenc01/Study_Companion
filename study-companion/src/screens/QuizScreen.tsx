import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Bookmark, Clock, Pause, Play, X, Zap } from 'lucide-react'
import type { FeedbackState } from '@/components/AnswerFeedback'
import { QuestionCard } from '@/components/QuestionCard'
import { QuizStats } from '@/components/QuizStats'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip } from '@/components/ui/tooltip'
import type { MasteryRecord, QuizSession, Settings } from '@/lib/types'
import { pct } from '@/lib/utils'

interface QuizScreenProps {
  session: QuizSession
  getRecord: (topicId: string, questionId: string) => MasteryRecord
  onSubmit: (value: string | number[] | string[]) => {
    correct: boolean
    answer: string
    masteredNow: boolean
    perBlank?: boolean[]
    isMcq?: boolean
    isMulti?: boolean
    isBool?: boolean
  } | null
  onNext: () => void
  onExit: () => void
  onRevealHint: () => void
  onToggleBookmark: (questionId: string, bookmarked: boolean) => void
  settings: Settings
  sessionElapsedMs: number
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function QuizScreen({
  session,
  getRecord,
  onSubmit,
  onNext,
  onExit,
  onRevealHint,
  onToggleBookmark,
  settings,
  sessionElapsedMs,
}: QuizScreenProps) {
  const [fb, setFb] = React.useState<{ step: number; value: FeedbackState } | null>(null)
  const [paused, setPaused] = React.useState(false)
  const feedback = fb && fb.step === session.step ? fb.value : null
  const question = session.questions[session.index]

  const masteredInSession = React.useMemo(
    () => session.questions.filter((q) => getRecord(session.topicId, q.id).mastered).length,
    [session.questions, session.topicId, getRecord],
  )

  // Global keyboard shortcuts.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused) return
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      const typing = tag === 'input' || tag === 'textarea'

      if (e.key === 'Escape') {
        onExit()
        return
      }
      if (feedback) {
        if ((settings.enterSubmits && e.key === 'Enter') || e.key === ' ') {
          if (!typing || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFb(null)
            onNext()
          }
        }
        return
      }
      // Hint shortcut: "h"
      if (!typing && (e.key === 'h' || e.key === 'H' || e.key === '?')) {
        e.preventDefault()
        onRevealHint()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [feedback, onExit, onNext, onRevealHint, paused, settings.enterSubmits])

  if (!question) return null

  const isCram = session.mode === 'cram'
  const isTest = session.mode === 'test'
  const isReview = session.mode === 'review'
  const isBookmarkedDeck = session.mode === 'bookmarked'
  const cramTotal = session.totalCount ?? session.questions.length
  const cramCleared = session.clearedCount ?? 0

  const answered = session.index + (feedback ? 1 : 0)
  const progress = isCram
    ? pct(cramCleared, cramTotal)
    : pct(answered, session.questions.length)
  const record = getRecord(session.topicId, question.id)
  const bookmarked = record.bookmarked || question.bookmarked || false

  const handleSubmit = (value: string | number[] | string[]) => {
    const result = onSubmit(value)
    if (result) setFb({ step: session.step, value: result })
    // In test mode, auto-advance immediately without showing feedback.
    if (result && isTest) {
      setFb(null)
      setTimeout(() => {
        onNext()
      }, 120)
    }
  }

  const handleNext = () => {
    setFb(null)
    onNext()
  }

  const modeLabel = isCram
    ? 'CRAM'
    : isTest
      ? 'PRACTICE TEST'
      : isReview
        ? 'REVIEW'
        : isBookmarkedDeck
          ? 'BOOKMARKED'
          : session.mode === 'wrong'
            ? 'MISSED'
            : null

  return (
    <>
      <header>
        <div className="flex items-center gap-3">
          <Tooltip label="Exit (Esc)">
            <Button variant="secondary" size="icon" onClick={onExit} aria-label="Exit quiz">
              <X aria-hidden="true" />
            </Button>
          </Tooltip>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] leading-tight font-semibold sm:text-[19px]">
              {session.topicName}
            </h1>
            <p className="tabular mt-0.5 text-[13px] text-ink-soft">
              {isCram ? (
                <>
                  <span className="font-medium text-ink">{cramCleared}</span> of {cramTotal} cleared
                  {(session.round ?? 1) > 1 && ` · round ${session.round}`}
                </>
              ) : isTest ? (
                <>
                  Question {session.index + 1} of {session.questions.length} · Timed
                </>
              ) : isReview ? (
                <>
                  {session.index + 1} of {session.questions.length} · due today
                </>
              ) : (
                <>
                  Question {session.index + 1} of {session.questions.length}
                  {session.mode === 'wrong' && ' · missed answers'}
                  {isBookmarkedDeck && ' · bookmarked only'}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {modeLabel && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isCram
                    ? 'border-gold/30 bg-gold-soft text-[hsl(36_82%_32%)]'
                    : isTest
                      ? 'border-danger/30 bg-danger-soft text-danger'
                      : 'border-primary/20 bg-primary-soft text-primary-soft-ink'
                }`}
              >
                {isCram && <Zap className="size-3.5" aria-hidden="true" />}
                {isBookmarkedDeck && <Bookmark className="size-3.5" aria-hidden="true" />}
                {isTest && <Clock className="size-3.5" aria-hidden="true" />}
                {modeLabel}
              </span>
            )}
            {settings.showTimer && (
              <span className="tabular hidden items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-[12px] font-semibold text-ink-soft sm:inline-flex">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatDuration(sessionElapsedMs)}
              </span>
            )}
            <Button
              variant="ghost"
              size="iconSm"
              aria-label={paused ? 'Resume' : 'Pause'}
              onClick={() => setPaused((p) => !p)}
              className="hidden sm:inline-flex"
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
          </div>
        </div>

        <Progress
          value={progress}
          label={isCram ? 'Questions cleared' : 'Quiz progress'}
          className="mt-4"
          indicatorClassName={
            isCram ? 'bg-gold' : isTest ? 'bg-danger' : isReview ? 'bg-success' : 'bg-primary'
          }
        />
      </header>

      {paused ? (
        <div className="mt-10 text-center">
          <p className="text-lg font-semibold">Paused</p>
          <p className="mt-1 text-sm text-ink-soft">Take a breath — press Resume when you're ready.</p>
          <Button className="mt-4" onClick={() => setPaused(false)}>
            <Play aria-hidden="true" /> Resume
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <QuizStats
              correct={session.correct}
              wrong={session.wrong}
              remaining={
                isCram
                  ? cramTotal - cramCleared - (feedback?.correct ? 1 : 0)
                  : session.questions.length - session.index - (feedback ? 1 : 0)
              }
              mastered={masteredInSession}
              streak={session.streak}
              timeMs={settings.showTimer ? sessionElapsedMs : undefined}
            />
          </div>

          <main className="mt-5">
            <AnimatePresence mode="wait">
              <QuestionCard
                key={`${question.id}-${session.step}`}
                question={question}
                questionNumber={session.index + 1}
                totalQuestions={session.questions.length}
                record={record}
                feedback={feedback}
                isLast={session.index === session.questions.length - 1}
                cramMode={isCram}
                hintLevel={(session.hintLevel ?? 0) as 0 | 1 | 2 | 3}
                bookmarked={bookmarked}
                showKeyboardHints
                enterSubmits={settings.enterSubmits}
                onSubmit={handleSubmit}
                onNext={handleNext}
                onRevealHint={onRevealHint}
                onToggleBookmark={() => onToggleBookmark(question.id, !bookmarked)}
              />
            </AnimatePresence>
            <p className="mt-3 text-center text-[12px] text-ink-faint">
              <span className="kbd">H</span> hint ·{' '}
              <span className="kbd">Esc</span> exit ·{' '}
              <span className="kbd">Enter</span> next
            </p>
          </main>
        </>
      )}
    </>
  )
}
