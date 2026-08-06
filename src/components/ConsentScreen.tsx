"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { I18nProvider, useI18n } from "@/lib/i18n/context";

function Consent() {
  const { t } = useI18n();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      await fetch("/api/consent", { method: "POST" });
      router.push("/onboarding");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const points = [t.consent.point1, t.consent.point2, t.consent.point3, t.consent.point4];

  return (
    <div className="flex min-h-dvh flex-col bg-sand-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-6 text-4xl">🔒</div>
        <h1 className="text-2xl font-bold">{t.consent.title}</h1>
        <p className="mt-3 text-ink-soft">{t.consent.intro}</p>

        <ul className="mt-6 flex flex-col gap-3">
          {points.map((p, i) => (
            <li key={i} className="card flex items-start gap-3 p-4 text-sm text-ink-soft">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              {p}
            </li>
          ))}
        </ul>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-soft">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
          />
          <span className="text-sm font-medium">{t.consent.checkbox}</span>
        </label>

        <div className="mt-auto pt-8">
          <button
            className="btn-primary w-full"
            disabled={!checked || loading}
            onClick={accept}
          >
            {loading ? t.common.loading : t.consent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentScreen() {
  return (
    <I18nProvider>
      <Consent />
    </I18nProvider>
  );
}
