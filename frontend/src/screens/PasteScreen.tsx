import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, CircleAlert, Play, Sparkles } from 'lucide-react'
import * as React from 'react'
import { NotesFormatExample } from '@/components/NotesFormatExample'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { parseNotes } from '@/lib/parseNotes'
import type { Question, Topic } from '@/lib/types'
import { plural } from '@/lib/utils'

const EXAMPLE_NOTES = `1. _____ is essential for safeguarding data, systems, and networks against unauthorized access.
ans: Information Assurance and Security

2. _____ transforms readable data into unreadable formats so only authorized parties can read it.
ans: Encryption

3. A _____ monitors network traffic and blocks packets that violate a rule set.
ans: firewall`

interface PasteScreenProps {
  editingTopic: Topic | null
  onBack: () => void
  onSave: (input: {
    name: string
    rawNotes: string
    questions: Question[]
    tags?: string[]
    color?: number
  }) => void
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <motion.p
      id={id}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-danger"
    >
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </motion.p>
  )
}

const ACCENT_CHOICES = [
  { label: 'Sky', className: 'bg-sky-500' },
  { label: 'Emerald', className: 'bg-emerald-500' },
  { label: 'Amber', className: 'bg-amber-500' },
  { label: 'Rose', className: 'bg-rose-500' },
  { label: 'Violet', className: 'bg-violet-500' },
  { label: 'Teal', className: 'bg-teal-500' },
]

export function PasteScreen({ editingTopic, onBack, onSave }: PasteScreenProps) {
  const isEdit = editingTopic !== null
  const [name, setName] = React.useState(editingTopic?.name ?? '')
  const [notes, setNotes] = React.useState(editingTopic?.rawNotes ?? '')
  const [tagInput, setTagInput] = React.useState((editingTopic?.tags ?? []).join(', '))
  const [color, setColor] = React.useState<number>(editingTopic?.color ?? 0)
  const [touched, setTouched] = React.useState(false)
  const nameRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const parsed = React.useMemo(() => parseNotes(notes), [notes])

  const nameError = !name.trim() ? 'Give this topic a name so you can find it later.' : null
  const notesError = !notes.trim()
    ? 'Paste your notes to build the quiz deck.'
    : parsed.questions.length === 0
      ? 'No valid questions found. Each question needs an “ans:” line directly beneath it.'
      : null

  const invalid = Boolean(nameError || notesError)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (invalid) return
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onSave({ name: name.trim(), rawNotes: notes, questions: parsed.questions, tags, color })
  }

  const showNameError = touched && Boolean(nameError)
  const showNotesError = touched && Boolean(notesError)

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" onClick={onBack} aria-label="Back to topics">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <span className="text-sm text-ink-faint">Topics</span>
      </div>

      <header className="mt-5 flex items-start gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary-soft text-primary">
          <BookOpen className="size-[22px]" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
            {isEdit ? 'Edit Quiz Topic' : 'Create a Quiz Topic'}
          </h1>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Paste your fill-in-the-blank notes below. Every question and its{' '}
            <code className="rounded bg-page-deep px-1 py-0.5 font-mono text-[13px]">ans:</code>{' '}
            line becomes a card in this deck.
          </p>
        </div>
      </header>

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6">
        <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div>
            <label htmlFor="topic-name" className="block text-sm font-medium">
              Topic name
            </label>
            <Input
              id="topic-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Information Assurance & Security"
              maxLength={90}
              invalid={showNameError}
              aria-describedby={showNameError ? 'topic-name-error' : undefined}
              className="mt-2"
            />
            <AnimatePresence>
              {showNameError && nameError && (
                <FieldError id="topic-name-error" message={nameError} />
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="topic-tags" className="block text-sm font-medium">
                Tags <span className="font-normal text-ink-faint">(comma-separated, optional)</span>
              </label>
              <Input
                id="topic-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. Midterm, Security, Chapter 3"
                className="mt-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Card accent</label>
              <div className="mt-2 flex items-center gap-2">
                {ACCENT_CHOICES.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setColor(i)}
                    className={`size-7 rounded-full ${c.className} ring-offset-2 transition-transform ${
                      color === i ? 'ring-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="topic-notes" className="block text-sm font-medium">
                Your notes
              </label>
              <div className="flex items-center gap-2">
                {parsed.skipped > 0 && (
                  <Badge variant="neutral">{parsed.skipped} skipped</Badge>
                )}
                <Badge variant={parsed.questions.length ? 'success' : 'neutral'}>
                  {parsed.questions.length
                    ? `${plural(parsed.questions.length, 'question')} detected`
                    : 'No questions yet'}
                </Badge>
              </div>
            </div>
            <Textarea
              id="topic-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'1. _____ is essential for safeguarding data...\nans: Information Assurance and Security'}
              spellCheck={false}
              invalid={showNotesError}
              aria-describedby={showNotesError ? 'topic-notes-error' : 'topic-notes-hint'}
              className="mt-2 min-h-[260px] font-mono text-[13.5px] sm:min-h-[320px]"
            />
            <AnimatePresence>
              {showNotesError && notesError ? (
                <FieldError id="topic-notes-error" message={notesError} />
              ) : (
                <p id="topic-notes-hint" className="mt-2 text-[13px] text-ink-faint">
                  {notes.length.toLocaleString()} characters · questions are detected as you type.
                </p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="lg" onClick={onBack} block className="sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              block
              className="sm:w-auto"
              disabled={touched && invalid}
            >
              <Play aria-hidden="true" />
              {isEdit ? 'Save & Start Quiz' : 'Save & Start Quiz'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <NotesFormatExample
            onUseExample={
              notes.trim() ? undefined : () => {
                setNotes(EXAMPLE_NOTES)
                if (!name.trim()) setName('Information Assurance & Security')
              }
            }
          />
          {parsed.questions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[var(--radius)] border border-success-border bg-success-soft p-4"
            >
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-success">
                <Sparkles className="mt-px size-4 shrink-0" aria-hidden="true" />
                <span>
                  Ready to study — <strong className="font-semibold">{parsed.questions.length}</strong>{' '}
                  {parsed.questions.length === 1 ? 'card' : 'cards'} will be created
                  {isEdit ? ' and mastery progress will be kept.' : '.'}
                </span>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </form>
  )
}
