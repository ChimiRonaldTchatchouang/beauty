# Déploiement — Nextiaa Voice (Neon + Render)

> ⚠️ Rappel : niveau gratuit uniquement, **données fictives** uniquement.

## Pourquoi Render (et pas Vercel) pour le serveur

Le cœur de l'app est une **connexion WebSocket persistante** (navigateur ⇄
serveur ⇄ Gemini Live) qui dure tout l'appel. **Vercel** (serverless) ne
supporte pas ce type de connexion longue → le serveur vocal **doit** tourner
sur un processus persistant : **Render Web Service**. Le web (React) est servi
par le **même** service Render (`@fastify/static`), donc **une seule URL** et
pas de configuration CORS.

## 1. Base de données Neon (PostgreSQL)

1. Créer un projet sur <https://neon.tech> (région **proche de Render**, ex.
   `us-east-2` / AWS US East Ohio).
2. Copier la **connection string** (« Pooled connection ») :
   `postgresql://user:pass@ep-...-pooler.<region>.aws.neon.tech/neondb?sslmode=require`
3. Le schéma et les données fictives sont créés **automatiquement au premier
   démarrage** du serveur (pas de migration manuelle). Pour (re)semer à la
   demande : `npm run db:seed`.

> Le paramètre `channel_binding=require` de l'URL est ignoré par le pilote
> `pg` (sans effet) ; on peut le laisser ou le retirer.

## 2. Serveur + web sur Render

Le dépôt contient `render.yaml` (Blueprint). Deux options :

### Option A — Blueprint (recommandé)
1. Sur Render : **New → Blueprint**, pointer sur le dépôt Git.
2. Render lit `render.yaml` et crée le service `nextiaa-voice`.
3. Renseigner les **secrets** (marqués `sync:false`) dans l'onglet Environment :
   - `DATABASE_URL` (Neon)
   - `GEMINI_API_KEY` (Google AI Studio)
   - `CONSOLE_PASSWORD` (mot de passe console)
4. Vérifier la **région** = `ohio` (proche du Neon `us-east-2`).

### Option B — service manuel
- **New → Web Service**, connecter le dépôt.
- Runtime **Node**, région **Ohio**.
- Build : `npm install && npm run build`
- Start : `npm start`
- Health check path : `/health`
- Ajouter les variables d'environnement (voir `.env.example`).

> Render fournit lui-même la variable `PORT` ; le serveur l'utilise
> automatiquement (ne pas la fixer).

## 3. Après déploiement

- Ouvrir `https://<votre-app>.onrender.com/` → le téléphone simulé.
- Console : `https://<votre-app>.onrender.com/console`.
- `GET /health` renvoie `{ ok, hasGeminiKey, hasDatabase, model }` — vérifier
  que `hasDatabase` et `hasGeminiKey` valent `true`.

## 4. Limites du niveau gratuit (à connaître pour une démo)

- **Render free** : le service se met en veille après ~15 min d'inactivité
  (démarrage à froid de quelques secondes au réveil ; un appel en cours peut
  tomber). **Réveiller l'app 2–3 min avant** un rendez-vous client.
- **Neon free** : la base se suspend aussi après inactivité (première requête
  plus lente). Idem, réveiller avant la démo.
- Les outils doivent répondre en **< 300 ms** : garder Render **et** Neon dans
  des régions **proches** (Ohio ↔ us-east-2).

## 5. Sécurité

- Aucun secret dans le dépôt (`.env` est git-ignoré ; sur Render, variables
  d'environnement).
- **Réinitialiser le mot de passe Neon** s'il a été partagé en clair.
- La clé Gemini et l'URL de base restent **côté serveur** — jamais dans le
  bundle navigateur.
