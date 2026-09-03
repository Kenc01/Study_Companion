import type { Question } from './types'
import { uid } from './utils'

/**
 * Turns arbitrary reviewer text into quiz questions.
 *
 * Strategy, in priority order:
 *   1. Explicit `ans:` notes            (the original hand-written format)
 *   2. Q&A pairs                        ("Q: ... A: ...", "1. What is X? Answer: Y")
 *   3. Numbered questions + answer key  (questions, then "1. B  2. A" at the end)
 *   4. Term – definition lists          ("Encryption - converts data ...")
 *   5. Cloze generation from prose      ("X is the process of ..." -> "_____ is the ...")
 *
 * Everything it cannot use is reported back so the learner can see the gaps
 * rather than silently losing exam material.
 */

export type ExtractionMethod =
  | 'ans-format'
  | 'qa-pair'
  | 'answer-key'
  | 'definition'
  | 'cloze'

export interface DraftQuestion extends Question {
  method: ExtractionMethod
  /** Lower = less certain; drives the "needs a look" flag in review. */
  confidence: number
  /** Text this was derived from, for the review list. */
  source: string
  include: boolean
}

export interface ExtractionReport {
  drafts: DraftQuestion[]
  /** Lines that looked meaningful but produced no question. */
  unused: string[]
  counts: Record<ExtractionMethod, number>
  totalLines: number
}

const BLANK = '_____'

const ANSWER_LINE = /^\s*(?:ans|answer|answers|correct answer|key)\s*[:.-]\s*(.+)$/i
/** Bare "A: ..." — only trusted when a question is already pending. */
const ANSWER_LINE_LOOSE = /^\s*a\s*[:.]\s*(.+)$/i
const QUESTION_LEAD = /^\s*(?:q(?:uestion)?\s*\d*\s*[:.)-]|\(?\d{1,3}[.)\]]|[-*•]\s)\s*/i
const NUMBER_LEAD = /^\s*\(?(\d{1,3})[.)\]]\s*/
/** Matches the first "term / definition" separator: " - ", " — ", " – " or ": ". */
const DEFINITION_SPLIT = /\s+[–—]\s+|\s+-{1,2}\s+|\s*:\s+/
const STOP_START = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'there',
  'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'but', 'if', 'when',
  'however', 'therefore', 'thus', 'also', 'such', 'both', 'each', 'some',
])

const HEADING_WORDS =
  /^(chapter|unit|module|lesson|section|part|topic|midterm|final|exam|reviewer|quiz|prelim|outline|references?|table of contents|objectives?)\b/i

function tidy(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function stripLead(s: string) {
  return tidy(s.replace(QUESTION_LEAD, ''))
}

function isHeading(line: string) {
  const t = tidy(line)
  if (!t) return false
  if (t.length < 60 && HEADING_WORDS.test(t)) return true
  // ALL CAPS short line with no terminal punctuation
  if (t.length < 60 && t === t.toUpperCase() && /[A-Z]{3}/.test(t) && !/[.?]$/.test(t)) return true
  return false
}

function splitAlternatives(raw: string): string[] {
  const parts = raw
    .split(/\s*\/\s*|\s+or\s+|\s*,\s*or\s+/i)
    .map(tidy)
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of parts) {
    const k = p.toLowerCase()
    if (!seen.has(k)) {
      seen.add(k)
      out.push(p)
    }
  }
  return out.length ? out : [tidy(raw)]
}

/**
 * Recognises a standalone "Term - definition" line. Returns null when the
 * shape doesn't fit, so the caller can fall back to normal buffering.
 */
function tryDefinition(line: string, confidence = 0.8): DraftQuestion | null {
  const joined = tidy(line)
  if (!joined || /\?$/.test(joined)) return null
  if (ANSWER_LINE.test(joined)) return null

  // Split on the FIRST separator only — definitions frequently contain
  // further dashes or colons that must stay in the definition text.
  const sep = joined.match(DEFINITION_SPLIT)
  if (!sep || sep.index === undefined) return null

  const term = tidy(joined.slice(0, sep.index).replace(QUESTION_LEAD, ''))
  const def = tidy(joined.slice(sep.index + sep[0].length))
  if (!term || !def) return null
  if (term.length < 3 || term.length > 60) return null
  if (term.split(' ').length > 6) return null
  if (def.length < 15) return null
  if (/\?$/.test(term)) return null
  if (STOP_START.has(term.split(' ')[0].toLowerCase())) return null

  return makeDraft(`${BLANK} — ${def}`, term, 'definition', confidence, joined)
}

function makeDraft(
  prompt: string,
  answerRaw: string,
  method: ExtractionMethod,
  confidence: number,
  source: string,
): DraftQuestion | null {
  const p = tidy(prompt)
  const alternatives = splitAlternatives(answerRaw)
  const answer = alternatives[0]
  if (!p || !answer) return null
  if (p.length < 8 || answer.length > 160) return null
  return {
    id: uid('q'),
    prompt: p,
    answer,
    alternatives,
    type: 'typed' as const,
    tags: [],
    method,
    confidence,
    source: tidy(source).slice(0, 400),
    include: true,
  }
}

/* ------------------------------------------------------------------ */
/*  Strategy 3 — answer key at the end of the document                 */
/* ------------------------------------------------------------------ */

/** Parses "1. B  2. Encryption  3) A" style keys into a number->answer map. */
function parseAnswerKey(text: string): Map<number, string> {
  const map = new Map<number, string>()
  const keyHeader = /answer\s*key|answers?\s*[:\n]/i
  const idx = text.search(keyHeader)
  if (idx === -1) return map

  const tail = text.slice(idx)
  const re = /(?:^|[\s;,])\(?(\d{1,3})[.):]\s*([^\n;,]{1,120}?)(?=(?:[\s;,]\(?\d{1,3}[.):])|\n|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(tail)) !== null) {
    const n = Number(m[1])
    const val = tidy(m[2])
    if (n > 0 && val && val.length < 120 && !map.has(n)) map.set(n, val)
  }
  return map
}

/* ------------------------------------------------------------------ */
/*  Strategy 5 — cloze generation from definition-style sentences      */
/* ------------------------------------------------------------------ */

const CLOZE_PATTERNS: RegExp[] = [
  /^(.{3,60}?)\s+(is|are|was|were)\s+(?:the\s+|a\s+|an\s+)?(process|method|practice|act|study|ability|system|technique|state|property|principle|concept|term|type|form|branch|measure|component|protocol|attack|device|layer)\b(.{10,})$/i,
  /^(.{3,60}?)\s+(?:is|are)\s+defined\s+as\s+(.{10,})$/i,
  /^(.{3,60}?)\s+(?:refers?\s+to|means|denotes|describes)\s+(.{10,})$/i,
  /^(.{3,60}?)\s+(is|are)\s+(?:used\s+to|responsible\s+for|essential\s+for|known\s+as|called)\s+(.{10,})$/i,
]

function clozeFromSentence(sentence: string): DraftQuestion | null {
  const s = tidy(sentence)
  if (s.length < 30 || s.length > 320) return null
  if (/^\s*(?:figure|table|source|note|see)\b/i.test(s)) return null

  for (const pattern of CLOZE_PATTERNS) {
    const m = s.match(pattern)
    if (!m) continue
    const subject = tidy(m[1]).replace(/^(?:the|a|an)\s+/i, '')
    if (!subject || subject.length < 3 || subject.length > 60) continue
    const first = subject.split(' ')[0].toLowerCase()
    if (STOP_START.has(first)) continue
    if (subject.split(' ').length > 7) continue
    // Rebuild the sentence with the subject blanked out.
    const rest = s.slice(m[1].length)
    const prompt = `${BLANK}${rest}`
    const draft = makeDraft(prompt, subject, 'cloze', 0.6, s)
    if (draft) return draft
  }
  return null
}

function splitSentences(block: string): string[] {
  return block
    .replace(/([.?!])\s+(?=[A-Z(])/g, '$1\u0001')
    .split('\u0001')
    .map(tidy)
    .filter(Boolean)
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export function autoExtractQuestions(rawText: string): ExtractionReport {
  const counts: Record<ExtractionMethod, number> = {
    'ans-format': 0,
    'qa-pair': 0,
    'answer-key': 0,
    definition: 0,
    cloze: 0,
  }
  const drafts: DraftQuestion[] = []
  const unused: string[] = []

  if (!rawText || !rawText.trim()) {
    return { drafts, unused, counts, totalLines: 0 }
  }

  const text = rawText.replace(/\r\n?/g, '\n')
  const allLines = text.split('\n')
  const answerKey = parseAnswerKey(text)

  // Ignore the answer-key block itself when scanning for questions.
  const keyIdx = text.search(/answer\s*key/i)
  const body = keyIdx > 0 ? text.slice(0, keyIdx) : text
  const lines = body.split('\n')

  const seenPrompt = new Set<string>()
  const push = (d: DraftQuestion | null) => {
    if (!d) return false
    const key = d.prompt.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seenPrompt.has(key)) return false
    seenPrompt.add(key)
    drafts.push(d)
    counts[d.method] += 1
    return true
  }

  let buffer: string[] = []
  let bufferNumber: number | null = null
  const proseBlocks: string[] = []
  /** Index in proseBlocks of the block flushed immediately before now. */
  let lastFlushedIdx: number | null = null
  let lastFlushedNumber: number | null = null
  void lastFlushedNumber

  const flushBuffer = () => {
    const joined = tidy(buffer.join(' '))
    buffer = []
    const num = bufferNumber
    bufferNumber = null
    if (!joined) return

    // A numbered question whose answer lives in the answer key.
    if (num !== null && answerKey.has(num)) {
      const prompt = stripLead(joined)
      if (push(makeDraft(prompt, answerKey.get(num)!, 'answer-key', 0.95, joined))) return
    }

    // "Question ... ? Answer ..." collapsed onto one line.
    const inlineQA = joined.match(
      /^(.{8,}?\?)\s*(?:ans|answer|a)\s*[:.-]\s*(.{1,160})$/i,
    )
    if (inlineQA) {
      if (push(makeDraft(stripLead(inlineQA[1]), inlineQA[2], 'qa-pair', 0.95, joined))) return
    }

    // Term – definition
    if (push(tryDefinition(joined))) return

    // Leftover prose gets cloze treatment later — but remember it, in case the
    // very next line turns out to be its answer (blank line in between).
    lastFlushedIdx = proseBlocks.length
    lastFlushedNumber = num
    proseBlocks.push(joined)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const t = tidy(line)

    if (!t) {
      // Keep lastFlushedIdx intact: the answer may follow after this gap.
      flushBuffer()
      continue
    }
    if (isHeading(t)) {
      flushBuffer()
      lastFlushedIdx = null
      lastFlushedNumber = null
      continue
    }

    // Explicit answer line closes the current buffer.
    const strictAns = t.match(ANSWER_LINE)
    const looseAns =
      !strictAns && (buffer.length || lastFlushedIdx !== null) ? t.match(ANSWER_LINE_LOOSE) : null
    const ansMatch = strictAns ?? looseAns

    if (ansMatch) {
      let prompt = stripLead(buffer.join(' '))
      buffer = []
      bufferNumber = null

      // A blank line often separates the question from its "ans:" line, which
      // means the question was already flushed into proseBlocks. Reclaim it.
      if (!prompt && lastFlushedIdx !== null && lastFlushedIdx === proseBlocks.length - 1) {
        prompt = stripLead(proseBlocks[lastFlushedIdx])
        proseBlocks.pop()
      }

      if (prompt) {
        const method: ExtractionMethod = prompt.includes(BLANK) ? 'ans-format' : 'qa-pair'
        push(makeDraft(prompt, ansMatch[1], method, 1, `${prompt} / ${ansMatch[1]}`))
      } else {
        unused.push(t)
      }
      lastFlushedIdx = null
      lastFlushedNumber = null
      continue
    }

    // A self-contained "Term - definition" line stands alone, so it must be
    // detected here — consecutive definitions have no blank line between them
    // and would otherwise merge into a single buffer.
    const nextLine = tidy(lines[i + 1] ?? '')
    const nextIsAnswer = ANSWER_LINE.test(nextLine)
    if (!buffer.length && !nextIsAnswer) {
      const def = tryDefinition(t)
      if (def && push(def)) continue
    }

    // A new numbered item starts a new buffer.
    const numMatch = t.match(NUMBER_LEAD)
    if (numMatch && buffer.length) flushBuffer()
    if (numMatch) bufferNumber = Number(numMatch[1])

    if (buffer.length === 0 && !numMatch) {
      // Starting fresh, unrelated content — previous block is settled.
      lastFlushedIdx = lastFlushedIdx === proseBlocks.length - 1 ? lastFlushedIdx : null
    }
    buffer.push(t)
  }
  flushBuffer()

  // Cloze pass over the remaining prose.
  for (const block of proseBlocks) {
    let made = false
    for (const sentence of splitSentences(block)) {
      const draft = clozeFromSentence(sentence)
      if (draft && push(draft)) made = true
    }
    if (!made && block.length > 40 && !isHeading(block)) {
      unused.push(block.slice(0, 220))
    }
  }

  return { drafts, unused, counts, totalLines: allLines.length }
}

export function methodLabel(method: ExtractionMethod): string {
  switch (method) {
    case 'ans-format':
      return 'Notes format'
    case 'qa-pair':
      return 'Q&A pair'
    case 'answer-key':
      return 'Answer key'
    case 'definition':
      return 'Definition'
    case 'cloze':
      return 'Auto-blanked'
  }
}
