import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  className?: string
  indicatorClassName?: string
  label?: string
}

export function Progress({ value, className, indicatorClassName, label }: ProgressProps) {
  const reduce = useReducedMotion()
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-page-deep', className)}
    >
      <motion.div
        className={cn('h-full rounded-full bg-primary', indicatorClassName)}
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 26 }}
      />
    </div>
  )
}
