# Notes d'intégration Gemini Live

> **Jalon 0 — statut de vérification.** L'accès réseau sortant de
> l'environnement de développement où ce code a été écrit **bloque
> `ai.google.dev`** (politique d'egress de l'organisation : seuls les
> registres de paquets et l'API Anthropic sont joignables). Les pages de la
> section 4 du cahier des charges **n'ont donc pas pu être lues directement**.
>
> Ce fichier consigne les hypothèses de travail (issues du cahier des charges
> et de la connaissance du SDK `@google/genai` v2). **Chaque point marqué
> ⚠️ À RECONFIRMER doit être vérifié sur la documentation officielle** dès
> qu'un accès réseau à `ai.google.dev` est disponible, avant toute démo
> client. En cas d'écart, **la documentation officielle fait foi** : adapter
> le code et mettre à jour ce fichier.

Pages à lire (section 4 du cahier des charges) :

- Capacités : <https://ai.google.dev/gemini-api/docs/live-api/capabilities>
- Outils : <https://ai.google.dev/gemini-api/docs/live-api/tools>
- Sessions : <https://ai.google.dev/gemini-api/docs/live-api/session-management>
- Bonnes pratiques : <https://ai.google.dev/gemini-api/docs/live-api/best-practices>
- Limites de débit : <https://ai.google.dev/gemini-api/docs/rate-limits>
- Tarifs / niveau gratuit : <https://ai.google.dev/gemini-api/docs/pricing>

## 1. Modèle Live

- **Point de départ** (variable `.env` `GEMINI_LIVE_MODEL`) :
  `gemini-3.1-flash-live-preview`.
- **Alternative** : `gemini-2.5-flash-native-audio-preview-12-2025`.
- ⚠️ **À RECONFIRMER** : le **nom exact** du modèle disponible et sa
  **disponibilité sur le niveau gratuit** d'AI Studio. Les modèles Live sont
  en *preview* et changent de nom régulièrement. Le modèle est configurable
  sans toucher au code (`.env`) précisément pour absorber ces changements.

## 2. SDK `@google/genai` (JavaScript) — champs attendus

Version installée : **`@google/genai` v2.x**. Surface utilisée (⚠️ à
reconfirmer nom par nom dans la doc « capabilities » et « tools ») :

| Élément | Usage prévu dans le code |
|---|---|
| `new GoogleGenAI({ apiKey })` | Client, **côté serveur uniquement** (la clé ne va jamais au navigateur). |
| `ai.live.connect({ model, config, callbacks })` | Ouvre la session Live (WebSocket géré par le SDK). |
| `config.responseModalities: [Modality.AUDIO]` | Sortie audio. |
| `config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName` | Voix prédéfinie (`.env` `GEMINI_VOICE`). |
| `config.systemInstruction` | Instructions système (fichier `prompts/system.fr.md`). |
| `config.inputAudioTranscription: {}` | Transcription de l'appelant. |
| `config.outputAudioTranscription: {}` | Transcription de l'assistant. |
| `config.realtimeInputConfig.automaticActivityDetection.silenceDurationMs` | VAD auto (défaut 700 ms, plage 500–800). |
| `config.tools: [{ functionDeclarations: [...] }]` | Déclaration des outils. |
| `config.sessionResumption: {}` | Reprise de session (J6). |
| `config.contextWindowCompression: {}` | Compression de contexte (sessions longues). |
| `config.thinkingConfig` | Niveau de réflexion **minimal** (latence). |
| `session.sendRealtimeInput({ audio: { data, mimeType } })` | Envoi de l'audio entrant. |
| `session.sendRealtimeInput({ text })` | Injection de texte **en cours** de conversation (ex. consigne d'accueil). |
| `session.sendClientContent({ turns })` | **Uniquement** pour injecter un historique initial. |
| `session.sendToolResponse({ functionResponses })` | Réponse d'outil (`{ id, name, response }`). |
| `session.close()` | Fermeture propre en fin d'appel. |
| callback `onmessage(message)` | Messages serveur (voir §3). |

## 3. Format des messages serveur

- Un **même message serveur peut contenir plusieurs parties** (audio ET
  transcription) : **traiter toutes les parties** de `message.serverContent.modelTurn.parts`.
- Audio sortant : parties `inlineData` (base64), PCM 16 bits **24 kHz**.
- Transcriptions : `message.serverContent.inputTranscription` /
  `outputTranscription` (⚠️ à reconfirmer : nom exact des champs).
- **Interruption** : `message.serverContent.interrupted === true` → vider
  immédiatement la file de lecture audio côté navigateur (`audio.flush`).
- Fin de tour : `message.serverContent.turnComplete`.
- Appels d'outils : `message.toolCall.functionCalls` (`{ id, name, args }`).
- Consommation : `message.usageMetadata` (à enregistrer par appel).
- ⚠️ **À RECONFIRMER** : noms exacts de tous ces champs.

## 4. Format audio

- **Entrant** : PCM 16 bits little-endian, **16 kHz**, mono,
  `mime: audio/pcm;rate=16000`.
- **Sortant** : PCM 16 bits, **24 kHz**, mono.
- Le navigateur capture en général à 48 kHz → rééchantillonnage vers 16 kHz
  (voir `apps/web/src/audio/resample.ts`). Le mode « qualité téléphone »
  applique un passe-bande 300–3400 Hz puis passe par 8 kHz.

## 5. Appel d'outils synchrone

- Avec Gemini 3.1 Flash Live, l'appel d'outils est **synchrone** : le modèle
  **attend** la réponse de l'outil avant de parler. Nos outils doivent donc
  répondre en **moins de 300 ms** (recherche Fuse.js en mémoire, SQLite local).
- ⚠️ **À RECONFIRMER** : comportement synchrone exact et éventuel champ
  `scheduling` (`INTERRUPT` / `WHEN_IDLE` / `SILENT`).

## 6. Sessions et limites

- Sessions **audio seules** limitées à **~15 minutes** sans mécanisme
  d'extension → durée max d'appel par défaut **10 minutes** (`.env`).
- `sessionResumption` permet la reprise après coupure (J6).
- `contextWindowCompression` prolonge les sessions longues.
- ⚠️ **À RECONFIRMER** : **limites de débit du niveau gratuit** pour le modèle
  retenu (requêtes/minute, minutes de session/jour). Sur dépassement (**429**),
  le serveur joue un bip, affiche « Service momentanément saturé… » et termine
  proprement l'appel.

## 7. Langues et voix

- Les modèles audio natifs **choisissent la langue automatiquement** ; on la
  cadre via les instructions système (français par défaut, anglais si
  l'appelant parle anglais).
- Le **pidgin** ne figure pas dans la liste officielle des langues : à tester
  **sans rien promettre**.
- **Voix testées** (à compléter après essais réels) :

  | Voix | Impression | Retenue ? |
  |---|---|---|
  | Kore | (à tester) | défaut |
  | Puck | (à tester) | — |
  | Charon | (à tester) | — |
  | Aoede | (à tester) | — |

## 8. Écarts constatés par rapport au cahier des charges

- (à compléter au fil des vérifications)
