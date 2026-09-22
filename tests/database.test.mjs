import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import worker from '../dist/server/index.js';
import { openLocalDatabase } from '../tooling/sqlite-d1.mjs';
import { defaults } from '../web/data.mjs';

function fixture(t) {
  const root = new URL('../.cache/', import.meta.url);
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(root.pathname + 'test-');
  let DB = openLocalDatabase(directory + '/test.sqlite');
  DB.migrate(new URL('../drizzle/', import.meta.url));
  t.after(() => {
    DB.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    async request(path, method = 'GET', body, owner = 'alice', headers = {}) {
      const request = new Request('https://agro.test' + path, {
        method,
        headers: {
          ...(owner ? { 'oai-authenticated-user-id': owner } : {}),
          'x-agro-request': '1',
          origin: 'https://agro.test',
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const response = await worker.fetch(request, { DB });
      return { status: response.status, data: await response.json() };
    },
    reopen() {
      DB.close();
      DB = openLocalDatabase(directory + '/test.sqlite');
    },
  };
}

test('saved periods survive close/reopen; bootstrap does not resurrect deleted records', async (t) => {
  const app = fixture(t);
  const initial = (await app.request('/api/bootstrap', 'POST', {})).data.records;
  const period = initial.find((r) => r.kind === 'production');
  period.data.title = 'Campaign 2027';
  const saved = await app.request('/api/records/' + period.id, 'PUT', {
    revision: 1,
    data: period.data,
  });
  assert.equal(saved.status, 200);
  app.reopen();
  assert.equal(
    (await app.request('/api/records')).data.records.find((r) => r.id === period.id).data.title,
    'Campaign 2027',
  );
  assert.equal(
    (await app.request('/api/records/' + period.id, 'DELETE', { revision: 2 })).status,
    200,
  );
  assert.equal(
    (await app.request('/api/bootstrap', 'POST', {})).data.records.some((r) => r.id === period.id),
    false,
  );
});

test('configuration is snapshotted into new periods, without changing older periods', async (t) => {
  const app = fixture(t);
  const initial = (await app.request('/api/bootstrap', 'POST', {})).data.records;
  const config = initial.find((r) => r.kind === 'config');
  config.data.expenses = [{ name: 'Water', amount: 75, group: 'general' }];
  assert.equal(
    (await app.request('/api/records/config', 'PUT', { revision: 1, data: config.data })).status,
    200,
  );
  const id = crypto.randomUUID();
  const created = await app.request('/api/records', 'POST', { id, kind: 'production' });
  assert.equal(created.data.record.data.expenses[0].amount, 75);
  config.data.expenses = [];
  await app.request('/api/records/config', 'PUT', { revision: 2, data: config.data });
  const all = (await app.request('/api/records')).data.records;
  assert.equal(all.find((r) => r.id === id).data.expenses[0].amount, 75);
  assert.equal(all.find((r) => r.id === 'initial-production').data.income[0].amount, 161446);
  assert.equal(
    (await app.request('/api/records', 'POST', { id, kind: 'production' })).data.record.id,
    id,
  );
});

test('NPK records are independent and stale revisions cannot overwrite a save', async (t) => {
  const app = fixture(t);
  await app.request('/api/bootstrap', 'POST', {});
  const id = crypto.randomUUID();
  const { record } = (await app.request('/api/records', 'POST', { id, kind: 'npk' })).data;
  record.data.title = 'Other sector';
  record.data.fertilizers.push({
    name: 'Extra',
    basis: 'manual',
    n: 10,
    p: 0,
    k: 0,
    kgHa: 100,
    price: 2,
    density: 1,
  });
  assert.equal(
    (await app.request('/api/records/' + id, 'PUT', { revision: 1, data: record.data })).status,
    200,
  );
  assert.equal(
    (await app.request('/api/records/' + id, 'PUT', { revision: 1, data: record.data })).status,
    409,
  );
  const all = (await app.request('/api/records')).data.records;
  assert.equal(all.find((r) => r.id === 'initial-npk').data.fertilizers.length, 2);
  assert.equal(all.find((r) => r.id === id).data.fertilizers.length, 3);
});

test('authentication, origin checks and owner scoping reject unauthorized mutations', async (t) => {
  const app = fixture(t);
  await app.request('/api/bootstrap', 'POST', {});
  assert.equal((await app.request('/api/records', 'GET', undefined, null)).status, 401);
  assert.equal(
    (await app.request('/api/bootstrap', 'POST', {}, 'alice', { origin: 'https://other.test' }))
      .status,
    403,
  );
  assert.equal(
    (await app.request('/api/records/initial-production', 'DELETE', { revision: 1 }, 'bob')).status,
    404,
  );
  assert.deepEqual((await app.request('/api/records', 'GET', undefined, 'bob')).data.records, []);
  assert.equal((await app.request('/api/records/config', 'DELETE', { revision: 1 })).status, 403);
});

test('invalid JSON shape, excessive bodies and invalid domain values are rejected', async (t) => {
  const app = fixture(t);
  assert.equal((await app.request('/api/bootstrap', 'POST', null)).status, 400);
  assert.equal((await app.request('/api/bootstrap', 'POST', [])).status, 400);
  assert.equal(
    (await app.request('/api/bootstrap', 'POST', { large: 'x'.repeat(2_000_001) })).status,
    413,
  );
  const records = (await app.request('/api/bootstrap', 'POST', {})).data.records;
  const record = records.find((r) => r.kind === 'production');
  record.data.area = 0;
  assert.equal(
    (await app.request('/api/records/' + record.id, 'PUT', { revision: 1, data: record.data }))
      .status,
    400,
  );
});

test('legacy browser values are imported only on first initialization', async (t) => {
  const app = fixture(t);
  const legacy = structuredClone(defaults);
  legacy.production.expenses[0].amount = 123;
  const result = await app.request('/api/bootstrap', 'POST', { legacy });
  assert.equal(result.data.imported, true);
  assert.equal(
    result.data.records.find((r) => r.kind === 'production').data.expenses[0].amount,
    123,
  );
  assert.equal((await app.request('/api/bootstrap', 'POST', { legacy })).data.imported, false);
});
