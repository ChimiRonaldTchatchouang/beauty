import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-11 w-40 rounded-2xl" />
      </div>
      <div className="space-y-2 rounded-[26px] bg-white p-2 shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-2 py-3">
            <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
