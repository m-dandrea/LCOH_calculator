import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, defaults, danish2030, data} from '../src/calculate.js';
import {baseline, provenance, editInput, resetInput} from '../src/input-store.js';

function close(actual, expected) { assert.ok(Math.abs(actual-expected)<1e-8, `${actual} != ${expected}`); }
test('matches the catalogue-updated default pathway', () => {
  const r = calculate();
  close(r.electricity,40.93959731543624);
  close(r.produced,92.43525603000148);
  close(r.delivered,109.0658346071894);
  close(r.perKg,4.297193883523263);
  close(r.fossils.coal,31.3390580074726);
  close(r.fossils.gas,42.80990759504223);
  close(r.heat.district.find(x=>x.name==='41 Electric Boilers >10 MW').total,46.046649596084535);
  close(r.heat.district.find(x=>x.name==='44 Natural Gas DH Only' && x.fuel==='Hydrogen').total,109.18394102675781);
  close(r.heat.process.find(x=>x.name.trim()==='310.1 Electric boiler steam').total,46.64905473284582);
  close(r.heat.process.find(x=>x.name==='312.a Direct firing Natural Gas' && x.fuel==='Hydrogen').total,110.26813821471596);
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
  assert.ok(!provenance.transmission);
  const before=calculate({...defaults,electrolyser:name}).perKg;
  editInput('electrolysers',name,'capex',tech.capex+100);
  assert.ok(calculate({...defaults,electrolyser:name}).perKg>before);
  resetInput('electrolysers',name);
  close(calculate({...defaults,electrolyser:name}).perKg,before);
});
