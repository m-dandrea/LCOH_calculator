import {data, baseline, provenance, recordId, isEdited} from './input-store.js';

const categories = [
  ['electricity','Electricity sources','price:€/MWh,tariff:€/MWh,emissions:kg CO₂/MWh'],
  ['carbon','Carbon tax','price:€/t CO₂'],
  ['transmission','Electricity transmission','losses:fraction,cost:€/MW/km/year'],
  ['electrolysers','Electrolysers','capex:€/kW,opex:fraction,efficiency:fraction,heat:fraction,lifetime:years,hours:h/year'],
  ['storage','Hydrogen storage','capex:M€/MWh,fixed:€/MW/year,variable:€/MWh,efficiency:fraction,lifetime:years,capacity:MW,duration:hours'],
  ['distribution','Hydrogen distribution','fixed:€/MW/km/year,variable:€/MWh/km,losses:fraction,levelised:€/MWh'],
  ['fuelPrices','Fuel prices','gas:€/MWh,coal:€/MWh,diesel:€/MWh,wood:€/MWh'],
  ['fuelEmissions','Fuel emissions','value:kg CO₂/MWh'],
  ['districtHeat','District heat','efficiency:%,capex:M€/MW,fixed:€/MW/year,variable:€/MWh,aux:%,lifetime:years'],
  ['processHeat','Process heat','efficiency:%,capex:M€/MW,fixed:€/MW/year,variable:€/MWh,aux:%,lifetime:years'],
  ['danishScenarios','Danish 2030 scenarios','price:DKK/MWh,tariff:DKK/MWh,hours:h/year'],
  ['defaults','Model assumptions','transmissionKm:km,distributionKm:km,loadFactor:fraction,storageUse:fraction,storageDiscount:fraction,productionDiscount:fraction,heatDiscount:fraction,districtHours:h/year,processHours:h/year,hydrogenMwhPerKg:MWh/kg,dkkPerEur:DKK/€']
];
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const title = field => field.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
export function renderInputs(category='electrolysers', query='') {
  const selected = categories.find(x=>x[0]===category) || categories[0];
  const fields = selected[2].split(',').map(x=>x.split(':'));
  const rows = category==='defaults' ? [{...data.defaults}] : category==='fuelEmissions' ? Object.entries(data.fuelEmissions).map(([name,value])=>({name,value})) : data[category];
  const original = category==='defaults' ? [{...baseline.defaults}] : category==='fuelEmissions' ? Object.entries(baseline.fuelEmissions).map(([name,value])=>({name,value})) : baseline[category];
  const body = rows.map((row,i)=>{
    const id=recordId(category,category==='fuelEmissions'?row.name:row);
    const label=category==='defaults'?'Model settings':category==='fuelPrices'?String(row.year):row.name;
    const secondary=category==='districtHeat'||category==='processHeat'||category==='electrolysers'||category==='storage' ? `${row.year}${row.fuel?' · '+row.fuel:''}` : category==='carbon'?String(row.year||''):'';
    const cells=fields.map(([field,unit])=>{
      const actualField=category==='fuelEmissions'?id:field;
      const value=row[field];
      const source=provenance[category]?.[id]?.[actualField];
      const edited=isEdited(category,id,actualField);
      const sourceText=source?`${source.file} · ${source.cell} · ${source.parameter}${source.priceYear?' · price basis '+source.priceYear:''}`:'Hydrogen_calc_tool_17May22_clean.xlsx';
      const status=edited?'Edited':source?'Catalogue':'Workbook';
      return `<td><label class="input-cell"><span class="sr-only">${esc(label)} ${esc(title(field))}</span><input type="number" step="any" value="${value??''}" data-input-category="${category}" data-input-id="${esc(id)}" data-input-field="${esc(actualField)}" aria-label="${esc(label)} ${esc(title(field))} (${esc(unit)})"><small class="source ${edited?'edited':source?'catalogue':''}" title="${esc(sourceText)}">${status}</small></label></td>`;
    }).join('');
    const changed=fields.some(([field])=>isEdited(category,id,category==='fuelEmissions'?id:field));
    return `<tr data-search="${esc((label+' '+secondary).toLowerCase())}"><th scope="row"><strong>${esc(label)}</strong><small>${esc(secondary)}</small></th>${cells}<td><button class="row-reset" data-reset-category="${category}" data-reset-id="${esc(id)}" ${changed?'':'disabled'}>Reset</button></td></tr>`;
  }).join('');
  return `<main class="shell inputs-page"><div class="heading"><div><p class="eyebrow">SOURCE DATA</p><h1>Input data</h1><p>Edit the source tables used by the dashboard. Changes recalculate results and stay in this browser.</p></div><button id="reset-inputs" class="reset-inputs">Reset all input data</button></div>
    <section class="inputs-panel"><div class="inputs-toolbar"><label class="field"><span>Input table</span><select id="input-category">${categories.map(([key,label])=>`<option value="${key}" ${key===category?'selected':''}>${label}</option>`).join('')}</select></label><label class="field"><span>Find a row</span><input id="input-search" type="search" value="${esc(query)}" placeholder="Search technology or year"></label></div>
    <p class="input-help"><span class="source catalogue">Catalogue</span> updated from a supplied technology data sheet · <span class="source">Workbook</span> original Excel value where no matching input was available · <span class="source edited">Edited</span> your local value. Hover over a source label for its file and cell. Catalogue values retain their published price year; no inflation adjustment was applied.</p>
    ${category==='electrolysers'?'<p class="input-help">The main hydrogen production calculation follows the original workbook formula, which uses CAPEX in its O&M term. The OPEX column is retained for the separate Danish scenario calculation.</p>':''}
    <div class="table-wrap inputs-table"><table><thead><tr><th>Record</th>${fields.map(([field,unit])=>`<th>${esc(title(field))}<small>${esc(unit)}</small></th>`).join('')}<th></th></tr></thead><tbody>${body}</tbody></table></div><p id="no-results" hidden>No matching rows.</p></section></main>`;
}
