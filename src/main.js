import {data, defaults, calculate, danish2030} from './calculate.js';
import './style.css';
import './flow.css';
import './inputs.css';
import './heat-flow.css';
import {renderHeatFlow, renderHeatComparison} from './heat-flow.js';
import {renderInputs, renderCharts} from './inputs.js';
import {editInput, resetInput, resetAllInputs} from './input-store.js';

const root = document.querySelector('#app');
const state = {...defaults};
let edits = {};
let activeTab = location.hash === '#inputs' ? 'inputs' : location.hash === '#heat' ? 'heat' : 'dashboard';
let inputCategory = 'electrolysers';
let inputQuery = '';
let chartYear = null;
const header = () => `<header class="topbar"><div class="brand"><span class="brand-mark">H₂</span><span>Hydrogen cost calculator</span></div><nav aria-label="Main navigation"><a href="#dashboard" aria-current="${activeTab==='dashboard'?'page':'false'}">Hydrogen flowchart</a><a href="#heat" aria-current="${activeTab==='heat'?'page':'false'}">Heat flow</a><a href="#inputs" aria-current="${activeTab==='inputs'?'page':'false'}">Input data</a></nav>${activeTab==='dashboard'?'<button id="reset" class="subtle">Reset scenario</button>':''}</header>`;
const fmt = (n, digits=2) => new Intl.NumberFormat('en-US',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(n);
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const by = (key, value) => data[key].find(row => row.name === value);
const options = (values, current) => values.map(v => `<option value="${escape(v)}" ${String(v)===String(current)?'selected':''}>${escape(v)}</option>`).join('');
const select = (label, key, values) => `<label class="field"><span>${label}</span><select data-state="${key}">${options(values,state[key])}</select></label>`;
const number = (label, key, value, unit, step='any') => `<label class="field"><span>${label} <small>${unit}</small></span><input type="number" data-${key in state ? 'state':'edit'}="${key}" value="${value}" step="${step}" /></label>`;
const card = (label, value, unit) => `<div class="metric"><span>${label}</span><strong>${fmt(value)}</strong><small>${unit}</small></div>`;
const row = (label, amount) => `<div class="break-row"><span>${label}</span><strong>${fmt(amount)}</strong></div>`;
const icon = index => `${import.meta.env.BASE_URL}icons/flow-${index}.png`;
const stage = (index, title, image, control, value, unit, final=false) => `<div class="flow-stage ${final?'flow-final':''}">
  <div class="flow-stage-head"><span class="flow-index">${String(index).padStart(2,'0')}</span><img src="${icon(image)}" alt="" width="54" height="54"/><h3>${title}</h3></div>
  <div class="flow-control">${control}</div><div class="flow-value"><strong>${fmt(value)}</strong><span>${unit}</span></div></div>`;

function render() {
  if (activeTab === 'inputs') { root.innerHTML = header() + renderInputs(inputCategory,inputQuery,chartYear); filterRows(); return; }
  const openDetails=[...root.querySelectorAll('details')].map(x=>x.open);
  const e = by('electricity', state.electricity), c = by('carbon', state.carbon), el = by('electrolysers', state.electrolyser), st = by('storage', state.storage);
  let r;
  try { r = calculate(state, edits); } catch (error) {
    root.innerHTML = `<main class="shell"><h1>Hydrogen cost calculator</h1><p class="error">${escape(error.message)}</p><button id="reset">Restore workbook defaults</button></main>`;
    return;
  }
  if (activeTab === 'heat') {
    root.innerHTML = `${header()}<main class="shell heat-page"><div class="heading"><div><p class="eyebrow">WORKBOOK HEAT PATHWAYS</p><h1>District and process heat</h1><p>Compare electricity, natural gas and hydrogen routes using the cost of hydrogen from the Hydrogen flowchart.</p></div><label class="field heat-year"><span>Technology year</span><select data-state="heatYear">${options([2020,2030,2040,2050],state.heatYear)}</select></label></div>${number('Heat discount rate','heatDiscount',state.heatDiscount,'fraction',0.01)}${renderHeatFlow(r,state)}${renderHeatComparison(r,state)}<p class="note">Source: Flow Chart - Heat and HeatCalculation in Hydrogen_calc_tool_17May22_clean.xlsx. Icons from the supplied workbook.</p></main>`;
    return;
  }
  const p = r.p;
  const pathway = `<div class="flow-track" aria-label="Electricity to delivered hydrogen pathway">
    ${stage(1,'Electricity source',6,select('Source','electricity',data.electricity.map(x=>x.name)),r.electricity,'€/MWh')}
    ${stage(2,'CO₂ taxation',4,select('Tax scenario','carbon',data.carbon.map(x=>x.name)),r.electricity+r.carbonElectricity,'€/MWh')}
    ${stage(3,'Transmission',5,`<div class="fixed-choice">HVDC</div>${number('Distance','transmissionKm',state.transmissionKm,'km',1)}`,r.transmitted,'€/MWh')}
    ${stage(4,'Electrolyser',2,select('Technology','electrolyser',data.electrolysers.map(x=>x.name)),r.produced,'€/MWh H₂')}
    ${stage(5,'Hydrogen storage',1,select('Technology','storage',data.storage.map(x=>x.name)),r.stored,'€/MWh H₂')}
    ${stage(6,'Distribution',0,`${select('Method','distribution',data.distribution.map(x=>x.name))}${number('Distance','distributionKm',state.distributionKm,'km',1)}`,r.delivered,'€/MWh H₂')}
    ${stage(7,'Hydrogen tap',3,`<p class="tap-caption">Delivered hydrogen<br/>including storage and transport</p>`,r.perKg,'€/kg',true)}
  </div>`;
  root.innerHTML = `${header()}
  <main class="shell"><div class="heading"><div><p class="eyebrow">LEVELISED COST MODEL</p><h1>Hydrogen flowchart</h1><p>Choose each stage of the pathway to see how cost changes through production, storage and delivery.</p></div><div class="workbook-tag">Updated catalogues · workbook fallback</div></div>
  <section class="pathway" aria-label="Hydrogen pathway"><div class="pathway-title"><div><h2>Hydrogen pathway</h2><p>Selections and distances update the cost at every stage.</p></div><span>Costs per unit of output at each stage</span></div>${pathway}</section>
  <div class="layout"><section class="controls" aria-label="Scenario inputs">
    <div class="section-head"><span class="step">01</span><h2>Other assumptions</h2></div>
    <div class="field-grid">${number('Transmission load factor','loadFactor',state.loadFactor,'fraction',0.01)}
      ${number('Storage capacity use','storageUse',state.storageUse,'fraction',0.01)}</div>
    <details><summary>Advanced assumptions <span>prices, technology and financing</span></summary><div class="field-grid advanced">
      ${number('Electricity price','electricityPrice',edits.electricityPrice??e.price,'€/MWh')}${number('Grid tariff','tariff',edits.tariff??e.tariff,'€/MWh')}
      ${number('Electricity emissions','emissions',edits.emissions??e.emissions,'kg CO₂/MWh')}${number('Carbon price','carbonPrice',edits.carbonPrice??c.price,'€/t CO₂')}
      ${number('Electrolyser CAPEX','capex',edits.capex??el.capex,'€/kW')}${number('Electrolyser lifetime','lifetime',edits.lifetime??el.lifetime,'years')}
      ${number('Electrolyser efficiency','efficiency',edits.efficiency??el.efficiency,'fraction')}${number('Electrolyser FLH','hours',edits.hours??el.hours,'h/yr')}
      ${number('Storage efficiency','storageEfficiency',edits.storageEfficiency??st.efficiency,'fraction')}
      ${number('Production discount rate','productionDiscount',state.productionDiscount,'fraction')}${number('Storage discount rate','storageDiscount',state.storageDiscount,'fraction')}
    </div></details></section>
    <section class="results" aria-label="Calculated results"><div class="section-head"><span class="step">02</span><h2>Cost detail</h2></div>
      <div class="metric-grid">${card('Direct from electrolyser',r.directKg,'€/kg')}${card('Production',r.produced,'€/MWh')}${card('Electricity at electrolyser',r.transmitted,'€/MWh')}</div>
      <h3>Cost build-up <small>€/MWh H₂</small></h3><div class="breakdown">${row('Production',r.produced)}${row('Storage and energy loss',r.stored-r.produced)}${row('Distribution',r.distributionCost)}<div class="break-row total"><span>Delivered</span><strong>${fmt(r.delivered)}</strong></div></div>
      <p class="note">The model retains the original workbook formulas. Updated catalogue values and original workbook assumptions are identified in the Input data tab.</p>
    </section></div>
    <section class="comparison"><div class="section-head"><span class="step">03</span><h2>Danish 2030 hydrogen scenarios</h2></div>
      <details class="all-tech"><summary>Danish 2030 electricity scenarios · DKK/GJ H₂</summary><p class="note">Separate scenario calculation from the workbook’s “Brint Input & control” and “Brint Cost” sheets. Alkaline 100 MW, 2030 assumptions.</p><div class="table-wrap"><table><thead><tr><th>Scenario</th><th>Electricity source</th><th class="num">DKK/MWh</th><th class="num">Tariff</th><th class="num">FLH</th><th class="num">DKK/GJ</th></tr></thead><tbody>${danish2030().map(x=>`<tr><td>${escape(x.name)}</td><td>${escape(x.source)}</td><td class="num">${fmt(x.price,0)}</td><td class="num">${fmt(x.tariff,0)}</td><td class="num">${fmt(x.hours,0)}</td><td class="num bold">${fmt(x.cost)}</td></tr>`).join('')}</tbody></table></div></details>
    </section><footer>Sources: supplied technology catalogues and Hydrogen_calc_tool_17May22_clean.xlsx. Workbook formulas reproduced for the shown pathways. Icons from the supplied workbook: Freepik, Ultimatearm and SmashIcons via Flaticon.</footer></main>`;
  [...root.querySelectorAll('details')].forEach((x,i)=>x.open=Boolean(openDetails[i]));
}

root.addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'input-category') { inputCategory=target.value; inputQuery=''; chartYear=null; render(); return; }
  if (target.id === 'chart-year') { chartYear=Number(target.value); render(); return; }
  if (target.dataset.inputCategory) {
    const {inputCategory:category,inputId:id,inputField:field}=target.dataset;
    const value=Number(target.value);
    if (target.value.trim()==='') { target.setCustomValidity('Enter a number.'); target.reportValidity(); target.setCustomValidity(''); return; }
    try { editInput(category,id,field,value); edits={}; if(category==='defaults') state[field]=value; calculate(state); }
    catch(error) { target.setCustomValidity(error.message); target.reportValidity(); target.setCustomValidity(''); return; }
    render(); return;
  }
  const oldState={...state}, oldEdits={...edits};
  if (target.dataset.state) {
    const key=target.dataset.state;
    state[key]=target.type==='number'||['fuelYear','heatYear'].includes(key) ? Number(target.value) : target.value;
    if(key==='heatYear'){state.heatDistrictTechnology=null;state.heatProcessTechnology=null;state.heatDistrictFuel=null;state.heatProcessFuel=null;}
    if(key==='heatDistrictTechnology') state.heatDistrictFuel=null;
    if(key==='heatProcessTechnology') state.heatProcessFuel=null;
    const related={electricity:['electricityPrice','tariff','emissions'],carbon:['carbonPrice'],electrolyser:['capex','opex','efficiency','hours','lifetime'],storage:['storageEfficiency']};
    (related[key]||[]).forEach(k=>delete edits[k]);
  }
  if (target.dataset.edit) edits[target.dataset.edit]=Number(target.value);
  try { calculate(state,edits); } catch(error) {
    Object.assign(state,oldState); edits=oldEdits;
    target.setCustomValidity(error.message); target.reportValidity(); target.setCustomValidity('');
    return;
  }
  render();
});
function filterRows() {
  const q=inputQuery.toLowerCase().trim(); let shown=0;
  root.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!row.dataset.search.includes(q); if(!row.hidden)shown++;});
  const empty=root.querySelector('#no-results'); if(empty) empty.hidden=shown!==0;
}
root.addEventListener('input', event=>{if(event.target.id==='input-search'){inputQuery=event.target.value;filterRows();root.querySelector('#input-charts').innerHTML=renderCharts(inputCategory,inputQuery,chartYear);}});
root.addEventListener('click', event => {
  const target=event.target;
  if(target.id==='reset'){Object.assign(state,defaults);edits={};render();}
  if(target.id==='reset-inputs'){resetAllInputs();Object.assign(state,defaults);edits={};render();}
  if(target.dataset.resetCategory){resetInput(target.dataset.resetCategory,target.dataset.resetId);Object.assign(state,defaults);edits={};render();}
});
window.addEventListener('hashchange',()=>{activeTab=location.hash==='#inputs'?'inputs':location.hash==='#heat'?'heat':'dashboard';render();});
render();
