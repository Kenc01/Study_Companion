import { Trash2, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { plural } from '@/lib/utils'

interface ConfirmDeleteDialogProps {
  open: boolean
  topicName: string
  questionCount: number
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDialog({
  open,
  topicName,
  questionCount,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const titleId = useId()
  const descId = useId()

  return (
    <Dialog open={open} onClose={onCancel} labelledBy={titleId} describedBy={descId}>
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-danger-soft text-danger">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-semibold">
            Delete this topic?
          </h2>
          <p id={descId} className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">{topicName}</span> and its{' '}
            {plural(questionCount, 'question')} will be removed, along with all mastery progress.
            This can’t be undone.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} className="sm:w-auto" block>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} className="sm:w-auto" block>
          <Trash2 aria-hidden="true" />
          Delete topic
        </Button>
      </div>
    </Dialog>
  )
}
