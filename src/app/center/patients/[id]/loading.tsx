import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="h-4 w-24" />
      <div className="mt-3 flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-11 w-28 rounded-2xl" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-20 w-full rounded-[26px]" />
          <Skeleton className="h-20 w-full rounded-[26px]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-64 w-full rounded-[26px]" />
        </div>
      </div>
    </div>
  );
}
