# CLAUDE.md — Nextiaa Voice

Conventions et repères pour travailler sur ce dépôt.

## Ce qu'est le projet

MVP d'un **assistant vocal IA voix-à-voix** (API **Gemini Live**) qu'on
« appelle » depuis un **téléphone simulé dans le navigateur**. Base de code
propre, pensée pour être branchée plus tard sur une **vraie ligne
téléphonique (SIP)** sans réécriture. Édité par **Nextiaa** (Douala, Cameroun).

## Contraintes non négociables

1. **Zéro service payant.** Seule l'API Gemini (niveau **gratuit** AI Studio).
   Pas de Twilio/Telnyx/Vapi/LiveKit Cloud, pas de SMS payant, pas de base
   hébergée, pas d'hébergement payant. Tout tourne en local, open source.
2. **Voix-à-voix** avec Gemini Live (pas de chaîne STT → LLM → TTS séparée).
3. **La clé API ne va JAMAIS dans le navigateur.** Architecture
   serveur-à-serveur : navigateur → serveur Node → Gemini.
4. **Aucune donnée réelle.** Toutes les données de démo sont **fictives**.
5. **L'assistant n'invente jamais** un code USSD, un prix, un montant, une
   procédure ni un état de dossier : ces infos viennent **uniquement des
   outils** (base de connaissances, dossiers fictifs).
6. **Simplicité.** Monorepo lisible, repris en une journée. Pas de
   microservices, Kubernetes, Redis, file de messages.
7. **Langue.** Interface en français. L'assistant parle français par défaut,
   bascule en anglais si l'appelant parle anglais.

## Structure

```
nextiaa-voice/
├── packages/shared/   # contrat WS + schémas d'outils (zod), partagé web/serveur
├── apps/server/       # Fastify + @google/genai + SQLite + outils
│   └── prompts/system.fr.md   # instructions système de l'agent
├── apps/web/          # React + Vite + Tailwind (téléphone simulé + console)
├── data/knowledge/    # fiches de la base de connaissances (importées en SQLite)
└── docs/              # ARCHITECTURE, GEMINI_NOTES, DEMO
```

## Commandes utiles

| Commande | Effet |
|---|---|
| `npm install` | Installe tout le monorepo (workspaces). |
| `npm run dev` | Lance serveur **et** web ensemble. |
| `npm run dev:server` / `npm run dev:web` | Lance l'un ou l'autre. |
| `npm run typecheck` | Typage strict sur tous les workspaces. |
| `npm run lint` | ESLint. |
| `npm test` | Tests unitaires (vitest). |
| `npm run db:seed` | (Re)remplit la base SQLite avec les données fictives. |
| `npm run kb:import -- chemin/fichier.csv` | Importe des fiches KB depuis un CSV. |

Web sur <http://localhost:5173>, serveur sur <http://localhost:8787>
(le web proxifie `/api`, `/ws`, `/health` vers le serveur).

## Architecture résumée

Navigateur (téléphone simulé, AudioWorklets 16/24 kHz) ⇄ WebSocket `/ws/call`
⇄ serveur : `CallTransport` (abstraction) → `CallSession` → `GeminiLiveClient`
→ Gemini Live. Les outils passent par le `ToolRouter` ; tout est persisté en
SQLite ; la console lit via `/api/*`. Détails et migration SIP :
`docs/ARCHITECTURE.md`.

## Règles de l'agent vocal (résumé)

Voir `apps/server/prompts/system.fr.md` pour le texte complet. En bref :

- Se présente comme **assistant automatique**, phrases courtes, une question
  à la fois.
- **Toujours** appeler un outil avant de donner code/prix/procédure/état ;
  sinon, dire franchement qu'il n'a pas l'info et proposer SMS ou transfert.
- Lit les codes **symbole par symbole**.
- **Confirme** avant SMS / ticket / transfert.
- Dépannage : sécurité d'abord (débrancher), étape par étape, arrêt au moindre
  danger.
- Jamais de code secret Mobile Money / PIN / mot de passe. Pas de conseil
  médical/juridique/financier personnalisé.

## Qualité de code

- **TypeScript strict** partout, pas de `any` non justifié.
- **zod** valide chaque message WS et chaque argument d'outil ; un argument
  invalide → erreur propre renvoyée au modèle, jamais un plantage.
- **Aucun secret** dans le dépôt ; `.env` est dans `.gitignore`.
- Journaux **pino** structurés avec `callId` ; **ne jamais** journaliser la clé.
- Nettoyage garanti des ressources en fin d'appel.
- Commentaires **en français** sur les parties délicates (audio, interruption,
  outils).

## Vérification Gemini

L'API Live est en *preview*. Avant toute intégration, lire la doc (section 4
du cahier des charges) et tenir `docs/GEMINI_NOTES.md` à jour. **La doc
officielle fait foi** en cas d'écart.
