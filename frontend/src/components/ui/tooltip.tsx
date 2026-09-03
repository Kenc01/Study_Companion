import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  label: string
  children: React.ReactElement
  side?: 'top' | 'bottom'
  className?: string
}

/**
 * Lightweight shadcn-style tooltip. Shows on hover *and* keyboard focus so
 * icon-only buttons stay discoverable without a pointer.
 */
export function Tooltip({ label, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const reduce = useReducedMotion()
  const id = React.useId()

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onPointerDown={() => setOpen(false)}
    >
      {React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': open ? id : undefined,
      })}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: side === 'top' ? 4 : -4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md bg-primary px-2 py-1 text-[11px] font-medium tracking-wide text-primary-ink whitespace-nowrap shadow-[var(--shadow-lift)]',
              side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
