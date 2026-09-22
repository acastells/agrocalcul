import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import worker from '../dist/server/index.js';
import { openLocalDatabase } from '../tooling/sqlite-d1.mjs';

const port = Number(process.env.PORT || 8787);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
mkdirSync(new URL('../.local/', import.meta.url), { recursive: true });
const DB = openLocalDatabase(new URL('../.local/agrocalcul.sqlite', import.meta.url).pathname);
DB.migrate(new URL('../drizzle/', import.meta.url));
const maximumBodyBytes = 2_000_000;
const server = createServer(async (incoming, outgoing) => {
  try {
    const origin = new URL(`http://${incoming.headers.host}`);
    if (
      !['localhost', '127.0.0.1'].includes(origin.hostname) ||
      Number(origin.port || 80) !== port
    ) {
      outgoing.writeHead(403);
      outgoing.end();
      return;
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > maximumBodyBytes) {
        outgoing.writeHead(413);
        outgoing.end();
        return;
      }
      chunks.push(chunk);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    }
    // Trust only the local adapter's fixed identity, never a caller-supplied header.
    headers.set('oai-authenticated-user-id', process.env.AGRO_DEV_USER || 'local-developer');
    const request = new Request(new URL(incoming.url, origin), {
      method: incoming.method,
      headers,
      body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await worker.fetch(request, { DB });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Local request failed:', error.message);
    outgoing.writeHead(500);
    outgoing.end('Local server error');
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log(`AgroCàlcul: http://127.0.0.1:${port} (development only)`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () =>
    server.close(() => {
      DB.close();
      process.exit(0);
    }),
  );
