import { Modality, type FunctionDeclaration, type LiveConnectConfig } from '@google/genai';

export interface SessionConfigInput {
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
    // Réflexion minimale = latence minimale (objectif < 1 s).
    // NB : certains modèles Gemini 3.x utilisent `thinkingLevel` plutôt que
    // `thinkingBudget` ; à reconfirmer selon le modèle (docs/GEMINI_NOTES.md).
    thinkingConfig: { thinkingBudget: 0 },
    // Reprise de session (J6) et compression de contexte (sessions longues).
    sessionResumption: input.resumeHandle ? { handle: input.resumeHandle } : {},
    contextWindowCompression: { slidingWindow: {} },
  };

  if (input.functionDeclarations.length > 0) {
    config.tools = [{ functionDeclarations: input.functionDeclarations }];
  }

  return config;
}
