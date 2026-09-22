import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/** Local subset of the D1 API used by this project. Never shipped in the Worker. */
export function openLocalDatabase(filename) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys = ON');
  const bindStatement = (sql, values = []) => ({
    bind(...parameters) {
      return bindStatement(sql, parameters);
    },
    async first() {
      return sqlite.prepare(sql).get(...values) ?? null;
    },
    async all() {
      return { results: sqlite.prepare(sql).all(...values) };
    },
    async run() {
      const result = sqlite.prepare(sql).run(...values);
      return { meta: { changes: Number(result.changes) } };
    },
  });
  return {
    prepare(sql) {
      return bindStatement(sql);
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    migrate(directory) {
      sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (tag TEXT PRIMARY KEY)');
      const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', directory), 'utf8'));
      for (const entry of journal.entries) {
        if (sqlite.prepare('SELECT tag FROM _local_migrations WHERE tag = ?').get(entry.tag))
          continue;
        sqlite.exec('BEGIN');
        try {
          sqlite.exec(readFileSync(new URL(entry.tag + '.sql', directory), 'utf8'));
          sqlite.prepare('INSERT INTO _local_migrations (tag) VALUES (?)').run(entry.tag);
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
      }
    },
    close() {
      sqlite.close();
    },
  };
}
