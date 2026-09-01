// Fonctions couleur pures — SANS "use client" pour être utilisables côté
// serveur ET client (un module client ne peut pas être appelé depuis le serveur).
import type { Severity } from "./db/schema";

export function scoreColor(score: number): string {
  if (score >= 80) return "#35b37e";
  if (score >= 60) return "#7bc86c";
  if (score >= 40) return "#e6ab3a";
  return "#ec6a86";
}

export function severityColor(sev: Severity): string {
  return {
    none: "#35b37e",
    low: "#7bc86c",
    medium: "#e6ab3a",
    high: "#ec6a86",
  }[sev];
}

export function categoryColor(category: string): string {
  return (
    {
      hydration: "#5b8def",
      acne: "#ec6a9c",
      wrinkles: "#a06cf0",
      pores: "#f0a24b",
      redness: "#ef6b6b",
      evenness: "#f0906e",
      dark_spots: "#b07be0",
      texture: "#35c2a8",
    }[category] ?? "#8368e9"
  );
}
