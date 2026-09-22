import { HttpError } from './http.mjs';

const MAX_TEXT_LENGTH = 200;
const MAX_ROWS = 1000;
const MAX_VALUE = 1e12;
const MIN_POSITIVE = 0.000001;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value, max = MAX_TEXT_LENGTH) => typeof value === 'string' && value.length <= max;
const isNumber = (value, min = 0, max = MAX_VALUE) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isList = (value, validateRow) =>
  Array.isArray(value) &&
  value.length <= MAX_ROWS &&
  value.every((row) => isObject(row) && validateRow(row));

function isDate(value) {
  if (!isText(value, 10) || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))
    return false;
  return new Date(value).toISOString().slice(0, 10) === value;
}
function isIncome(row) {
  return (
    isText(row.name) &&
    isNumber(row.quantity) &&
    isNumber(row.price) &&
    isNumber(row.amount) &&
    ['manual', 'calculated'].includes(row.mode)
  );
}
function isExpense(row) {
  return isText(row.name) && isNumber(row.amount) && ['production', 'general'].includes(row.group);
}
function isFertilizer(row) {
  return (
    isText(row.name) &&
    ['manual', 'n', 'p', 'k'].includes(row.basis) &&
    [row.n, row.p, row.k].every((value) => isNumber(value, 0, 100)) &&
    isNumber(row.kgHa) &&
    isNumber(row.price) &&
    isNumber(row.density, MIN_POSITIVE)
  );
}
function hasFinancialRows(data) {
  return isList(data.income, isIncome) && isList(data.expenses, isExpense);
}
function isProduction(data) {
  return (
    isText(data.crop) &&
    isNumber(data.year, 1900, 9999) &&
    Number.isInteger(data.year) &&
    isDate(data.startDate) &&
    isDate(data.endDate) &&
    data.startDate <= data.endDate &&
    hasFinancialRows(data)
  );
}
function isNpk(data) {
  return (
    isText(data.farm) &&
    isText(data.sector) &&
    isText(data.variety) &&
    isNumber(data.days, 1, 100000) &&
    Number.isInteger(data.days) &&
    isNumber(data.flow, MIN_POSITIVE) &&
    [data.n, data.p, data.k].every((value) => isNumber(value)) &&
    isList(data.fertilizers, isFertilizer)
  );
}
/**
 * Validate an entire record snapshot without mutating or coercing values.
 * @param {'production'|'npk'|'config'} kind
 * @param {unknown} data
 * @returns {object} The original validated object.
 * @throws {HttpError} HTTP 400 for invalid input.
 */
export function validateData(kind, data) {
  const invalid = () => {
    throw new HttpError('Revisa els camps.', 400);
  };
  if (!isObject(data)) invalid();
  if (kind === 'config') {
    if (!hasFinancialRows(data)) invalid();
    return data;
  }
  const common =
    isText(data.title) &&
    data.title.trim().length > 0 &&
    isNumber(data.area, MIN_POSITIVE) &&
    isText(data.company);
  if (!common) invalid();
  if (kind === 'production' && isProduction(data)) return data;
  if (kind === 'npk' && isNpk(data)) return data;
  invalid();
}
