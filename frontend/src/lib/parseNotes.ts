import type { Question, QuestionType } from './types'
import { uid } from './utils'

export interface ParseResult {
  questions: Question[]
  /** Entries that looked like questions but were unusable. */
  skipped: number
}

const NUMBER_PREFIX = /^\s*\(?\d{1,3}\s*[.)\]:-]\s*/
const ANSWER_PREFIX = /^\s*(?:ans|answer|correct answer)\s*[:.-]\s*/i
const BLANK_RUN = /_{2,}/g
const TF_ANSWER = /^\s*(true|false|t|f)\s*$/i
const OPTION_LINE = /^\s*([a-d])\s*[.)\]:-]\s*(.+)$/i

/** MCQ answer patterns: "A", "a", "A and C", "A, C", "A,C,D", "AC" (single letters) */
const MCQ_LETTER_ANSWER = /^\s*([a-d](?:\s*(?:,|and|&)?\s*[a-d]){0,3})\s*$/i

function normalizeBlanks(text: string) {
  return text.replace(BLANK_RUN, '_____')
}

function countBlanks(text: string): number {
  const m = text.match(/_____/g)
  return m ? m.length : 0
}

function tidy(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Splits an answer line into every accepted alternative.
 * Supports "a / b", "a or b", "a, or b".
 */
export function splitAlternatives(raw: string): string[] {
  const parts = raw
    .split(/\s*\/\s*|\s+or\s+|\s*,\s*or\s+/i)
    .map((part) => tidy(part))
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of parts) {
    const key = part.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(part)
  }
  return out
}

interface ParseBuffer {
  promptLines: string[]
  options: { letter: string; text: string; letterIndex: number }[]
  answerLine: string | null
  numberLead: string | null
}

function newBuffer(): ParseBuffer {
  return { promptLines: [], options: [], answerLine: null, numberLead: null }
}

function detectType(buf: ParseBuffer): QuestionType {
  if (buf.options.length >= 2) return 'mcq'
  const prompt = normalizeBlanks(tidy(buf.promptLines.join(' ')))
  const blanks = countBlanks(prompt)
  const hasTrueFalse =
    buf.answerLine && TF_ANSWER.test(buf.answerLine)
  if (hasTrueFalse && blanks === 0 && /\b(true|false)\b/i.test(prompt) === false) {
    // Could be a true/false statement ending in "ans: true"
    return 'boolean'
  }
  if (blanks >= 2) return 'multi'
  if (blanks === 1) return 'typed'
  // No blank + options → mcq; no blank + no options → cloze/typed (definition)
  return 'typed'
}

function buildQuestion(buf: ParseBuffer): Question | null {
  const rawPrompt = tidy(buf.promptLines.join(' ').replace(NUMBER_PREFIX, ''))
  const prompt = normalizeBlanks(rawPrompt)

  if (!buf.answerLine) return null
  const answerRaw = tidy(buf.answerLine.replace(ANSWER_PREFIX, ''))
  if (!prompt || !answerRaw) return null

  const type = detectType(buf)

  if (type === 'boolean') {
    const ans = answerRaw.toLowerCase().startsWith('t')
    // The prompt is a statement; if it's not a blanked prompt, render as statement.
    const statement = prompt
    return {
      id: uid('q'),
      prompt: statement,
      answer: ans ? 'True' : 'False',
      alternatives: [ans ? 'True' : 'False', ans ? 'true' : 'false'],
      type: 'boolean',
      boolAnswer: ans,
    }
  }

  if (type === 'mcq') {
    // Answer is letter(s) like "A", "b", "A and C".
    const lettersMatch = answerRaw.match(MCQ_LETTER_ANSWER)
    const options = buf.options.slice().sort((a, b) => a.letterIndex - b.letterIndex)
    const letterList = options.map((o) => o.letter.toUpperCase())

    let correctLetters: string[] = []
    if (lettersMatch) {
      // Parse letter sequence ignoring separators.
      const seq = lettersMatch[1].toUpperCase().replace(/[^A-D]/g, '')
      correctLetters = [...new Set(seq.split(''))].filter((l) => letterList.includes(l))
    }

    // Fallback: if answer is text, match against options by content.
    if (!correctLetters.length) {
      const alts = splitAlternatives(answerRaw)
      for (const alt of alts) {
        const idx = options.findIndex(
          (o) => o.text.toLowerCase() === alt.toLowerCase(),
        )
        if (idx >= 0) correctLetters.push(options[idx].letter.toUpperCase())
      }
    }

    if (!correctLetters.length) {
      // Try fuzzy contains match.
      const altText = answerRaw.toLowerCase()
      for (const o of options) {
        if (altText.includes(o.text.toLowerCase()) && o.text.length > 3) {
          correctLetters.push(o.letter.toUpperCase())
        }
      }
    }

    if (!correctLetters.length) return null

    const correctIndices = correctLetters
      .map((l) => options.findIndex((o) => o.letter.toUpperCase() === l))
      .filter((i) => i >= 0)
    if (!correctIndices.length) return null

    return {
      id: uid('q'),
      prompt,
      answer: options[correctIndices[0]]?.text ?? '',
      alternatives: correctIndices.map((i) => options[i]?.text ?? '').filter(Boolean),
      type: 'mcq',
      options: options.map((o) => o.text),
      answerIndices: correctIndices,
    }
  }

  if (type === 'multi') {
    // Multiple blanks: answer line should have parts separated by ";" or "|".
    const parts = answerRaw
      .split(/\s*[;|]\s*/)
      .map((p) => splitAlternatives(p))
      .filter((a) => a.length > 0)
    const blanks = countBlanks(prompt)
    if (parts.length !== blanks || parts.length < 2) {
      // Fallback: treat as single typed answer (accept whole phrase).
      const alternatives = splitAlternatives(answerRaw)
      if (!alternatives.length) return null
      return {
        id: uid('q'),
        prompt,
        answer: alternatives[0],
        alternatives,
        type: 'typed',
      }
    }
    return {
      id: uid('q'),
      prompt,
      answer: parts[0][0],
      alternatives: parts,
      type: 'multi',
      blankCount: parts.length,
    }
  }

  // Default: typed single-blank.
  const alternatives = splitAlternatives(answerRaw)
  if (!alternatives.length) return null
  return {
    id: uid('q'),
    prompt,
    answer: alternatives[0],
    alternatives,
    type: 'typed',
  }
}

function isOptionLine(line: string): { letter: string; text: string; idx: number } | null {
  const m = line.match(OPTION_LINE)
  if (m) {
    const letter = m[1].toUpperCase()
    const idx = 'ABCD'.indexOf(letter)
    if (idx < 0) return null
    return { letter, text: tidy(m[2]), idx }
  }
  return null
}

/**
 * Parses mixed-format notes:
 *   - single-fill with ans:
 *   - multi-blank with semicolon separated answers
 *   - MCQ (A. / B. / C. / D.) with letter answer
 *   - true/false statements
 *
 * Lines can be split across lines; options belong to the preceding prompt.
 */
export function parseNotes(input: string): ParseResult {
  const questions: Question[] = []
  let skipped = 0

  if (typeof input !== 'string' || !input.trim()) {
    return { questions, skipped }
  }

  const lines = input.replace(/\r\n?/g, '\n').split('\n')
  let buf = newBuffer()
  let lastFlushedPrompt: string[] = [] // reclaim orphan question if followed by ans:

  const flushOrphan = () => {
    if (buf.promptLines.some((l) => l.trim()) || buf.options.length) {
      // Keep last prompt text to reclaim if an answer line appears next (PDF issue).
      lastFlushedPrompt = [...buf.promptLines]
      skipped += 1
    }
    buf = newBuffer()
  }

  const finalize = () => {
    const q = buildQuestion(buf)
    if (q) questions.push(q)
    else if (buf.promptLines.some((l) => l.trim())) skipped += 1
    buf = newBuffer()
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // Answer line?
    if (ANSWER_PREFIX.test(line)) {
      if (!buf.promptLines.length && lastFlushedPrompt.length) {
        // Reclaim the previous orphan prompt (PDF blank-line gap).
        buf.promptLines = lastFlushedPrompt
        lastFlushedPrompt = []
      }
      buf.answerLine = line
      finalize()
      continue
    }

    // Option line (A. / B. / C. / D.)?
    const opt = isOptionLine(line)
    if (opt) {
      buf.options.push({ letter: opt.letter, text: opt.text, letterIndex: opt.idx })
      continue
    }

    // New question start (numbered line)?
    if (NUMBER_PREFIX.test(line)) {
      if (buf.promptLines.length || buf.options.length) {
        // If we never saw an answer, flush as orphan; else already finalized.
        if (!buf.answerLine) flushOrphan()
      }
      buf.promptLines.push(line)
      continue
    }

    // Otherwise: continuation of current prompt.
    buf.promptLines.push(line)
  }

  if (buf.promptLines.length || buf.options.length) {
    if (!buf.answerLine) flushOrphan()
    else finalize()
  }

  return { questions, skipped }
}

/** Cheap count used for the live indicator while typing. */
export function countParsable(input: string) {
  return parseNotes(input).questions.length
}

/** Detect question type from a pre-built question. */
export function inferQuestionType(q: Question): QuestionType {
  return q.type ?? 'typed'
}
