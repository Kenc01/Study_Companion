import {
  type MasteryMap,
  type MasteryRecord,
  type Question,
  type Settings,
  type Theme,
  type Topic,
} from './types'

export type { Settings, Theme }

const TOPICS_KEY = 'study-companion:topics:v2'
const MASTERY_KEY = 'study-companion:mastery:v2'
const SETTINGS_KEY = 'study-companion:settings:v1'

function safeRead<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!validate(parsed)) {
      window.localStorage.removeItem(key)
      return fallback
    }
    return parsed
  } catch {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    return fallback
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota or private mode */
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function isMasteryMap(value: unknown): value is MasteryMap {
  return isRecord(value)
}

/** Migrate v1 topics (fill-in only) to v2 shape with explicit types. */
function migrateTopic(t: Record<string, unknown>, idx: number): Topic | null {
  const rawQuestions = Array.isArray(t.questions) ? t.questions : []
  const questions = rawQuestions
    .map((q) => (isRecord(q) ? sanitizeQuestion(q) : null))
    .filter((q): q is Question => q !== null)
  return {
    id: typeof t.id === 'string' ? t.id : `topic_${idx}`,
    name: typeof t.name === 'string' ? t.name : `Topic ${idx + 1}`,
    tags: Array.isArray(t.tags) ? (t.tags as unknown[]).filter((x): x is string => typeof x === 'string') : [],
    color: typeof t.color === 'number' ? Math.max(0, Math.min(5, t.color)) : idx % 6,
    rawNotes: typeof t.rawNotes === 'string' ? t.rawNotes : '',
    createdAt: Number(t.createdAt) || Date.now(),
    updatedAt: Number(t.updatedAt) || Date.now(),
    lastStudiedAt: typeof t.lastStudiedAt === 'number' ? t.lastStudiedAt : undefined,
    questions,
  }
}

function sanitizeTopics(topics: unknown): Topic[] {
  if (!Array.isArray(topics)) return []
  const out: Topic[] = []
  for (let i = 0; i < topics.length; i++) {
    const t = topics[i]
    if (!isRecord(t) || !t.id || !t.name) continue
    const migrated = migrateTopic(t, i)
    if (migrated) out.push(migrated)
  }
  return out
}

function sanitizeMastery(map: MasteryMap): MasteryMap {
  const out: MasteryMap = {}
  for (const [key, value] of Object.entries(map)) {
    if (!isRecord(value)) continue
    const rec = value as MasteryRecord
    out[key] = {
      streak: Number.isFinite(rec.streak) ? Math.max(0, Math.trunc(rec.streak)) : 0,
      mastered: Boolean(rec.mastered),
      correctCount: Number.isFinite(rec.correctCount) ? Math.max(0, rec.correctCount) : 0,
      attempts: Number.isFinite(rec.attempts) ? Math.max(0, rec.attempts) : 0,
      lastSeenAt: Number.isFinite(rec.lastSeenAt) ? rec.lastSeenAt : Date.now(),
      bookmarked: Boolean(rec.bookmarked),
      srs: rec.srs
        ? {
            ease: Number.isFinite(rec.srs.ease) ? rec.srs.ease : 2.5,
            interval: Number.isFinite(rec.srs.interval) ? Math.max(0, rec.srs.interval) : 0,
            dueAt: Number.isFinite(rec.srs.dueAt) ? rec.srs.dueAt : Date.now(),
            lastQuality:
              rec.srs.lastQuality !== undefined && Number.isFinite(rec.srs.lastQuality)
                ? Math.max(0, Math.min(5, rec.srs.lastQuality))
                : undefined,
          }
        : undefined,
    }
  }
  return out
}

function sanitizeSettings(s: unknown): Settings {
  const rec = isRecord(s) ? s : {}
  return {
    theme:
      rec.theme === 'light' || rec.theme === 'dark' || rec.theme === 'system'
        ? (rec.theme as Settings['theme'])
        : 'system',
    strictness:
      rec.strictness === 'loose' || rec.strictness === 'strict'
        ? (rec.strictness as Settings['strictness'])
        : 'normal',
    soundEffects: Boolean(rec.soundEffects),
    showTimer: rec.showTimer !== false,
    autoAdvanceMs:
      typeof rec.autoAdvanceMs === 'number' && Number.isFinite(rec.autoAdvanceMs)
        ? Math.max(0, Math.min(10000, rec.autoAdvanceMs))
        : 0,
    enterSubmits: rec.enterSubmits !== false,
  }
}

function sanitizeQuestion(q: Record<string, unknown>): Question | null {
  if (typeof q.id !== 'string' || typeof q.prompt !== 'string') return null
  const rawAlts = q.alternatives
  let alternatives: string[] | string[][]
  if (Array.isArray(rawAlts) && rawAlts.every((a) => typeof a === 'string')) {
    alternatives = rawAlts as string[]
  } else if (Array.isArray(rawAlts) && rawAlts.every((a) => Array.isArray(a))) {
    alternatives = (rawAlts as unknown[][]).map((arr) =>
      arr.filter((x): x is string => typeof x === 'string'),
    )
  } else {
    alternatives = typeof q.answer === 'string' ? [q.answer] : ['']
  }
  const answer = typeof q.answer === 'string' ? q.answer : (Array.isArray(alternatives[0]) ? (alternatives[0] as string[])[0] : (alternatives[0] as string)) || ''
  const type =
    q.type === 'mcq' || q.type === 'boolean' || q.type === 'multi'
      ? q.type
      : 'typed'
  return {
    id: q.id,
    prompt: q.prompt as string,
    answer,
    alternatives,
    type,
    options: Array.isArray(q.options) ? (q.options as string[]).filter((o): o is string => typeof o === 'string') : undefined,
    answerIndices: Array.isArray(q.answerIndices) ? (q.answerIndices as number[]).filter((n): n is number => typeof n === 'number') : undefined,
    blankCount: typeof q.blankCount === 'number' ? q.blankCount : undefined,
    boolAnswer: typeof q.boolAnswer === 'boolean' ? q.boolAnswer : undefined,
    tags: Array.isArray(q.tags) ? (q.tags as string[]).filter((t): t is string => typeof t === 'string') : [],
    bookmarked: Boolean(q.bookmarked),
    confidence: typeof q.confidence === 'number' ? q.confidence : undefined,
    source: typeof q.source === 'string' ? q.source : undefined,
  }
}

/** Attempt to migrate v1 localStorage keys → v2 shape the first time we load. */
function migrateV1Keys(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(TOPICS_KEY)) return
    const v1t = window.localStorage.getItem('study-companion:topics:v1')
    const v1m = window.localStorage.getItem('study-companion:mastery:v1')
    if (v1t) {
      try {
        const parsed = JSON.parse(v1t) as unknown
        if (Array.isArray(parsed)) {
          const migrated = sanitizeTopics(parsed as Topic[])
          window.localStorage.setItem(TOPICS_KEY, JSON.stringify(migrated))
        }
      } catch {
        /* ignore */
      }
    }
    if (v1m) {
      window.localStorage.setItem(MASTERY_KEY, v1m)
    }
  } catch {
    /* ignore */
  }
}

migrateV1Keys()

export function loadTopics(): Topic[] | null {
  if (typeof window === 'undefined') return null
  let existed = false
  try {
    existed = window.localStorage.getItem(TOPICS_KEY) !== null
  } catch {
    return null
  }
  if (!existed) return null
  return sanitizeTopics(safeRead<unknown[]>(TOPICS_KEY, [], Array.isArray))
}

export function saveTopics(topics: Topic[]) {
  safeWrite(TOPICS_KEY, topics)
}

export function loadMastery(): MasteryMap {
  return sanitizeMastery(safeRead(MASTERY_KEY, {} as MasteryMap, isMasteryMap))
}

export function saveMastery(mastery: MasteryMap) {
  safeWrite(MASTERY_KEY, mastery)
}

export function loadSettings(): Settings {
  const raw = safeRead<Record<string, unknown>>(SETTINGS_KEY, {}, isRecord)
  return sanitizeSettings(raw)
}

export function saveSettings(s: Settings) {
  safeWrite(SETTINGS_KEY, s)
}

export function masteryKey(topicId: string, questionId: string) {
  return `${topicId}:${questionId}`
}
