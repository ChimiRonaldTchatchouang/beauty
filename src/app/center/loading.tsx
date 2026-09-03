import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[26px]" />
        ))}
      </div>
      <Skeleton className="mt-6 h-12 w-52 rounded-2xl" />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-[26px]" />
        <Skeleton className="h-48 w-full rounded-[26px]" />
      </div>
    </div>
  );
}
