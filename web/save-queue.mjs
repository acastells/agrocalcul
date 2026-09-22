/**
 * Serialize optimistic writes, retaining edits made while a request is in flight.
 * A failed save never clears the draft. Conflicts require an explicit reload.
 * Dependencies are injected so the concurrency behavior can be tested without DOM.
 */
export function createSaveQueue({ findRecord, saveRecord, onStatus, delay = 650 }) {
  const pending = new Map();
  let timer;
  let active = null;
  let failure = null;

  function reportFailure(error) {
    onStatus(error.message, true, error.status === 409);
  }

  async function drain() {
    try {
      while (pending.size) {
        const [id, generation] = pending.entries().next().value;
        const record = findRecord(id);
        if (!record) {
          pending.delete(id);
          continue;
        }
        onStatus('Desant…');
        const result = await saveRecord(id, {
          data: structuredClone(record.data),
          revision: record.revision,
        });
        record.revision = result.revision;
        if (pending.get(id) === generation) pending.delete(id);
      }
      onStatus('Desat');
      return true;
    } catch (error) {
      failure = error;
      reportFailure(error);
      return false;
    }
  }

  function flush() {
    clearTimeout(timer);
    if (active) return active;
    if (failure) return Promise.resolve(false);
    // Defer drain so even an empty queue completes after active is assigned.
    active = Promise.resolve()
      .then(drain)
      .finally(() => {
        active = null;
      });
    return active;
  }

  return {
    mark(id) {
      pending.set(id, (pending.get(id) || 0) + 1);
      clearTimeout(timer);
      if (failure?.status === 409) {
        reportFailure(failure);
        return;
      }
      failure = null;
      onStatus('Pendent');
      timer = setTimeout(() => {
        void flush();
      }, delay);
    },
    flush,
    retry() {
      if (failure?.status === 409) return Promise.resolve(false);
      failure = null;
      return flush();
    },
    get hasPending() {
      return pending.size > 0;
    },
    dispose() {
      clearTimeout(timer);
    },
  };
}
