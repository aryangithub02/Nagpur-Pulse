import sys
import pandas as pd
from pathlib import Path

sys.path.insert(0, r'c:\Users\lenovo\OneDrive\Desktop\Nagpur Pulse\Nagpur-Pulse\backend')
from app.database import SessionLocal
from app.models.junction import Junction

excel_path = r'c:\Users\lenovo\OneDrive\Desktop\Nagpur Pulse\Nagpur-Pulse\datasets\nagpur_accidents_2020_2025.xlsx'
xl = pd.ExcelFile(excel_path)
df_j = xl.parse('Summary_ByJunction')

db = SessionLocal()
db_j = db.query(Junction).all()

print(f"Total DB Junctions: {len(db_j)}")
print(f"Total Dataset Junctions: {len(df_j)}")

# Build lookup table with fuzzy/normalized matching
ds_map = {}
for _, row in df_j.iterrows():
    jname = str(row['Junction']).strip().lower()
    ds_map[jname] = {
        "TotalAccidents": int(row['TotalAccidents']),
        "Injuries": int(row['Injuries']),
        "Fatalities": int(row['Fatalities'])
    }

print("\n--- MATCHING RESULTS ---")
matched_count = 0
for j in db_j:
    name_clean = j.name.strip().lower()
    match = ds_map.get(name_clean)
    if not match:
        # Partial matching
        for k, v in ds_map.items():
            if k in name_clean or name_clean in k:
                match = v
                break
    
    if match:
        matched_count += 1
        print(f"DB ID {j.id:02d} | '{j.name}' -> Accidents: {match['TotalAccidents']}, Injuries: {match['Injuries']}, Fatalities: {match['Fatalities']}")
    else:
        print(f"DB ID {j.id:02d} | '{j.name}' -> NO MATCH FOUND")

print(f"\nTotal matched: {matched_count}/{len(db_j)}")
