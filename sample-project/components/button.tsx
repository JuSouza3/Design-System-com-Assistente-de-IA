import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-4 whitespace-nowrap rounded-sm font-sans font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-6 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-white border border-zinc-300 font-medium shadow-sm text-primary hover:bg-primary hover:text-white rounded-lg normal-case tracking-wider",
        primary: "bg-primary [&>span]:text-white text-white border-primary border hover:bg-white hover:text-primary uppercase",
        outline:
          "border uppercase border-primary text-primary bg-white shadow-xs hover:bg-primary hover:text-white dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        link: "text-primary underline-offset-4 underline hover:text-primary/60 font-normal",
        ghost: "text-slate-500 font-medium hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-4 text-sm", //14px
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-xs", //12px
        md: "h-8 gap-4 px-3 has-[>svg]:px-2.5 text-lg", //18px
        lg: "h-16 px-6 w-full max-w-xs has-[>svg]:px-4 text-lg md:text-2xl uppercase font-bold", //24px
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
