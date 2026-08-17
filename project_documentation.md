# Nagpur Pulse — Project & Product Documentation

**Project Title**: Nagpur Pulse AI Traffic Risk Prediction, Incident Monitoring & Police Deployment Platform  
**Target Region**: Nagpur City & Metropolitan Area, Maharashtra, India  
**Target Users**: Nagpur Traffic Police Command HQ, Traffic Control Room Dispatchers, Field Patrol Units, Urban Mobility Analysts  

---

## 1. Project Mission & Core Modules

Nagpur Pulse is an AI-powered urban traffic monitoring and emergency response dispatch platform designed specifically for Nagpur City. The platform unifies three core modules into a single interface:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NAGPUR PULSE PLATFORM                            │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│ 1. NAGPUR TRAFFIC MONITOR    │ 2. ACCIDENT & INCIDENT       │ 3. POLICE     │
│    - Inter-junction routes   │    MONITOR                   │    DISPATCH   │
│    - Arterial corridor flow  │    - Real-time incident logs │    - PCR fleet│
│    - Telemetry inspector     │    - Risk heatmap canvas     │    - Deploy   │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

---

## 2. Platform Feature Overview

### 2.1 Nagpur Traffic Monitor (Module 1)
- **40 Monitored Intersections (Chowks)**: Full spatial mapping across Sitabuldi Interchange, Variety Square, Lokmat Chowk, LIC Chowk, Indora Square, Medical Chowk, Chhatrapati Square, Zero Mile, Shankar Nagar, and all key arterials.
- **Arterial Corridor Flow Analysis**: Visualizes inter-junction road corridor segments with dynamic color coding based on speed and delay:
  - 🟢 **Green (Fluid)**: Speed > 30 km/h, Delay < 2m
  - 🟡 **Yellow (Moderate)**: Speed 20–30 km/h, Delay 2–5m
  - 🟠 **Orange (Heavy)**: Speed 10–20 km/h, Delay 5–10m
  - 🔴 **Red (Gridlock)**: Speed < 10 km/h, Delay > 10m
- **Junction Telemetry Inspector Card**: On clicking any junction pin on the interactive map, an inspector card opens displaying live speed (km/h), congestion status, delay minutes, quick routing action buttons, and a **Predict** button.

### 2.2 Nagpur Traffic Incidents & Accident Monitor (Module 2)
- **Historical Accident Integration**: Ingested 1,823 accident records from 2020 to 2025 across Nagpur Chowks (`nagpur_accidents_2020_2025.xlsx`).
- **Interactive Risk Heatmap Canvas**: Renders high-risk circles on the Leaflet map:
  - 🟢 **LOW**: Normal baseline traffic flow
  - 🟡 **MEDIUM**: Elevated volume / minor bottleneck
  - 🟠 **HIGH**: High collision hazard / heavy queueing
  - 🔴 **CRITICAL**: Immediate accident risk / severe congestion
- **Incident Telemetry Roster**: Live feed of reported traffic accidents, vehicle breakdowns, waterlogging incidents, and illegal parking congestion.

### 2.3 Nagpur Police Unit Command & Dispatch (Module 3)
- **PCR Patrol Van Fleet Roster**: Live tracking of police patrol units (e.g. `PCR-101`, `PCR-102`, `Traffic Patrol 4`) with officer names, vehicle IDs, current coordinates, and statuses (`AVAILABLE`, `DISPATCHED`, `PATROLLING`).
- **Predictive Deployment Advisories**: AI engine automatically recommends nearest available PCR units to deploy to high-risk or critical chowks based on driving distance and estimated arrival time.
- **One-Click Dispatch & Confirmation**: Command HQ operators can accept or reject deployment advisories with a single click, instantly dispatching officers to scene.

---

## 3. Data Processing & Prediction Model Architecture

### 3.1 Machine Learning Engine Workflow
```
[Live Telemetry Inputs]
 ├── Speed (km/h)
 ├── Density (%)
 ├── Congestion Level
 └── Active Incidents (7-day / 30-day)
           │
           ▼
[Feature Synthesizer Pipeline]
 └── Computes 30-feature vector (Rolling means, Lags, Cyclical Month/DOW, Target Encodings)
           │
           ▼
[Retrained Random Forest Classifier (rf_v2_retrained)]
 ├── Evaluates class probabilities: P(LOW), P(MEDIUM), P(HIGH), P(CRITICAL)
 └── Computes continuous risk score: Score = Σ (P(class) * Weight)
           │
           ▼
[SHAP TreeExplainer]
 └── Computes exact feature attributions & human-readable explanation sentences
           │
           ▼
[Database Persistence]
 └── Inserts complete record into Neon PostgreSQL / SQLite predictions table (#371+)
```

### 3.2 Predictive Risk Score Calculation
- **Class Weights**:
  - `LOW`: 15.0
  - `MEDIUM`: 40.0
  - `HIGH`: 70.0
  - `CRITICAL`: 95.0
- **Risk Score Formula**:
  $$\text{Risk Score} = P(\text{LOW}) \times 15.0 + P(\text{MEDIUM}) \times 40.0 + P(\text{HIGH}) \times 70.0 + P(\text{CRITICAL}) \times 95.0$$

---

## 4. Hardware & Software Technical Stack

| Layer | Component | Technology Selection |
| :--- | :--- | :--- |
| **Frontend Framework** | UI Application | React 18 + TypeScript |
| **Build Tool** | Development Server & Bundler | Vite 6 |
| **Styling** | Design System | Vanilla CSS + TailwindCSS |
| **Mapping Engine** | GIS Map Canvas | Leaflet 1.9 + React-Leaflet |
| **Icons & Visuals** | Iconography | Lucide React |
| **Backend Framework** | API Gateway & Logic | FastAPI (Python 3.12+) |
| **ORM** | Database Object-Relational Mapper | SQLAlchemy 2.0 (`psycopg3`) |
| **Database** | Persistence Storage | Neon Cloud PostgreSQL / SQLite |
| **ML Engine** | Risk Classification | Scikit-Learn (Random Forest) |
| **XAI (Explainable AI)**| Feature Attributions | SHAP (`shap.TreeExplainer`) |
| **Serialization** | Model Artifacts | Joblib |
