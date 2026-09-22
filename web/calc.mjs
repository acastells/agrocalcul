const finite = (value) => Number.isFinite(value) && value >= 0;

export function production(p) {
  if (!(Number.isFinite(p.area) && p.area > 0)) throw new Error('invalid');
  if (
    ![...p.income, ...p.expenses].every(
      (r) => finite(r.amount) && finite(r.quantity ?? 0) && finite(r.price ?? 0),
    )
  )
    throw new Error('invalid');
  const revenues = p.income.map((r) => (r.mode === 'calculated' ? r.quantity * r.price : r.amount));
  const productionCost = p.expenses
    .filter((r) => r.group === 'production')
    .reduce((sum, r) => sum + r.amount, 0);
  const generalCost = p.expenses
    .filter((r) => r.group === 'general')
    .reduce((sum, r) => sum + r.amount, 0);
  const revenue = revenues.reduce((sum, value) => sum + value, 0);
  return {
    revenues,
    productionCost,
    generalCost,
    cost: productionCost + generalCost,
    revenue,
    result: revenue - productionCost - generalCost,
  };
}

export function npk(p) {
  if (
    !(
      Number.isFinite(p.area) &&
      p.area > 0 &&
      Number.isFinite(p.days) &&
      p.days > 0 &&
      Number.isFinite(p.flow) &&
      p.flow > 0
    )
  )
    throw new Error('invalid');
  if (![p.n, p.p, p.k].every(finite)) throw new Error('invalid');
  const nutrients = [0, 0, 0];
  const target = [p.n, p.p, p.k];
  const indexes = { n: 0, p: 1, k: 2 };
  const rows = p.fertilizers.map((fertilizer) => {
    const composition = [fertilizer.n, fertilizer.p, fertilizer.k];
    if (
      ![...composition, fertilizer.price, fertilizer.density, fertilizer.kgHa].every(finite) ||
      composition.some((v) => v > 100) ||
      fertilizer.density <= 0
    )
      throw new Error('invalid');
    let kgHa = fertilizer.kgHa;
    if (fertilizer.basis !== 'manual') {
      const index = indexes[fertilizer.basis];
      const fraction = composition[index] / 100;
      kgHa = fraction > 0 ? Math.max(0, target[index] - nutrients[index]) / fraction : 0;
    }
    composition.forEach((value, index) => (nutrients[index] += (kgHa * value) / 100));
    const kg = kgHa * p.area;
    const liters = kg / fertilizer.density;
    const daily = liters / p.days;
    const minutes = daily / p.flow;
    const cost = kg * fertilizer.price;
    return {
      kgHa,
      kg,
      liters,
      daily,
      weekly: daily * 7,
      minutes,
      weeklyMinutes: minutes * 7,
      cost,
      costHa: cost / p.area,
    };
  });
  return { rows, nutrients, cost: rows.reduce((sum, row) => sum + row.cost, 0) };
}
