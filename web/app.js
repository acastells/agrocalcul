import { production, npk } from './calc.mjs';
import { api } from './api.mjs';
import { createSaveQueue } from './save-queue.mjs';
import { createViews } from './views.mjs';
import { $, esc, eur, markValidity, setText } from './ui.mjs';

const selection = { production: null, npk: null };
const state = { production: null, npk: null, config: null };
let records = [],
  feature = 'production',
  ready = false;
const { renderProduction, updateProduction, renderNpk, updateNpk, renderConfig } =
  createViews(state);
const saveQueue = createSaveQueue({
  findRecord: (id) => records.find((record) => record.id === id),
  saveRecord: async (id, body) => (await api('/api/records/' + id, 'PUT', body)).record,
  onStatus: status,
});
function status(message, error = false, conflict = false) {
  $('db-status').textContent = message;
  $('db-status').classList.toggle('save-error', error);
  $('retry').hidden = !error || conflict;
  $('reload').hidden = !conflict;
}
function currentRecord(kind = feature) {
  return records.find((r) => r.id === (kind === 'config' ? 'config' : selection[kind]));
}
function syncState() {
  for (const kind of ['production', 'npk', 'config'])
    state[kind] = currentRecord(kind)?.data || null;
}
function persist() {
  const record = currentRecord();
  if (record) saveQueue.mark(record.id);
}
function flush() {
  return saveQueue.flush();
}
async function boot() {
  try {
    let legacy;
    try {
      legacy = JSON.parse(localStorage.getItem('agrocalcul-v2'));
    } catch {
      /* Optional browser storage or WebMCP may be unavailable. */
    }
    const response = await api('/api/bootstrap', 'POST', { legacy });
    records = response.records;
    if (response.imported) {
      try {
        localStorage.removeItem('agrocalcul-v2');
      } catch {
        /* Optional browser storage or WebMCP may be unavailable. */
      }
    }
    for (const kind of ['production', 'npk'])
      selection[kind] = records.find((r) => r.kind === kind)?.id || null;
    syncState();
    ready = true;
    $('loading').hidden = true;
    $('app').hidden = false;
    renderProduction();
    renderNpk();
    renderConfig();
    renderToolbar();
    status('Desat');
  } catch (error) {
    $('loading').textContent = 'No s’han pogut carregar les dades.';
    status(error.message, true);
  }
}
function renderToolbar() {
  const bar = $('record-toolbar');
  bar.hidden = feature === 'config';
  if (bar.hidden) return;
  const list = records.filter((r) => r.kind === feature);
  bar.innerHTML = `<select id="record-select" aria-label="${feature === 'production' ? 'Període' : 'Càlcul NPK'}">${list.length ? list.map((r) => `<option value="${r.id}" ${r.id === selection[feature] ? 'selected' : ''}>${esc(r.data.title)}</option>`).join('') : '<option>—</option>'}</select><button id="new-record" class="add">+ ${feature === 'production' ? 'Nou període' : 'Nou càlcul'}</button>${list.length ? '<button id="delete-record" class="quiet danger">Eliminar</button>' : ''}`;
}
async function createRecord() {
  const kind = feature;
  if (!(await flush())) return;
  const button = $('new-record');
  if (button) button.disabled = true;
  try {
    const response = await api('/api/records', 'POST', { kind, id: crypto.randomUUID() });
    records.push(response.record);
    selection[kind] = response.record.id;
    syncState();
    kind === 'production' ? renderProduction() : renderNpk();
    renderToolbar();
    if (feature === kind) document.querySelector(`#${kind} [data-path$=".title"]`)?.focus();
    status('Desat');
  } catch (error) {
    status(error.message, true);
  } finally {
    if ($('new-record')) $('new-record').disabled = false;
  }
}
async function deleteRecord() {
  const kind = feature,
    record = currentRecord();
  if (!record || !confirm(`Eliminar «${record.data.title}»?`)) return;
  if (!(await flush())) return;
  try {
    await api('/api/records/' + record.id, 'DELETE', { revision: record.revision });
    records = records.filter((r) => r.id !== record.id);
    selection[kind] = records.find((r) => r.kind === kind)?.id || null;
    syncState();
    kind === 'production' ? renderProduction() : renderNpk();
    renderToolbar();
    status('Desat');
  } catch (error) {
    status(error.message, true, error.status === 409);
  }
}

function renderFeature() {
  if (feature === 'production') renderProduction();
  else if (feature === 'npk') renderNpk();
  else renderConfig();
}
function setPath(path, value) {
  const keys = path.split('.');
  let object = state;
  for (const key of keys.slice(0, -1)) object = object[key];
  object[keys.at(-1)] = value;
}
document.addEventListener('input', (event) => {
  const element = event.target;
  if (!element.dataset.path || !ready) return;
  setPath(
    element.dataset.path,
    element.type === 'number'
      ? element.value === ''
        ? NaN
        : Number(element.value)
      : element.value,
  );
  persist();
  const section = element.dataset.path.split('.')[0];
  if (
    element.tagName === 'SELECT' &&
    ['mode', 'basis'].includes(element.dataset.path.split('.').at(-1))
  )
    renderFeature();
  else if (section === 'production') updateProduction();
  else if (section === 'npk') updateNpk();
  else {
    markValidity('config');
    state.config.income.forEach((r, i) =>
      setText(`default-amount-${i}`, eur(r.quantity * r.price)),
    );
  }
  if (element.dataset.path.endsWith('.title')) {
    const option = $('record-select')?.selectedOptions[0];
    if (option) option.textContent = element.value;
  }
});
const lists = {
  income: () => state.production.income,
  expense: () => state.production.expenses,
  fertilizer: () => state.npk.fertilizers,
  'default-income': () => state.config.income,
  'default-expense': () => state.config.expenses,
};
document.addEventListener('click', (event) => {
  if (!ready) return;
  if (event.target.closest('#new-record')) {
    void createRecord();
    return;
  }
  if (event.target.closest('#delete-record')) {
    void deleteRecord();
    return;
  }
  const add = event.target.closest('[data-add]'),
    remove = event.target.closest('[data-delete]');
  if (add) {
    const kind = add.dataset.add;
    const row =
      kind === 'fertilizer'
        ? { name: '', basis: 'manual', n: 0, p: 0, k: 0, price: 0, density: 1, kgHa: 0 }
        : kind.includes('expense')
          ? { name: '', amount: 0, group: 'production' }
          : { name: '', quantity: 0, price: 0, amount: 0, mode: 'manual' };
    lists[kind]().push(row);
    persist();
    renderFeature();
    const names = document.querySelectorAll(`#${feature} [data-path$=".name"]`);
    const index =
      kind === 'income' || kind === 'default-income' ? lists[kind]().length - 1 : names.length - 1;
    names[index]?.focus();
  }
  if (remove) {
    lists[remove.dataset.delete]().splice(Number(remove.dataset.index), 1);
    persist();
    renderFeature();
  }
});
document.addEventListener('change', async (event) => {
  if (event.target.id !== 'record-select') return;
  const kind = feature,
    previous = selection[kind],
    next = event.target.value;
  if (!(await flush())) {
    event.target.value = previous;
    return;
  }
  selection[kind] = next;
  syncState();
  kind === 'production' ? renderProduction() : renderNpk();
  renderToolbar();
});
for (const section of ['production', 'npk', 'config'])
  $(`tab-${section}`).addEventListener('click', () => {
    if (!ready) return;
    feature = section;
    for (const key of ['production', 'npk', 'config']) {
      $(key).hidden = key !== section;
      $(`tab-${key}`).classList.toggle('active', key === section);
      if (key === section) $(`tab-${key}`).setAttribute('aria-current', 'page');
      else $(`tab-${key}`).removeAttribute('aria-current');
    }
    $('feature-title').textContent = {
      production: 'Ingressos i despeses',
      npk: 'Fertilització NPK',
      config: 'Configuració',
    }[section];
    renderToolbar();
  });
$('retry').addEventListener('click', () => {
  ready ? void saveQueue.retry() : void boot();
});
$('reload').addEventListener('click', () => {
  if (confirm('Recarregar les dades guardades? Els canvis pendents es perdran.')) location.reload();
});
window.addEventListener('beforeunload', (event) => {
  if (saveQueue.hasPending) {
    event.preventDefault();
    event.returnValue = '';
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && saveQueue.hasPending) void flush();
});
void boot();
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'read_agricultural_calculations',
          description: 'Llegeix els càlculs actuals d’ingressos, despeses i NPK.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true },
          execute(input) {
            if (!input || Object.keys(input).length) throw Error('No parameters expected.');
            return { production: production(state.production), npk: npk(state.npk) };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {
    /* Optional browser storage or WebMCP may be unavailable. */
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
