import { Check, ClipboardList } from 'lucide-react'

const EXAMPLE = `1. _____ is essential for safeguarding data...
ans: Information Assurance and Security

2. _____ transforms readable data into unreadable formats...
ans: Encryption`

const RULES = [
  'Start each question with a number and a period.',
  'Put the answer on the next line after “ans:”.',
  'Keep the _____ blank where the answer belongs.',
  'Separate alternatives with “/” or “or”.',
]

interface NotesFormatExampleProps {
  onUseExample?: () => void
}

export function NotesFormatExample({ onUseExample }: NotesFormatExampleProps) {
  return (
    <aside className="rounded-[var(--radius)] border border-line bg-card-muted p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <ClipboardList className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold">Formatting example</h3>
      </div>

      <pre className="mt-3.5 rounded-[var(--radius-sm)] border border-line bg-card p-3.5 font-mono text-[12px] leading-relaxed break-words whitespace-pre-wrap text-ink-soft">
        <code>{EXAMPLE}</code>
      </pre>

      <ul className="mt-4 space-y-2">
        {RULES.map((rule) => (
          <li key={rule} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-soft">
            <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      {onUseExample && (
        <button
          type="button"
          onClick={onUseExample}
          className="mt-4 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
        >
          Insert example notes
        </button>
      )}
    </aside>
  )
}
