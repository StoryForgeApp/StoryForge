import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "h-5 gap-1 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive overflow-hidden group/badge",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        destructive:
          "bg-destructive/10 [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-destructive dark:bg-destructive/20",
        "destructive-outline":
          "border-destructive text-destructive [a]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:border-destructive/40 dark:text-destructive/80",
        success: "bg-green-100 text-green-800 [a]:hover:bg-green-200",
        "outline-success":
          "border-green-300 text-muted-foreground [a]:hover:bg-green-100 focus-visible:ring-green-300",
        warning:
          "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 [a]:hover:bg-yellow-200",
        "outline-warning":
          "border-yellow-300 text-muted-foreground [a]:hover:bg-yellow-100 focus-visible:ring-yellow-300",
        info: "bg-blue-100 text-blue-800 [a]:hover:bg-blue-200",
        "outline-info":
          "border-blue-300 text-blue-800 [a]:hover:bg-blue-100 focus-visible:ring-blue-300",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
      },
    },
  },
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
