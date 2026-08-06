/**
 * Seed : catalogue produits générique (par catégorie d'ingrédient), utilisé
 * comme repli tant qu'aucun partenaire n'a chargé son propre catalogue.
 * Lancer avec : npm run db:seed
 */
import "dotenv/config";
import { db } from "./index";
import { products } from "./schema";

const GENERIC_PRODUCTS = [
  { name: "Nettoyant doux", category: "cleanser", keyIngredient: "glycérine", targetsConcern: null, description: "Nettoie sans dessécher, tous types de peaux." },
  { name: "Sérum vitamine C", category: "serum", keyIngredient: "vitamine C", targetsConcern: "dark_spots", description: "Éclat et réduction des taches pigmentaires." },
  { name: "Sérum niacinamide", category: "serum", keyIngredient: "niacinamide", targetsConcern: "pores", description: "Affine le grain de peau et régule le sébum." },
  { name: "Traitement acide salicylique", category: "treatment", keyIngredient: "acide salicylique", targetsConcern: "acne", description: "Cible les imperfections et points noirs." },
  { name: "Soin rétinol nuit", category: "treatment", keyIngredient: "rétinol", targetsConcern: "wrinkles", description: "Anti-âge, à introduire progressivement." },
  { name: "Crème hydratante", category: "moisturizer", keyIngredient: "acide hyaluronique", targetsConcern: "hydration", description: "Hydratation longue durée." },
  { name: "Écran solaire SPF 50", category: "spf", keyIngredient: "SPF", targetsConcern: null, description: "Protection quotidienne indispensable." },
  { name: "Soin apaisant cica", category: "treatment", keyIngredient: "centella (cica)", targetsConcern: "redness", description: "Apaise les rougeurs et renforce la barrière." },
];

async function main() {
  console.log("Seeding produits génériques…");
  for (const p of GENERIC_PRODUCTS) {
    await db.insert(products).values({ ...p, partnerId: null }).onConflictDoNothing();
  }
  console.log(`✓ ${GENERIC_PRODUCTS.length} produits insérés.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
