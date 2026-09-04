import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Select natif stylé (léger, sans dépendance Radix) au look shadcn.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full appearance-none rounded-2xl border border-sand-200 bg-white px-4 py-3 pr-10 text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
    </div>
  ),
);
Select.displayName = "Select";

export { Select };
