import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Beaker,
  Clock,
  Download,
  Keyboard,
  Moon,
  Trash2,
  Upload,
  Volume2,
  Zap,
} from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Settings } from '@/lib/types'
import { DEFAULT_SETTINGS } from '@/lib/types'

interface SettingsScreenProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  onBack: () => void
  onExport: () => void
  onImport: (file: File) => void
  onResetAllData: () => void
}

function Row({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 border-b border-line py-4 last:border-b-0">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-ink">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-card-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            value === o.value
              ? 'bg-card text-ink shadow-[var(--shadow-soft)]'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-primary bg-primary' : 'border-line-strong bg-card-muted'
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export function SettingsScreen({
  settings,
  onChange,
  onReset,
  onBack,
  onExport,
  onImport,
  onResetAllData,
}: SettingsScreenProps) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = React.useState(false)

  return (
    <>
      <header className="flex items-center gap-3">
        <Button variant="secondary" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-[22px] font-semibold sm:text-[26px]">Settings</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Customize how Study Companion looks and behaves.
          </p>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 space-y-5"
      >
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 text-[15px] font-semibold">Appearance</h2>
          <Row
            icon={<Moon className="size-[18px]" aria-hidden="true" />}
            title="Theme"
            description="Choose light, dark, or match your system."
            control={
              <Segmented<'light' | 'dark' | 'system'>
                value={settings.theme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'Auto' },
                ]}
                onChange={(v) => onChange({ theme: v })}
              />
            }
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 text-[15px] font-semibold">Study</h2>
          <Row
            icon={<Clock className="size-[18px]" aria-hidden="true" />}
            title="Session timer"
            description="Show elapsed time in the corner of quiz screens."
            control={<Toggle checked={settings.showTimer} onChange={(v) => onChange({ showTimer: v })} />}
          />
          <Row
            icon={<Zap className="size-[18px]" aria-hidden="true" />}
            title="Answer matching"
            description="Strict requires exact spelling; loose tolerates more typos."
            control={
              <Segmented<'loose' | 'normal' | 'strict'>
                value={settings.strictness}
                options={[
                  { value: 'loose', label: 'Loose' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'strict', label: 'Strict' },
                ]}
                onChange={(v) => onChange({ strictness: v })}
              />
            }
          />
          <Row
            icon={<Keyboard className="size-[18px]" aria-hidden="true" />}
            title="Enter submits"
            description="Press Enter to submit an answer and to advance."
            control={
              <Toggle checked={settings.enterSubmits} onChange={(v) => onChange({ enterSubmits: v })} />
            }
          />
          <Row
            icon={<Volume2 className="size-[18px]" aria-hidden="true" />}
            title="Sound effects"
            description="Subtle beeps on correct / incorrect answers."
            control={
              <Toggle checked={settings.soundEffects} onChange={(v) => onChange({ soundEffects: v })} />
            }
          />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 text-[15px] font-semibold">Data</h2>
          <p className="mb-4 text-[13px] text-ink-soft">
            Back up your topics and progress to a JSON file you can move to another device or a future backend.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onExport}>
              <Download aria-hidden="true" /> Export backup
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload aria-hidden="true" /> Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImport(f)
                e.target.value = ''
              }}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-danger">
            <Beaker className="size-[16px]" aria-hidden="true" /> Danger zone
          </h2>
          <p className="mb-4 text-[13px] text-ink-soft">
            Reset everything back to the sample topics. This cannot be undone.
          </p>
          {!confirmReset ? (
            <Button variant="dangerGhost" onClick={() => setConfirmReset(true)}>
              <Trash2 aria-hidden="true" /> Reset all data
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={onResetAllData}>
                Yes, erase everything
              </Button>
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          )}
          <p className="mt-4">
            <button
              type="button"
              onClick={onReset}
              className="text-[12px] text-ink-faint underline-offset-2 hover:underline"
            >
              Restore settings to defaults
            </button>
          </p>
        </Card>

        <p className="pb-6 text-center text-[12px] text-ink-faint">
          Study Companion · v2.0 · all data stays on your device
        </p>
      </motion.div>
    </>
  )
}

export { DEFAULT_SETTINGS }
