import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate, defaults, danish2030} from '../src/calculate.js';

function close(actual, expected) { assert.ok(Math.abs(actual-expected)<1e-8, `${actual} != ${expected}`); }
test('matches cached workbook summary for its default pathway', () => {
  const r = calculate();
  close(r.electricity,40.93959731543624);
  close(r.produced,65.4539567591637);
  close(r.delivered,82.08451674446354);
  close(r.perKg,3.2341299597318636);
  close(r.fossils.coal,31.3390580074726);
  close(r.fossils.gas,42.80990759504223);
  close(r.heat.district.find(x=>x.name==='41 Electric Boilers >10 MW').total,45.69258247978054);
  close(r.heat.district.find(x=>x.name==='44 Natural Gas DH Only' && x.fuel==='Hydrogen').total,82.98628124474878);
  close(r.heat.process.find(x=>x.name.trim()==='310.1 Electric boiler steam').total,45.32659129608834);
  close(r.heat.process.find(x=>x.name==='312.a Direct firing Natural Gas' && x.fuel==='Hydrogen').total,83.12494921579585);
});
test('matches Danish 2030 scenario grid',()=>{
  const results=danish2030();
  [146.88150434916295,120.55043276480882,111.8340501926811,88.94271813168137]
    .forEach((expected,i)=>close(results[i].cost,expected));
});
test('changing carbon price and route distance updates the downstream costs', () => {
  const base=calculate();
  const higher=calculate({...defaults, distributionKm:900},{carbonPrice:150});
  assert.ok(higher.delivered>base.delivered);
  assert.ok(higher.fossils.coal>base.fossils.coal);
  assert.ok(higher.heat.district.find(x=>x.fuel==='Hydrogen').total > base.heat.district.find(x=>x.fuel==='Hydrogen').total);
});
