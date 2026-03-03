import { cn } from "@/lib/utils";

interface ProgressProps {
  className?: string;
  value: number;
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full bg-primary transition-all duration-200 ease-in-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
