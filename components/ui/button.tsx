import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border border-primary/80 shadow-[3px_3px_0px_rgba(16,185,129,0.4)] hover:shadow-[5px_5px_0px_rgba(16,185,129,0.4)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-primary/90 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
        destructive:
          'bg-destructive text-destructive-foreground border border-destructive/80 shadow-[3px_3px_0px_rgba(239,68,68,0.3)] hover:shadow-[5px_5px_0px_rgba(239,68,68,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:bg-destructive/90',
        outline:
          'border border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary shadow-[3px_3px_0px_rgba(16,185,129,0.2)] hover:shadow-[5px_5px_0px_rgba(16,185,129,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
        secondary:
          'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 shadow-[3px_3px_0px_rgba(39,39,42,0.8)] hover:shadow-[5px_5px_0px_rgba(39,39,42,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px]',
        ghost:
          'hover:bg-secondary hover:text-foreground border border-transparent hover:border-border',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
