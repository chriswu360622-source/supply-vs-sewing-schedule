# Accessory Supplier Score Dashboard

Published static dashboard for Nike accessory incoming quality review.

## Open Dashboard

Use GitHub Pages:

```text
https://chriswu360622-source.github.io/supply-vs-sewing-schedule/accessory-supplier-score/
```

## Excel Data Source

The source workbook is stored here:

```text
source-data/ACCESSORY REPORT.xlsx
```

To update the dashboard later, replace that file with a new workbook using the same filename, then run:

```powershell
& "C:\Users\kobe1\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\build_data.py
```

Commit and push the updated `data/dashboard-data.js` and `source-data/ACCESSORY REPORT.xlsx`.
