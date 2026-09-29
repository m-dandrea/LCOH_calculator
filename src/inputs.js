import {data, defaults, provenance, workbookProvenance, recordId, isEdited, isCustom} from './input-store.js';
import {displayValue, isEuroField} from './currency.js';

const categories = [
  ['electricity','Electricity sources','price:DKK/MWh,tariff:DKK/MWh,emissions:kg CO₂/MWh'],
  ['carbon','Carbon tax','price:DKK/t CO₂'],
  ['transmission','Electricity transmission','losses:fraction,cost:DKK/MW/km/year'],
  ['electrolysers','Electrolysers','capex:DKK/kW,opex:fraction,efficiency:fraction,heat:fraction,lifetime:years,hours:h/year'],
  ['storage','Hydrogen storage','capex:MDKK/MWh,fixed:DKK/MW/year,variable:DKK/MWh,efficiency:fraction,lifetime:years,capacity:MW,duration:hours'],
  ['distribution','Hydrogen distribution','fixed:DKK/MW/km/year,variable:DKK/MWh/km,losses:fraction,levelised:DKK/MWh'],
  ['fuelPrices','Fuel prices','gas:DKK/GJ,coal:DKK/GJ,diesel:DKK/GJ,wood:DKK/GJ'],
  ['fuelEmissions','Fuel emissions','value:kg CO₂/MWh'],
  ['districtHeat','District heat','efficiency:%,capex:MDKK/MW,fixed:DKK/MW/year,variable:DKK/MWh,aux:%,lifetime:years'],
  ['processHeat','Process heat','efficiency:%,capex:MDKK/MW,fixed:DKK/MW/year,variable:DKK/MWh,aux:%,lifetime:years'],
  ['danishScenarios','Danish 2030 scenarios','price:DKK/MWh,tariff:DKK/MWh,hours:h/year,networkLoss:fraction'],
  ['defaults','Model assumptions','transmissionKm:km,distributionKm:km,loadFactor:fraction,storageUse:fraction,storageDiscount:fraction,productionDiscount:fraction,heatDiscount:fraction,districtHours:h/year,processHours:h/year,hydrogenMwhPerKg:MWh/kg']
];
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const title = field => field.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const addable = category => !['defaults','fuelEmissions'].includes(category);
const addFields = category => categories.find(x=>x[0]===category)?.[2].split(',').map(x=>x.split(':')) || [];
const needsYear = category => ['carbon','electrolysers','storage','fuelPrices','districtHeat','processHeat','danishScenarios'].includes(category);
function renderAddForm(category) {
  if (!addable(category)) return '';
  const fields=addFields(category);
  const name=category==='fuelPrices'?'':'<label class="field"><span>Record name</span><input data-add-name placeholder="e.g. New technology" /></label>';
  const year=needsYear(category)?'<label class="field"><span>Year</span><input type="number" data-add-year step="1" placeholder="2030" /></label>':'';
  const values=fields.map(([field,unit])=>`<label class="field"><span>${esc(title(field))} <small>${esc(unit)}</small></span><input type="number" data-add-field="${field}" step="any" /></label>`).join('');
  return `<details class="add-record"><summary>Add ${category==='fuelPrices'?'fuel-price year':'technology or scenario'}</summary><p class="input-help">Every characteristic is required and uses the units and validation rules shown in this table. Added records are saved only in this browser and can be removed.</p><div class="add-grid">${name}${year}${values}</div><button class="add-submit" data-add-submit="${category}">Add record</button><p class="add-error" data-add-error hidden></p></details>`;
}
export function renderInputs(category='electrolysers', query='', year=null) {
  const selected = categories.find(x=>x[0]===category) || categories[0];
  const fields = selected[2].split(',').map(x=>x.split(':'));
  const rows = category==='defaults' ? [{...data.defaults}] : category==='fuelEmissions' ? Object.entries(data.fuelEmissions).map(([name,value])=>({name,value})) : data[category];
  const body = rows.map(row=>{
    const id=recordId(category,category==='fuelEmissions'?row.name:row);
    const label=category==='defaults'?'Model settings':category==='fuelPrices'?String(row.year):row.name;
    const secondary=category==='districtHeat'||category==='processHeat'||category==='electrolysers'||category==='storage' ? `${row.year}${row.fuel?' · '+row.fuel:''}` : category==='carbon'?String(row.year||''):'';
    const cells=fields.map(([field,unit])=>{
      const actualField=category==='fuelEmissions'?id:field;
      const value=displayValue(category,field,row[field],defaults.dkkPerEur);
      const source=provenance[category]?.[id]?.[actualField];
      const workbookSource=workbookProvenance[category]?.[id]?.[actualField] || workbookProvenance[category]?.[String(id)]?.[actualField];
      const edited=isEdited(category,id,actualField);
      const gridNoCable=category==='transmission' && id.startsWith('AF25 grid reference') && field==='cost';
      const legacyNoLoss=category==='danishScenarios' && field==='networkLoss' && !id.startsWith('KF26');
      const modelChoice=gridNoCable||legacyNoLoss;
      const sourceText=(source?`${source.file} · ${source.cell} · ${source.parameter}${source.priceYear?' · price basis '+source.priceYear:''}`:gridNoCable?'Model choice: no dedicated HVDC distance charge for the grid reference; the electricity tariff is accounted for at point 1.':legacyNoLoss?'Model choice: original Excel scenario formula has no explicit network-loss multiplier.':workbookSource||'Guess')+(isEuroField(category,field)?` · Shown in DKK at ${defaults.dkkPerEur} DKK/EUR.`:'');
      const custom=isCustom(category,id);
      const status=custom?'Added by user':edited?'Edited':source?'Source':modelChoice?'Model':workbookSource||'Guess';
      return `<td><label class="input-cell"><span class="sr-only">${esc(label)} ${esc(title(field))}</span><input type="number" step="any" value="${value??''}" data-input-category="${category}" data-input-id="${esc(id)}" data-input-field="${esc(actualField)}" aria-label="${esc(label)} ${esc(title(field))} (${esc(unit)})"><small class="source ${edited?'edited':source?'catalogue':''}" title="${esc(sourceText)}">${esc(status)}</small></label></td>`;
    }).join('');
    const changed=fields.some(([field])=>isEdited(category,id,category==='fuelEmissions'?id:field));
    const reset=changed?`<button class="row-reset" data-reset-category="${category}" data-reset-id="${esc(id)}">Reset</button>`:'';
    const action=`${reset}<button class="row-reset remove-record" data-remove-category="${category}" data-remove-id="${esc(id)}">Remove</button>`;
    return `<tr data-search="${esc((label+' '+secondary).toLowerCase())}"><th scope="row"><strong>${esc(label)}</strong><small>${esc(secondary)}</small></th>${cells}<td>${action}</td></tr>`;
  }).join('');
  return `<main class="shell inputs-page"><div class="heading"><div><p class="eyebrow">SOURCE DATA</p><h1>Input data</h1><p>Edit the source tables used by the dashboard. Changes recalculate results and stay in this browser.</p></div><button id="reset-inputs" class="reset-inputs">Reset all input data</button></div>
    <section class="inputs-panel"><div class="inputs-toolbar"><label class="field"><span>Input table</span><select id="input-category">${categories.map(([key,label])=>`<option value="${key}" ${key===category?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>Find a row</span><input id="input-search" type="search" value="${esc(query)}" placeholder="Search technology or year"></label></div>
    <div id="input-charts">${renderCharts(category,query,year)}</div>${renderAddForm(category)}
    <p class="input-help">All monetary values are shown and edited in DKK (MDKK means million DKK). EUR values from the workbook use its fixed conversion of 7.45 DKK/EUR. <span class="source catalogue">Source</span> shows the external report, dataset, URL, or source note recorded in Excel · values marked <strong>Guess</strong> have no source provided in Excel · Model: a stated calculation choice · <span class="source edited">Edited</span> your local value. Hover over a label for the full source text. Published price years are retained; no inflation adjustment was applied.</p>
    ${category==='electrolysers'?'<p class="input-help">The main hydrogen production calculation follows the original workbook formula, which uses CAPEX in its O&M term. The OPEX column is retained for the separate Danish scenario calculation.</p>':''}
    <div class="table-wrap inputs-table"><table><thead><tr><th>Record</th>${fields.map(([field,unit])=>`<th>${esc(title(field))}<small>${esc(unit)}</small></th>`).join('')}<th></th></tr></thead><tbody>${body}</tbody></table></div><p id="no-results" hidden>No matching rows.</p></section></main>`;
}

// Keep unlike units on separate scales, and compare a single year when a
// catalogue contains time slices. Bars show the actual input value and unit.
const chartFields = {
  electricity:['price','tariff','emissions'], carbon:['price'],
  electrolysers:['capex','efficiency','lifetime'],
  storage:['capex','efficiency','fixed'],
  distribution:['fixed','variable','losses'],
  fuelPrices:['gas'], fuelEmissions:['value'],
  districtHeat:['capex','efficiency','fixed'],
  processHeat:['capex','efficiency','fixed'],
  danishScenarios:['price','tariff','hours']
};
const chartUnits = Object.fromEntries(categories.map(([key,,list])=>[key,Object.fromEntries(list.split(',').map(x=>x.split(':')))]));
const displayNumber = value => new Intl.NumberFormat('en-US',{maximumFractionDigits: value < 1 ? 4 : 2}).format(value);
const chartLabel = (category,row) => category==='fuelPrices' ? String(row.year) : row.name.trim();

export function renderCharts(category, query='', year=null) {
  const fields=chartFields[category];
  if (!fields) return '';
  const rows=category==='fuelEmissions' ? Object.entries(data.fuelEmissions).map(([name,value])=>({name,value})) : data[category];
  const years=[...new Set(rows.map(x=>x.year).filter(Number.isFinite))].sort((a,b)=>a-b);
  const selectedYear=years.includes(Number(year)) ? Number(year) : years.at(-1);
  const relevant=rows.filter(x=>(!years.length||x.year===selectedYear) &&
    (chartLabel(category,x)+' '+(x.fuel||'')).toLowerCase().includes(query.toLowerCase().trim()));
  const charts=fields.map((field,index)=>{
    // Fuel price columns are separate fuels, not technology parameters.
    const points=category==='fuelPrices' ? ['gas','coal','diesel','wood'].map(fuel=>({name:title(fuel),value:relevant[0]?.[fuel]})) : relevant.map(x=>({name:chartLabel(category,x),value:displayValue(category,field,x[field],defaults.dkkPerEur)}));
    const values=points.filter(x=>Number.isFinite(x.value));
    if (!values.length) return '';
    const max=Math.max(...values.map(x=>x.value),0);
    const bars=values.map(x=>`<div class="chart-row"><span class="chart-label" title="${esc(x.name)}">${esc(x.name)}</span><div class="chart-track"><div class="chart-bar chart-bar-${index%3}" style="width:${max?Math.max(1,x.value/max*100):0}%"></div></div><strong>${displayNumber(x.value)}</strong></div>`).join('');
    return `<section class="chart-card" aria-label="${esc(title(field))} comparison in ${esc(chartUnits[category][field])}"><h3>${esc(category==='fuelPrices'?'Fuel prices':title(field))} <small>${esc(chartUnits[category][field])}</small></h3>${bars}</section>`;
  }).join('');
  if (!charts) return '';
  return `<section class="charts-section" aria-label="Input comparisons"><div class="charts-heading"><div><p class="eyebrow">COMPARE INPUTS</p><h2>Comparison graphs</h2><p>Compare technologies using the editable values in the table below.</p></div>${years.length>1?`<label class="field"><span>Comparison year</span><select id="chart-year">${years.map(y=>`<option value="${y}" ${y===selectedYear?'selected':''}>${y}</option>`).join('')}</select></label>`:''}</div><div class="chart-grid">${charts}</div></section>`;
}
