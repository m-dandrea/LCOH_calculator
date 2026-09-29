"""Extract source/comment text from the original workbook for Input-data labels."""
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
UPLOAD = ROOT.parent / 'upload'
w = openpyxl.load_workbook(UPLOAD / 'Hydrogen_calc_tool_17May22_clean.xlsx', read_only=True, data_only=True)
out = {}

def put(category, record, fields, source):
    text = str(source).strip() if source not in (None, '') else 'Guess'
    out.setdefault(category, {}).setdefault(str(record), {}).update({field: text for field in fields})

# Electricity comments are explicit in the source table (including Guess).
s = w['el.source']
for r in range(4, 8):
    put('electricity', s[f'A{r}'].value, ['price', 'tariff', 'emissions'], s[f'E{r}'].value)

# The transmission sheet provides a reference URL for the HVDC cost/loss data.
s = w['el.trans']
put('transmission', 'HVDC', ['losses', 'cost'], s['E4'].value or s['D4'].value)

# Row-level source notes in the workbook. Blank notes are deliberately reported
# as Guess rather than implying that the workbook itself is an external source.
for category, sheet, first, last, id_col, note_cols in [
    ('electrolysers', 'electrolyser', 4, 15, 'A', ['J']),
    ('storage', 'h2.storage', 3, 14, 'A', ['N']),
    ('districtHeat', 'DH Summary', 6, 52, 'B', []),
    ('processHeat', 'ProcH Summary', 6, 37, 'B', []),
]:
    s = w[sheet]
    for r in range(first, last + 1):
        record = s[f'{id_col}{r}'].value
        if record is None:
            continue
        source = next((s[f'{c}{r}'].value for c in note_cols if s[f'{c}{r}'].value not in (None, '')), None)
        fields = {'electrolysers':['capex','opex','efficiency','heat','lifetime','hours'],
                  'storage':['capex','fixed','variable','efficiency','lifetime','capacity','duration'],
                  'districtHeat':['efficiency','capex','fixed','variable','aux','lifetime'],
                  'processHeat':['efficiency','capex','fixed','variable','aux','lifetime']}[category]
        key = f"{record}|{s[f'C{r}'].value}" if category in ('districtHeat','processHeat') else record
        put(category, key, fields, source)

for r in range(4, 10):
    if w['h2.distr'][f'A{r}'].value:
        put('distribution', w['h2.distr'][f'A{r}'].value, ['fixed','variable','losses','levelised'], None)
for r in range(4, 15):
    if w['carbontax'][f'A{r}'].value:
        name = str(w['carbontax'][f'A{r}'].value)
        source = ('IEA Advanced Economies with Net Zero Pledges' if 'IEA Advanced Economies' in name
                  else 'IEA Net Zero by 2050' if 'IEA Net Zero' in name else None)
        put('carbon', name, ['price'], source)
for r in range(5, 37):
    year = w['Fuel price projection'][f'A{r}'].value
    if isinstance(year, int):
        put('fuelPrices', year, ['gas','coal','diesel','wood'], None)
for fuel in ['gas','coal','diesel','wood']:
    put('fuelEmissions', fuel, [fuel], w['fossil.source']['D18'].value)
for r in range(4, 8):
    if w['Elomk.'][f'C{r}'].value:
        put('danishScenarios', w['Elomk.'][f'C{r}'].value, ['price','tariff','hours'], w['Elomk.'][f'I{r}'].value)

out['defaults'] = {'model': {field: 'Guess' for field in [
    'transmissionKm','distributionKm','loadFactor','storageUse','storageDiscount',
    'productionDiscount','heatDiscount','districtHours','processHours','hydrogenMwhPerKg','dkkPerEur','transmission']}}
(ROOT / 'data' / 'workbook-provenance.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Wrote workbook-provenance.json')
