import type { AnswerStrictness } from './types'

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'for', 'is'])
const STRICT_STOP_WORDS = new Set<string>() // strict mode: no stop words ignored
const LOOSE_EXTRA_STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'and', 'or', 'to', 'in', 'for', 'is',
  'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'that', 'this',
  'as', 'at', 'by', 'with', 'on', 'from',
])

function stopWordsFor(strictness: AnswerStrictness): Set<string> {
  if (strictness === 'strict') return STRICT_STOP_WORDS
  if (strictness === 'loose') return LOOSE_EXTRA_STOP_WORDS
  return STOP_WORDS
}

/** lowercase, strip accents/punctuation, collapse whitespace. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(value: string, _strictness: AnswerStrictness = 'normal'): string[] {
  void _strictness
  return normalizeAnswer(value).split(' ').filter(Boolean)
}

function significant(list: string[], strictness: AnswerStrictness): string[] {
  const stops = stopWordsFor(strictness)
  const kept = list.filter((t) => !stops.has(t))
  return kept.length ? kept : list
}

/** Levenshtein distance, bailing out early once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      rowMin = Math.min(rowMin, curr[j])
    }
    if (rowMin > max) return max + 1
    prev = curr
  }
  return prev[b.length]
}

function nearlyEqual(user: string, target: string, strictness: AnswerStrictness): boolean {
  if (user === target) return true
  if (strictness === 'strict') return false
  const allowedTypos = strictness === 'loose' ? 2 : 1
  const minLen = strictness === 'loose' ? 4 : 6
  if (target.length < minLen || user.length < minLen - 1) return false
  return editDistance(user, target, allowedTypos) <= allowedTypos
}

function matchesAcronym(userTokens: string[], targetTokens: string[]): boolean {
  if (userTokens.length !== 1) return false
  const core = significant(targetTokens, 'normal')
  if (core.length < 2) return false
  const typed = userTokens[0]
  if (typed.length < 2 || typed.length !== core.length) return false
  return core.every((word, i) => word[0] === typed[i])
}

function matchesMeaningfulPart(
  userTokens: string[],
  targetTokens: string[],
  strictness: AnswerStrictness,
): boolean {
  if (strictness === 'strict') return false
  const userCore = significant(userTokens, strictness)
  const targetCore = significant(targetTokens, strictness)
  if (!userCore.length || userCore.length > targetCore.length) return false

  const typedChars = userCore.join('').length
  const minChars = strictness === 'loose' ? 3 : 4
  if (typedChars < minChars) return false
  const coverage = strictness === 'loose' ? 0.4 : 0.5
  if (userCore.length / targetCore.length < coverage) return false

  for (let start = 0; start + userCore.length <= targetCore.length; start++) {
    let ok = true
    for (let i = 0; i < userCore.length; i++) {
      if (!nearlyEqual(userCore[i], targetCore[start + i], strictness)) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

function matchesPrefix(userTokens: string[], targetTokens: string[], strictness: AnswerStrictness): boolean {
  if (strictness === 'strict') return false
  if (userTokens.length !== 1 || targetTokens.length !== 1) return false
  const [typed] = userTokens
  const [target] = targetTokens
  const minTyped = strictness === 'loose' ? 3 : 5
  if (typed.length < minTyped || typed.length >= target.length) return false
  const ratio = strictness === 'loose' ? 0.55 : 0.7
  if (typed.length / target.length < ratio) return false
  return target.startsWith(typed)
}

export interface MatchOutcome {
  correct: boolean
  matched?: string
}

export function gradeAnswer(
  userInput: string,
  alternatives: string[],
  strictness: AnswerStrictness = 'normal',
): MatchOutcome {
  const userTokens = tokens(userInput, strictness)
  if (!userTokens.length) return { correct: false }
  const userNorm = userTokens.join(' ')

  for (const alt of alternatives) {
    const targetTokens = tokens(alt, strictness)
    if (!targetTokens.length) continue
    const targetNorm = targetTokens.join(' ')

    if (userNorm === targetNorm) return { correct: true, matched: alt }
    const userCompact = userNorm.replace(/ /g, '')
    const targetCompact = targetNorm.replace(/ /g, '')
    if (targetCompact.length <= 12 && userCompact.length >= 2 && userCompact === targetCompact) {
      return { correct: true, matched: alt }
    }
    if (significant(userTokens, strictness).join(' ') === significant(targetTokens, strictness).join(' ')) {
      return { correct: true, matched: alt }
    }
    if (targetTokens.length === 1 && nearlyEqual(userNorm, targetNorm, strictness)) {
      return { correct: true, matched: alt }
    }
    if (matchesPrefix(userTokens, targetTokens, strictness)) return { correct: true, matched: alt }
    if (matchesAcronym(userTokens, targetTokens)) return { correct: true, matched: alt }
    if (matchesMeaningfulPart(userTokens, targetTokens, strictness)) return { correct: true, matched: alt }
  }

  return { correct: false }
}

/** Grade a multi-blank answer: each blank is matched positionally; all must pass. */
export function gradeMultiAnswer(
  userAnswers: string[],
  expected: string[][],
  strictness: AnswerStrictness = 'normal',
): { correct: boolean; perBlank: boolean[]; matched: string[] } {
  const perBlank: boolean[] = []
  const matched: string[] = []
  if (userAnswers.length !== expected.length) {
    for (let i = 0; i < expected.length; i++) {
      perBlank.push(false)
      matched.push(expected[i]?.[0] ?? '')
    }
    return { correct: false, perBlank, matched: matched.map((_, i) => expected[i]?.[0] ?? '') }
  }
  let allCorrect = true
  for (let i = 0; i < expected.length; i++) {
    const g = gradeAnswer(userAnswers[i] ?? '', expected[i] ?? [], strictness)
    perBlank.push(g.correct)
    matched.push(g.matched ?? expected[i]?.[0] ?? '')
    if (!g.correct) allCorrect = false
  }
  return { correct: allCorrect, perBlank, matched }
}

/** Grade an MCQ selection (array of selected indices). */
export function gradeMcqAnswer(selected: number[], correctIndices: number[]): boolean {
  if (selected.length !== correctIndices.length) return false
  const a = [...selected].sort((x, y) => x - y)
  const b = [...correctIndices].sort((x, y) => x - y)
  return a.every((v, i) => v === b[i])
}

export function isAnswerCorrect(userInput: string, alternatives: string[], strictness: AnswerStrictness = 'normal'): boolean {
  return gradeAnswer(userInput, alternatives, strictness).correct
}
