import type { ScanAnalysis, Routine, RoutineStep } from "./db/schema";

// ---------------------------------------------------------------------------
// Génération de routine par règles-métier (problème → étapes).
// Choix : mapping déterministe plutôt qu'un 2e appel Gemini → coût nul,
// résultat fiable et reproductible. Le prompt CDC autorise explicitement ce choix.
// ---------------------------------------------------------------------------

interface Concern {
  category: string;
  score: number;
}

// Ingrédient conseillé par problème détecté (esthétique, générique).
const INGREDIENT_BY_CONCERN: Record<string, string> = {
  acne: "acide salicylique",
  dark_spots: "vitamine C",
  wrinkles: "rétinol",
  pores: "niacinamide",
  redness: "centella (cica)",
  hydration: "acide hyaluronique",
  evenness: "niacinamide",
  shaving_irritation: "aloe vera / panthénol",
  lip_hydration: "beurre de karité",
  dark_circles: "caféine",
};

const TREATMENT_LABEL: Record<string, string> = {
  acne: "Traitement anti-imperfections",
  dark_spots: "Sérum anti-taches",
  wrinkles: "Soin anti-âge",
  pores: "Sérum affinant les pores",
  redness: "Soin apaisant",
  hydration: "Sérum hydratant",
  evenness: "Sérum uniformisant",
  shaving_irritation: "Soin apaisant post-rasage",
  lip_hydration: "Baume réparateur lèvres",
  dark_circles: "Soin contour des yeux",
};

export function generateRoutine(
  analysis: ScanAnalysis,
  profile: { skinType?: string | null; concerns?: string[] } | null,
  intake?: Record<string, unknown> | null,
): Routine {
  // On cible les 2 critères les plus faibles (score le plus bas) du scan,
  // complétés par les préoccupations déclarées dans le profil.
  const sorted: Concern[] = [...analysis.metrics].sort(
    (a, b) => a.score - b.score,
  );
  const worst = sorted.slice(0, 2).filter((m) => m.score < 75);
  const profileConcerns = profile?.concerns ?? [];

  const primaryConcern =
    worst[0]?.category ?? profileConcerns[0] ?? "hydration";
  const secondaryConcern = worst[1]?.category ?? profileConcerns[1];

  const skinType = profile?.skinType ?? "unknown";
  const moisturizer =
    skinType === "oily"
      ? "Gel hydratant léger (non comédogène)"
      : skinType === "dry"
        ? "Crème riche nourrissante"
        : "Crème hydratante équilibrée";

  const morning: RoutineStep[] = [
    {
      order: 1,
      category: "cleanser",
      title: "Nettoyant doux",
      reason: "Élimine le sébum et les impuretés de la nuit sans agresser.",
      frequency: "Chaque matin",
    },
    {
      order: 2,
      category: "serum",
      title: TREATMENT_LABEL[primaryConcern] ?? "Sérum ciblé",
      reason: `Cible en priorité : ${labelConcern(primaryConcern)}.`,
      keyIngredient: INGREDIENT_BY_CONCERN[primaryConcern],
      frequency: "Chaque matin",
    },
    {
      order: 3,
      category: "moisturizer",
      title: moisturizer,
      reason: "Maintient la barrière cutanée hydratée toute la journée.",
      keyIngredient: "acide hyaluronique",
      frequency: "Chaque matin",
    },
    {
      order: 4,
      category: "spf",
      title: "Protection solaire SPF 50",
      reason:
        "Étape essentielle : prévient les taches, le vieillissement et protège les résultats de la routine.",
      keyIngredient: "SPF",
      frequency: "Chaque matin, à renouveler",
    },
  ];

  const evening: RoutineStep[] = [
    {
      order: 1,
      category: "cleanser",
      title: "Double nettoyage",
      reason: "Retire pollution, sébum et résidus de la journée.",
      frequency: "Chaque soir",
    },
  ];

  if (secondaryConcern) {
    evening.push({
      order: 2,
      category: "treatment",
      title: TREATMENT_LABEL[secondaryConcern] ?? "Soin ciblé",
      reason: `Agit la nuit sur : ${labelConcern(secondaryConcern)}.`,
      keyIngredient: INGREDIENT_BY_CONCERN[secondaryConcern],
      frequency: secondaryConcern === "wrinkles" ? "2-3 soirs / semaine" : "Chaque soir",
    });
  }

  evening.push({
    order: evening.length + 1,
    category: "moisturizer",
    title: skinType === "dry" ? "Crème réparatrice de nuit" : moisturizer,
    reason: "Répare et hydrate pendant le sommeil.",
    frequency: "Chaque soir",
  });

  // Protocole rasage si la personne se rase (questionnaire) ou irritation détectée.
  const shaves = Boolean(intake?.shaves) || analysis.metrics.some((m) => m.category === "shaving_irritation");
  const shaving: RoutineStep[] | undefined = shaves
    ? [
        {
          order: 1,
          category: "treatment",
          title: "Préparation",
          reason: "Ramollir le poil et préparer la peau pour éviter micro-coupures et frottements.",
          keyIngredient: "huile / gel de rasage",
          frequency: "Avant chaque rasage",
        },
        {
          order: 2,
          category: "treatment",
          title: "Rasage",
          reason: "Rasoir propre, toujours dans le sens du poil, sans repasser au même endroit.",
          frequency: "Jours de rasage",
        },
        {
          order: 3,
          category: "treatment",
          title: "Après-rasage",
          reason: "Baume apaisant sans alcool : calme l'inflammation et prévient les taches sombres.",
          keyIngredient: "aloe vera / panthénol",
          frequency: "Après chaque rasage",
        },
      ]
    : undefined;

  const tips = buildTips(analysis, intake);

  return { morning, evening, shaving, tips };
}

function buildTips(analysis: ScanAnalysis, intake?: Record<string, unknown> | null): Routine["tips"] {
  const tips: Routine["tips"] = [
    {
      title: "Soleil",
      body: "La protection solaire chaque matin fixe les résultats : sur peaux riches en mélanine, elle empêche les UV d'assombrir durablement les taches.",
    },
  ];
  const hydration = analysis.metrics.find((m) => m.category === "hydration");
  if (hydration && hydration.score < 60) {
    tips.push({
      title: "Barrière cutanée",
      body: "Évite les nettoyants trop décapants et l'eau très chaude : ils fragilisent la barrière et accentuent la déshydratation.",
    });
  }
  if (Boolean(intake?.dryLips) || analysis.metrics.some((m) => m.category === "lip_hydration")) {
    tips.push({
      title: "Lèvres",
      body: "Applique un baume nourrissant matin et soir pour réduire la sécheresse et les gerçures.",
    });
  }
  if (analysis.metrics.some((m) => m.category === "shaving_irritation")) {
    tips.push({
      title: "Rasage",
      body: "L'irritation répétée entretient l'apparition de taches sombres : rase toujours dans le sens du poil, sans repasser plusieurs fois.",
    });
  }
  tips.push({
    title: "Hydratation & alimentation",
    body: "Bois suffisamment d'eau et privilégie fruits, légumes et oméga-3 : ils soutiennent visiblement l'éclat de la peau.",
  });
  return tips;
}

function labelConcern(c: string): string {
  return (
    {
      acne: "les imperfections / acné",
      dark_spots: "les taches pigmentaires",
      wrinkles: "les rides et ridules",
      pores: "les pores dilatés",
      redness: "les rougeurs",
      hydration: "l'hydratation",
      evenness: "l'uniformité du teint",
      shaving_irritation: "l'irritation du rasage",
      lip_hydration: "l'hydratation des lèvres",
      dark_circles: "les cernes",
    }[c] ?? c
  );
}
