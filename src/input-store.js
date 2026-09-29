import initial from '../data/workbook.json' with { type: 'json' };
import sources from '../data/input-sources.json' with { type: 'json' };

export const baseline = structuredClone(initial);
export const data = structuredClone(initial);
export const defaults = data.defaults;
export const provenance = sources;
const key = 'lcoh-input-overrides-v1';
let overrides = {};

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

function valid(category, field, value) {
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  if (['efficiency', 'storageUse', 'loadFactor', 'opex', 'losses'].includes(field) &&
      category !== 'districtHeat' && category !== 'processHeat' && value > 1) return false;
  if (field === 'losses' && value === 1) return false;
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

export function editInput(category, id, field, value) {
  if (!valid(category, field, value)) throw new Error('Enter a valid nonnegative number in the expected units.');
  assign(category, id, field, value);
  const original = baselineValue(category, id, field);
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
  for (const field of Object.keys(fields)) assign(category, id, field, baselineValue(category, id, field));
  delete overrides[category][id];
  persist();
}

export function resetAllInputs() {
  for (const [category, records] of Object.entries(overrides))
    for (const id of Object.keys(records)) resetInput(category, id);
  overrides = {};
  persist();
}

export function isEdited(category, id, field) {
  return Object.hasOwn(overrides[category]?.[id] || {}, field);
}
