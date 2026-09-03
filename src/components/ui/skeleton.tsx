import { cn } from "@/lib/utils";

// Squelette de chargement (perception de rapidité).
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-2xl bg-sand-100", className)} {...props} />;
}

export { Skeleton };
