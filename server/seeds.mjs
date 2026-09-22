import { defaults } from '../web/data.mjs';
import { validateData } from './validate.mjs';
/** Copy baseline data once; never reseed deleted user records. */
export function initialSeed(legacy) {
  const p = structuredClone(defaults.production),
    n = structuredClone(defaults.npk);
  const config = {
    income: p.income.map((r) => ({ ...r, amount: 0, quantity: 0 })),
    expenses: p.expenses.map((r) => ({ ...r, amount: 0 })),
  };
  let seed = {
    production: {
      ...p,
      title: `${p.crop} ${p.year}`,
      startDate: `${p.year}-01-01`,
      endDate: `${p.year}-12-31`,
    },
    npk: { ...n, title: `${n.variety} · Sector ${n.sector}` },
    config,
  };
  let imported = false;
  if (legacy?.production && legacy?.npk) {
    try {
      const lp = legacy.production,
        ln = legacy.npk;
      const production = {
        ...lp,
        title: `${lp.crop} ${lp.year}`,
        startDate: `${lp.year}-01-01`,
        endDate: `${lp.year}-12-31`,
      };
      const npk = { ...ln, title: `${ln.variety} · Sector ${ln.sector}` };
      validateData('production', production);
      validateData('npk', npk);
      seed = { production, npk, config };
      imported = true;
    } catch {
      /* Invalid legacy drafts stay in the browser; seed the workbook baseline. */
    }
  }
  return { seed, imported };
}
