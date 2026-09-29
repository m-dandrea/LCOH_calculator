"""Extract the workbook's source tables and cached technology values for the web app.

This is a one-time, read-only import. The source workbook is intentionally not shipped.
"""
import json
from pathlib import Path
import openpyxl

SOURCE = Path(__file__).resolve().parents[2] / 'upload' / 'Hydrogen_calc_tool_17May22_clean.xlsx'
OUT = Path(__file__).resolve().parents[1] / 'data' / 'workbook.json'
w = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)

def records(sheet, first, last, fields):
    s = w[sheet]
    return [{key: s[f'{column}{r}'].value for key, column in fields.items()}
            for r in range(first, last + 1)]

data = {
    'electricity': records('el.source', 4, 7, {'name':'A','price':'B','tariff':'C','emissions':'D'}),
    'carbon': records('carbontax', 4, 14, {'name':'A','year':'B','price':'C'}),
    'electrolysers': records('electrolyser', 4, 15, {'name':'A','year':'B','capex':'C','opex':'D','efficiency':'E','heat':'F','lifetime':'G','hours':'H'}),
    'storage': records('h2.storage', 3, 14, {'name':'A','year':'B','capex':'C','fixed':'D','variable':'E','efficiency':'F','lifetime':'G','capacity':'H','duration':'I'}),
    'distribution': records('h2.distr', 4, 9, {'name':'A','fixed':'B','variable':'C','losses':'D','levelised':'E'}),
    'fuelPrices': records('Fuel price projection', 5, 36, {'year':'A','gas':'C','coal':'D','diesel':'G','wood':'J'}),
    'fuelEmissions': {'gas':w['fossil.source']['E6'].value, 'coal':w['fossil.source']['E7'].value, 'diesel':w['fossil.source']['E10'].value, 'wood':0},
    'districtHeat': records('DH Summary', 6, 52, {'name':'B','year':'C','efficiency':'D','capex':'E','fixed':'F','variable':'G','aux':'H','lifetime':'I','fuel':'J'}),
    'processHeat': records('ProcH Summary', 6, 37, {'name':'B','year':'C','efficiency':'D','capex':'E','fixed':'F','variable':'G','aux':'H','lifetime':'I','fuel':'J'}),
    'defaults': {'electricity':'Offgrid offshore wind, w/ island','carbon':'1 - 2022 (low)','electrolyser':'Alkaline 100 MW - 2050','storage':'LOHC -2050','distribution':'EU H2 Backbone - Medium','fuelYear':2050,'heatYear':2030,'transmissionKm':500,'distributionKm':500,'loadFactor':0.45,'storageUse':0.3,'storageDiscount':0.05,'productionDiscount':0.05,'heatDiscount':0.05,'districtHours':1752,'processHours':7884,'hydrogenMwhPerKg':0.0394,'dkkPerEur':7.45}
}
for key in ('districtHeat','processHeat'):
    data[key] = [r for r in data[key] if r['name'] and isinstance(r['year'], int)]
for key in ('carbon','distribution'):
    data[key] = [r for r in data[key] if r['name']]
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(OUT)
