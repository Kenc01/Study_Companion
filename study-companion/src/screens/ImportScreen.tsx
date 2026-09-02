import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CircleAlert,
  FileUp,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { ExtractionReview } from '@/components/ExtractionReview'
import { FileDropzone } from '@/components/FileDropzone'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  autoExtractQuestions,
  methodLabel,
  type DraftQuestion,
  type ExtractionMethod,
} from '@/lib/autoExtract'
import { ExtractError, extractTextFromFile, isSupportedFile } from '@/lib/extractText'
import type { Question } from '@/lib/types'
import { plural } from '@/lib/utils'

interface ImportScreenProps {
  onBack: () => void
  onSave: (input: {
    name: string
    rawNotes: string
    questions: Question[]
    startCram: boolean
  }) => void
}

type Stage = 'upload' | 'review'

export function ImportScreen({ onBack, onSave }: ImportScreenProps) {
  const [stage, setStage] = React.useState<Stage>('upload')
  const [busy, setBusy] = React.useState(false)
  const [busyLabel, setBusyLabel] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [rawText, setRawText] = React.useState('')
  const [name, setName] = React.useState('')
  const [drafts, setDrafts] = React.useState<DraftQuestion[]>([])
  const [unused, setUnused] = React.useState<string[]>([])
  const [counts, setCounts] = React.useState<Record<ExtractionMethod, number> | null>(null)

  const runExtraction = React.useCallback((text: string, suggestedName?: string) => {
    const report = autoExtractQuestions(text)
    setDrafts(report.drafts)
    setUnused(report.unused)
    setCounts(report.counts)
    if (suggestedName && !name.trim()) setName(suggestedName)
    if (!report.drafts.length) {
      setError(
        'No questions could be detected. Check the formatting guide, or paste the text and add “ans:” lines manually.',
      )
      return false
    }
    setError(null)
    setStage('review')
    return true
  }, [name])

  const handleFile = async (file: File) => {
    setError(null)
    if (!isSupportedFile(file)) {
      setError(`“${file.name}” isn’t a supported type. Use PDF, .docx, .txt, or .md.`)
      return
    }
    setBusy(true)
    setBusyLabel(file.name.toLowerCase().endsWith('.pdf') ? 'Reading PDF pages...' : 'Reading file...')
    setFileName(file.name)
    try {
      const doc = await extractTextFromFile(file)
      setRawText(doc.text)
      setBusyLabel('Finding questions...')
      const cleanName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
      runExtraction(doc.text, cleanName)
    } catch (err) {
      setError(
        err instanceof ExtractError
          ? err.message
          : 'Something went wrong reading that file. Try another one.',
      )
      setFileName(null)
    } finally {
      setBusy(false)
      setBusyLabel('')
    }
  }

  const included = drafts.filter((d) => d.include)
  const canSave = name.trim().length > 0 && included.length > 0

  const buildPayload = (startCram: boolean) => {
    const questions: Question[] = included.map((d) => ({
      id: d.id,
      prompt: d.prompt,
      answer: d.answer,
      alternatives: d.alternatives.length ? d.alternatives : [d.answer],
      type: d.type ?? 'typed',
      options: d.options,
      answerIndices: d.answerIndices,
      blankCount: d.blankCount,
      boolAnswer: d.boolAnswer,
      tags: [],
      confidence: d.confidence,
      source: d.source,
    }))
    // Store a re-editable notes representation so the topic stays lossless.
    const rawNotes = questions
      .map((q, i) => `${i + 1}. ${q.prompt}\nans: ${q.alternatives.join(' / ')}`)
      .join('\n\n')
    onSave({ name: name.trim(), rawNotes, questions, startCram })
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="icon" onClick={onBack} aria-label="Back to topics">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <span className="text-sm text-ink-faint">Topics</span>
      </div>

      <header className="mt-5 flex items-start gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-primary-soft text-primary">
          <FileUp className="size-[22px]" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
            Import a Reviewer
          </h1>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Upload a PDF, Word file, or text file and every question it can find becomes a card —
            you review the full list before anything is saved.
          </p>
        </div>
      </header>

      {error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-danger-border bg-danger-soft p-3.5"
        >
          <CircleAlert className="mt-px size-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-[13.5px] leading-relaxed text-ink">{error}</p>
        </motion.div>
      )}

      {stage === 'upload' ? (
        <div className="mt-5 space-y-4">
          <FileDropzone
            onFile={handleFile}
            busy={busy}
            busyLabel={busyLabel}
            fileName={fileName}
          />

          <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold">Or paste your reviewer text</h2>
            <label htmlFor="paste-bulk" className="sr-only">
              Paste reviewer text
            </label>
            <Textarea
              id="paste-bulk"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'Paste anything: Q&A pairs, numbered questions with an answer key,\nterm - definition lists, or plain study notes.'}
              className="mt-2.5 min-h-[180px] text-[14px]"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                size="lg"
                onClick={() => runExtraction(rawText)}
                disabled={!rawText.trim()}
                className="sm:w-auto"
                block
              >
                <Sparkles aria-hidden="true" />
                Find questions
              </Button>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-card-muted p-4 sm:p-5">
            <h3 className="text-sm font-semibold">What it can read</h3>
            <ul className="mt-2.5 grid gap-1.5 text-[13px] leading-relaxed text-ink-soft sm:grid-cols-2">
              <li>• “Q: … A: …” question and answer pairs</li>
              <li>• Numbered questions with an answer key</li>
              <li>• “Term – definition” glossary lists</li>
              <li>• “_____ … ans: …” fill-in-the-blank notes</li>
              <li className="sm:col-span-2">
                • Plain definition sentences, auto-converted into blanks
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-[var(--radius)] border border-line bg-card p-5 shadow-[var(--shadow-soft)]">
            <label htmlFor="import-name" className="block text-sm font-medium">
              Topic name
            </label>
            <Input
              id="import-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midterm Reviewer"
              maxLength={90}
              className="mt-2"
            />
            {counts && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {(Object.keys(counts) as ExtractionMethod[])
                  .filter((m) => counts[m] > 0)
                  .map((m) => (
                    <Badge key={m} variant="neutral">
                      {methodLabel(m)}: {counts[m]}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          <ExtractionReview drafts={drafts} unused={unused} onChange={setDrafts} />

          <div className="rounded-[var(--radius)] border border-line bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[13px] text-ink-soft">
              <span className="tabular font-semibold text-ink">{included.length}</span>{' '}
              {plural(included.length, 'question').replace(String(included.length) + ' ', '')} will
              be saved to this topic.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Button size="lg" onClick={() => buildPayload(true)} disabled={!canSave} block>
                <Zap aria-hidden="true" />
                Save & Cram to 100%
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => buildPayload(false)}
                disabled={!canSave}
                block
              >
                <Play aria-hidden="true" />
                Save & Quiz Normally
              </Button>
            </div>
            <div className="mt-2 flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => setStage('upload')}>
                Back to upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
