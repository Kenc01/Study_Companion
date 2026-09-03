# Study Companion

A calm, focused flashcard quiz app. Paste your fill-in-the-blank notes, and each topic
becomes its own quiz deck with per-question mastery tracking. **Frontend only** — everything
lives in `localStorage`, no backend or API.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts: `npm run build` (type-check + production build), `npm run preview`, `npm run lint`.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · Lucide icons ·
pdfjs-dist + mammoth (lazy-loaded, code-split) ·
shadcn/ui-inspired primitives (Button, Card, Input, Textarea, Badge, Progress, Dialog, Tooltip).

## Importing a reviewer (PDF / DOCX / TXT)

**Import File** reads a document and extracts every question it can find. It is a
*pattern extractor*, not an AI model — there is no backend, so it recognises structure
rather than understanding meaning. Five strategies run in priority order:

| Strategy | Example |
| --- | --- |
| Notes format | `1. _____ is ...` + `ans: ...` |
| Q&A pair | `Q: What is X?` / `A: Y` |
| Answer key | numbered questions + `Answer Key` block at the end |
| Definition | `Encryption - the process of ...` |
| Auto-blanked (cloze) | `Photosynthesis is the process by which ...` |

Nothing is saved until you confirm. The review step lists **every** extracted question with
the strategy that produced it, lets you edit or exclude any of them, and shows a
"couldn't be turned into a question" panel so gaps in coverage are visible rather than silent.

Scanned/image-only PDFs contain no selectable text and will report a clear error — OCR is
deliberately not included (heavy and unreliable).

## Cram mode

**Cram to 100%** is the "study it all fast and get a perfect score" mode. A missed question is
pushed to the back of the queue and reappears until answered correctly; the session cannot end
while any question is unanswered. Progress reads *"N of M cleared"* with a round counter.
This is verified by a property test that runs 300 randomised sessions and asserts every one
terminates with all questions cleared and none dropped.

## Notes format

```
1. _____ is essential for safeguarding data...
ans: Information Assurance and Security

2. _____ transforms readable data into unreadable formats...
ans: Encryption
```

- Leading numbers are optional and stripped; `ans:` is case-insensitive.
- Blank lines are ignored, malformed entries are skipped (never crash).
- Multiple accepted answers: separate with `/` or the word `or`.
- The visible `_____` marker is preserved and rendered as a styled blank.

## Answer matching

Case-insensitive, whitespace-collapsing, and punctuation-tolerant. Also accepts
meaningful partial answers, single typos in longer words, acronyms (`IAS`), long unambiguous
prefixes, and any listed alternative — while rejecting very short accidental fragments.

## Mastery & streaks

A question is **mastered** after 3 consecutive correct answers, tracked across sessions and
persisted per `topicId:questionId`. A miss resets that question's streak. The in-quiz streak
counts consecutive correct answers in the current run.

## Architecture

```
src/
  lib/         parseNotes · autoExtract · extractText · matchAnswer · storage ·
               types · sampleData · utils
  hooks/       useQuizState — the single source of truth for all app state
  components/  AppShell, TopicCard, EmptyTopicsState, NotesFormatExample, QuizStats,
               QuestionCard, AnswerFeedback, ScoreSummary, WrongAnswerList,
               MasterySummary, ConfirmDeleteDialog, BlankText, Confetti,
               FileDropzone, ExtractionReview, ui/*
  screens/     HomeScreen · PasteScreen · ImportScreen · QuizScreen · ResultsScreen
```

Colors are defined as CSS variables in `src/index.css` and exposed to Tailwind via `@theme`.

## Data & resilience

Two keys: `study-companion:topics:v1` and `study-companion:mastery:v1`. Both are validated and
sanitized on read — corrupted or unparseable data is discarded rather than crashing the app.
Sample topics are seeded **only** when no saved data exists (an empty library stays empty).

## Accessibility

Semantic landmarks, labels on every input, aria-labels + tooltips on icon-only buttons,
visible focus rings, Enter to submit/advance, focus trapping in the delete dialog, a skip link,
correctness conveyed by icon and text (not color alone), and `prefers-reduced-motion` support.

## Tests

```bash
npx vite-node tests/logic.test.mjs     # 30 parser + answer-matching assertions
npx vite-node tests/extract.test.mjs   # 33 reviewer-extraction assertions
node tests/cram.test.mjs               # 15 cram-queue property tests (300 random sessions)
node tests/e2e.mjs                     # 62 Playwright checks (dev server must be running)
node tests/e2e-import.mjs              # 31 import + cram end-to-end checks
```

Playwright must be installed in the parent directory (`npm i -D playwright`) for the e2e files.

The e2e suite covers topic creation, validation, parsing, quizzing, correct/wrong feedback,
results, retry-wrong, retry-all, edit, delete, reload persistence, corrupted storage recovery,
and responsive layout at 375 / 768 / 1280px.
