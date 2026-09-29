"""Apply exact technology/year matches from the supplied data catalogues.

Run after extract_workbook.py. Source workbooks are read only. Unmatched years,
plant sizes, technologies and incompatible units retain the original value.
"""
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
UPLOAD = ROOT.parent / 'upload'
target = ROOT / 'data' / 'workbook.json'
data = json.loads(target.read_text(encoding='utf-8'))
provenance = {}

CATALOGUES = {
    'electrolysers': ('data_sheets_for_renewable_fuels_15_with_index_alldata_long.xlsx', 'alldata_long'),
    'storage': ('technology_datasheet_for_energy_storage - 0011.xlsx', 'alldata_flat'),
    'districtHeat': ('technology_data_for_el_and_dh_updated_alldatalong.xlsx', 'alldata_long'),
    'processHeat': ('technology_data_for_industrial_process_heat.xlsx', 'alldata_flat'),
}

def source_index(filename, sheet):
    ws = openpyxl.load_workbook(UPLOAD / filename, read_only=True, data_only=True)[sheet]
    rows = ws.iter_rows()
    head = [c.value for c in next(rows)]
    if head[0] == 'Back to Index':
        head = [c.value for c in next(rows)]
    col = {name: idx for idx, name in enumerate(head)}
    index = {}
    for cells in rows:
        values = [c.value for c in cells]
        if str(values[col['est']]).lower() not in ('ctrl', 'crtl'):
            continue
        year, value = values[col['year']], values[col['val']]
        if not isinstance(year, int) or not isinstance(value, (int, float)):
            continue
        key = (values[col['ws']], values[col['par']], year)
        if key in index:
            index[key] = None  # ambiguous source row; preserve workbook input
            continue
        c = cells[col['val']]
        index[key] = (value, f'{sheet}!{c.coordinate}', values[col['unit']], values[col.get('priceyear', -1)] if 'priceyear' in col else None)
    return index

indexes = {key: source_index(*source) for key, source in CATALOGUES.items()}

def row_id(category, item):
    if category in ('districtHeat', 'processHeat'):
        return f"{item['name']}|{item['year']}"
    return item['name']

def apply(category, item, field, worksheet, parameter, multiplier=1):
    key = (worksheet, parameter, item['year'])
    match = indexes[category].get(key)
    if not match:
        return False
    value, cell, unit, priceyear = match
    updated = value * multiplier
    if not isinstance(item.get(field), (int, float)):
        return False
    item[field] = updated
    provenance.setdefault(category, {}).setdefault(row_id(category, item), {})[field] = {
        'file': CATALOGUES[category][0], 'cell': cell, 'technology': worksheet,
        'parameter': parameter, 'unit': unit, 'priceYear': priceyear,
        'conversion': multiplier,
    }
    return True

electrolyser_ws = {'Alkaline 100 MW': '80 AEC 100 MW', 'PEM 100 MW': '80 PEMEC 100 MW'}
for item in data['electrolysers']:
    for prefix, ws in electrolyser_ws.items():
        if not item['name'].startswith(prefix):
            continue
        for field, par, factor in [
            ('capex', 'Specific investment [€/kW of total input_e]', 1),
            ('opex', 'Fixed O&M [% of specific investment/year]', .01),
            ('efficiency', 'LHV-based efficiency (% total input_e [MWh/MWh])', .01),
            ('heat', '- hereof recoverable for district heating [%-points of heat loss]', .01),
            ('lifetime', 'Technical lifetime of plant [years]', 1),
        ]:
            apply('electrolysers', item, field, ws, par, factor)

storage_ws = {'Tanks': '151a Hydrogen Storage - Tanks',
              'LOHC': '151b Hydrogen Storage - LOHC',
              'Caverns': '151c Hydrogen Storage - Caverns'}
for item in data['storage']:
    ws = storage_ws[item['name'].split(' -')[0]]
    for field, par in [
        ('capex', 'Specific investment [M€/MWh]'),
        ('fixed', 'Fixed O&M [€/MW/year]'),
        ('variable', 'Variable O&M [€/MWh]'),
        ('efficiency', 'Round trip efficiency [%]'),
        ('lifetime', 'Technical lifetime [years]'),
        ('capacity', 'Input capacity for one unit [MW]'),
        ('duration', 'Energy storage capacity for one unit [MWh]'),
    ]:
        apply('storage', item, field, ws, par)

district_ws = {
    '40 Comp. hp, airsource 1 MW': '40 Comp. hp, airsource 1 MW',
    '40 Comp. hp, airsource 3 MW': '40 Comp. hp, airsource 3 MW',
    '40 Comp. hp, airsource 10 MW': '40 Comp. hp, airsource 10 MW',
    '40 Comp. hp, excess heat 1 MW': '40 Comp. hp, waste heat 1 MW',
    '40 Comp. hp, excess heat 3 MW': '40 Comp. hp, waste heat 3 MW',
    '40 Comp. hp, excess heat 10 MW': '40 Comp. hp, waste heat 10 MW',
    '40 Comp. hp, seawater 20 MW': '40 Comp. hp, seawater 20 MW',
    '41 Electric Boilers 1-5 MW': '41 Electric boiler, small',
    '41 Electric Boilers >10 MW': '41 Electric boiler, large',
    '44 Natural Gas DH Only': '44 Natural Gas DH Only',
}
for item in data['districtHeat']:
    ws = district_ws.get(item['name'])
    if not ws:
        continue
    for field, par, factor in [
        ('efficiency', 'Heat efficiency (net, annual average) []', 100),
        ('capex', 'Nominal investment (*total) [MEUR/MW_h]', 1),
        ('fixed', 'Fixed O&M (*total) [EUR/MW_h/y]', 1),
        ('variable', 'Variable O&M (other O&M) [EUR/MWh_h]', 1),
        ('aux', 'Auxiliary Electricity consumption (share of heat gen.) []', 100),
        ('lifetime', 'Technical lifetime [years]', 1),
    ]:
        apply('districtHeat', item, field, ws, par, factor)

# These process-heat matches also agree with the old workbook's voltage and
# unit capacity: steam/hot-water boilers 10 kV, 15 MW; gas firing 2.5 MW;
# electric firing 5 MW. The newer 150 C heat pump is 2 MW vs. 1.5 MW old.
process_ws = {
    '310.1 Electric boiler steam  ': '5.1b Electric boiler steam',
    '310.2 Electric boiler hot water': '5.2b Electric boiler hot wate',
    '312.a Direct firing Natural Gas': '7.1 Direct firing Natural Gas',
    '312.c Direct firing Electricity': '7.3 Direct electric firing',
}
for item in data['processHeat']:
    ws = process_ws.get(item['name'])
    if not ws:
        continue
    # The parameter names differ by technology. Require one unambiguous
    # central-estimate record for the exact year and parameter prefix.
    mapping = [
        ('efficiency', 'Total efficiency, net [%], annual average', 100),
        ('capex', 'Nominal investment [M€/MW]', 1),
        ('fixed', 'Fixed O&M', 1),
        ('variable', 'Variable O&M', 1),
        ('aux', 'Auxiliary electricity consumption [% of heat gen]', 100),
        ('lifetime', 'Technical lifetime [years]', 1),
    ]
    for field, prefix, factor in mapping:
        candidates = [p for w,p,y in indexes['processHeat'] if w == ws and y == item['year'] and p.startswith(prefix)]
        if len(candidates) == 1:
            apply('processHeat', item, field, ws, candidates[0], factor)

target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
(ROOT / 'data' / 'input-sources.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2), encoding='utf-8')
print({key: sum(len(fields) for fields in rows.values()) for key, rows in provenance.items()})
