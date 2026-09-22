import test from 'node:test';
import assert from 'node:assert/strict';
import { production, npk } from '../web/calc.mjs';
import { defaults } from '../web/data.mjs';
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
test('spreadsheet financial baseline and manual versus calculated amounts', () => {
  const data = structuredClone(defaults.production);
  const result = production(data);
  near(result.revenue, 387696.09);
  near(result.cost, 53470);
  near(result.result, 334226.09);
  data.income[0].mode = 'calculated';
  near(production(data).revenue, 387587.39);
  assert.throws(() => production({ ...data, area: 0 }));
});
test('spreadsheet NPK baseline, scaling and fertilizer costs', () => {
  const data = structuredClone(defaults.npk),
    result = npk(data);
  near(result.rows[0].kg, 3733.3333333333335);
  near(result.rows[1].kg, 466.6666666666666);
  near(result.nutrients[1], 53.33333333333333);
  near(npk({ ...data, area: 2.8 }).rows[0].daily, result.rows[0].daily * 2);
  data.fertilizers[0].price = 0.5;
  data.fertilizers[1].price = 1;
  near(npk(data).cost, 2333.3333333333335);
  data.n = 20;
  near(npk(data).rows[1].kg, 0);
});
