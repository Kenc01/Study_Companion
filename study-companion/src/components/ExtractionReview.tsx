import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, Eye, EyeOff, Pencil, Search, TriangleAlert } from 'lucide-react'
import * as React from 'react'
import { BlankText } from '@/components/BlankText'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip } from '@/components/ui/tooltip'
import { methodLabel, type DraftQuestion, type ExtractionMethod } from '@/lib/autoExtract'
import { cn, plural } from '@/lib/utils'

interface ExtractionReviewProps {
  drafts: DraftQuestion[]
  unused: string[]
  onChange: (drafts: DraftQuestion[]) => void
}

const METHOD_TONE: Record<ExtractionMethod, 'navy' | 'success' | 'gold' | 'neutral'> = {
  'ans-format': 'success',
  'qa-pair': 'success',
  'answer-key': 'navy',
  definition: 'navy',
  cloze: 'gold',
}

function DraftRow({
  draft,
  index,
  onUpdate,
}: {
  draft: DraftQuestion
  index: number
  onUpdate: (patch: Partial<DraftQuestion>) => void
}) {
  const [editing, setEditing] = React.useState(false)

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'rounded-[var(--radius-sm)] border p-3.5 transition-colors',
        draft.include ? 'border-line bg-card' : 'border-line bg-card-muted opacity-60',
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 sm:flex-nowrap">
        <span className="tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-page-deep text-[11px] font-semibold text-ink-soft">
          {index + 1}
        </span>

        <div className="min-w-[min(100%,14rem)] flex-1">
          {editing ? (
            <div className="space-y-2">
              <div>
                <label htmlFor={`p-${draft.id}`} className="text-[11px] font-medium text-ink-faint">
                  Question
                </label>
                <Input
                  id={`p-${draft.id}`}
                  value={draft.prompt}
                  onChange={(e) => onUpdate({ prompt: e.target.value })}
                  className="mt-1 h-10 text-[14px]"
                />
              </div>
              <div>
                <label htmlFor={`a-${draft.id}`} className="text-[11px] font-medium text-ink-faint">
                  Answer
                </label>
                <Input
                  id={`a-${draft.id}`}
                  value={draft.answer}
                  onChange={(e) =>
                    onUpdate({ answer: e.target.value, alternatives: [e.target.value] })
                  }
                  className="mt-1 h-10 text-[14px]"
                />
              </div>
              <Button size="sm" onClick={() => setEditing(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-ink">
                <BlankText text={draft.prompt} />
              </p>
              <p className="mt-1.5 text-[13px] text-ink-soft">
                <span className="text-ink-faint">Answer:</span>{' '}
                <span className="font-medium text-ink">{draft.answer}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant={METHOD_TONE[draft.method]}>{methodLabel(draft.method)}</Badge>
                {draft.confidence < 0.7 && (
                  <Badge variant="neutral">
                    <TriangleAlert aria-hidden="true" />
                    Worth checking
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 gap-1">
          <Tooltip label={editing ? 'Close editor' : 'Edit'}>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setEditing((v) => !v)}
              aria-label={`Edit question ${index + 1}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip label={draft.include ? 'Exclude' : 'Include'}>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onUpdate({ include: !draft.include })}
              aria-label={`${draft.include ? 'Exclude' : 'Include'} question ${index + 1}`}
              aria-pressed={!draft.include}
            >
              {draft.include ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
          </Tooltip>
        </div>
      </div>
    </motion.li>
  )
}

export function ExtractionReview({ drafts, unused, onChange }: ExtractionReviewProps) {
  const [query, setQuery] = React.useState('')
  const [showUnused, setShowUnused] = React.useState(false)

  const included = drafts.filter((d) => d.include).length

  const filtered = React.useMemo(() => {
    if (!query.trim()) return drafts
    const q = query.toLowerCase()
    return drafts.filter(
      (d) => d.prompt.toLowerCase().includes(q) || d.answer.toLowerCase().includes(q),
    )
  }, [drafts, query])

  const update = (id: string, patch: Partial<DraftQuestion>) => {
    onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }

  const setAll = (include: boolean) => onChange(drafts.map((d) => ({ ...d, include })))

  return (
    <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold">Review extracted questions</h2>
        <p className="text-[13px] text-ink-soft">
          <span className="tabular font-semibold text-ink">{included}</span> of{' '}
          {plural(drafts.length, 'question')} selected
        </p>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        Everything found in your file is listed below. Edit anything that looks off, and untick
        what you don’t want — nothing is saved until you confirm.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <label htmlFor="draft-search" className="sr-only">
            Search extracted questions
          </label>
          <Input
            id="draft-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="h-10 pl-9 text-[14px]"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAll(true)}>
            Select all
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAll(false)}>
            Clear all
          </Button>
        </div>
      </div>

      <ul className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {filtered.map((draft) => (
            <DraftRow
              key={draft.id}
              draft={draft}
              index={drafts.indexOf(draft)}
              onUpdate={(patch) => update(draft.id, patch)}
            />
          ))}
        </AnimatePresence>
        {!filtered.length && (
          <li className="py-8 text-center text-[13.5px] text-ink-faint">
            No questions match “{query}”.
          </li>
        )}
      </ul>

      {unused.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-sm)] border border-line bg-card-muted p-4">
          <button
            type="button"
            onClick={() => setShowUnused((v) => !v)}
            className="flex w-full items-center gap-2 text-left text-[13px] font-medium text-ink-soft hover:text-ink"
            aria-expanded={showUnused}
          >
            <CircleAlert className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <span>
              {plural(unused.length, 'passage')} couldn’t be turned into a question
            </span>
            <span className="ml-auto text-[12px] text-ink-faint">
              {showUnused ? 'Hide' : 'Show'}
            </span>
          </button>
          <AnimatePresence>
            {showUnused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
                  These are usually headings or narrative text. If any of them should be a
                  question, add it manually on the notes tab.
                </p>
                <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {unused.map((line, i) => (
                    <li
                      key={i}
                      className="rounded border border-line bg-card px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink-soft"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
