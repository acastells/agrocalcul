export function database(env, owner) {
  if (!env.DB) throw new Error('Database unavailable');
  const sql = (statement, ...args) => env.DB.prepare(statement).bind(...args);
  const decode = (row) =>
    row ? { id: row.id, kind: row.kind, data: JSON.parse(row.data), revision: row.revision } : null;
  const get = async (id) =>
    decode(
      await sql(
        'SELECT id, kind, data, revision FROM records WHERE owner = ? AND id = ?',
        owner,
        id,
      ).first(),
    );
  const list = async () =>
    (
      (
        await sql(
          'SELECT id, kind, data, revision FROM records WHERE owner = ? ORDER BY created_at, id',
          owner,
        ).all()
      ).results ?? []
    ).map(decode);
  return {
    get,
    list,
    async initialize(seed) {
      const now = new Date().toISOString();
      const statements = ['production', 'npk'].map((kind) =>
        sql(
          "INSERT OR IGNORE INTO records (owner,id,kind,data,revision,created_at,updated_at) SELECT ?,?,?,?,1,?,? WHERE NOT EXISTS (SELECT 1 FROM records WHERE owner = ? AND id = 'config')",
          owner,
          'initial-' + kind,
          kind,
          JSON.stringify(seed[kind]),
          now,
          now,
          owner,
        ),
      );
      statements.push(
        sql(
          "INSERT OR IGNORE INTO records (owner,id,kind,data,revision,created_at,updated_at) VALUES (?,'config','config',?,1,?,?)",
          owner,
          JSON.stringify(seed.config),
          now,
          now,
        ),
      );
      const result = await env.DB.batch(statements);
      return result[2].meta.changes === 1;
    },
    async create(id, kind, data) {
      const now = new Date().toISOString();
      await sql(
        'INSERT OR IGNORE INTO records (owner,id,kind,data,revision,created_at,updated_at) VALUES (?,?,?,?,1,?,?)',
        owner,
        id,
        kind,
        JSON.stringify(data),
        now,
        now,
      ).run();
      return get(id);
    },
    async update(id, revision, data) {
      const row = await sql(
        'UPDATE records SET data = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND id = ? AND revision = ? RETURNING id,kind,data,revision',
        JSON.stringify(data),
        new Date().toISOString(),
        owner,
        id,
        revision,
      ).first();
      return decode(row);
    },
    async remove(id, revision) {
      const result = await sql(
        "DELETE FROM records WHERE owner = ? AND id = ? AND revision = ? AND kind != 'config'",
        owner,
        id,
        revision,
      ).run();
      return result.meta.changes === 1;
    },
  };
}
