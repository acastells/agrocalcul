import test from 'node:test';
import assert from 'node:assert/strict';
import { createSaveQueue } from '../web/save-queue.mjs';

function fixture(saveRecord) {
  const record = { id: 'a', revision: 1, data: { title: 'Original' } };
  const events = [];
  const queue = createSaveQueue({
    findRecord: () => record,
    saveRecord,
    onStatus: (...event) => events.push(event),
    delay: 60_000,
  });
  return { record, events, queue };
}

test('an empty flush must not prevent subsequent writes', async () => {
  let writes = 0;
  const { queue } = fixture(async () => ({ revision: ++writes + 1 }));
  try {
    assert.equal(await queue.flush(), true);
    queue.mark('a');
    assert.equal(await queue.flush(), true);
    assert.equal(writes, 1);
    assert.equal(queue.hasPending, false);
  } finally {
    queue.dispose();
  }
});

test('edits during an in-flight request are saved using the returned revision', async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const writes = [];
  const { record, queue } = fixture(async (id, body) => {
    writes.push(body);
    if (writes.length === 1) await gate;
    return { revision: body.revision + 1 };
  });
  try {
    queue.mark('a');
    const saving = queue.flush();
    await Promise.resolve();
    record.data.title = 'Edited during save';
    queue.mark('a');
    release();
    await saving;
    assert.deepEqual(
      writes.map((r) => r.revision),
      [1, 2],
    );
    assert.equal(writes[0].data.title, 'Original');
    assert.equal(writes[1].data.title, 'Edited during save');
    assert.equal(record.revision, 3);
    assert.equal(queue.hasPending, false);
  } finally {
    queue.dispose();
  }
});

test('a transient error preserves drafts and explicit retry saves them', async () => {
  let attempts = 0;
  const { queue } = fixture(async () => {
    if (++attempts === 1) throw Error('Offline');
    return { revision: 2 };
  });
  try {
    queue.mark('a');
    assert.equal(await queue.flush(), false);
    assert.equal(queue.hasPending, true);
    assert.equal(await queue.retry(), true);
    assert.equal(queue.hasPending, false);
  } finally {
    queue.dispose();
  }
});

test('a conflict is not overwritten by retry or further typing', async () => {
  let attempts = 0;
  const { queue } = fixture(async () => {
    attempts++;
    throw Object.assign(Error('Conflict'), { status: 409 });
  });
  try {
    queue.mark('a');
    await queue.flush();
    queue.mark('a');
    assert.equal(await queue.retry(), false);
    assert.equal(attempts, 1);
    assert.equal(queue.hasPending, true);
  } finally {
    queue.dispose();
  }
});
