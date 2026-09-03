import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full rounded-[var(--radius-sm)] border border-line bg-card p-3.5 text-[15px] leading-relaxed text-ink shadow-[inset_0_1px_2px_rgba(16,32,60,.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-faint/80',
        'focus:border-ring/60 focus:outline-none focus:ring-4 focus:ring-ring/12',
        invalid && 'border-danger-border focus:border-danger focus:ring-danger/15',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
