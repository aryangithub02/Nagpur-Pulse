import pandas as pd
from pathlib import Path

FILE_PATH = Path("data/raw/nagpur_accidents_2020_2025.xlsx")

print("=" * 80)
print("NAGPUR PULSE - EXCEL WORKBOOK INSPECTION")
print("=" * 80)

if not FILE_PATH.exists():
    print("\nERROR: Dataset not found:")
    print(FILE_PATH)
    raise SystemExit(1)

# ---------------------------------------------------------
# 1. Inspect workbook sheets
# ---------------------------------------------------------

excel = pd.ExcelFile(FILE_PATH)

print("\n[1] WORKBOOK SHEETS")
print("-" * 80)

for i, sheet in enumerate(excel.sheet_names, start=1):
    print(f"{i}. {sheet}")

# ---------------------------------------------------------
# 2. Inspect every sheet without assuming headers
# ---------------------------------------------------------

print("\n[2] SHEET PREVIEW")
print("-" * 80)

for sheet in excel.sheet_names:

    print("\n" + "=" * 80)
    print(f"SHEET: {sheet}")
    print("=" * 80)

    raw = pd.read_excel(
        FILE_PATH,
        sheet_name=sheet,
        header=None
    )

    print(f"Rows: {raw.shape[0]}")
    print(f"Columns: {raw.shape[1]}")

    print("\nFirst 20 rows:")
    print(raw.head(20).to_string(index=True, header=False))

# ---------------------------------------------------------
# 3. Try to identify the actual table
# ---------------------------------------------------------

print("\n" + "=" * 80)
print("WORKBOOK INSPECTION COMPLETE")
print("=" * 80)