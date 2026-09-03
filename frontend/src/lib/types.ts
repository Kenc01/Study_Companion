export type Screen =
  | 'home'
  | 'paste'
  | 'import'
  | 'quiz'
  | 'results'
  | 'review'
  | 'settings'

export type QuestionType = 'typed' | 'mcq' | 'boolean' | 'multi'

/**
 * A question in a topic deck. `type` controls how it is rendered/graded:
 *  - 'typed'   : single-blank fill-in (original behaviour)
 *  - 'mcq'     : multiple-choice — `options` holds shuffled choices, `answerIndices` the correct ones
 *  - 'boolean' : true/false
 *  - 'multi'   : multiple blanks in one prompt (typed answers, checked in order)
 */
export interface Question {
  id: string
  prompt: string
  /** Primary accepted answer (for single-answer questions) or first blank for multi-blank. */
  answer: string
  /** Every accepted answer for single-answer questions, or blank-by-blank alternatives for multi. */
  alternatives: string[] | string[][]
  type: QuestionType
  /** Options shown to the user (MCQ). May include distractors. */
  options?: string[]
  /** Index(es) into `options` that are correct. Length > 1 means multi-select MCQ. */
  answerIndices?: number[]
  /** For 'multi' type: number of blanks in the prompt (matches alternatives.length). */
  blankCount?: number
  /** True/false question: which is correct. */
  boolAnswer?: boolean
  /** User-facing tags set per card (e.g. "tricky", "formula"). */
  tags?: string[]
  /** Manual "star this as hard" flag. */
  bookmarked?: boolean
  /** Extraction confidence for imported questions (0-1). */
  confidence?: number
  /** Which heuristic produced this card. */
  source?: string
}

export interface Topic {
  id: string
  name: string
  /** Topic-level tags (e.g. subject, midterm). */
  tags?: string[]
  /** Colour accent index for the card, 0–5. */
  color?: number
  /** Original pasted notes, kept verbatim so editing is lossless. */
  rawNotes: string
  questions: Question[]
  createdAt: number
  updatedAt: number
  lastStudiedAt?: number
}

/** SM-2 spaced-repetition record for a single card. */
export interface SchedulingData {
  /** Ease factor (SM-2), default 2.5. */
  ease: number
  /** Consecutive correct repetitions. */
  interval: number // in days
  /** Next review due timestamp (ms since epoch). */
  dueAt: number
  /** 0-5 quality of last review (SM-2). */
  lastQuality?: number
}

/**
 * Per-question mastery record, keyed by `${topicId}:${questionId}`.
 * Mastery (streak-based) remains for the Cram flow; scheduling powers
 * spaced-repetition reviews.
 */
export interface MasteryRecord {
  streak: number
  mastered: boolean
  correctCount: number
  attempts: number
  lastSeenAt: number
  bookmarked?: boolean
  /** SM-2 scheduling — absent for cards that have never been reviewed. */
  srs?: SchedulingData
}

export type MasteryMap = Record<string, MasteryRecord>

export interface AnswerLog {
  questionId: string
  prompt: string
  answer: string
  userAnswer: string
  correct: boolean
  streakAfter: number
  masteredNow: boolean
  /** Time taken to answer, in milliseconds (best-effort). */
  timeMs?: number
}

/**
 * 'all'       — every question once, shuffled
 * 'wrong'     — only the questions missed last attempt
 * 'cram'      — repeats missed questions until each is answered correctly
 * 'review'    — spaced-repetition: only cards due today (or overdue)
 * 'bookmarked'— only starred/hard questions
 * 'test'      — timed practice test: no feedback until end
 */
export type QuizMode = 'all' | 'wrong' | 'cram' | 'review' | 'bookmarked' | 'test'

export interface QuizSession {
  topicId: string
  topicName: string
  /** Questions in play, already shuffled. */
  questions: Question[]
  index: number
  logs: AnswerLog[]
  correct: number
  wrong: number
  streak: number
  bestStreak: number
  startedAt: number
  mode: QuizMode
  /** Timer for test mode (ms limit). Undefined = untimed. */
  timeLimitMs?: number
  /** For multi-blank questions: index of the blank currently focused. */
  activeBlank?: number
  /**
   * Cram mode only: ids still awaiting a correct answer. A question leaves
   * this set once answered correctly, and is re-queued when missed.
   */
  pendingIds?: string[]
  /** Cram mode only: how many distinct questions have been cleared. */
  clearedCount?: number
  /**
   * Cram mode only: the deck's original size.
   */
  totalCount?: number
  /** Cram mode only: total passes made through the deck. */
  round?: number
  /** True once the current question is graded and awaiting "Next". */
  awaitingNext: boolean
  /** Increments every time a question is presented. */
  step: number
  /** Hint state per card step — how much of the answer to reveal. */
  hintLevel?: 0 | 1 | 2 | 3 // 0 none, 1 word count, 2 first letter, 3 reveal
}

export type Theme = 'light' | 'dark' | 'system'
export type AnswerStrictness = 'loose' | 'normal' | 'strict'

export interface Settings {
  theme: Theme
  strictness: AnswerStrictness
  soundEffects: boolean
  showTimer: boolean
  autoAdvanceMs?: number // 0 = off
  enterSubmits: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  strictness: 'normal',
  soundEffects: false,
  showTimer: true,
  autoAdvanceMs: 0,
  enterSubmits: true,
}

export const MASTERY_THRESHOLD = 3

/** SRS defaults for SM-2. */
export const SRS_DEFAULTS = {
  INITIAL_EASE: 2.5,
  FIRST_INTERVAL: 1, // days after first correct
  SECOND_INTERVAL: 6, // days after second correct
  MIN_EASE: 1.3,
  EASE_BONUS: 0.15, // for quality 5
  EASE_PENALTY: 0.2, // for quality < 3
}

/** File format for export/import & future backend sync. */
export interface StudyCompanionExport {
  version: 2
  exportedAt: number
  topics: Topic[]
  mastery: MasteryMap
  settings: Settings
}
