import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>
      <div className="space-y-2 rounded-[26px] bg-white p-2 shadow-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-2 py-2">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
