import { problem, readJsonObject } from './http.mjs';
import assets from 'agro:assets';
import { defaults } from '../web/data.mjs';
import { validateData } from './validate.mjs';
import { database } from './database.mjs';
import { initialSeed } from './seeds.mjs';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
/** Create from a snapshot of configuration; retrying the same ID is idempotent. */
async function createRecord(db, body) {
  if (
    !['production', 'npk'].includes(body.kind) ||
    typeof body.id !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(body.id)
  )
    problem('Dades no vàlides.', 400);
  const existing = await db.get(body.id);
  if (existing) return json({ record: existing });
  const config = await db.get('config');
  if (!config) problem('Recarrega la pàgina.', 409);
  const year = new Date().getUTCFullYear();
  const data =
    body.kind === 'production'
      ? {
          ...structuredClone(defaults.production),
          title: `Nou període ${year}`,
          year,
          startDate: `${year}-01-01`,
          endDate: `${year}-12-31`,
          income: structuredClone(config.data.income),
          expenses: structuredClone(config.data.expenses),
        }
      : { ...structuredClone(defaults.npk), title: 'Nou càlcul NPK' };
  validateData(body.kind, data);
  return json({ record: await db.create(body.id, body.kind, data) }, 201);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      const path = url.pathname === '/' ? '/index.html' : url.pathname;
      if (!Object.hasOwn(assets, path)) return new Response('Not found', { status: 404 });
      const contentType = path.endsWith('.html')
        ? 'text/html'
        : path.endsWith('.css')
          ? 'text/css'
          : 'text/javascript';
      return new Response(assets[path], {
        headers: {
          'content-type': contentType + '; charset=utf-8',
          'cache-control': 'no-cache',
          'x-content-type-options': 'nosniff',
          'referrer-policy': 'same-origin',
        },
      });
    }
    try {
      const owner = request.headers.get('oai-authenticated-user-id');
      if (!owner) problem('Inicia sessió.', 401);
      const db = database(env, owner);
      if (request.method === 'GET' && url.pathname === '/api/records')
        return json({ records: await db.list() });
      if (!['POST', 'PUT', 'DELETE'].includes(request.method)) problem('Mètode no permès.', 405);
      if (
        request.headers.get('x-agro-request') !== '1' ||
        (request.headers.has('origin') && request.headers.get('origin') !== url.origin)
      )
        problem('Accés denegat.', 403);
      const body = await readJsonObject(request);
      if (url.pathname === '/api/bootstrap' && request.method === 'POST') {
        const { seed, imported } = initialSeed(body.legacy);
        const initialized = await db.initialize(seed);
        return json({ records: await db.list(), imported: initialized && imported });
      }
      if (url.pathname === '/api/records' && request.method === 'POST') {
        return await createRecord(db, body);
      }
      const match = url.pathname.match(/^\/api\/records\/([a-zA-Z0-9-]+)$/);
      if (!match) problem('No trobat.', 404);
      const record = await db.get(match[1]);
      if (!record) problem('No trobat.', 404);
      if (!Number.isSafeInteger(body.revision) || body.revision < 1)
        problem('Versió no vàlida.', 400);
      if (request.method === 'PUT') {
        validateData(record.kind, body.data);
        const updated = await db.update(record.id, body.revision, body.data);
        if (!updated) problem('Hi ha canvis en un altre dispositiu. Recarrega.', 409);
        return json({ record: updated });
      }
      if (request.method === 'DELETE') {
        if (record.kind === 'config') problem('Accés denegat.', 403);
        if (!(await db.remove(record.id, body.revision)))
          problem('Hi ha canvis en un altre dispositiu. Recarrega.', 409);
        return json({ deleted: true });
      }
      problem('Mètode no permès.', 405);
    } catch (error) {
      if (!error.status) console.error('AgroCalcul database operation failed', error.message);
      return json(
        { error: error.status ? error.message : 'No s’ha pogut desar. Torna-ho a provar.' },
        error.status || 503,
      );
    }
  },
};
