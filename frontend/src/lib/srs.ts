import { SRS_DEFAULTS, type MasteryRecord, type SchedulingData } from './types'

const DAY = 86_400_000

/**
 * SM-2 scheduler.
 * quality is 0–5 (5 = perfect recall with no effort, 0 = blackout).
 * For our flow we map:
 *   - wrong answer           → quality 1 (reset interval)
 *   - correct but with hint  → quality 3
 *   - correct                → quality 4
 *   - correct on first try, fast, no hint use → quality 5
 */
export function schedule(
  prev: SchedulingData | undefined,
  quality: number,
  now: number = Date.now(),
): SchedulingData {
  const q = Math.max(0, Math.min(5, quality))
  const prevEase = prev?.ease ?? SRS_DEFAULTS.INITIAL_EASE
  const prevInterval = prev?.interval ?? 0

  let ease: number
  let interval: number

  if (q < 3) {
    // Failed — re-show soon; reset repetitions.
    interval = 0 // due today
    ease = Math.max(SRS_DEFAULTS.MIN_EASE, prevEase - SRS_DEFAULTS.EASE_PENALTY)
  } else {
    ease = Math.max(
      SRS_DEFAULTS.MIN_EASE,
      prevEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
    )
    if (prevInterval === 0) {
      interval = SRS_DEFAULTS.FIRST_INTERVAL
    } else if (prevInterval === SRS_DEFAULTS.FIRST_INTERVAL) {
      interval = SRS_DEFAULTS.SECOND_INTERVAL
    } else {
      interval = Math.round(prevInterval * ease)
    }
  }

  const dueAt = q < 3 ? now + 10 * 60 * 1000 : now + interval * DAY
  return { ease, interval, dueAt, lastQuality: q }
}

/** Cards due today or earlier. */
export function isDue(rec: MasteryRecord | undefined, now: number = Date.now()): boolean {
  if (!rec?.srs) return true // never reviewed → due immediately
  return rec.srs.dueAt <= now
}

/** Map UI correctness + context into an SM-2 quality score. */
export function qualityFromResult(params: {
  correct: boolean
  hintsUsed?: number // 0-3
  firstTry?: boolean
  fastAnswer?: boolean
}): number {
  if (!params.correct) return 1
  if (params.hintsUsed && params.hintsUsed >= 2) return 3
  if (params.hintsUsed === 1) return 3
  if (params.fastAnswer && params.firstTry) return 5
  return 4
}
