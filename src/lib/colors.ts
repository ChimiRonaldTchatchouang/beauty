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

export { categoryColor } from "./categories";
