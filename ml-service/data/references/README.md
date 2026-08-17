# Reference Data Directory

This directory contains standardized junction reference files:

- `nagpur_first_20_junctions.json`: Reference metadata for junctions 1 to 20.
- `nagpur_second_20_junctions.json`: Reference metadata for junctions 21 to 40.

### Structure
Each junction item contains:
- `location_id`: Canonical normalized identifier (e.g. `sitabuldi-chowk`).
- `name`: Official display name.
- `latitude`: WGS84 latitude coordinate.
- `longitude`: WGS84 longitude coordinate.
- `approximate`: Boolean flag indicating if coordinates are approximate.
- `is_manned`: Operational status boolean flag (default `false` if unmapped).
- `aliases`: List of alternate matching strings.
