import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="animate-fade-in">
      <Skeleton className="mb-6 h-28 w-full rounded-[26px]" />
      <Skeleton className="mb-5 h-11 w-56 rounded-2xl" />
      <div className="lg:grid lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-8">
        <Skeleton className="h-80 w-full rounded-[26px]" />
        <div className="mt-6 space-y-3 lg:mt-0">
          <Skeleton className="h-32 w-full rounded-[26px]" />
          <Skeleton className="h-24 w-full rounded-[26px]" />
        </div>
      </div>
    </div>
  );
}
