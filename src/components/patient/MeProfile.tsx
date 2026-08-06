"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import type { Lang } from "@/lib/i18n/dictionaries";

export function MeProfile({
  user,
  centerName,
  profile,
}: {
  user: { name: string | null; email: string | null; lang: Lang; consented: boolean };
  centerName: string | null;
  profile: { skinType: string | null; ageRange: string | null; concerns: string[] };
}) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [consented, setConsented] = useState(user.consented);

  async function acceptConsent() {
    await fetch("/api/consent", { method: "POST" });
    setConsented(true);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function deleteAccount() {
    if (!confirm(t.profile.deleteData + " ?\n\nAction irréversible.")) return;
    await fetch("/api/account", { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t.profile.title}</h1>

      <div className="card mb-6 flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl">
          {(user.name?.[0] ?? "🙂").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user.name || "—"}</p>
          <p className="truncate text-sm text-ink-faint">{user.email}</p>
          {centerName && <p className="text-xs text-brand-600">Suivi par {centerName}</p>}
        </div>
      </div>

      {!consented && (
        <div className="card mb-6 border border-brand-200">
          <p className="font-semibold">🔒 Consentement données</p>
          <p className="mt-1 text-sm text-ink-soft">{t.consent.point1}</p>
          <button onClick={acceptConsent} className="btn-primary mt-4 w-full">
            {t.consent.accept}
          </button>
        </div>
      )}

      <Section title={t.profile.editProfile}>
        <Row label={t.onboarding.skinType} value={profile.skinType} />
        <Row label={t.onboarding.age} value={profile.ageRange} />
        <Row label={t.onboarding.concerns} value={profile.concerns.length ? profile.concerns.join(", ") : "—"} />
        <div className="px-4 py-3 text-xs text-ink-faint">
          Votre profil peau est renseigné par votre centre lors de la consultation.
        </div>
      </Section>

      <Section title={t.profile.language}>
        <div className="flex gap-2 p-3">
          {(["fr", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`flex-1 rounded-2xl border-2 px-4 py-2 font-semibold transition ${
                lang === l ? "border-brand-400 bg-brand-50 text-brand-700" : "border-sand-200"
              }`}
            >
              {l === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.profile.privacy}>
        <a href="/api/account/export" className="block border-b border-sand-100 px-4 py-3 text-sm font-medium">
          ⬇️ {t.profile.exportData}
        </a>
        <button onClick={deleteAccount} className="w-full px-4 py-3 text-left text-sm font-medium text-brand-600">
          🗑 {t.profile.deleteData}
        </button>
      </Section>

      <button onClick={logout} className="btn-ghost mt-2 w-full text-brand-600">
        {t.profile.logout}
      </button>

      <p className="mt-6 text-center text-xs text-ink-faint">
        SkinScan · Analyse cosmétique, aucun diagnostic médical.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 px-1 text-sm font-semibold text-ink-faint">{title}</h2>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
