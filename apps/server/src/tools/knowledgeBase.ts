import Fuse from 'fuse.js';
import type { Repository, KbRow } from '../db/repository.js';
import type { SearchKnowledgeBaseArgs } from '@nextiaa/shared';

export interface KbHit {
  id: string;
  title: string;
  content: string;
  lastVerified: string | null;
}

export type KbSearchResult = { found: true; results: KbHit[] } | { found: false };

/**
 * Recherche approximative (Fuse.js) dans la base de connaissances.
 *
 * Ne considère QUE les fiches vérifiées (`verified = 1`) : c'est la garantie
 * que l'assistant ne lit jamais un contenu « À RENSEIGNER » ou non validé.
 * Renvoie jusqu'à 3 fiches, ou `{ found: false }` si rien de vérifié ne matche.
 */
export function searchKnowledgeBase(repo: Repository, args: SearchKnowledgeBaseArgs): KbSearchResult {
  const candidates = repo.kbForSearch(args.category, args.operator);
  if (candidates.length === 0) return { found: false };

  const fuse = new Fuse<KbRow>(candidates, {
    // Titre fortement pondéré : évite les faux positifs venant du corps de texte
    // (mieux vaut répondre « pas d'information vérifiée » que lire une fiche sans
    // rapport — l'assistant ne doit jamais inventer). Seuil 0.4 réglé
    // empiriquement : les requêtes légitimes matchent, les sujets absents non.
    keys: [
      { name: 'title', weight: 0.85 },
      { name: 'content', weight: 0.15 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  // Filet de sécurité : on écarte les scores quasi nuls (proches de 1).
  const matches = fuse.search(args.query).filter((m) => (m.score ?? 1) < 0.9).slice(0, 3);
  if (matches.length === 0) return { found: false };

  return {
    found: true,
    results: matches.map(({ item }) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      lastVerified: item.last_verified,
    })),
  };
}
