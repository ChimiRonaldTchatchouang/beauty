import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="animate-fade-in space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-64 w-full rounded-[26px]" />
      <Skeleton className="h-40 w-full rounded-[26px]" />
    </div>
  );
}
