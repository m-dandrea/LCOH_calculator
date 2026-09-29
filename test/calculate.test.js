import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, defaults, danish2030, data} from '../src/calculate.js';
import {baseline, provenance, editInput, resetInput} from '../src/input-store.js';

function close(actual, expected) { assert.ok(Math.abs(actual-expected)<1e-8, `${actual} != ${expected}`); }
test('uses the 2030 AF25/KF26 reference pathway and carries hydrogen into heat', () => {
  const r = calculate();
  close(r.electricity,99.54537096625907);
  close(r.transmitted,117.08260133143047);
  close(r.produced,241.08400790611725);
  close(r.delivered,283.8742324125216);
  close(r.perKg,11.184644757053352);
  close(r.fossils.coal,44.976844026845626);
  close(r.fossils.gas,54.0107855033557);
  close(r.heat.district.find(x=>x.name==='41 Electric Boilers >10 MW').total,114.98876943425662);
  close(r.heat.district.find(x=>x.name==='44 Natural Gas DH Only' && x.fuel==='Hydrogen').total,277.35043873078735);
  close(r.heat.process.find(x=>x.name.trim()==='310.1 Electric boiler steam').total,115.59117457101792);
  close(r.heat.process.find(x=>x.name==='312.a Direct firing Natural Gas' && x.fuel==='Hydrogen').total,285.24632729981283);
});
test('published forecast cells replace only matching fields', () => {
  const fuel=data.fuelPrices.find(x=>x.year===2030);
  close(fuel.gas,72.02);
  close(fuel.coal,25.68);
  close(fuel.wood,79.59);
  assert.ok(!provenance.fuelPrices['2030'].diesel);
  assert.ok(!provenance.fuelPrices['2024']);
  close(data.carbon.find(x=>x.name==='AF25 ETS1 allowance - 2030').price,716/7.45);
  close(data.electricity.find(x=>x.name==='KF26 grid spot average - 2030').price,641.6130136986301/7.45);
  assert.equal(provenance.electricity['KF26 grid spot average - 2030'].price.priceYear,2026);
  assert.ok(!provenance.electricity['KF26 grid spot average - 2030'].tariff);
  close(data.transmission.find(x=>x.name==='AF25 grid reference - DK1').losses,.0677);
  close(data.transmission.find(x=>x.name==='AF25 grid reference - DK2').losses,.0622);
  assert.equal(provenance.transmission['AF25 grid reference - DK1'].losses.cell,'Elforbrug!H6');
});
test('network case changes point 3 and downstream hydrogen and heat costs', () => {
  const dk1=calculate();
  const dk2=calculate({...defaults,transmission:'AF25 grid reference - DK2'});
  const cable=calculate({...defaults,transmission:'HVDC'});
  close(dk1.transmitted,(dk1.electricity+dk1.carbonElectricity)/(1-.0677));
  assert.ok(dk1.transmitted>dk2.transmitted);
  assert.ok(dk1.delivered>cable.delivered);
  assert.ok(dk1.heat.district.find(x=>x.fuel==='Hydrogen').total > cable.heat.district.find(x=>x.fuel==='Hydrogen').total);
});
test('matches Danish 2030 scenario grid',()=>{
  const results=danish2030();
  [215.95727295341126,217.11775175538006,206.13597750898228,149.77044480902845]
    .forEach((expected,i)=>close(results[i].cost,expected));
});
test('changing carbon price and route distance updates the downstream costs', () => {
  const base=calculate();
  const higher=calculate({...defaults, distributionKm:900},{carbonPrice:150});
  assert.ok(higher.delivered>base.delivered);
  assert.ok(higher.fossils.coal>base.fossils.coal);
  assert.ok(higher.heat.district.find(x=>x.fuel==='Hydrogen').total > base.heat.district.find(x=>x.fuel==='Hydrogen').total);
});

test('updates only matched catalogue cells and permits local edits', () => {
  const name='Alkaline 100 MW - 2050';
  const tech=data.electrolysers.find(x=>x.name===name);
  assert.ok(provenance.electrolysers[name].capex.cell.startsWith('alldata_long!'));
  assert.equal(tech.capex, baseline.electrolysers.find(x=>x.name===name).capex);
  assert.ok(!provenance.electrolysers['Alkaline 100 MW - 2020']);
  assert.ok(!provenance.electrolysers['Solid oxide 1 MW - 2050']);
  assert.ok(!provenance.transmission.HVDC);
  const before=calculate({...defaults,electrolyser:name}).perKg;
  editInput('electrolysers',name,'capex',tech.capex+100);
  assert.ok(calculate({...defaults,electrolyser:name}).perKg>before);
  resetInput('electrolysers',name);
  close(calculate({...defaults,electrolyser:name}).perKg,before);
});
