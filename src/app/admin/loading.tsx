import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[26px]" />)}
      </div>
      <Skeleton className="mt-8 h-40 w-full rounded-[26px]" />
    </div>
  );
}
