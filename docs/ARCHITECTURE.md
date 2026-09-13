# Architecture — Nextiaa Voice

## Vue d'ensemble

```
┌────────────────────────── NAVIGATEUR ──────────────────────────┐
│  Téléphone simulé (clavier, appel, USSD, boîte SMS)            │
│  AudioWorklet micro ──► PCM16 16 kHz ─┐                        │
│  AudioWorklet lecture ◄── PCM16 24 kHz┤                        │
│  Panneau transcription / console      │                        │
└───────────────────────────────────────┼────────────────────────┘
                                        │ WebSocket /ws/call
                                        │ (binaire = audio, texte = JSON)
┌───────────────────────────────────────▼──────── SERVEUR NODE ──┐
│  CallTransport (BrowserTransport aujourd'hui, SipTransport     │
│  demain)                                                       │
│      │                                                         │
│  CallSession ── GeminiLiveClient ──► WSS Gemini Live API       │
│      │                                                         │
│  ToolRouter ── knowledgeBase / sms / tickets / dossiers / otp  │
│      │                                                         │
│  Repository PostgreSQL/Neon (appels, tours, outils, SMS, …)    │
│  API REST /api/* pour la console                               │
└────────────────────────────────────────────────────────────────┘
```

## Principes

1. **La clé API ne quitte jamais le serveur.** Le navigateur envoie l'audio à
   notre serveur Node (WebSocket) ; c'est le serveur qui ouvre la session
   Gemini Live. Aucune clé, aucun secret dans le bundle navigateur.
2. **Un seul contrat WebSocket**, défini dans `packages/shared` et validé par
   zod des deux côtés.
3. **Le transport de l'appel est abstrait** (`CallTransport`) pour permettre
   de brancher plus tard une vraie ligne téléphonique **sans réécrire**
   `CallSession`.

## Protocole WebSocket (route `/ws/call`)

- **Frames binaires** : audio PCM16 mono.
  - Navigateur → serveur : **16 kHz**, morceaux de ~20–40 ms.
  - Serveur → navigateur : **24 kHz**.
- **Frames texte (JSON)** : événements validés par zod (`packages/shared/src/events.ts`).

### Client → serveur

| Événement | Charge utile |
|---|---|
| `call.start` | `{ dialed, callerNumber, simOperator, phoneQualityMode, accessMode, resumeToken? }` |
| `call.hangup` | — |
| `call.mute` | `{ muted }` |
| `ussd.select` | `{ option }` |
| `metrics.turn.report` | `{ latencyMs }` (mesure de latence locale) |

### Serveur → client

| Événement | Charge utile |
|---|---|
| `call.ringing` | — |
| `call.connected` | `{ callId, resumeToken? }` |
| `call.ended` | `{ reason, durationSec }` |
| `audio.flush` | — (interruption : vider la file de lecture) |
| `transcript.user` | `{ text, final }` |
| `transcript.agent` | `{ text, final }` |
| `tool.called` | `{ name, args }` |
| `tool.result` | `{ name, ok }` |
| `sms.received` | `{ from, body, at }` |
| `ussd.menu` | `{ text, options }` |
| `metrics.turn` | `{ latencyMs }` |
| `error` | `{ code, message }` |

## Abstraction `CallTransport`

Interface définie dans `apps/server/src/telephony/CallTransport.ts` :

```ts
export interface CallTransport {
  readonly callId: string;
  readonly callerNumber: string;   // numéro simulé de l'appelant
  readonly dialed: string;         // numéro ou code composé
  onAudio(cb: (pcm16k: Buffer) => void): void;
  sendAudio(pcm24k: Buffer): void;
  flushPlayback(): void;           // appelé sur interruption
  sendEvent(event: ServerEvent): void;
  hangup(reason: string): void;
  onHangup(cb: (reason: string) => void): void;
}
```

`CallSession` ne connaît **que** cette interface. Il reçoit de l'audio 16 kHz
via `onAudio`, renvoie de l'audio 24 kHz via `sendAudio`, pousse des événements
via `sendEvent`, et vide la lecture via `flushPlayback` sur interruption.

### Implémentation actuelle : `BrowserTransport`

- Adapte le WebSocket navigateur : frames binaires = audio, frames texte = JSON.
- L'audio arrive déjà en PCM16 16 kHz (rééchantillonné dans le navigateur) et
  repart en PCM16 24 kHz tel quel.

## Chemin de migration vers une vraie ligne téléphonique (`SipTransport`)

Objectif final : joindre l'assistant via un **vrai numéro camerounais**, puis
via un **code USSD Orange/MTN** qui déclenche un **rappel automatique** (le
canal USSD est *texte uniquement*, il ne transporte pas la voix — il ne sert
qu'à déclencher l'appel).

Un futur `SipTransport` implémente la **même interface `CallTransport`** :

1. **Signalisation SIP** (open source, ex. *drachtio*, *Asterisk ARI* ou
   *JsSIP*/*sip.js* côté passerelle) pour recevoir/émettre les appels.
2. **Média RTP** : l'audio téléphonique arrive typiquement en **8 kHz**
   (souvent codec G.711 µ-law/a-law). `SipTransport` doit :
   - décoder le codec vers du PCM16 ;
   - **rééchantillonner 8 kHz → 16 kHz** avant `onAudio` (le même utilitaire
     que `apps/web/src/audio/resample.ts`, porté côté serveur) ;
   - **rééchantillonner 24 kHz → 8 kHz** et ré-encoder pour `sendAudio`.
3. **USSD opérateur** : le code USSD (Orange/MTN) déclenche, via l'intégration
   opérateur, un **appel sortant** de la plateforme vers l'appelant
   (« callback »). Côté code, cela revient à instancier un `SipTransport` avec
   `accessMode = 'ussd_callback'` — exactement ce que simule déjà le parcours
   `#136#` du navigateur.

**Rien de tout cela ne touche `CallSession`, `GeminiLiveClient`, le
`ToolRouter` ni la base de données.** Seul le transport change. C'est
l'intérêt de l'abstraction : le MVP navigateur et la future ligne réelle
partagent 90 % du code.

## Base de données & déploiement

- **PostgreSQL (Neon)** via le pilote `pg` (pool de connexions), accédé par un
  `Repository` **asynchrone**. Le schéma et les données fictives sont appliqués
  au premier démarrage. La couche recherche (`searchFiches`) est une fonction
  **pure** testée sans base ; les tests d'intégration utilisent **PGlite**
  (Postgres embarqué WASM) — aucun serveur externe requis.
- **Déploiement tout-Render** : un seul Web Service Node exécute le serveur
  (Fastify + WebSocket) **et** sert le web buildé (`@fastify/static`), donc une
  seule origine (WebSocket même origine, pas de CORS). Vercel est écarté pour
  le serveur car il ne supporte pas les WebSockets longs. Voir
  `docs/DEPLOIEMENT.md`.

## Nettoyage des ressources

À la fin d'un appel (raccrochage, timeout, erreur, coupure) :

- fermeture de la session Gemini (`session.close()`) ;
- arrêt du flux micro et déconnexion des AudioWorklets côté navigateur ;
- fermeture du WebSocket ;
- écriture finale en base (durée, statut, consommation).
