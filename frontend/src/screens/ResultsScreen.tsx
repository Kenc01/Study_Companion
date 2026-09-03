import { motion } from 'framer-motion'
import {
  BookOpenCheck,
  Clock,
  FileUp,
  Home,
  PartyPopper,
  RefreshCw,
  Shuffle,
  Trophy,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { Confetti } from '@/components/Confetti'
import { MasterySummary, type MasteryEntry } from '@/components/MasterySummary'
import { ScoreSummary } from '@/components/ScoreSummary'
import { WrongAnswerList } from '@/components/WrongAnswerList'
import { Button } from '@/components/ui/button'
import type { MasteryRecord, QuizSession, Topic } from '@/lib/types'
import { plural } from '@/lib/utils'

interface ResultsScreenProps {
  session: QuizSession
  topic: Topic | null
  getRecord: (topicId: string, questionId: string) => MasteryRecord
  onRetryWrong: () => void
  onRetryAll: () => void
  onNewNotes: () => void
  onCram: () => void
  onReview: () => void
  onTest: () => void
  onHome: () => void
  elapsedMs?: number
}

function formatDuration(ms?: number): string | null {
  if (!ms || ms < 0) return null
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }
  if (m === 0) return `${s}s`
  return `${m}m ${sec}s`
}

export function ResultsScreen({
  session,
  topic,
  getRecord,
  onRetryWrong,
  onRetryAll,
  onNewNotes,
  onCram,
  onReview,
  onTest,
  onHome,
  elapsedMs,
}: ResultsScreenProps) {
  const total = session.logs.length || session.questions.length
  const perfect = total > 0 && session.wrong === 0
  const wrongCount = session.logs.filter((l) => !l.correct).length
  const isTest = session.mode === 'test'

  const entries: MasteryEntry[] = React.useMemo(() => {
    const pool = topic?.questions ?? session.questions
    return pool.map((question) => ({
      question,
      record: getRecord(session.topicId, question.id),
    }))
  }, [topic, session.questions, session.topicId, getRecord])

  const masteredCount = entries.filter((e) => e.record.mastered).length
  const newlyMastered = session.logs.filter((l) => l.masteredNow).length
  const avgTimeMs =
    session.logs.length > 0
      ? session.logs.reduce((acc, l) => acc + (l.timeMs ?? 0), 0) / session.logs.length
      : 0
  const elapsed = formatDuration(elapsedMs)

  return (
    <div className="relative">
      {perfect && <Confetti />}

      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <span
          className={`grid size-14 place-items-center rounded-[var(--radius)] ${
            perfect ? 'bg-gold-soft text-gold' : 'bg-primary-soft text-primary'
          }`}
        >
          {perfect ? (
            <Trophy className="size-7" aria-hidden="true" />
          ) : (
            <PartyPopper className="size-7" aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-4 text-[24px] leading-tight font-semibold sm:text-[28px]">
          {isTest ? 'Practice Test Complete' : 'Quiz Complete'}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">{session.topicName}</p>
        {elapsed && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-faint">
            <Clock className="size-3.5" aria-hidden="true" /> {elapsed} total
            {avgTimeMs > 500 && ` · ~${Math.round(avgTimeMs / 100) / 10}s per card`}
          </p>
        )}

        {perfect ? (
          <motion.p
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18 }}
            className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold-soft px-3.5 py-1.5 text-[13.5px] font-medium text-[hsl(36_82%_32%)]"
          >
            <Trophy className="size-4" aria-hidden="true" />
            Perfect score! You've mastered this set!
          </motion.p>
        ) : (
          newlyMastered > 0 && (
            <p className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold-soft px-3.5 py-1.5 text-[13.5px] font-medium text-[hsl(36_82%_32%)]">
              ⭐ {plural(newlyMastered, 'new question')} mastered this round
            </p>
          )
        )}
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-6"
      >
        <ScoreSummary
          correct={session.correct}
          wrong={session.wrong}
          total={total}
          mastered={masteredCount}
          bestStreak={session.bestStreak}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 grid gap-2.5 sm:grid-cols-2"
      >
        <Button size="lg" onClick={onCram} block className="sm:col-span-2">
          <Zap aria-hidden="true" />
          {masteredCount === entries.length && entries.length > 0
            ? 'Cram Again to Stay Sharp'
            : 'Cram This Deck to 100%'}
        </Button>
        <Button size="lg" variant="secondary" onClick={onRetryWrong} disabled={wrongCount === 0} block>
          <RefreshCw aria-hidden="true" />
          Retry Wrong{wrongCount > 0 ? ` (${wrongCount})` : ''}
        </Button>
        <Button size="lg" variant="secondary" onClick={onReview} block>
          <BookOpenCheck aria-hidden="true" />
          Spaced Review
        </Button>
        <Button size="lg" variant="secondary" onClick={onTest} block>
          <Clock aria-hidden="true" />
          Timed Test Mode
        </Button>
        <Button size="lg" variant="secondary" onClick={onRetryAll} block>
          <Shuffle aria-hidden="true" />
          Shuffle & Retry All
        </Button>
        <Button size="lg" variant="secondary" onClick={onNewNotes} block>
          <FileUp aria-hidden="true" />
          Import New File
        </Button>
        <Button size="lg" variant="secondary" onClick={onHome} block className="sm:col-span-2">
          <Home aria-hidden="true" />
          Back to Topics
        </Button>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8"
        aria-labelledby="review-heading"
      >
        <h2 id="review-heading" className="text-[17px] font-semibold">
          Review Your Answers
        </h2>
        <p className="mt-1 mb-4 text-[13.5px] text-ink-soft">
          {wrongCount
            ? `${plural(wrongCount, 'question')} to revisit before your next run.`
            : 'Every answer in this run was correct.'}
        </p>
        <WrongAnswerList logs={session.logs} />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6"
      >
        <MasterySummary entries={entries} />
      </motion.section>
    </div>
  )
}
