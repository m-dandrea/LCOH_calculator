const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const money = value => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const icon = index => `${(import.meta.env?.BASE_URL || "/")}icons/heat-${index}.png`;

function sourceIcon(fuel, district) {
  if (fuel==='Hydrogen') return district ? 5 : 6;
  if (fuel==='Natural Gas') return district ? 4 : 8;
  return district ? 3 : 9;
}
function technologyIcon(name, fuel, district) {
  if (/heat pump|hp|excess heat/i.test(name)) return 1;
  return sourceIcon(fuel,district);
}

function lane(result, state, type) {
  const district=type==='district';
  const rows=result.heat[type];
  const technologyKey=district?'heatDistrictTechnology':'heatProcessTechnology';
  const fuelKey=district?'heatDistrictFuel':'heatProcessFuel';
  const names=[...new Set(rows.map(x=>x.name))];
  const preferred=district?'41 Electric Boilers >10 MW':'312.a Direct firing Natural Gas';
  if (!names.includes(state[technologyKey])) state[technologyKey]=names.includes(preferred)?preferred:names[0];
  const candidates=rows.filter(x=>x.name===state[technologyKey]);
  const fuels=candidates.map(x=>x.fuel);
  if (!fuels.includes(state[fuelKey])) state[fuelKey]=fuels[0];
  const item=candidates.find(x=>x.fuel===state[fuelKey]);
  if (!item) return '';
  const fuel=result.heatFuels[item.fuel];
  const sourceCost=fuel.base+fuel.tax;
  const inputCost=item.input+item.aux+item.carbon;
  const conversionCost=item.investment+item.fixed+item.variable;
  const name=district?'District heating':'Process heat';
  const destination=district?'Heat network':'Industrial heat';
  const title=district?'District heating pathway':'Process heat pathway';
  const choices=(values,selected)=>values.map(value=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(value.trim())}</option>`).join('');
  return `<div class="heat-lane" aria-label="${title}">
    <div class="heat-lane-head"><img src="${icon(district?0:7)}" alt="" width="43" height="43"><div><h3>${name}</h3><p>${esc(state.heatYear)} technology data</p></div><strong>${money(item.total)} <small>€/MWh heat</small></strong></div>
    <div class="heat-stages">
      <div class="heat-stage"><span class="heat-step">01 · Energy source</span><img src="${icon(sourceIcon(item.fuel,district))}" alt="" width="56" height="56"><label class="field"><span>Input fuel</span><select data-state="${fuelKey}">${choices(fuels,state[fuelKey])}</select></label><p><strong>${money(sourceCost)}</strong> €/MWh input</p></div>
      <div class="heat-arrow" aria-hidden="true">→</div>
      <div class="heat-stage"><span class="heat-step">02 · Conversion</span><img src="${icon(technologyIcon(item.name,item.fuel,district))}" alt="" width="56" height="56"><label class="field"><span>Technology</span><select data-state="${technologyKey}">${choices(names,state[technologyKey])}</select></label><p><strong>${money(conversionCost)}</strong> €/MWh heat · capital &amp; O&amp;M</p></div>
      <div class="heat-arrow" aria-hidden="true">→</div>
      <div class="heat-stage heat-output"><span class="heat-step">03 · ${destination}</span><img src="${icon(district?0:7)}" alt="" width="56" height="56"><div class="heat-total"><strong>${money(item.total)}</strong><span>€/MWh heat</span></div><p>Fuel &amp; auxiliary ${money(inputCost)} + conversion ${money(conversionCost)}</p></div>
    </div>
  </div>`;
}

export function renderHeatFlow(result,state) {
  return `<section class="heat-flow" aria-label="Heat pathways"><div class="heat-flow-heading"><div><p class="eyebrow">HEAT FLOWCHART</p><h2>From energy to heat</h2><p>Choose a technology and input fuel for district or process heat. Costs follow the workbook’s heat calculation.</p></div><span>Output cost in €/MWh heat</span></div>${lane(result,state,'district')}${lane(result,state,'process')}</section>`;
}
