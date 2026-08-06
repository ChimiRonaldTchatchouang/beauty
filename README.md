# SkinScan — Plateforme B2B de diagnostic cutané par IA

SaaS multi-tenant vendu **sous licence à des centres de beauté**. Trois espaces :

- **Admin** (`/admin`) — l'éditeur gère les centres et leurs licences.
- **Centre** (`/center`) — chaque centre scanne ses patients (Gemini vision),
  envoie les résultats **par email** (Resend), suit patients & rendez-vous.
- **Patient** (`/me`) — connexion **Google**, consulte ses résultats, sa
  routine et ses rendez-vous après consultation.

> ⚕️ Analyse **cosmétique** uniquement — aucun diagnostic médical.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · **Neon** (Postgres) + Drizzle
ORM · **Gemini** vision · **Resend** email · OAuth **Google** maison + session
JWT (`jose`) · Recharts · PWA (service worker + manifest).

## Rôles & isolation

`admin | center_admin | staff | patient` (colonne `users.role`). Chaque donnée
(patient, scan, RDV) porte un `center_id` : un centre ne voit que ses données.
Le rôle est résolu au login Google (`SUPER_ADMIN_EMAILS`, invitations centre,
patients créés par un centre). Voir `src/middleware.ts` (garde par rôle).

## Flux principal

`Centre crée un patient → le scanne → Gemini analyse → routine générée →
"Envoyer au patient" (Resend) → le patient se connecte en Google (même email)
et retrouve résultats + routine + rendez-vous.`

## Variables d'environnement

Voir `.env.example`. Clés : `DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`,
`RESEND_FROM`, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`SUPER_ADMIN_EMAILS`, `NEXT_PUBLIC_APP_URL`.

## Déploiement Vercel

1. Importer le repo dans Vercel.
2. Renseigner toutes les variables d'environnement.
3. Déployer. Le build lance automatiquement les migrations Neon
   (`next build && npm run db:migrate`, voir `vercel.json`).
4. Créer le client **OAuth Google** avec l'URI de redirection
   `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback`, puis renseigner
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` et redéployer.
5. Se connecter avec un email listé dans `SUPER_ADMIN_EMAILS` → espace Admin.

En local : `cp .env.example .env`, remplir, `npm install`, `npm run db:migrate`,
`npm run dev`.

## Schéma

`centers`, `licenses`, `users`, `skin_profiles`, `scans`, `scan_metrics`,
`appointments`, `result_emails`, `products`, `license_transactions`.
Migrations versionnées dans `drizzle/`.

## Pipeline Gemini

Image compressée (base64) + contrôle qualité **côté client** (jamais d'appel
Gemini inutile) → prompt JSON strict (score global + 7 critères, sévérité,
zone, explication) normalisé (`src/lib/gemini.ts`) → routine par règles-métier
(`src/lib/routine.ts`).
