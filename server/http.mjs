const MAX_BODY_BYTES = 2_000_000;

/** Expected client errors are safe to return; unexpected failures remain generic. */
export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
export function problem(message, status) {
  throw new HttpError(message, status);
}

/** Bound memory while reading, then require a JSON object rather than null or arrays. */
export async function readJsonObject(request) {
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let length = 0,
    text = '';
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BODY_BYTES) {
          await reader.cancel();
          problem('Massa dades.', 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
  }
  let body;
  try {
    body = JSON.parse(text || '{}');
  } catch {
    problem('Dades no vàlides.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) problem('Dades no vàlides.', 400);
  return body;
}
