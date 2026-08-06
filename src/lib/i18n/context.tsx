"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { dictionaries, type Lang, type Dict } from "./dictionaries";

interface I18nValue {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  initialLang = "fr",
  children,
}: {
  initialLang?: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // Persistance best-effort côté serveur (ne bloque pas l'UI).
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: l }),
    }).catch(() => {});
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t: dictionaries[lang] as Dict, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans un I18nProvider");
  return ctx;
}
