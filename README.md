# Hydrogen cost calculator

A browser app built from `Hydrogen_calc_tool_17May22_clean.xlsx`. Its Hydrogen flowchart follows the workbook's illustrated pathway from electricity to the hydrogen tap, with choices and stage costs in the flow. A second flowchart follows the workbook's district and process heat branches, using its icons and the current fuel and technology inputs. The Heat flow tab ranks district and process heat options by calculated cost, including hydrogen at the delivered cost from the Hydrogen flowchart. The separate Danish 2030 electricity scenarios remain on the hydrogen page. The Inputs tab shows editable source values. Matched technology rows were updated from the supplied data sheets, while values without a comparable source remain from the workbook. It is not a live price feed.

## Run

```sh
npm install
npm run dev
```

`npm test` checks the updated default outputs and input editing. `npm run build` produces a static site in `dist/`, suitable for GitHub Pages or another static host. For GitHub Pages under a repository path, set the `base` option in `vite.config.js` (already configured).

## Model notes

- Price chain: electricity plus tariff and carbon tax → HVDC transmission → electrolyser CAPEX and fixed charge → storage investment and energy loss → hydrogen distribution.
- Electrolyser fixed charge follows the workbook's `h2. prod cost!E17` formula, which references CAPEX instead of the OPEX percentage field. The OPEX percentage is shown in the Inputs tab because the separate Danish scenario calculation uses it.
- Heat CAPEX for process heat follows `HeatCalculation!C52:E52`, which uses the district heating full-load hours (1,752), while process heat fixed O&M uses 7,884 hours.
- Hydrogen energy content is 0.0394 MWh/kg LHV, as in the workbook. Other assumptions are intentionally preserved even where units or conventions in the source seem unusual.
- Workbook fuel prices cover 2019–2050. Heat technology catalogues use their available milestone years; the page offers the years common to its main heat options.
- The workbook also contains static source technology catalogues and flow charts. This app focuses on the main `Results Summary` pathway, its supporting calculations, and the four Danish 2030 scenario results; it does not reproduce every worksheet as an editable screen.

The extraction script reads the original workbook from `../upload/` when available; the extracted JSON is committed so the app does not need Excel at runtime.

## Input data and provenance

`data/workbook.json` contains the extracted and updated defaults. `data/input-sources.json` records the supplied file, sheet, cell, parameter, unit, and conversion for every catalogue-updated field. The Inputs tab identifies each field as Catalogue, Workbook, or Edited; hover over its label for the source cell. Edits are stored locally in the browser and can be reset by row or all at once. They are not shared across devices.

- Renewable fuels: 100 MW alkaline and PEM electrolysers for 2030, 2040, and 2050. The 2020 rows and 1 MW solid oxide rows retain their workbook values.
- Energy storage: matching tank, LOHC, and cavern rows for 2020–2050. Missing parameters retain workbook values.
- Electricity and district heating: matching boiler, heat pump, and gas district heat rows; the source's waste heat label corresponds to the workbook's excess heat row.
- Industrial process heat: matching 15 MW electric steam and hot water boilers, 2.5 MW natural gas direct firing, and 5 MW electric direct firing. Other equipment sizes retain workbook values.
- The transport and residential heating catalogues have no directly comparable model rows, so they do not replace the workbook's HVDC or hydrogen distribution assumptions. Fuel forecasts, carbon prices, and emissions factors likewise retain workbook values.

Catalogue values retain their published currency and price-year basis; no inflation adjustment was applied. Re-run `python scripts/extract_workbook.py` followed by `python scripts/update_catalogue_inputs.py` with the supplied files in `../upload/` to regenerate the JSON.

The Inputs tab also has comparison charts beneath each table. Technology charts compare CAPEX, efficiency, and an operating or lifetime measure for one selected catalogue year. The charts use the current editable values and keep unlike units on separate scales.
