import type { ReactNode } from 'react';

/** Cadre de smartphone centré, pensé mobile d'abord. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex h-[720px] w-full max-w-[380px] flex-col overflow-hidden rounded-[2.5rem] border-[10px] border-nextiaa-black bg-white shadow-2xl">
      {/* Encoche */}
      <div className="absolute left-1/2 top-0 z-10 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-nextiaa-black" />
      {/* Barre d'état factice */}
      <div className="flex items-center justify-between bg-nextiaa-black px-6 py-1 text-[10px] text-white">
        <span>Nextiaa SIM</span>
        <span>100% 🔋</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
