import {defaults} from './input-store.js';
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const money = value => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value * defaults.dkkPerEur);
const icon = index => `${(import.meta.env?.BASE_URL || '/')}icons/heat-${index}.png`;

// The seven routes and icon positions follow the labels in “Flow Chart - Heat”.
const routes = {
  district: [
    {label:'Electric boiler', key:'heatDistrictBoiler', fuel:'Electricity', icon:3, match:x=>/^41 Electric Boiler/i.test(x.name), preferred:'41 Electric Boilers >10 MW'},
    {label:'Electricity & excess heat', key:'heatDistrictExcess', fuel:'Electricity', icon:1, match:x=>/^40 /i.test(x.name), preferred:'40 Comp. hp, excess heat 10 MW'},
    {label:'Natural gas', key:'heatDistrictGas', fuel:'Natural Gas', icon:4, match:()=>true, preferred:'44 Natural Gas DH Only'},
    {label:'Hydrogen', key:'heatDistrictHydrogen', fuel:'Hydrogen', icon:5, match:()=>true, preferred:'44 Natural Gas DH Only'}
  ],
  process: [
    {label:'Electricity', key:'heatProcessElectricity', fuel:'Electricity', icon:9, match:()=>true, preferred:'310.1 Electric boiler steam  '},
    {label:'Natural gas', key:'heatProcessGas', fuel:'Natural Gas', icon:8, match:()=>true, preferred:'312.a Direct firing Natural Gas'},
    {label:'Hydrogen', key:'heatProcessHydrogen', fuel:'Hydrogen', icon:6, match:()=>true, preferred:'312.a Direct firing Natural Gas'}
  ]
};

function routeRows(result,type,route) {
  return result.heat[type].filter(x=>x.fuel===route.fuel && route.match(x));
}
function chosenRow(result,state,type,route) {
  const rows=routeRows(result,type,route);
  if (!rows.some(x=>x.name===state[route.key]))
    state[route.key]=rows.find(x=>x.name===route.preferred)?.name || rows[0]?.name || null;
  return rows.find(x=>x.name===state[route.key]);
}
function routeCard(result,state,type,route) {
  const rows=routeRows(result,type,route);
  const item=chosenRow(result,state,type,route);
  const district=type==='district';
  const choices=rows.map(x=>`<option value="${esc(x.name)}" ${x.name===state[route.key]?'selected':''}>${esc(x.name.trim())}</option>`).join('');
  if (!item) return `<div class="heat-route unavailable" data-heat-route="${route.key}"><h4>${esc(route.label)}</h4><p>No matching technology for ${esc(state.heatYear)}.</p></div>`;
  const fuel=result.heatFuels[item.fuel];
  const input=item.input+item.aux+item.carbon;
  const conversion=item.investment+item.fixed+item.variable;
  return `<div class="heat-route" data-heat-route="${route.key}">
    <div class="heat-route-title"><img src="${icon(route.icon)}" alt="" width="55" height="55"><div><span>${district?'DISTRICT HEATING':'PROCESS HEAT'}</span><h4>${esc(route.label)}</h4></div></div>
    <div class="heat-route-source">Input: <strong>${money(fuel.base+fuel.tax)}</strong> DKK/MWh ${item.fuel==='Hydrogen'?'H₂':item.fuel==='Electricity'?'electricity':'gas'}</div>
    <div class="heat-route-arrow" aria-hidden="true">↓</div>
    <label class="field"><span>Conversion technology</span><select data-state="${route.key}">${choices}</select></label>
    <div class="heat-route-arrow" aria-hidden="true">↓</div>
    <div class="heat-route-result"><span>${district?'Heat network':'Industrial heat'}</span><strong>${money(item.total)}</strong><small>DKK/MWh heat</small></div>
    <p>Fuel &amp; auxiliary ${money(input)} + capital &amp; O&amp;M ${money(conversion)}</p>
  </div>`;
}
function branch(result,state,type) {
  const district=type==='district';
  return `<div class="heat-branch"><div class="heat-branch-head"><img src="${icon(district?0:7)}" alt="" width="46" height="46"><div><h3>${district?'District heating':'Process heat'}</h3><p>${district?'Four':'Three'} routes · ${esc(state.heatYear)} technology data</p></div></div>
    <div class="heat-route-grid ${district?'four':'three'}">${routes[type].map(route=>routeCard(result,state,type,route)).join('')}</div></div>`;
}
export function renderHeatFlow(result,state) {
  return `<section class="heat-flow" aria-label="Heat pathways"><div class="heat-flow-heading"><div><p class="eyebrow">HEAT FLOWCHART</p><h2>From energy to heat</h2><p>Four district heating routes and three process heat routes from the Excel sketch. Choose a technology in each route.</p></div><span>Output cost in DKK/MWh heat</span></div>${branch(result,state,'district')}${branch(result,state,'process')}</section>`;
}
export function renderHeatComparison(result,state) {
  const section=(type,title)=>{
    const rows=[...result.heat[type]].sort((a,b)=>a.total-b.total);
    if (!rows.length) return `<section class="heat-ranking"><div class="heat-ranking-head"><div><h3>${title}</h3><p>No matching technology records remain for ${esc(state.heatYear)}.</p></div></div></section>`;
    const cheapest=rows[0];
    const selected=new Set(routes[type].map(route=>{
      const x=chosenRow(result,state,type,route);
      return x ? `${x.name}|${x.fuel}` : '';
    }));
    return `<section class="heat-ranking"><div class="heat-ranking-head"><div><h3>${title}</h3><p>${rows.length} technology and fuel combinations · ${esc(state.heatYear)}</p></div><div class="heat-best">Lowest: <strong>${money(cheapest.total)} DKK/MWh</strong> · ${esc(cheapest.name.trim())} (${esc(cheapest.fuel)})</div></div>
      <div class="table-wrap"><table><thead><tr><th>Rank</th><th>Technology</th><th>Fuel</th><th class="num">Fuel + auxiliary</th><th class="num">Capital + O&amp;M</th><th class="num">Total DKK/MWh heat</th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="${selected.has(`${x.name}|${x.fuel}`)?'heat-selected':''}"><td>${i+1}${i===0?' · Lowest':''}</td><td>${esc(x.name.trim())}</td><td>${esc(x.fuel)}</td><td class="num">${money(x.input+x.aux+x.carbon)}</td><td class="num">${money(x.investment+x.fixed+x.variable)}</td><td class="num bold">${money(x.total)}</td></tr>`).join('')}</tbody></table></div><p class="heat-ranking-note">Highlighted rows are the selected routes above. Technologies of different capacities are shown together.</p></section>`;
  };
  return `<section class="heat-comparison" aria-label="Heat cost comparison"><div class="heat-flow-heading"><div><p class="eyebrow">COST COMPARISON</p><h2>Which heat option costs least?</h2><p>Hydrogen uses the delivered cost from the <a href="#dashboard">Hydrogen flowchart</a>: <strong>${money(result.delivered)} DKK/MWh H₂</strong>. Change its pathway there to update these comparisons.</p></div></div>${section('district','District heating')}${section('process','Process heat')}</section>`;
}
