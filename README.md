# Hydrogen cost calculator

A browser app built from `Hydrogen_calc_tool_17May22_clean.xlsx`. Its main dashboard follows the workbook's illustrated pathway from electricity to the hydrogen tap, with choices and stage costs in the flow. It also reproduces the fuel and heat comparisons and separate Danish 2030 electricity scenarios. The data in `data/workbook.json` was extracted from the supplied 2022 workbook; it is not a live price feed.

## Run

```sh
npm install
npm run dev
```

`npm test` checks the workbook's cached default outputs. `npm run build` produces a static site in `dist/`, suitable for GitHub Pages or another static host. For GitHub Pages under a repository path, set the `base` option in `vite.config.js` (already configured).

## Model notes

- Price chain: electricity plus tariff and carbon tax → HVDC transmission → electrolyser CAPEX and fixed charge → storage investment and energy loss → hydrogen distribution.
- Electrolyser fixed charge follows the workbook's `h2. prod cost!E17` formula, which references CAPEX instead of the OPEX percentage field. The UI omits the unused OPEX percentage.
- Heat CAPEX for process heat follows `HeatCalculation!C52:E52`, which uses the district heating full-load hours (1,752), while process heat fixed O&M uses 7,884 hours.
- Hydrogen energy content is 0.0394 MWh/kg LHV, as in the workbook. Other assumptions are intentionally preserved even where units or conventions in the source seem unusual.
- Workbook fuel prices cover 2019–2050. Heat technology catalogues use their available milestone years; the page offers the years common to its main heat options.
- The workbook also contains static source technology catalogues and flow charts. This app focuses on the main `Results Summary` pathway, its supporting calculations, and the four Danish 2030 scenario results; it does not reproduce every worksheet as an editable screen.

The extraction script reads the original workbook from `../upload/` when available; the extracted JSON is committed so the app does not need Excel at runtime.
