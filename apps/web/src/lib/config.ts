import { useEffect, useState } from 'react';

export interface ServerConfig {
  demoNumbers: string[];
  ussdCode: string;
  maxCallMinutes: number;
}

const FALLBACK: ServerConfig = { demoNumbers: ['8000'], ussdCode: '#136#', maxCallMinutes: 10 };

/** Charge la configuration publique du serveur (numéros de démo, code USSD). */
export function useServerConfig(): ServerConfig {
  const [cfg, setCfg] = useState<ServerConfig>(FALLBACK);
  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((c: ServerConfig) => setCfg(c))
      .catch(() => setCfg(FALLBACK));
  }, []);
  return cfg;
}
