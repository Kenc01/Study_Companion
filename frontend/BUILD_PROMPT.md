# Build Prompt — "Study Companion" Reviewer Import + Cram Mode

> Paste everything below this line into your coding agent. It is written to be
> self-contained: it specifies behaviour, algorithms, edge cases, and the exact
> tests that must pass. Delete the two "ADAPT" notes at the end if you are
> building the whole app rather than bolting the feature onto an existing one.

---

## 0. What you are building

A **frontend-only** study/flashcard quiz app called **Study Companion**. Users
either paste fill-in-the-blank notes or **upload an exam reviewer (PDF / Word /
text)**, and the app extracts every question it can find into a quiz deck. A
**Cram mode** then repeats missed questions until every single one has been
answered correctly.

**Hard constraints:**

- No backend, no API, no server, no AI/LLM calls. Everything runs in the browser.
- All data persists in `localStorage`.
- File parsing happens client-side.
- Every visible control must work. No placeholder buttons.
- Do not include OCR. Scanned/image-only PDFs must fail with a clear message.

**Critical framing:** the extractor is a **deterministic pattern matcher**, not a
semantic understander. Do not pretend otherwise in the UI. Because it can miss
things, the design compensates with a mandatory **review step** that shows the
user everything found *and* everything skipped, so coverage is verifiable rather
than assumed. This is a core product requirement, not a nicety.

---

## 1. Stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4 (via `@tailwindcss/vite`; tokens declared with `@theme inline`)
- Framer Motion — screen transitions and list animations
- `lucide-react` — icons
- `clsx` + `tailwind-merge` (a `cn()` helper) + `class-variance-authority`
- `pdfjs-dist` — PDF text extraction
- `mammoth` — DOCX text extraction
- shadcn/ui-*style* primitives, hand-written (Button, Card, Input, Textarea,
  Badge, Progress, Dialog, Tooltip). Do not install the shadcn CLI.

**Bundle rule:** `pdfjs-dist` and `mammoth` must be **dynamically imported**
inside the extraction functions so they are code-split and cost nothing until a
user actually imports a file. Verify in the build output that they emit as
separate chunks.

Path alias `@/*` → `./src/*` in both `vite.config.ts` and `tsconfig.app.json`.

---

## 2. Design system

Light, calm, productivity-focused. **Avoid:** purple gradients, glassmorphism,
oversized hero sections, generic-dashboard styling.

Define these as CSS variables on `:root` and expose them to Tailwind via
`@theme inline`. Use exactly these HSL values:

```css
:root {
  /* Surfaces */
  --page: 210 33% 97%;
  --page-deep: 213 30% 94%;
  --card: 0 0% 100%;
  --card-muted: 210 33% 98%;

  /* Ink */
  --ink: 218 43% 14%;
  --ink-soft: 217 19% 38%;
  --ink-faint: 216 15% 55%;

  /* Brand — dark navy */
  --primary: 218 52% 18%;
  --primary-hover: 218 52% 24%;
  --primary-ink: 0 0% 100%;
  --primary-soft: 218 60% 96%;
  --primary-soft-ink: 218 52% 24%;

  /* Semantics */
  --success: 152 62% 32%;
  --success-soft: 150 60% 96%;
  --success-border: 150 45% 80%;
  --danger: 0 65% 48%;
  --danger-soft: 4 80% 97%;
  --danger-border: 4 70% 86%;
  --gold: 40 92% 47%;
  --gold-soft: 44 96% 94%;

  /* Lines & focus */
  --border: 214 26% 89%;
  --border-strong: 214 22% 82%;
  --ring: 218 60% 42%;

  /* Radii */
  --radius: 12px;
  --radius-sm: 10px;
  --radius-lg: 16px;
}
```

- Font: **Poppins** (Google Fonts), weights 400/500/600/700.
- Green = correct, red = wrong, gold = mastery/cram. Never rely on colour alone —
  always pair with an icon and text.
- Body background: soft cool-gray plus two very subtle radial tints
  (navy top-left, cyan top-right). No loud gradients.
- Respect `prefers-reduced-motion`: disable animations and skip confetti.

---

## 3. Data model

```ts
export type Screen = 'home' | 'paste' | 'import' | 'quiz' | 'results'
export type QuizMode = 'all' | 'wrong' | 'cram'

export interface Question {
  id: string              // stable; mastery is keyed to this
  prompt: string          // keeps the visible '_____' marker
  answer: string          // primary accepted answer
  alternatives: string[]  // all accepted answers, including the primary
}

export interface Topic {
  id: string
  name: string
  rawNotes: string        // verbatim source, so editing is lossless
  questions: Question[]
  createdAt: number
  updatedAt: number
  lastStudiedAt?: number
}

export interface MasteryRecord {
  streak: number
  mastered: boolean
  correctCount: number
  attempts: number
  lastSeenAt: number
}
export type MasteryMap = Record<string, MasteryRecord>  // key: `${topicId}:${questionId}`

export interface AnswerLog {
  questionId: string
  prompt: string
  answer: string
  userAnswer: string
  correct: boolean
  streakAfter: number
  masteredNow: boolean
}

export interface QuizSession {
  topicId: string
  topicName: string
  questions: Question[]   // already shuffled
  index: number
  logs: AnswerLog[]
  correct: number
  wrong: number
  streak: number
  bestStreak: number
  startedAt: number
  mode: QuizMode
  awaitingNext: boolean   // true once graded, before advancing
  step: number            // increments on EVERY question presentation
  // Cram only:
  pendingIds?: string[]   // ids not yet answered correctly
  clearedCount?: number
  totalCount?: number     // ORIGINAL deck size — see §6 pitfall
  round?: number
}

export const MASTERY_THRESHOLD = 3
```

localStorage keys: `study-companion:topics:v1`, `study-companion:mastery:v1`.

**Storage must be defensive.** Wrap all reads in try/catch, validate the parsed
shape, sanitize each record, and drop anything malformed instead of throwing. A
corrupted value must never white-screen the app. Distinguish "key absent"
(→ seed sample data) from "key present but empty array" (→ genuinely empty
library; do **not** re-seed).

---

## 4. Screens

`home` · `paste` · `import` · `quiz` · `results`, switched by client-side state
and wrapped in `<AnimatePresence mode="wait">` with fade+slide transitions.
Max widths: home `1100px`, forms `900px`, quiz/results `850px`.

### Home
Header (graduation-cap icon, title, subtitle: `"X topics"` or
`"Create your first quiz topic"`), buttons **Import File** (primary) and
**New Topic** (secondary). Three summary tiles: topics / total cards /
mastered + %. Responsive topic grid: 1 col mobile, 2 tablet, 3 desktop.

**Topic card:** book icon, name, card count, relative "last studied", gold star
+ mastery %, thin progress bar, full-width **Start Quiz**, plus icon-only
**Cram** (zap), **Edit** (pencil), **Delete** (trash). Every icon-only button
needs a tooltip *and* an `aria-label`. Cards animate in with fade+scale, use
`h-full` so a row's cards match height, and push the mastery block down with
`mt-auto`.

Delete opens a modal confirm (focus trap, Escape closes, backdrop click closes,
focus restored on close).

### Import (the new screen — see §5)
Two stages: **upload** → **review**.

### Quiz
Top bar: exit button, topic name, progress text, thin progress bar.
Stats row of 5: Correct (green), Wrong (red), Left, Mastered (gold star), Streak
(flame). On mobile lay these out as a **3 + 2 grid** (`grid-cols-6` with
col-spans of 2/2/2 then 3/3), 5-across from `sm:` up.

Question card: "Fill in the blank" pill, question ≥18px with generous
line-height, the `_____` rendered as a visible styled blank (underline +
subtle highlight) with an `sr-only` "blank" for screen readers. Give the card a
min-height (~340px mobile / 380px desktop) so the layout doesn't jump between
short and long questions.

Answer area: labelled input (placeholder `Type your answer...`), Submit button
with arrow icon, Enter submits. Input autofocuses on each new question. After
grading: input becomes read-only, feedback panel appears, full-width
**Next Question** button appears and receives focus; Enter advances.

Feedback — correct: green panel, check icon, "Correct!". Wrong: red panel, X
icon, "Wrong." plus "The correct answer is: X". If the answer just hit 3-in-a-row,
show a gold "Mastered" badge.

### Results
Completion icon, "Quiz Complete", topic name. Perfect score → gold trophy,
"Perfect score! You've mastered this set!" and a lightweight confetti burst
(pure CSS/Framer, no library; skipped under reduced motion).

Score summary: animated SVG ring showing `correct / total` and %, plus metric
tiles for correct, wrong, mastered, best streak.

Actions: **Cram This Deck to 100%** (primary, full width), **Retry Wrong
Answers (n)** (disabled at 0), **Retry All (Shuffled)**, **Import New File**,
**Back to Topics**.

Review section listing every wrong answer (number, full question, your answer,
correct answer). If none, show a positive empty state. Mastery section splits
mastered (gold stars) from still-needs-practice (neutral icon + `n/3` progress).

---

## 5. FEATURE A — Reviewer import

### 5.1 Text extraction (`src/lib/extractText.ts`)

Accept `.pdf`, `.docx`, `.txt`, `.md`. Reject `.doc` with an explicit "save as
.docx or PDF" message. Max 25 MB.

- **PDF** — `pdfjs-dist`, worker via `?url` import. Reconstruct lines from each
  text item's y-coordinate (`transform[5]`, new line when Δy > 2) and `hasEOL`.
  Call `page.cleanup()` per page. If the result is empty, throw: the PDF is
  likely scanned — tell the user to use a text-based PDF or paste directly.
- **DOCX** — `mammoth.extractRawText`.
- **Plain text** — `file.text()`.

Then run **`cleanDocumentText`**, which must:
1. Normalise `\r\n` → `\n` and non-breaking spaces.
2. Strip control characters (keep `\n`/`\t`).
3. **Rejoin words hyphenated across a line break**: `encryp-\ntion` → `encryption`.
4. **Remove repeated page furniture** — count identical trimmed lines (length
   4–79) and drop any appearing ≥ `max(3, 60% of page count)`.
5. Drop bare page-number lines (`^\d{1,4}$`, `Page 3`, `3 / 12`).
6. Collapse runs of spaces and 3+ blank lines.

Throw a typed `ExtractError` for all user-facing failures so the UI can show the
message verbatim; wrap anything else in a generic "couldn't read that file".

### 5.2 Question extraction (`src/lib/autoExtract.ts`)

Signature:

```ts
autoExtractQuestions(rawText: string): {
  drafts: DraftQuestion[]      // Question + method, confidence, source, include
  unused: string[]             // meaningful text that produced no question
  counts: Record<ExtractionMethod, number>
  totalLines: number
}

type ExtractionMethod = 'ans-format' | 'qa-pair' | 'answer-key' | 'definition' | 'cloze'
```

Scan **line by line**, buffering the current question, and apply these
strategies in priority order:

**1. `ans-format`** — a line matching
`/^\s*(?:ans|answer|answers|correct answer|key)\s*[:.-]\s*(.+)$/i` closes the
buffered prompt. Strip any leading number. Method is `ans-format` when the
prompt contains `_____`, else `qa-pair`.

**2. `qa-pair`** — `Q: … / A: …`. Also handle a collapsed single line:
`/^(.{8,}?\?)\s*(?:ans|answer|a)\s*[:.-]\s*(.{1,160})$/i`.
A **bare `A:`** line (`/^\s*a\s*[:.]\s*(.+)$/i`) is only trusted when a question
is actually pending — otherwise a lettered list item would hijack it.

**3. `answer-key`** — find a header matching `/answer\s*key|answers?\s*[:\n]/i`,
parse the tail into a `Map<number, string>` with
`/(?:^|[\s;,])\(?(\d{1,3})[.):]\s*([^\n;,]{1,120}?)(?=(?:[\s;,]\(?\d{1,3}[.):])|\n|$)/g`,
and match those numbers to the numbered questions in the body. **Exclude the key
block itself from question scanning.**

**4. `definition`** — a standalone `Term - definition` line. Split on the
**first** separator only (` - `, ` — `, ` – `, `: `) because definitions often
contain further dashes. Requires: term 3–60 chars and ≤6 words, definition ≥15
chars, term not ending in `?`, term not starting with a stop word. Produces
prompt `_____ — {definition}` with the term as the answer.
**This must be detected per-line**, before buffering, since consecutive
definitions have no blank line between them and would otherwise merge.

**5. `cloze`** — for leftover prose, split into sentences and blank the subject
of definition-shaped sentences. Confidence `0.6`; flag as "worth checking" in
the UI. Patterns:

```
/^(.{3,60}?)\s+(is|are|was|were)\s+(?:the\s+|a\s+|an\s+)?(process|method|practice|act|study|ability|system|technique|state|property|principle|concept|term|type|form|branch|measure|component|protocol|attack|device|layer)\b(.{10,})$/i
/^(.{3,60}?)\s+(?:is|are)\s+defined\s+as\s+(.{10,})$/i
/^(.{3,60}?)\s+(?:refers?\s+to|means|denotes|describes)\s+(.{10,})$/i
/^(.{3,60}?)\s+(is|are)\s+(?:used\s+to|responsible\s+for|essential\s+for|known\s+as|called)\s+(.{10,})$/i
```
Reject subjects that are >7 words or start with a stop word.

**Cross-cutting rules:**
- Ignore blank lines and headings. Heading = short line matching
  `chapter|unit|module|lesson|section|part|topic|midterm|final|exam|reviewer|quiz|prelim|outline|references|table of contents|objectives`,
  or a short ALL-CAPS line with no terminal punctuation.
- Normalise every run of 2+ underscores to exactly `_____`.
- Split alternatives on `/`, ` or `, `, or ` — de-duplicated case-insensitively.
- De-duplicate questions by normalised prompt.
- Never throw. Malformed input yields fewer questions, never a crash.
- Anything meaningful (>40 chars) that produced nothing goes into `unused`.

#### ⚠️ Pitfall that will cost you a debugging session
PDFs very often place a **blank line between the question and its `ans:` line**:

```
1. _____ is essential for safeguarding data.

ans: Information Assurance and Security
```

A naive loop flushes the buffer on the blank line and orphans the question. Keep
a pointer to the most recently flushed block; when an answer line arrives with an
empty buffer, **reclaim that block as the prompt**. Invalidate the pointer on
headings and unrelated content. Test both spaced and unspaced variants.

### 5.3 Import UI

**Upload stage:** drag-and-drop zone (also a real `<input type="file">` with a
`<label>` — keyboard accessible), a spinner with a live status label
("Reading PDF pages..." → "Finding questions..."), a paste-text fallback
textarea with a **Find questions** button, and a short "what it can read" list.
Errors render in a red panel with `role="alert"`.

Prefill the topic name from the filename (strip extension, `_`/`-` → spaces).

**Review stage (mandatory — do not allow skipping it):**
- Header: "Review extracted questions", `N of M questions selected`.
- Badges summarising counts per extraction method.
- Searchable, scrollable list. Each row: index, prompt (rendering the blank),
  answer, a badge naming the strategy, a "Worth checking" badge when
  `confidence < 0.7`, and icon buttons to **edit** (inline prompt/answer fields)
  and **include/exclude** (eye / eye-off, `aria-pressed`).
- **Select all** / **Clear all**.
- A collapsible panel: "N passages couldn't be turned into a question", listing
  them. This is what makes coverage auditable — do not omit it.
- Footer: "N questions will be saved to this topic" and two buttons —
  **Save & Cram to 100%** (primary) and **Save & Quiz Normally**. Both disabled
  unless a topic name is set and ≥1 question is selected.
- Keep this footer in normal document flow. A `sticky` footer overlaps the list.
- On mobile let the row wrap (`flex-wrap`, text column
  `min-w-[min(100%,14rem)]`, actions `ml-auto`) so the prompt isn't squeezed
  into a narrow column.

Save writes a re-editable `rawNotes` string (`1. {prompt}\nans: {alternatives
joined by " / "}`) so the topic can later be edited on the paste screen without
data loss.

---

## 6. FEATURE B — Cram mode

**Contract: the session cannot end while any question remains unanswered
correctly.**

- Start with `pendingIds` = every question id, `totalCount` = deck size,
  `clearedCount` = 0, `round` = 1.
- Correct → remove that id from `pendingIds`.
- Wrong → move that id to the **back** of `pendingIds` (never drop it).
- Advance to the next still-pending question in the current pass.
- Pass exhausted but `pendingIds` non-empty → **reshuffle only the pending
  questions**, reset `index` to 0, increment `round`.
- `pendingIds` empty → go to results.

### ⚠️ Two bugs you will hit if you are not careful

**(a) Progress must be measured against the original deck size.**
`questions` shrinks on every reshuffle, so `questions.length - pendingIds.length`
silently under-counts and the session can appear complete early. Store
`totalCount` at session start and compute `cleared = totalCount - pendingIds.length`.

**(b) Re-queued questions must remount.**
In cram mode the same question can reappear at the **same array index**, so a
`key={question.id}` (or index) lets React reuse the component and the user's
previous typed answer stays in the box. Increment a `step` counter on *every*
presentation and key the question card `` `${question.id}-${session.step}` ``.
Tag the local feedback state with the step it belongs to and ignore it when
`fb.step !== session.step`, so a stale feedback panel can never leak forward.

Guard double submission with the explicit `awaitingNext` boolean — **not** by
comparing `logs.length` to `index`, which is invalid once questions repeat.

**Cram UI:** gold "CRAM" badge, progress reads `N of M cleared` (+ `· round R`
from round 2), gold progress bar, and the advance button reads
"Got it — try again later" after a miss instead of "Next Question".

Entry points: the zap button on each topic card, the primary button on results,
and **Save & Cram to 100%** after import.

---

## 7. Answer matching (`src/lib/matchAnswer.ts`)

`gradeAnswer(input, alternatives) → { correct, matched? }`. Normalise by
lowercasing, stripping accents (NFKD) and punctuation, and collapsing
whitespace. Accept when **any** alternative matches by:

1. Exact normalised equality.
2. Equality ignoring stop words (`a, an, the, of, and, or, to, in, for, is`).
3. Compact equality for short targets (≤12 chars) — accepts `c.i.a.` for `CIA`.
4. One-typo tolerance (Levenshtein ≤1, early-exit) for single-word targets,
   only when the target is ≥6 chars and the input ≥5.
5. Long unambiguous prefix for single-word targets (≥5 chars and ≥70% of length).
6. Acronym: initials of the significant words (`ias` → *Information Assurance
   and Security*).
7. **Meaningful partial** — a contiguous run of the target's significant words,
   requiring ≥4 typed characters and ≥50% of the target's significant words.

Rule 7's thresholds exist to reject accidental fragments. `in` or `data` must
**not** be graded correct for "Information Assurance and Security".

---

## 8. Mastery & streaks

- Mastery is per `${topicId}:${questionId}` and survives reload.
- 3 consecutive correct answers → mastered (gold star). A miss resets that
  question's streak to 0 but does not un-master it.
- Session streak = consecutive correct answers this run; track `bestStreak`.
- Editing a topic must **preserve mastery**: re-map unchanged prompts
  (case-insensitive) to their existing question ids so a rename or typo fix
  doesn't wipe progress.
- Deleting a topic also deletes its mastery entries.

---

## 9. Accessibility & responsive

- Semantic landmarks; a "Skip to content" link.
- Every input has a `<label>` (visible or `sr-only`).
- Icon-only buttons: tooltip **and** `aria-label`.
- Visible focus rings; full keyboard operation; Enter submits and advances.
- Feedback uses `role="status"` + `aria-live="polite"`.
- Dialog: `role="dialog"`, `aria-modal`, focus trap, Escape, scroll lock,
  focus restoration.
- Correctness is never colour-only.
- Must work at **375 / 768 / 1280 px** with **no horizontal scroll** at any size.
- Touch targets ≥44px (use 48px for the answer input and Submit).
- Beware: in a stacked mobile column, `flex-1` collapses an input's height —
  set an explicit height and apply `flex-1` only from `sm:` up.

---

## 10. Required file layout

```
src/
  lib/         utils · types · storage · parseNotes · matchAnswer ·
               extractText · autoExtract · sampleData
  hooks/       useQuizState        <- single source of truth for all state
  components/  AppShell · TopicCard · EmptyTopicsState · NotesFormatExample ·
               QuizStats · QuestionCard · AnswerFeedback · ScoreSummary ·
               WrongAnswerList · MasterySummary · ConfirmDeleteDialog ·
               BlankText · Confetti · FileDropzone · ExtractionReview
               ui/  button · card · input · textarea · badge · progress ·
                    dialog · tooltip
  screens/     HomeScreen · PasteScreen · ImportScreen · QuizScreen · ResultsScreen
```

`useQuizState` exposes: `screen, topics, mastery, session, editingTopic,
lastSession, goHome, openCreate, openImport, openEdit, saveTopic, deleteTopic,
startQuiz, startQuizForTopic, startCram, retryWrong, retryAll, submitAnswer,
nextQuestion, exitQuiz, getTopicStats, getRecord, resetAllData`.

Seed 2 realistic sample topics **only** when the topics key is absent.

---

## 11. Definition of done — you must verify, not assume

Run all of these and report the results. Do not claim completion on inspection alone.

1. `tsc -b` → 0 errors. Lint → 0 warnings.
2. `npm run build` succeeds, and the output shows **pdf** and **mammoth** as
   separate chunks (proving lazy loading).
3. `npm run dev` starts cleanly; **no console errors** during any flow.

**Unit tests** (plain Node/`vite-node`, no framework needed):

- *Extraction* — each of the 5 strategies in isolation; a mixed document using
  4+ strategies at once; headings excluded; **blank line between question and
  `ans:`**; bare `A:` not hijacking a stray lettered line; duplicates collapsed;
  `/` and ` or ` alternatives; empty/whitespace/single-char/junk input all safe;
  `cleanDocumentText` hyphen rejoin, page-number stripping, repeated-header
  removal, blank-line collapsing.
- *Matching* — case, whitespace, punctuation, alternatives, acronym, prefix,
  single typo, meaningful partial accepted; **short fragments rejected**.
- *Cram (property test)* — simulate the queue directly: all-correct finishes in
  exactly *n* steps; a question wrong until attempt *k* is attempted exactly *k*
  times; **300 randomised sessions must all terminate with every question
  cleared and none dropped**; single-question deck; 200-question deck.

**End-to-end (Playwright, headless):**

- Import flow: paste a mixed reviewer → review stage → assert ≥6 questions and
  that all 5 strategies are represented; heading is not a question; Clear all
  disables save; Select all re-enables; search filters.
- **PDF flow: build a real multi-page PDF and assert every expected question is
  extracted, including answer-key items on a later page.**
- Cram: answer an entire pass **wrong** → assert `0 of N cleared` and `round 2`;
  then answer everything correctly → assert it reaches results **only** after
  all are cleared.
- Rapidly press Enter many times → assert no question is skipped and the answer
  input is empty at the start of every question (the remount bug in §6b).
- Core regressions: create, validate, quiz, correct/wrong feedback, results,
  retry-wrong, retry-all, edit (mastery preserved), delete (confirm + cancel),
  reload persistence, corrupted-localStorage recovery.
- Responsive: assert `document.documentElement.scrollWidth <= viewport` at 375,
  768 and 1280 on home, import, review and quiz; assert Submit and the answer
  input are ≥44px tall on mobile.
- Accessibility: assert **zero** buttons without text or `aria-label`, and zero
  inputs without an associated label.

Fix every failure you find, then re-run until green. Report the final counts.

---

### ADAPT — if you are adding this to an existing app

- Keep your own design tokens and primitives; §5, §6 and §7 are the parts that
  matter. `extractText.ts`, `autoExtract.ts` and `matchAnswer.ts` are pure
  TypeScript with no React dependency and can be dropped in as-is.
- If your questions already have a different shape, map to `{ id, prompt,
  answer, alternatives }` at the boundary and keep mastery keyed by a stable id.

### ADAPT — if you want multiple-choice support

Not covered above (this build is fill-in-the-blank/short-answer only). You would
add an `options?: string[]` field to `Question`, a parser branch for `A) … B) …`
lettered options plus a key that stores letters, and a choice-button UI in
`QuestionCard`. Say so explicitly if you want it — do not let the agent
improvise it.
