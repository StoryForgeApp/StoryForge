import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 active:scale-100 duration-250 ease-in-out aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none cursor-pointer",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-lg": "size-9",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        "default-outline":
          "border-primary text-primary bg-background dark:bg-input/30 hover:bg-primary/20 focus-visible:ring-primary/20 dark:border-primary/50 dark:hover:bg-primary/30",
        destructive:
          "bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30",
        "destructive-outline":
          "border-destructive bg-background dark:bg-input/30 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:border-destructive/50 dark:hover:bg-destructive/30",
        error:
          "bg-destructive text-destructive-foreground hover:bg-destructive/80 aria-expanded:bg-destructive aria-expanded:text-destructive-foreground",
        "error-outline":
          "border-destructive bg-background dark:bg-input/30 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:border-destructive/50 dark:hover:bg-destructive/30 aria-expanded:bg-destructive/20 aria-expanded:text-destructive",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        info: "bg-info text-info-foreground hover:bg-info/80 aria-expanded:bg-info aria-expanded:text-info-foreground",
        "info-outline":
          "border-info text-info bg-background dark:bg-input/30 hover:bg-info/20 focus-visible:ring-info/20 dark:border-info/50 dark:hover:bg-info/30 aria-expanded:bg-info/20 aria-expanded:text-info",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        "secondary-outline":
          "border-secondary text-secondary bg-background dark:bg-input/30 hover:bg-secondary/20 focus-visible:ring-secondary/20 dark:border-secondary/50 dark:hover:bg-secondary/30 aria-expanded:bg-secondary/20 aria-expanded:text-secondary",
        success:
          "bg-success text-success-foreground hover:bg-success/80 aria-expanded:bg-success aria-expanded:text-success-foreground",
        "success-outline":
          "border-success text-success bg-background dark:bg-input/30 hover:bg-success/20 focus-visible:ring-success/20 dark:border-success/50 dark:hover:bg-success/30 aria-expanded:bg-success/20 aria-expanded:text-success",
        warning:
          "bg-warning text-warning-foreground hover:bg-warning/80 aria-expanded:bg-warning aria-expanded:text-warning-foreground",
        "warning-outline":
          "border-warning text-warning bg-background dark:bg-input/30 hover:bg-warning/20 focus-visible:ring-warning/20 dark:border-warning/50 dark:hover:bg-warning/30 aria-expanded:bg-warning/20 aria-expanded:text-warning",
      },
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ className, size, variant }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
