# Nextiaa Voice

Assistant vocal IA **voix-à-voix** (API **Gemini Live**) qu'on « appelle »
depuis un **téléphone simulé dans le navigateur**. MVP de démonstration édité
par **Nextiaa** (Douala, Cameroun).

> ⚠️ **Données de démonstration fictives uniquement.**
> Ce projet utilise le **niveau gratuit** de Google AI Studio. Sur ce niveau,
> Google **peut utiliser les échanges** pour améliorer ses produits.
> **Ne saisissez donc aucune donnée réelle** (numéros, noms, dossiers,
> montants). Tout ce qui est fourni dans la démo est **fictif**.

## Prérequis

- **Node.js 20+** (testé sous Node 22) et **npm 10+**.
- Une **clé API Google AI Studio** (gratuite).

## Obtenir la clé gratuite

1. Aller sur <https://aistudio.google.com/apikey>.
2. Se connecter avec un compte Google et **créer une clé API**.
3. La clé donne accès au **niveau gratuit** (voir ses limites ci-dessous).

## Installation

```bash
git clone <ce-dépôt> nextiaa-voice
cd nextiaa-voice
npm install
cp .env.example .env
# puis éditer .env et coller la clé dans GEMINI_API_KEY
```

## Lancement

```bash
npm run dev
```

- Interface (téléphone simulé) : <http://localhost:5173>
- Console d'administration : <http://localhost:5173/console>
- Serveur (API + WebSocket) : <http://localhost:8787>

Le serveur démarre même **sans clé** (l'interface indique alors « clé
absente ») : pratique pour explorer l'UI, mais les appels échoueront tant que
`GEMINI_API_KEY` n'est pas renseignée.

## Utilisation rapide

1. En haut de l'écran, choisir la **SIM simulée** (Orange ou MTN) et un
   **numéro fictif** (clairement marqué « fictif »).
2. Composer **`8000`** puis appuyer sur le bouton vert pour parler à
   l'assistant.
3. Autoriser le **micro** quand le navigateur le demande.
4. Parler naturellement en français (ou en anglais).

Scénarios de démonstration détaillés : [`docs/DEMO.md`](docs/DEMO.md).

## Limites du niveau gratuit

- Les modèles Live sont en **preview** : noms et quotas évoluent (voir
  [`docs/GEMINI_NOTES.md`](docs/GEMINI_NOTES.md)).
- **Limites de débit** : au-delà du quota (**erreur 429**), l'assistant joue un
  bip, affiche « Service momentanément saturé, réessayez dans un instant » et
  termine proprement l'appel.
- Sessions audio limitées à **~15 minutes** ; la durée max d'appel est réglée à
  **10 minutes** par défaut (`.env` `MAX_CALL_MINUTES`).
- **Confidentialité** : sur le niveau gratuit, Google peut exploiter les
  échanges — d'où la règle **données fictives uniquement**.

## Configuration (`.env`)

Voir [`.env.example`](.env.example) pour la liste commentée. Points clés :

| Variable | Rôle |
|---|---|
| `GEMINI_API_KEY` | Clé du niveau gratuit (**jamais** dans le navigateur). |
| `GEMINI_LIVE_MODEL` | Modèle Live (défaut `gemini-3.1-flash-live-preview`). |
| `GEMINI_VOICE` | Voix prédéfinie (défaut `Kore`). |
| `DEMO_NUMBERS` | Numéros qui joignent l'assistant (défaut `8000`). |
| `USSD_CODE` | Code USSD simulé (défaut `#136#`). |
| `MAX_CALL_MINUTES` | Durée max d'appel. |
| `CONSOLE_PASSWORD` | Mot de passe simple de la console (local). |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — schéma, protocole WebSocket,
  migration vers une vraie ligne téléphonique (SIP).
- [`docs/GEMINI_NOTES.md`](docs/GEMINI_NOTES.md) — modèle, paramètres, limites,
  voix testées.
- [`docs/DEMO.md`](docs/DEMO.md) — scénarios prêts pour un rendez-vous client.
- [`CLAUDE.md`](CLAUDE.md) — conventions du projet.

## Sécurité & confidentialité

- La clé Gemini reste **côté serveur**. Le navigateur ne parle qu'à notre
  serveur Node.
- `.env` est ignoré par git ; aucun secret n'est committé.
- Les journaux ne contiennent **jamais** la clé API.
