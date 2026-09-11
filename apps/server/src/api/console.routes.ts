import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config, getRuntimeSettings, updateRuntimeSettings } from '../config.js';
import type { Repository } from '../db/repository.js';

/**
 * API REST de la console (usage LOCAL). Protégée par un mot de passe simple
 * transmis dans l'en-tête `x-console-password` (comparé à CONSOLE_PASSWORD).
 * Ce n'est PAS une authentification robuste — le projet tourne en local.
 */
function checkPassword(req: FastifyRequest, reply: FastifyReply): boolean {
  const provided = req.headers['x-console-password'];
  if (provided !== config.CONSOLE_PASSWORD) {
    reply.code(401).send({ error: 'Mot de passe console invalide' });
    return false;
  }
  return true;
}

const KbUpsertSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['operateurs', 'depannage', 'assurance', 'general']),
  operator: z.enum(['orange', 'mtn']).nullable().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.string().nullable().optional(),
  last_verified: z.string().nullable().optional(),
  verified: z.boolean(),
});

const SettingsSchema = z.object({
  voice: z.string().min(1).optional(),
  vadSilenceMs: z.number().int().min(0).max(5000).optional(),
  maxCallMinutes: z.number().int().positive().max(60).optional(),
  systemPromptOverride: z.string().nullable().optional(),
});

export async function registerConsoleRoutes(app: FastifyInstance, repo: Repository): Promise<void> {
  // Vérification du mot de passe sur toutes les routes /api/console/*.
  app.addHook('preHandler', async (req, reply) => {
    if (req.url.startsWith('/api/console')) {
      if (!checkPassword(req, reply)) return reply;
    }
    return undefined;
  });

  // Point de contrôle du mot de passe (login de la console).
  app.post('/api/console/login', async () => ({ ok: true }));

  app.get('/api/console/dashboard', async () => ({
    ...repo.dashboard(),
    topQueries: repo.topKbQueries(10),
  }));

  app.get('/api/console/calls', async () => ({ calls: repo.listCalls(200) }));

  app.get('/api/console/calls/:id', async (req) => {
    const { id } = req.params as { id: string };
    const call = repo.getCall(id);
    if (!call) return { call: null };
    return {
      call,
      turns: repo.listTurns(id),
      tools: repo.listToolCalls(id),
      sms: repo.listSmsByCall(id),
    };
  });

  app.get('/api/console/kb', async () => ({ fiches: repo.kbAll() }));

  app.post('/api/console/kb', async (req, reply) => {
    const parsed = KbUpsertSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    const d = parsed.data;
    repo.kbUpsert({
      id: d.id,
      category: d.category,
      operator: d.operator ?? null,
      title: d.title,
      content: d.content,
      source: d.source ?? null,
      last_verified: d.last_verified ?? null,
      verified: d.verified ? 1 : 0,
    });
    return { ok: true };
  });

  app.patch('/api/console/kb/:id/verified', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { verified?: boolean };
    const verified = body.verified ?? false;
    repo.kbSetVerified(id, verified, new Date().toISOString().slice(0, 10));
    return { ok: true };
  });

  app.delete('/api/console/kb/:id', async (req) => {
    const { id } = req.params as { id: string };
    repo.kbDelete(id);
    return { ok: true };
  });

  app.get('/api/console/tickets', async () => ({ tickets: repo.listTickets(200) }));

  app.get('/api/console/settings', async () => getRuntimeSettings());

  app.put('/api/console/settings', async (req, reply) => {
    const parsed = SettingsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });
    return updateRuntimeSettings(parsed.data);
  });
}
