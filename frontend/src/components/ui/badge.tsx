import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-card-muted text-ink-soft',
        secondary: 'border-line bg-card text-ink-soft',
        navy: 'border-primary/12 bg-primary-soft text-primary-soft-ink',
        success: 'border-success-border bg-success-soft text-success',
        danger: 'border-danger-border bg-danger-soft text-danger',
        gold: 'border-gold/25 bg-gold-soft text-[hsl(36_82%_34%)]',
        outline: 'border-line-strong bg-transparent text-ink-soft',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
