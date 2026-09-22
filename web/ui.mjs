/** Small DOM and escaped HTML helpers shared by the three views. */
export const $ = (id) => document.getElementById(id);
export const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export const num = (value, digits = 2) =>
  new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
export const eur = (value) => `${num(value)} €`;
export function input(
  path,
  label,
  value,
  { text = false, min = 0, max, step = 'any', className = '', date = false } = {},
) {
  const rules = text
    ? ''
    : `min="${min}" ${max === undefined ? '' : `max="${max}"`} step="${step}"`;
  return `<label class="field ${className}">
<span>${label}</span>
<input data-path="${path}" aria-label="${label}" type="${date ? 'date' : text ? 'text' : 'number'}" ${date ? '' : rules} value="${esc(value)}">
</label>`;
}
export const cellInput = (path, label, value, { text = false, max } = {}) =>
  `<input data-path="${path}" aria-label="${esc(label)}" type="${text ? 'text' : 'number'}" ${text ? '' : `min="0" ${max === undefined ? '' : `max="${max}"`} step="any"`} value="${esc(value)}">`;
export const removeButton = (kind, index, name) =>
  `<button class="icon" type="button" data-delete="${kind}" data-index="${index}" aria-label="Eliminar ${esc(name || 'fila')}">×</button>`;
export const addButton = (kind, label) =>
  `<button class="add" type="button" data-add="${kind}">
<span>+</span>${label}</button>`;

export function markValidity(section) {
  let valid = true;
  $(section)
    .querySelectorAll('input[type=number]')
    .forEach((el) => {
      const ok = el.value !== '' && el.validity.valid && Number.isFinite(Number(el.value));
      el.setAttribute('aria-invalid', String(!ok));
      valid &&= ok;
    });
  return valid;
}
export function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value;
}
