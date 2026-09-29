import data from '../data/workbook.json' with { type: 'json' };

export { data };
export const defaults = data.defaults;
export function annuity(rate, years) {
  return rate === 0 ? 1 / years : rate / (1 - (1 + rate) ** -years);
}
const find = (rows, name) => rows.find(row => row.name === name);

export function calculate(s = defaults, edits = {}) {
  const e = find(data.electricity, s.electricity);
  const c = find(data.carbon, s.carbon);
  const el = find(data.electrolysers, s.electrolyser);
  const st = find(data.storage, s.storage);
  const dist = find(data.distribution, s.distribution);
  if (!e || !c || !el || !st || !dist) throw new Error('Unknown technology selection');
  const p = {electricityPrice:e.price,tariff:e.tariff,emissions:e.emissions,carbonPrice:c.price,
    capex:el.capex,opex:el.opex,efficiency:el.efficiency,hours:el.hours,lifetime:el.lifetime,
    storageEfficiency:st.efficiency,storageUse:s.storageUse,storageDiscount:s.storageDiscount,
    productionDiscount:s.productionDiscount,transmissionKm:s.transmissionKm,distributionKm:s.distributionKm,
    loadFactor:s.loadFactor, ...edits};
  if (Object.values(p).some(x => !Number.isFinite(x)) || p.efficiency <= 0 || p.storageEfficiency <= 0 ||
      p.hours <= 0 || p.lifetime <= 0 || p.storageUse <= 0 || p.storageDiscount < 0 ||
      p.productionDiscount < 0 || p.loadFactor <= 0 || p.loadFactor > 1 || p.transmissionKm < 0 ||
      p.distributionKm < 0 || p.capex < 0 || p.opex < 0 || p.tariff < 0 || p.electricityPrice < 0 ||
      p.efficiency > 1 || p.storageEfficiency > 1) throw new Error('Enter valid positive inputs and efficiencies between 0 and 100%.');
  // Transmission constants are from el.trans!B4:C4; H2 transmission is HVDC in the workbook.
  const electricity = p.electricityPrice + p.tariff;
  const carbonElectricity = p.emissions / 1000 * p.carbonPrice;
  const transmitted = (electricity + carbonElectricity + (22.1 / (p.loadFactor * 8760)) * p.transmissionKm) / 0.98;
  const capexPerMwh = p.capex * 1000 * annuity(p.productionDiscount, p.lifetime) / p.hours;
  // The workbook's E17 uses CAPEX * annualised CAPEX / 1000, rather than fixed O&M on the original CAPEX.
  const fixedPerMwh = p.capex * capexPerMwh / 1000;
  const produced = (transmitted + capexPerMwh + fixedPerMwh) / p.efficiency;
  const storageElectricity = transmitted * (1 / p.storageEfficiency - 1);
  const storageCapex = st.capex * 1e6 * st.duration * annuity(p.storageDiscount, st.lifetime) /
    (st.capacity * 8760 * p.storageUse);
  const storageFixed = st.fixed / (8760 * p.storageUse);
  const stored = produced + storageElectricity + storageCapex + storageFixed + st.variable;
  const perKg = s.hydrogenMwhPerKg;
  const distributionCost = (((p.distributionKm * (dist.variable || 0) + (dist.fixed || 0)) / 1000) +
    p.distributionKm / 1000 * (dist.levelised || 0)) / perKg;
  const delivered = stored + distributionCost;
  const deliveredEmission = p.emissions / (0.98 * p.efficiency * p.storageEfficiency * (1 - (dist.losses || 0))) / 1000;
  const fuelPrice = data.fuelPrices.find(row => row.year === Number(s.fuelYear));
  if (!fuelPrice) throw new Error('Fuel price year is unavailable in the workbook.');
  const fossils = Object.fromEntries(['coal','gas','diesel','wood'].map(k => [k,
    fuelPrice[k] / s.dkkPerEur * 3.6 + data.fuelEmissions[k] * p.carbonPrice]));
  const heatFuelPrice = data.fuelPrices.find(row => row.year === Number(s.heatYear));
  if (!heatFuelPrice) throw new Error('Heat year is unavailable in the workbook.');
  const heatFuels = {
    Electricity:{base:electricity, tax:carbonElectricity},
    'Natural Gas':{base:heatFuelPrice.gas / s.dkkPerEur * 3.6, tax:data.fuelEmissions.gas * p.carbonPrice},
    Hydrogen:{base:delivered - deliveredEmission * p.carbonPrice, tax:deliveredEmission * p.carbonPrice}
  };
  return {p, e, c, el, st, dist, electricity, carbonElectricity, transmitted, produced,
    stored, delivered, perKg:delivered * perKg, directKg:produced * perKg,
    storageElectricity, storageCapex, storageFixed, distributionCost,
    capexPerMwh, fixedPerMwh, deliveredEmission, fossils, heatFuels,
    heat: {
      district: heatCosts(data.districtHeat, s.heatYear, heatFuels, p.carbonPrice, s.heatDiscount, s.districtHours, s.districtHours),
      process: heatCosts(data.processHeat, s.heatYear, heatFuels, p.carbonPrice, s.heatDiscount, s.processHours, s.districtHours)
    }};
}

function heatCosts(rows, year, fuels, tax, discount, hours, capexHours) {
  return rows.filter(x => x.year === Number(year) && Number.isFinite(x.efficiency) && Number.isFinite(x.capex))
    .flatMap(x => {
      const fuel = /gas/i.test(x.fuel) ? 'Natural Gas' : x.fuel;
      const f = fuels[fuel];
      if (!f) return [];
      const original = {name:x.name, fuel, ...heatCost(x, f, fuels.Electricity, discount, hours, capexHours)};
      return fuel === 'Natural Gas' ? [original, {name:x.name, fuel:'Hydrogen',
        ...heatCost(x, fuels.Hydrogen, fuels.Electricity, discount, hours, capexHours)}] : [original];
    });
}

export function heatCost(x, fuel, electricity, discount, hours, capexHours) {
  const share = x.efficiency / 100, auxiliary = x.aux / 100;
  const investment = x.capex * 1e6 * annuity(discount, x.lifetime) / capexHours;
  const fixed = x.fixed / hours;
  const input = fuel.base / share;
  const aux = auxiliary * electricity.base;
  const carbon = fuel.tax / share + auxiliary * electricity.tax;
  const variable = x.variable;
  return {investment, fixed, input, aux, carbon, variable,
    total:investment + fixed + input + aux + carbon + variable,
    efficiency:x.efficiency};
}
