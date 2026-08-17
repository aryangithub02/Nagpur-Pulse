# Raw Data Directory

This directory contains raw synthetic and external datasets for Nagpur Pulse ML Service:

- `nagpur_accidents_2020_2025.xlsx`: Raw accident log dataset (1,823 records, 2020–2025).

All records ingested from synthetic/simulated datasets must maintain an explicit data provenance tag:
- `data_source: "SIMULATED"`
- `is_simulated: true`
