// Métadonnées des critères d'analyse (module neutre : serveur + client).
// Jeu de critères élargi, inspiré d'un rapport dermo-cosmétique complet.

export interface CategoryMeta {
  fr: string;
  en: string;
  short: string; // libellé court pour les repères photo
  color: string;
  zone: { x: number; y: number }; // position indicative (%) sur une photo de face
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  acne: { fr: "Acné / imperfections", en: "Acne / breakouts", short: "Acné", color: "#ec6a9c", zone: { x: 50, y: 16 } },
  dark_spots: { fr: "Taches pigmentaires", en: "Dark spots", short: "Taches", color: "#b07be0", zone: { x: 70, y: 55 } },
  wrinkles: { fr: "Rides & ridules", en: "Wrinkles & fine lines", short: "Rides", color: "#a06cf0", zone: { x: 50, y: 14 } },
  pores: { fr: "Pores dilatés", en: "Enlarged pores", short: "Pores", color: "#f0a24b", zone: { x: 50, y: 50 } },
  redness: { fr: "Rougeurs", en: "Redness", short: "Rougeurs", color: "#ef6b6b", zone: { x: 56, y: 52 } },
  hydration: { fr: "Hydratation de la peau", en: "Skin hydration", short: "Hydratation", color: "#5b8def", zone: { x: 40, y: 20 } },
  evenness: { fr: "Uniformité du teint", en: "Skin tone evenness", short: "Teint", color: "#35c2a8", zone: { x: 30, y: 58 } },
  shaving_irritation: { fr: "Irritation liée au rasage", en: "Shaving irritation", short: "Rasage", color: "#ef6b6b", zone: { x: 50, y: 82 } },
  lip_hydration: { fr: "Hydratation des lèvres", en: "Lip hydration", short: "Lèvres", color: "#ec6a9c", zone: { x: 50, y: 74 } },
  dark_circles: { fr: "Cernes", en: "Dark circles", short: "Cernes", color: "#7c6cf0", zone: { x: 63, y: 40 } },
};

// Liste des critères autorisés (l'IA choisit ceux qui sont pertinents).
export const ALLOWED_CATEGORIES = Object.keys(CATEGORY_META);

export function categoryColor(category: string): string {
  return CATEGORY_META[category]?.color ?? "#8368e9";
}

export function categoryLabel(category: string, lang: "fr" | "en" = "fr"): string {
  const m = CATEGORY_META[category];
  return m ? (lang === "fr" ? m.fr : m.en) : category;
}

export function categoryShort(category: string): string {
  return CATEGORY_META[category]?.short ?? category;
}

export function categoryZone(category: string): { x: number; y: number } {
  return CATEGORY_META[category]?.zone ?? { x: 50, y: 50 };
}
