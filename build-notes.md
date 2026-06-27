# Build Notes

## Scope

- Dashboard: Supply VS sewing schedule
- Sources:
  - PPIC R01
  - R15 WIP
  - Cutting R11

## Assumptions

- `Sewing Inline` is the primary time axis.
- `Buyer Delivery` is the default delivery-date field, but the dashboard can switch to `SCI Delivery` or `CRD`.
- Dashboard `Standard Qty` is the daily sewing schedule target capped by row quantity: `min(Standard Output, Allo Qty)` when both are present.
- Stage completion is shown as a daily slice against that scheduled daily target, and the final day can be partial when the remaining order or output is smaller.
- `Order Qty` is kept as the PPIC total order quantity. `Allo Qty` controls the PPIC schedule-row quantity for progress allocation.
- WIP rows without a PPIC R01 match are added for ALA/GMM/VT1 factory coverage; A2G rows are normalized into GMM. Their WIP `Standard Output` is retained for process-progress fallbacks, but dashboard daily standard qty is based on the sewing schedule spread.
- When one exact `SPNO` appears in multiple PPIC schedule rows, matched WIP quantities are allocated by schedule due order, consuming the earlier due schedule before moving to the next row.
- Date charts front-load completed quantity only inside the same Factory + Style + exact SPNO group. If a later visible date for the same SPNO has completed qty while an earlier visible date for that same SPNO still has lacking qty, the later completion is moved forward until the earlier visible target is filled. Different SPNO values never consume or borrow each other's completion.
- When the combined WIP progress for a repeated `SP` reaches or exceeds its `Order Qty`, every allocated PPIC schedule row for that SP is complete for that stage.
- `Cutting` uses WIP `Cut_Qty` as the complete quantity.
- `Loading` uses WIP `RFID Loading Qty`, but if `RFID Loading Qty` is lower than `RFID SewingLine In Qty`, the dashboard uses `RFID SewingLine In Qty` instead. This prevents undercounting when loading has already happened but the loading field was not updated correctly.
- `Sub-process` tokens are split from WIP `Orig. Artwork` using `+` and matched to HT, AT, PAD-PRT, EMB, AUT, FM, BO, and PRT.
- Subprocess quantities use the higher of process/RFID progress and loading qty for each required code, because subprocess completion should not be lower than loading. Print and Pad Print also use WIP progress fields such as `PRINTING` and `PAD PRINTING` as fallbacks when RFID farm out is blank.
- `Stage` completion only uses complete and lacking states. Any unfinished quantity is red; there is no separate other state in the UI.
- Default date window is today through next week.

## Source Freshness

- Latest source date in current file set: 2026-08-01
- PPIC file modified: 2026-06-27T07:52:23
- WIP files merged: 2
- Latest WIP file modified: 2026-06-27T07:51:10
- Cutting file modified: 2026-06-20T08:21:01

## Source Mapping

- PPIC R01: schedule fields, standard output, sewing inline/offline, delivery dates, line status.
- R15 WIP: cutting, subprocess, loading, artwork tokens, process quantities. All `Planning_R15_WIP*.xlsx` files and `R15 WIP ALA.xlsx` in raw data are merged before joining to PPIC.
- Cutting R11: average consumption per SP and style to estimate yard usage.
