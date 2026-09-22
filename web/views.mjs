import { production, npk } from './calc.mjs';
import {
  $,
  esc,
  num,
  eur,
  input,
  cellInput,
  removeButton,
  addButton,
  markValidity,
  setText,
} from './ui.mjs';
/** Render the current record. Calculations do not write or fetch data. */
export function createViews(state) {
  function renderProduction() {
    const p = state.production;
    if (!p) {
      $('production').innerHTML = '<div class="empty">Cap període</div>';
      return;
    }
    $('production').innerHTML = `
    <div class="period-meta">${input('production.title', 'Període', p.title, { text: true })}${input('production.startDate', 'Inici', p.startDate, { date: true })}${input('production.endDate', 'Fi', p.endDate, { date: true })}</div>
    <div class="context">${input('production.company', 'Empresa', p.company, { text: true })}${input('production.crop', 'Cultiu', p.crop, { text: true })}${input('production.year', 'Any', p.year, { min: 1900, max: 9999, step: 1 })}${input('production.area', 'Hectàrees', p.area, { min: 0.0001 })}</div>
    <div class="stats">
<article class="stat">
<span>Ingressos</span>
<strong id="revenue">
</strong>
<small id="revenue-ha">
</small>
</article>
<article class="stat">
<span>Despeses</span>
<strong id="cost">
</strong>
<small id="cost-ha">
</small>
</article>
<article class="stat result">
<span>Resultat</span>
<strong id="result">
</strong>
<small id="result-ha">
</small>
</article>
</div>
    <article class="panel">
<div class="panelhead">
<h2>Ingressos</h2>${addButton('income', 'Afegir ingrés')}</div>
<div class="tablewrap">
<table class="wide">
<thead>
<tr>
<th>Nom</th>
<th>Kg / unitats</th>
<th>Preu</th>
<th>Càlcul</th>
<th>Import</th>
<th>€/ha</th>
<th>
</th>
</tr>
</thead>
<tbody>${p.income
      .map(
        (r, i) => `<tr>
<td>${cellInput(`production.income.${i}.name`, 'Nom', r.name, { text: true })}</td>
<td>${cellInput(`production.income.${i}.quantity`, 'Kg o unitats', r.quantity)}</td>
<td>${cellInput(`production.income.${i}.price`, 'Preu', r.price)}</td>
<td>
<select data-path="production.income.${i}.mode" aria-label="Càlcul">
<option value="manual" ${r.mode === 'manual' ? 'selected' : ''}>Import</option>
<option value="calculated" ${r.mode === 'calculated' ? 'selected' : ''}>Kg × preu</option>
</select>
</td>
<td>${
          r.mode === 'manual'
            ? cellInput(`production.income.${i}.amount`, 'Import', r.amount)
            : `<b id="income-${i}">
</b>`
        }</td>
<td class="output" id="income-ha-${i}">
</td>
<td>${removeButton('income', i, r.name)}</td>
</tr>`,
      )
      .join('')}</tbody>
<tfoot>
<tr>
<td colspan="4">Total</td>
<td id="income-total">
</td>
<td id="income-total-ha">
</td>
<td>
</td>
</tr>
</tfoot>
</table>
</div>
</article>
    <article class="panel">
<div class="panelhead">
<h2>Despeses</h2>${addButton('expense', 'Afegir despesa')}</div>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Nom</th>
<th>Tipus</th>
<th>Import</th>
<th>€/ha</th>
<th>
</th>
</tr>
</thead>
<tbody>${p.expenses
      .map(
        (r, i) => `<tr>
<td>${cellInput(`production.expenses.${i}.name`, 'Nom', r.name, { text: true })}</td>
<td>
<select data-path="production.expenses.${i}.group" aria-label="Tipus">
<option value="production" ${r.group === 'production' ? 'selected' : ''}>Producció</option>
<option value="general" ${r.group === 'general' ? 'selected' : ''}>General</option>
</select>
</td>
<td>${cellInput(`production.expenses.${i}.amount`, 'Import', r.amount)}</td>
<td class="output" id="expense-ha-${i}">
</td>
<td>${removeButton('expense', i, r.name)}</td>
</tr>`,
      )
      .join('')}</tbody>
<tfoot>
<tr>
<td colspan="2">Producció</td>
<td id="production-cost">
</td>
<td id="production-cost-ha">
</td>
<td>
</td>
</tr>
<tr>
<td colspan="2">Generals</td>
<td id="general-cost">
</td>
<td id="general-cost-ha">
</td>
<td>
</td>
</tr>
</tfoot>
</table>
</div>
</article>`;
    updateProduction();
  }

  function updateProduction() {
    let result;
    try {
      if (!markValidity('production')) throw new Error();
      result = production(state.production);
    } catch {
      [
        'revenue',
        'revenue-ha',
        'cost',
        'cost-ha',
        'result',
        'result-ha',
        'income-total',
        'income-total-ha',
        'production-cost',
        'production-cost-ha',
        'general-cost',
        'general-cost-ha',
      ].forEach((id) => setText(id, '—'));
      document
        .querySelectorAll('#production .output, #production b[id^=income-]')
        .forEach((el) => (el.textContent = '—'));
      return;
    }
    const p = state.production;
    setText('revenue', eur(result.revenue));
    setText('revenue-ha', `${eur(result.revenue / p.area)} / ha`);
    setText('cost', eur(result.cost));
    setText('cost-ha', `${eur(result.cost / p.area)} / ha`);
    setText('result', eur(result.result));
    setText('result-ha', `${eur(result.result / p.area)} / ha`);
    p.income.forEach((r, i) => {
      setText(`income-${i}`, eur(result.revenues[i]));
      setText(`income-ha-${i}`, eur(result.revenues[i] / p.area));
    });
    p.expenses.forEach((r, i) => setText(`expense-ha-${i}`, eur(r.amount / p.area)));
    setText('income-total', eur(result.revenue));
    setText('income-total-ha', eur(result.revenue / p.area));
    setText('production-cost', eur(result.productionCost));
    setText('production-cost-ha', eur(result.productionCost / p.area));
    setText('general-cost', eur(result.generalCost));
    setText('general-cost-ha', eur(result.generalCost / p.area));
  }

  function renderNpk() {
    const p = state.npk;
    if (!p) {
      $('npk').innerHTML = '<div class="empty">Cap càlcul</div>';
      return;
    }
    const f = (key, label, options = {}) => input(`npk.${key}`, label, p[key], options);
    $('npk').innerHTML = `
    <div class="calculation-title">${f('title', 'Nom del càlcul', { text: true })}</div>
    <div class="context">${f('company', 'Empresa', { text: true })}${f('farm', 'Finca', { text: true })}${f('variety', 'Varietat', { text: true })}${f('sector', 'Sector', { text: true })}</div>
    <div class="npk-params">
<div class="panel compact">
<div class="formgrid">${f('area', 'Hectàrees', { min: 0.0001 })}${f('days', 'Dies', { min: 1, step: 1 })}${f('flow', 'Cabal (L/min)', { min: 0.0001 })}</div>
</div>
<div class="panel compact">
<div class="targets">${f('n', 'N · UF/ha')}${f('p', 'P · UF/ha')}${f('k', 'K · UF/ha')}</div>
</div>
</div>
    <article class="panel">
<div class="panelhead">
<h2>Adobs</h2>${addButton('fertilizer', 'Afegir adob')}</div>
<div class="tablewrap">
<table class="fertilizers">
<thead>
<tr>
<th>Nom</th>
<th>Calcula per</th>
<th>N %</th>
<th>P %</th>
<th>K %</th>
<th>Kg/ha</th>
<th>€/kg</th>
<th>kg/L</th>
<th>
</th>
</tr>
</thead>
<tbody>${p.fertilizers
      .map(
        (r, i) => `<tr>
<td>${cellInput(`npk.fertilizers.${i}.name`, 'Nom', r.name, { text: true })}</td>
<td>
<select data-path="npk.fertilizers.${i}.basis" aria-label="Calcula per">
<option value="k" ${r.basis === 'k' ? 'selected' : ''}>K</option>
<option value="n" ${r.basis === 'n' ? 'selected' : ''}>N</option>
<option value="p" ${r.basis === 'p' ? 'selected' : ''}>P</option>
<option value="manual" ${r.basis === 'manual' ? 'selected' : ''}>Manual</option>
</select>
</td>
<td>${cellInput(`npk.fertilizers.${i}.n`, 'N %', r.n, { max: 100 })}</td>
<td>${cellInput(`npk.fertilizers.${i}.p`, 'P %', r.p, { max: 100 })}</td>
<td>${cellInput(`npk.fertilizers.${i}.k`, 'K %', r.k, { max: 100 })}</td>
<td>${
          r.basis === 'manual'
            ? cellInput(`npk.fertilizers.${i}.kgHa`, 'Kg/ha', r.kgHa)
            : `<b id="dose-${i}">
</b>`
        }</td>
<td>${cellInput(`npk.fertilizers.${i}.price`, 'Preu', r.price)}</td>
<td>${cellInput(`npk.fertilizers.${i}.density`, 'Densitat', r.density)}</td>
<td>${removeButton('fertilizer', i, r.name)}</td>
</tr>`,
      )
      .join('')}</tbody>
</table>
</div>
</article>
    <div class="stats nutrients">
<article class="stat">
<span>N</span>
<strong id="nutrient-n">
</strong>
<small id="target-n">
</small>
</article>
<article class="stat">
<span>P</span>
<strong id="nutrient-p">
</strong>
<small id="target-p">
</small>
</article>
<article class="stat">
<span>K</span>
<strong id="nutrient-k">
</strong>
<small id="target-k">
</small>
</article>
<article class="stat result">
<span>Cost</span>
<strong id="npk-cost">
</strong>
<small id="npk-cost-ha">
</small>
</article>
</div>
    <article class="panel">
<div class="panelhead">
<h2>Aplicació</h2>
</div>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Adob</th>
<th>Kg sector</th>
<th>L sector</th>
<th>L/dia</th>
<th>Min/dia</th>
<th>Cost</th>
</tr>
</thead>
<tbody id="application">
</tbody>
</table>
</div>
</article>`;
    updateNpk();
  }

  function updateNpk() {
    let result;
    try {
      if (!markValidity('npk')) throw new Error();
      result = npk(state.npk);
    } catch {
      document
        .querySelectorAll('#npk .output,#npk b[id^=dose-],#npk .stats strong,#npk .stats small')
        .forEach((el) => (el.textContent = '—'));
      $('application').innerHTML = '';
      return;
    }
    const p = state.npk;
    result.rows.forEach((row, i) => setText(`dose-${i}`, num(row.kgHa)));
    ['n', 'p', 'k'].forEach((key, i) => {
      setText(`nutrient-${key}`, num(result.nutrients[i]));
      setText(`target-${key}`, `${num(p[key])} UF/ha`);
    });
    setText('npk-cost', eur(result.cost));
    setText('npk-cost-ha', `${eur(result.cost / p.area)} / ha`);
    $('application').innerHTML = result.rows
      .map(
        (row, i) =>
          `<tr>
<td>${esc(p.fertilizers[i].name)}</td>
<td>${num(row.kg)}</td>
<td>${num(row.liters)}</td>
<td>${num(row.daily)}</td>
<td>${num(row.minutes)}</td>
<td>${eur(row.cost)}</td>
</tr>`,
      )
      .join('');
  }

  function renderConfig() {
    const c = state.config;
    if (!c) return;
    $('config').innerHTML = `<p class="config-note">Conceptes per als períodes nous.</p>
  <article class="panel">
<div class="panelhead">
<h2>Ingressos per defecte</h2>${addButton('default-income', 'Afegir ingrés')}</div>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Nom</th>
<th>Kg / unitats</th>
<th>Preu</th>
<th>Càlcul</th>
<th>Import</th>
<th>
</th>
</tr>
</thead>
<tbody>${c.income
      .map(
        (r, i) => `<tr>
<td>${cellInput(`config.income.${i}.name`, 'Nom', r.name, { text: true })}</td>
<td>${cellInput(`config.income.${i}.quantity`, 'Kg o unitats', r.quantity)}</td>
<td>${cellInput(`config.income.${i}.price`, 'Preu', r.price)}</td>
<td>
<select data-path="config.income.${i}.mode" aria-label="Càlcul">
<option value="manual" ${r.mode === 'manual' ? 'selected' : ''}>Import</option>
<option value="calculated" ${r.mode === 'calculated' ? 'selected' : ''}>Kg × preu</option>
</select>
</td>
<td>${r.mode === 'manual' ? cellInput(`config.income.${i}.amount`, 'Import', r.amount) : `<b id="default-amount-${i}">${eur(r.quantity * r.price)}</b>`}</td>
<td>${removeButton('default-income', i, r.name)}</td>
</tr>`,
      )
      .join('')}</tbody>
</table>
</div>
</article>
  <article class="panel">
<div class="panelhead">
<h2>Despeses per defecte</h2>${addButton('default-expense', 'Afegir despesa')}</div>
<div class="tablewrap">
<table>
<thead>
<tr>
<th>Nom</th>
<th>Tipus</th>
<th>Import</th>
<th>
</th>
</tr>
</thead>
<tbody>${c.expenses
      .map(
        (r, i) => `<tr>
<td>${cellInput(`config.expenses.${i}.name`, 'Nom', r.name, { text: true })}</td>
<td>
<select data-path="config.expenses.${i}.group" aria-label="Tipus">
<option value="production" ${r.group === 'production' ? 'selected' : ''}>Producció</option>
<option value="general" ${r.group === 'general' ? 'selected' : ''}>General</option>
</select>
</td>
<td>${cellInput(`config.expenses.${i}.amount`, 'Import', r.amount)}</td>
<td>${removeButton('default-expense', i, r.name)}</td>
</tr>`,
      )
      .join('')}</tbody>
</table>
</div>
</article>`;
  }

  return { renderProduction, updateProduction, renderNpk, updateNpk, renderConfig };
}
