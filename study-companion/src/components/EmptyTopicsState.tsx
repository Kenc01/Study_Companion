import { motion } from 'framer-motion'
import { FileUp, Library, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyTopicsStateProps {
  onCreate: () => void
  onImport: () => void
}

export function EmptyTopicsState({ onCreate, onImport }: EmptyTopicsStateProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-6 flex max-w-lg flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-card/70 px-6 py-14 text-center sm:mt-10 sm:px-10"
    >
      <span className="grid size-16 place-items-center rounded-[var(--radius)] bg-primary-soft text-primary">
        <Library className="size-8" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold sm:text-[22px]">No quiz topics yet</h2>
      <p className="mt-2.5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        Upload a reviewer, or paste your fill-in-the-blank notes. Each topic becomes its own quiz
        deck.
      </p>
      <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Button size="lg" className="px-6" onClick={onImport}>
          <FileUp aria-hidden="true" />
          Import a File
        </Button>
        <Button size="lg" variant="secondary" className="px-6" onClick={onCreate}>
          <Plus aria-hidden="true" />
          Create First Topic
        </Button>
      </div>
    </motion.section>
  )
}
