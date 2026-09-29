# Hydrogen cost calculator

A browser app built from `Hydrogen_calc_tool_17May22_clean.xlsx`. Its Hydrogen flowchart follows the workbook's illustrated pathway from electricity to the hydrogen tap, with choices and stage costs in the flow. A second flowchart follows the workbook's district and process heat branches, using its icons and the current fuel and technology inputs. The Heat flow tab displays all four district heating branches (electric boiler, electricity and excess heat, natural gas, hydrogen) and three process heat branches (electricity, natural gas, hydrogen) from the workbook sketch. Each branch has a technology selector; the tab ranks all available heat options by calculated cost, including hydrogen at the delivered cost from the Hydrogen flowchart. The separate Danish 2030 electricity scenarios remain on the hydrogen page. The Inputs tab shows editable source values. The default 2030 reference pathway uses AF25 and KF26 forecast inputs where comparable. It is not a live price feed.

The Inputs tab also supports adding and removing records in array-based technology and scenario tables. New rows must provide every field in the table's accepted units and validation range, and are stored locally in the browser. Original workbook rows can also be removed locally; Reset all input data restores the complete workbook baseline.

## Run

```sh
npm install
npm run dev
```

`npm test` checks the updated default outputs and input editing. `npm run build` produces a static site in `dist/`, suitable for GitHub Pages or another static host. For GitHub Pages under a repository path, set the `base` option in `vite.config.js` (already configured).

## Model notes

- Price chain: electricity plus tariff and carbon tax → selected grid-loss or HVDC transmission case → electrolyser CAPEX and fixed charge → storage investment and energy loss → hydrogen distribution.
- Electrolyser fixed charge follows the workbook's `h2. prod cost!E17` formula, which references CAPEX instead of the OPEX percentage field. The OPEX percentage is shown in the Inputs tab because the separate Danish scenario calculation uses it.
- Heat CAPEX for process heat follows `HeatCalculation!C52:E52`, which uses the district heating full-load hours (1,752), while process heat fixed O&M uses 7,884 hours.
- Hydrogen energy content is 0.0394 MWh/kg LHV, as in the workbook. Other assumptions are intentionally preserved even where units or conventions in the source seem unusual.
- Workbook fuel prices cover 2019–2050. Matching imported natural gas, coal, and industrial wood pellet prices for 2025–2050 are updated from AF25. Diesel has no matching imported price and retains its workbook values. Heat technology catalogues use their available milestone years; the page offers the years common to its main heat options.
- The workbook also contains static source technology catalogues and flow charts. This app focuses on the main `Results Summary` pathway, its supporting calculations, and the Danish 2030 scenario results; it does not reproduce every worksheet as an editable screen.

The extraction script reads the original workbook from `../upload/` when available; the extracted JSON is committed so the app does not need Excel at runtime.

## Input data and provenance

`data/workbook.json` contains the extracted and updated defaults. `data/input-sources.json` records the supplied external file, sheet, cell, parameter, unit, and conversion for every catalogue-updated field. The Inputs tab shows the external report, dataset, URL, or source note recorded in Excel; values without a source are labelled `Guess`. Edits are stored locally in the browser and can be reset by row or all at once. They are not shared across devices.

The interface displays and accepts all monetary values in DKK, including the hydrogen and heat results, source tables, and comparison charts. The workbook's EUR-based inputs and calculations stay in their original units internally; the interface converts them at the fixed workbook rate of 7.45 DKK/EUR. The Danish scenario and fuel-price data are already in DKK and are not converted. Existing browser edits in EUR are preserved and displayed in DKK.

- Renewable fuels: 100 MW alkaline and PEM electrolysers for 2030, 2040, and 2050. The 2020 rows and 1 MW solid oxide rows retain their workbook values.
- Energy storage: matching tank, LOHC, and cavern rows for 2020–2050. Missing parameters retain workbook values.
- Electricity and district heating: matching boiler, heat pump, and gas district heat rows; the source's waste heat label corresponds to the workbook's excess heat row.
- Industrial process heat: matching 15 MW electric steam and hot water boilers, 2.5 MW natural gas direct firing, and 5 MW electric direct firing. Other equipment sizes retain workbook values.
- The transport and residential heating catalogues have no directly comparable model rows, so they do not replace the workbook's HVDC or hydrogen distribution assumptions. Emissions factors, tariffs, and unmatched prices retain workbook values.

## AF25 and KF26 reference scenario

The default pathway selects the **KF26 2030 grid spot average**, the **AF25 2030 ETS1 allowance** option, the **AF25 DK1 grid-loss reference** at point 3, and the existing 2030 alkaline electrolyser and LOHC storage rows. The 2030 fuel and heat year is selected. Original electricity, carbon and HVDC options remain selectable. The workbook's grid tariff and emissions factor are carried over because the new datasets do not supply equivalent model inputs.

- `offentligt_dataset_AF25_20251107_v2.xlsx`, `Brændselspriser`: annual Danish **import** prices for natural gas (row 8), coal (row 6), and wood pellets (row 27), 2025–2050, in 2025 DKK/GJ. These match the workbook's `Fuel price projection` CIF/import columns C, D, and J. Fuel used by the heat calculation therefore follows AF25. No corresponding diesel import series was available.
- The same dataset, `CO2-kvotepris` row 4: ETS1 allowance prices for 2030, 2035, 2040, and 2050, in 2025 DKK/t. They are converted to EUR/t with the workbook's 7.45 DKK/EUR and offered as explicit choices; an ETS allowance is not automatically a tax on every fuel or user.
- `KF26 - Resultater - Tal bag figurer september 2026.xlsx`, `25.1`: 8,760 hourly spot prices in 2026 DKK/MWh for 2030 and 2035. Their arithmetic annual means are 641.61 and 444.85 DKK/MWh, converted to EUR/MWh using the workbook exchange rate. An electrolyser with flexible dispatch, contracted electricity, or a different price area can face a different effective price. These are labeled grid choices, not offgrid generation costs.
- `KF26_Del1.pdf` figure 18.1's pipeline gas price is not the same as the import fuel series the workbook uses, so it is not substituted. `AF25 - Sammenfatningsnotat (NY)_0.pdf` explains that AF25 does not itself provide the simulated future electricity prices in that release.
- `offentligt_dataset_AF25_20251107_v2.xlsx`, `Elforbrug!H6:H7`: 2030 system-wide net-versus-gross electricity loss assumptions, **6.77% in DK1** and **6.22% in DK2**. Point 3 offers these as explicitly labeled grid references. Their standalone distance cost is zero because no dedicated HVDC link is modeled with the grid option; the electricity source's tariff is still applied. These whole-grid losses are not measured losses for a specific electrolyser connection. The original workbook's HVDC loss (2%) and €22.1/MW/km/year cost remain selectable for a dedicated connection, with its user-set distance and load factor. Choosing an offgrid electricity source switches point 3 to HVDC; choosing a grid source switches to DK1, after which DK2 or HVDC can be selected manually. KF26 contains no directly comparable transmission investment or cable-loss input.

The **Danish 2030 hydrogen scenarios** table now shows two additional grid cases alongside the original four workbook cases. The new DK1/DK2 cases use KF26's 2030 annual spot mean (641.61 DKK/MWh), AF25's 6.77%/6.22% whole-grid loss reference, and the workbook's `Elomk.!F5:G5` fallback tariff (100 DKK/MWh) and 2,915 full-load hours. The new grid input is divided by `1 - networkLoss` in the separate workbook DKK/GJ calculation. The original four cases retain their outputs and have no added loss multiplier. No independent ETS1 charge is added to the KF26 price because the workbook's scenario formula has no separate carbon term and an additional charge could double count market effects. The 2030 technology inputs retain their catalogue updates. This is a transparent sensitivity calculation, not an optimised electrolyser dispatch or a forecast of its realised purchase price. All six scenario inputs are editable in the Input data tab.

The new forecasts retain their published **2025** (AF25) and **2026** (KF26) price bases; the original workbook uses **2019** prices and catalogue values may use other bases. No inflation adjustment was made without a supplied index. This mixed basis limits direct cost comparisons; the provenance of each updated field is visible in Input data. The workbook's hydrogen and heat formulas remain the same.

Published values retain their currency and price-year basis; no inflation adjustment was applied. Re-run `python scripts/extract_workbook.py`, `python scripts/update_catalogue_inputs.py`, then `python scripts/update_af25_kf26.py` with the supplied files in `../upload/` to regenerate the JSON.

The Inputs tab also has comparison charts beneath each table. Technology charts compare CAPEX, efficiency, and an operating or lifetime measure for one selected catalogue year. The charts use the current editable values and keep unlike units on separate scales.

The workbook has no 2040 district heating calculation rows for the electric boiler, natural gas, or hydrogen branches. The flowchart marks those routes unavailable in 2040 instead of inventing values.
