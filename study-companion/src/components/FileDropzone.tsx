import { FileText, Loader2, Upload } from 'lucide-react'
import * as React from 'react'
import { ACCEPTED_EXTENSIONS, isSupportedFile } from '@/lib/extractText'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  onFile: (file: File) => void
  busy?: boolean
  busyLabel?: string
  fileName?: string | null
}

export function FileDropzone({ onFile, busy, busyLabel, fileName }: FileDropzoneProps) {
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (busy) return
        const file = e.dataTransfer.files?.[0]
        if (file && isSupportedFile(file)) onFile(file)
        else if (file) onFile(file) // let the parent surface the error message
      }}
      className={cn(
        'relative rounded-[var(--radius)] border-2 border-dashed p-6 text-center transition-colors duration-150 sm:p-8',
        dragging
          ? 'border-ring/60 bg-primary-soft'
          : 'border-line-strong bg-card-muted hover:border-ring/40',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        id="file-upload"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = '' // allow re-picking the same file
        }}
      />

      <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-primary-soft text-primary">
        {busy ? (
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        ) : fileName ? (
          <FileText className="size-6" aria-hidden="true" />
        ) : (
          <Upload className="size-6" aria-hidden="true" />
        )}
      </span>

      {busy ? (
        <p className="mt-3.5 text-[15px] font-medium" role="status" aria-live="polite">
          {busyLabel ?? 'Reading your file...'}
        </p>
      ) : (
        <>
          <p className="mt-3.5 text-[15px] font-medium">
            {fileName ? (
              <span className="break-all">{fileName}</span>
            ) : (
              'Drop your reviewer here'
            )}
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            PDF, Word (.docx), or plain text — up to 25 MB
          </p>
          <label
            htmlFor="file-upload"
            className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-primary-ink shadow-[var(--shadow-soft)] transition-colors hover:bg-primary-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          >
            <Upload className="size-[18px]" aria-hidden="true" />
            {fileName ? 'Choose a different file' : 'Choose file'}
          </label>
        </>
      )}
    </div>
  )
}
