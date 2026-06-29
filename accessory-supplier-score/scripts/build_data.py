from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / "source-data" / "ACCESSORY REPORT.xlsx"
OUT = PROJECT_ROOT / "data" / "dashboard-data.js"


def clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [" ".join(str(col).replace("\n", " ").split()) for col in df.columns]
    return df


def main() -> None:
    df = pd.read_excel(SOURCE, sheet_name=0)
    df = clean_columns(df)
    df["Factory"] = df["Factory"].replace({"A2G": "ALA", "A2P": "ALA"})

    for col in ["Arrive W/H Date", "Inspection Date", "Sewing Inline Date"]:
        df[col] = pd.to_datetime(df[col], errors="coerce")

    for col in ["Arrive Qty", "Inspected Qty", "Order Qty", "Rejected Qty"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    df["Month"] = df["Arrive W/H Date"].dt.to_period("M").astype(str)
    df["Reason"] = df["Defect Type"].fillna(df["Remark"]).fillna("UNSPECIFIED")
    df["Issue Group"] = df["Reason"].map(
        lambda value: "Quality Defect"
        if value in {"WRONG LAY-OUT", "WRONG SIZE"}
        else "Operational Exception"
        if value in {"CANCELLED ORDER", "NO ARRIVAL"}
        else "Unspecified"
    )

    keep = [
        "SP#",
        "SEQ",
        "Factory",
        "Brand",
        "Style",
        "Season",
        "ShipMode",
        "Supplier",
        "Material Type",
        "Color",
        "Color Name",
        "Size",
        "Arrive W/H Date",
        "Inspection Date",
        "Month",
        "Arrive Qty",
        "Inspected Qty",
        "Order Qty",
        "Inspection Result",
        "Reason",
        "Issue Group",
        "Inspector",
    ]
    data = df[keep].copy()
    for col in ["Arrive W/H Date", "Inspection Date"]:
        data[col] = data[col].dt.strftime("%Y-%m-%d").fillna("")

    payload = {
        "source": str(SOURCE),
        "generatedAt": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rows": data.fillna("").to_dict(orient="records"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("window.DASHBOARD_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"Wrote {len(data):,} rows to {OUT}")


if __name__ == "__main__":
    main()
