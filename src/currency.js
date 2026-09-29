// The workbook calculation uses EUR. Present euro-based fields in DKK while
// leaving the original data, local edits, and the Danish scenario unchanged.
const euroFields = {
  electricity: ['price', 'tariff'],
  carbon: ['price'],
  transmission: ['cost'],
  electrolysers: ['capex'],
  storage: ['capex', 'fixed', 'variable'],
  distribution: ['fixed', 'variable', 'levelised'],
  districtHeat: ['capex', 'fixed', 'variable'],
  processHeat: ['capex', 'fixed', 'variable']
};

export function isEuroField(category, field) {
  return euroFields[category]?.includes(field) || false;
}

export function displayValue(category, field, value, rate) {
  return isEuroField(category, field) ? value * rate : value;
}

export function storedValue(category, field, value, rate) {
  return isEuroField(category, field) ? value / rate : value;
}

export const monetaryEdits = new Set(['electricityPrice', 'tariff', 'carbonPrice', 'capex']);
