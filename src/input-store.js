import initial from '../data/workbook.json' with { type: 'json' };
import sources from '../data/input-sources.json' with { type: 'json' };
import workbookSources from '../data/workbook-provenance.json' with { type: 'json' };

export const baseline = structuredClone(initial);
export const data = structuredClone(initial);
export const defaults = data.defaults;
export const provenance = sources;
export const workbookProvenance = workbookSources;
const key = 'lcoh-input-overrides-v1';
const customKey = 'lcoh-input-custom-v1';
const removedKey = 'lcoh-input-removed-v1';
let overrides = {};
let customRecords = {};
let removedRecords = {};

export function recordId(category, row) {
  if (category === 'defaults') return 'model';
  if (category === 'fuelEmissions') return row;
  if (category === 'fuelPrices') return String(row.year);
  if (category === 'districtHeat' || category === 'processHeat') return `${row.name}|${row.year}`;
  return row.name;
}

function getRecord(collection, category, id) {
  if (category === 'defaults') return collection.defaults;
  if (category === 'fuelEmissions') return collection.fuelEmissions;
  return collection[category]?.find(row => recordId(category, row) === id);
}

function assign(category, id, field, value) {
  const record = getRecord(data, category, id);
  if (!record || !(category === 'fuelEmissions' ? id in record && field === id : field in record)) throw new Error('Unknown input');
  record[category === 'fuelEmissions' ? id : field] = value;
}

function baselineValue(category, id, field) {
  const record = getRecord(baseline, category, id);
  return record?.[category === 'fuelEmissions' ? id : field];
}

function originalValue(category, id, field) {
  return customRecords[category]?.[id]?.row?.[field] ?? baselineValue(category, id, field);
}

function valid(category, field, value) {
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  if (['efficiency', 'storageUse', 'loadFactor', 'opex', 'losses', 'networkLoss'].includes(field) &&
      category !== 'districtHeat' && category !== 'processHeat' && value > 1) return false;
  if (['losses', 'networkLoss'].includes(field) && value === 1) return false;
  if (['efficiency', 'storageUse', 'loadFactor'].includes(field) && value === 0) return false;
  if (['lifetime', 'hours', 'capacity', 'duration', 'hydrogenMwhPerKg', 'dkkPerEur',
    'districtHours', 'processHours'].includes(field) && value === 0) return false;
  return true;
}

try {
  const saved = JSON.parse(localStorage.getItem(key) || '{}');
  for (const [category, records] of Object.entries(saved)) {
    for (const [id, fields] of Object.entries(records)) {
      for (const [field, value] of Object.entries(fields)) {
        if (category === 'defaults' && field === 'dkkPerEur') continue;
        if (valid(category, field, value)) {
          try { assign(category, id, field, value); } catch { continue; }
          (((overrides[category] ??= {})[id] ??= {}))[field] = value;
        }
      }
    }
  }
} catch { /* Device storage is optional. */ }

function persist() {
  try { localStorage.setItem(key, JSON.stringify(overrides)); } catch { /* Still editable in this session. */ }
}

function persistCustom() {
  try { localStorage.setItem(customKey, JSON.stringify(customRecords)); } catch { /* Still editable in this session. */ }
}

function persistRemoved() {
  try { localStorage.setItem(removedKey, JSON.stringify(removedRecords)); } catch { /* Still editable in this session. */ }
}

const fieldsFor = category => ({
  electricity:['price','tariff','emissions'], carbon:['price'], transmission:['losses','cost'],
  electrolysers:['capex','opex','efficiency','heat','lifetime','hours'],
  storage:['capex','fixed','variable','efficiency','lifetime','capacity','duration'],
  distribution:['fixed','variable','losses','levelised'], fuelPrices:['gas','coal','diesel','wood'],
  districtHeat:['efficiency','capex','fixed','variable','aux','lifetime'],
  processHeat:['efficiency','capex','fixed','variable','aux','lifetime'],
  danishScenarios:['price','tariff','hours','networkLoss']
}[category] || []);

export function isCustom(category, id) { return Boolean(customRecords[category]?.[id]); }

export function addInput(category, row, persist=true) {
  const fields = fieldsFor(category);
  if (!fields.length) throw new Error('This table cannot contain added records.');
  const id = recordId(category, row);
  if (!id || data[category]?.some(item => recordId(category, item) === id)) throw new Error('A record with this name or year already exists.');
  const required = category === 'fuelPrices' ? ['year', ...fields] : ['name', ...fields];
  if (['electrolysers','storage','districtHeat','processHeat','danishScenarios'].includes(category)) required.push('year');
  if (required.some(field => field === 'name' ? !String(row[field] || '').trim() : field === 'year' ? !Number.isInteger(Number(row[field])) || Number(row[field]) < 1 : !valid(category, field, Number(row[field])))) throw new Error('Complete every field with valid nonnegative values.');
  data[category].push(structuredClone(row));
  ((customRecords[category] ??= {})[id] = {row: structuredClone(row)});
  delete removedRecords[category]?.[id];
  if (persist) persistCustom();
}

export function removeInput(category, id) {
  if (!data[category]?.length) throw new Error('This table has no records to remove.');
  if (data[category].length <= 1) throw new Error('Keep at least one record in this table.');
  const index = data[category].findIndex(row => recordId(category, row) === id);
  if (index < 0) throw new Error('Unknown input');
  data[category].splice(index, 1);
  if (isCustom(category, id)) delete customRecords[category][id];
  else ((removedRecords[category] ??= {})[id] = true);
  delete overrides[category]?.[id];
  persistCustom(); persistRemoved(); persist();
}

try {
  const savedCustom = JSON.parse(localStorage.getItem(customKey) || '{}');
  customRecords = savedCustom && typeof savedCustom === 'object' ? savedCustom : {};
  const savedRemoved = JSON.parse(localStorage.getItem(removedKey) || '{}');
  removedRecords = savedRemoved && typeof savedRemoved === 'object' ? savedRemoved : {};
  for (const [category, records] of Object.entries(removedRecords)) {
    for (const id of Object.keys(records || {})) {
      if (customRecords[category]?.[id]) continue;
      const index = data[category]?.findIndex(row => recordId(category, row) === id);
      if (index >= 0) data[category].splice(index, 1);
    }
  }
  for (const [category, records] of Object.entries(savedCustom))
    for (const entry of Object.values(records))
      if (entry?.row) {
        try {
          const id = recordId(category, entry.row);
          const existing = data[category]?.findIndex(row => recordId(category, row) === id);
          if (existing >= 0) data[category].splice(existing, 1);
          delete customRecords[category]?.[id];
          addInput(category, entry.row, false);
        } catch { /* Ignore invalid old custom data. */ }
      }
} catch { /* Device storage is optional. */ }

export function editInput(category, id, field, value) {
  if (category === 'defaults' && field === 'dkkPerEur') throw new Error('The workbook conversion rate is fixed at 7.45 DKK/EUR.');
  if (!valid(category, field, value)) throw new Error('Enter a valid nonnegative number in the expected units.');
  assign(category, id, field, value);
  const original = originalValue(category, id, field);
  if (value === original) {
    delete overrides[category]?.[id]?.[field];
  } else {
    (((overrides[category] ??= {})[id] ??= {}))[field] = value;
  }
  persist();
}

export function resetInput(category, id) {
  const fields = overrides[category]?.[id];
  if (!fields) return;
  for (const field of Object.keys(fields)) assign(category, id, field, originalValue(category, id, field));
  delete overrides[category][id];
  persist();
}

export function resetAllInputs() {
  for (const category of Object.keys(baseline)) {
    if (Array.isArray(baseline[category])) data[category] = structuredClone(baseline[category]);
    else if (category === 'defaults') Object.assign(data.defaults, structuredClone(baseline.defaults));
  }
  overrides = {};
  customRecords = {};
  removedRecords = {};
  persistCustom(); persistRemoved();
  persist();
}

export function isEdited(category, id, field) {
  return Object.hasOwn(overrides[category]?.[id] || {}, field);
}
