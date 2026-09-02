import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-[background-color,color,box-shadow,transform,border-color] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-ink shadow-[var(--shadow-soft)] hover:bg-primary-hover hover:shadow-[var(--shadow-focus)]',
        secondary:
          'border border-line bg-card text-ink shadow-[0_1px_1px_rgba(16,32,60,.03)] hover:border-line-strong hover:bg-card-muted',
        soft: 'bg-primary-soft text-primary-soft-ink hover:bg-primary-soft/70',
        ghost: 'text-ink-soft hover:bg-page-deep hover:text-ink',
        danger:
          'bg-danger text-white shadow-[var(--shadow-soft)] hover:bg-danger/90',
        dangerGhost:
          'border border-transparent text-ink-faint hover:border-danger-border hover:bg-danger-soft hover:text-danger',
        success: 'bg-success text-white shadow-[var(--shadow-soft)] hover:bg-success/90',
      },
      size: {
        sm: 'h-9 px-3 text-[13px] [&_svg]:size-4',
        md: 'h-11 px-4 [&_svg]:size-[18px]',
        lg: 'h-12 px-5 text-[15px] [&_svg]:size-[18px]',
        icon: 'size-11 [&_svg]:size-[18px]',
        iconSm: 'size-9 [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
