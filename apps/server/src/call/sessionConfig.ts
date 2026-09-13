import { Modality, type FunctionDeclaration, type LiveConnectConfig } from '@google/genai';

export interface SessionConfigInput {
  /** Nom du modèle Live (pour adapter la config selon audio-natif / cascade). */
  model: string;
  /** Instructions système déjà interpolées (variables d'appel injectées). */
  systemInstruction: string;
  /** Voix prédéfinie (ex. Kore). */
  voice: string;
  /** Durée de silence avant fin de parole (VAD), 500–800 ms recommandé. */
  vadSilenceMs: number;
  /** Déclarations d'outils (function calling). Vide au J1. */
  functionDeclarations: FunctionDeclaration[];
  /** Jeton de reprise de session (J6), le cas échéant. */
  resumeHandle?: string;
}

/**
 * Construit la configuration de connexion Gemini Live.
 *
 * Choix clés :
 * - sortie AUDIO uniquement (voix-à-voix) ;
 * - transcriptions entrée ET sortie activées (affichage + persistance) ;
 * - VAD automatique avec `silenceDurationMs` réglable ;
 * - réflexion minimale (`thinkingBudget: 0`) pour réduire la latence ;
 * - `sessionResumption` activé pour permettre la reprise après coupure (J6) ;
 * - `contextWindowCompression` pour tenir sur les sessions longues.
 *
 * Les noms de champs ont été validés contre les types du SDK @google/genai v2
 * (voir docs/GEMINI_NOTES.md).
 */
export function buildLiveConfig(input: SessionConfigInput): LiveConnectConfig {
  const config: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    // Voix prédéfinie de l'assistant.
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: input.voice } },
    },
    systemInstruction: input.systemInstruction,
    // Transcriptions : l'objet vide active la fonctionnalité.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    // VAD automatique : le serveur Gemini détecte la fin de parole.
    realtimeInputConfig: {
      automaticActivityDetection: { silenceDurationMs: input.vadSilenceMs },
    },
    // Reprise de session (J6) et compression de contexte (sessions longues).
    sessionResumption: input.resumeHandle ? { handle: input.resumeHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
  };

  // Réflexion minimale = latence minimale (objectif < 1 s). Les modèles
  // AUDIO-NATIFS ne prennent pas thinkingConfig : on ne l'ajoute que pour les
  // modèles « cascade » (ex. *-flash-live-*) afin d'éviter une erreur de connexion.
  if (!input.model.includes('native-audio')) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  if (input.functionDeclarations.length > 0) {
    config.tools = [{ functionDeclarations: input.functionDeclarations }];
  }

  return config;
}
