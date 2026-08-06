# SkinScan — PWA de diagnostic cutané par IA

Progressive Web App installable qui analyse la peau du visage via **Gemini
(vision)**, génère une **routine skincare personnalisée**, et suit la
progression dans le temps. Mobile-first avec navigation façon app native
(bottom nav), et vraie adaptation desktop (sidebar + layouts élargis).

> ⚕️ **Cosmétique uniquement** — aucun diagnostic médical ou pathologique.

## Stack

| Domaine | Choix |
|---|---|
| Framework | **Next.js 15** (App Router, RSC) + TypeScript |
| UI | **Tailwind CSS**, composants maison, icônes SVG inline |
| Base de données | **Neon** (Postgres serverless) via **Drizzle ORM** |
| IA vision | **Google Gemini** (`@google/generative-ai`) |
| Auth | Cookie de session signé (`jose`) + `bcryptjs` |
| Graphiques | **Recharts** |
| Hébergement | **Vercel** (ou Render) |

## Parcours (3 taps pour un scan)

`Accueil → Scanner → (capture) → Résultats → Routine`

- **Onboarding** : bienvenue → inscription → **consentement données** (obligatoire,
  donnée sensible) → questionnaire profil peau (quiz) → 1er scan.
- **Scan** : caméra avec cadre ovale + conseils en direct → **contrôle qualité
  local** (luminosité / netteté / visage) → compression → Gemini → résultats
  (score global + détail par critère) → routine matin/soir.
- **Historique** : liste, détail, **comparaison avant/après**, courbe de progression.
- **Profil** : profil peau, quota/abonnement, notifications, langue FR/EN,
  confidentialité (export / suppression), aide (WhatsApp).

## Fonctionnalités transverses

- **PWA** installable : `manifest.json`, icônes (192/512/maskable), service
  worker (`public/sw.js`) avec **fallback hors-ligne** + support **push**.
- **Compression image côté client** + **retry réseau** automatique.
- **Contrôle qualité avant envoi** : jamais d'appel Gemini inutile (économie API).
- **Quota freemium** : compteur mensuel visible (`FREE_SCANS_PER_MONTH`).
- **Multilingue FR/EN** dès la structure (langue stockée en base).
- **Partage opt-in** + gestion des **données sensibles** (consentement, effacement).
- **États vides** soignés sur chaque écran.

## Espace Partenaire Pro (Phase 2)

Non développé en v1, mais **l'architecture est posée** : tables `partners`,
`products`, `partner_transactions`, colonne `users.partner_id`, et un tableau de
bord scaffold role-gated (`/pro`) avec statistiques agrégées. Aucune refonte du
schéma ne sera nécessaire pour l'activer.

## Configuration

1. `cp .env.example .env` puis remplir :
   - `DATABASE_URL` — chaîne *pooled* Neon
   - `GEMINI_API_KEY` — clé Google AI Studio (`GEMINI_MODEL` optionnel)
   - `AUTH_SECRET` — `openssl rand -base64 32`
2. Installer & préparer la base :

```bash
npm install
npm run db:push     # crée les tables sur Neon
npm run db:seed     # catalogue produits générique (optionnel)
npm run dev
```

Ouvrir http://localhost:3000. Le service worker n'est actif qu'en build de
production (`npm run build && npm start`).

## Déploiement (Vercel)

1. Importer le repo sur Vercel.
2. Renseigner les variables d'environnement (mêmes que `.env`).
3. Deploy. Lancer `npm run db:push` une fois contre la base de prod.

## Schéma de base

`users`, `skin_profiles`, `scans`, `scan_metrics`, `products`, `partners`,
`partner_transactions`, `sessions`. Voir `src/lib/db/schema.ts`.

## Pipeline Gemini

1. Image compressée (base64) + prompt structuré → **JSON strict**
   (score global, 7 critères, sévérité, zone, explication).
2. Réponse normalisée/validée (`src/lib/gemini.ts`) → stockée (Neon).
3. Routine générée par **règles-métier** déterministes (`src/lib/routine.ts`)
   — coût nul, résultat fiable et reproductible.
4. Aucun appel si le contrôle qualité image échoue.
