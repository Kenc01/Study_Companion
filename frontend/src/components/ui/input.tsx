import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-12 w-full rounded-[var(--radius-sm)] border border-line bg-card px-3.5 text-[15px] text-ink shadow-[inset_0_1px_2px_rgba(16,32,60,.03)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-faint/80',
        'focus:border-ring/60 focus:outline-none focus:ring-4 focus:ring-ring/12',
        'disabled:cursor-not-allowed disabled:bg-card-muted disabled:text-ink-faint',
        invalid && 'border-danger-border focus:border-danger focus:ring-danger/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
