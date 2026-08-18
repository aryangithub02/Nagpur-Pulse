# 🚀 Nagpur Pulse — Deployment Guide: Frontend on Vercel & Backend on Render

This guide provides an exact, step-by-step walkthrough to deploy **Nagpur Pulse** using the standard production stack:
- **Frontend**: React 19 + Vite + Tailwind CSS deployed on **[Vercel](https://vercel.com)**
- **Backend & Database**: Python FastAPI REST API + PostgreSQL deployed on **[Render](https://render.com)**

---

## 🏗️ Architecture Blueprint

```text
+-------------------------------------------------------------------------+
|                              CLIENT BROWSER                             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         VERCEL (FRONTEND SPA)                           |
|                    https://nagpur-pulse.vercel.app                      |
|                                                                         |
|  - React 19 Single Page App (Vite)                                      |
|  - Leaflet 44 Nagpur Junction GIS Map Engine                            |
|  - Instant routing fallback via vercel.json                             |
+------------------------------------+------------------------------------+
                                     |
                   HTTPS REST Calls (/api) & CORS
                                     |
                                     v
+------------------------------------+------------------------------------+
|                         RENDER (BACKEND API)                            |
|                https://nagpur-pulse-backend.onrender.com                |
|                                                                         |
|  - FastAPI (Python 3.11 + Uvicorn)                                      |
|  - Argon2id Authentication & RBAC/ZBAC                                  |
|  - Real-time Dispatch & OR-Tools Optimization Engine                    |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                      RENDER POSTGRESQL DATABASE                         |
|  - 44 Nagpur Chowk Telemetry, Police Units, and Incidents Records       |
+-------------------------------------------------------------------------+
```

---

## 📑 Deployment Steps Overview

1. [Step 1: Deploy Database & Backend on Render](#step-1-deploy-database--backend-on-render)
2. [Step 2: Seed the PostgreSQL Database](#step-2-seed-the-postgresql-database)
3. [Step 3: Deploy Frontend on Vercel](#step-3-deploy-frontend-on-vercel)
4. [Step 4: Connect Vercel & Render via Environment Variables](#step-4-connect-vercel--render-via-environment-variables)
5. [Step 5: Full Stack Verification Checklist](#step-5-full-stack-verification-checklist)
6. [Troubleshooting & Common Fixes](#troubleshooting--common-fixes)

---

## Step 1: Deploy Database & Backend on Render

### Method A: 1-Click Blueprint Deploy (Fastest)

The repository includes a [render.yaml](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/render.yaml) blueprint file.

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **"New +"** in the top navigation and choose **"Blueprint"**.
3. Connect your `Nagpur-Pulse` GitHub repository.
4. Render will automatically detect `render.yaml` and create:
   - `nagpur-pulse-db` (PostgreSQL Database)
   - `nagpur-pulse-backend` (FastAPI Web Service)
5. Click **"Apply"** to launch both services.

---

### Method B: Manual Setup via Render Web UI

#### 1. Create PostgreSQL Database on Render
1. In Render Dashboard, click **"New +"** ➜ **"PostgreSQL"**.
2. Configure:
   - **Name**: `nagpur-pulse-db`
   - **Database**: `nagpur_pulse`
   - **User**: `nagpur_user`
   - **Region**: Choose closest to you (e.g. *Singapore* or *Frankfurt*)
   - **Instance Type**: *Free*
3. Click **"Create Database"**.
4. Once created, copy the **Internal Database URL** (e.g. `postgresql://nagpur_user:pass@dpg-...-a:5432/nagpur_pulse`).

#### 2. Create FastAPI Backend Web Service
1. In Render Dashboard, click **"New +"** ➜ **"Web Service"**.
2. Connect your `Nagpur-Pulse` repository.
3. Configure the service settings:
   - **Name**: `nagpur-pulse-backend`
   - **Region**: Same region as your database
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: *Free*
4. Scroll down to **Environment Variables** and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.11.9` | Ensures compatible Python runtime |
| `ENVIRONMENT` | `production` | Production mode |
| `DATABASE_URL` | *(Paste Internal Database URL from above)* | PostgreSQL connection URI |
| `FRONTEND_URL` | `https://nagpur-pulse.vercel.app` | Your Vercel frontend URL |
| `CORS_ORIGINS` | `https://nagpur-pulse.vercel.app,http://localhost:3000` | Allowed origins |
| `SECRET_KEY` | *(Click "Generate" or type 32 random characters)* | JWT Auth key |
| `TOMTOM_API_KEY` | *(Optional: Your TomTom API Key)* | Real-time traffic & routing |
| `OPENWEATHER_API_KEY` | *(Optional: Your OpenWeather API Key)* | Weather impact score |

5. Click **"Create Web Service"**.
6. Wait for the build to finish. Copy your live backend URL (e.g. `https://nagpur-pulse-backend.onrender.com`).

---

## Step 2: Seed the PostgreSQL Database

To populate the **44 Nagpur Junctions** (LIC Chowk, Samvidhan Square, Law College Square, etc.) and police dispatch units into the database:

### Option A: Using Render Web Shell (Easiest)
1. In Render Dashboard, open your `nagpur-pulse-backend` web service.
2. Click the **"Shell"** tab on the left sidebar.
3. Run the database seed script:
   ```bash
   python seed.py
   ```
4. You will see confirmation logs initializing all 44 junctions and operational zones.

### Option B: From Your Local Machine
```bash
# In your local terminal:
cd backend
export DATABASE_URL="<Paste Render External Database URL here>"
python seed.py
```

---

## Step 3: Deploy Frontend on Vercel

### Method A: Via Vercel Web Dashboard (Recommended)

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** ➜ **"Project"**.
3. Select your `Nagpur-Pulse` GitHub repository and click **"Import"**.
4. Configure the project:
   - **Framework Preset**: `Vite` (Auto-detected)
   - **Root Directory**: `./` (Default root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Expand the **Environment Variables** section and add:

| Name | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://nagpur-pulse-backend.onrender.com` *(Your Render URL)* |
| `VITE_WEBSOCKET_URL` | `wss://nagpur-pulse-backend.onrender.com/ws` |
| `VITE_DEMO_MODE` | `false` |
| `VITE_TOMTOM_API_KEY` | *(Optional: TomTom Key)* |

6. Click **"Deploy"**.
7. In ~45 seconds, your application will be live at `https://nagpur-pulse.vercel.app`!

---

### Method B: Via Vercel CLI

```bash
# 1. Install CLI & authenticate
npm install -g vercel
vercel login

# 2. Link project
vercel link

# 3. Add environment variables
vercel env add VITE_API_BASE_URL production
# Type: https://nagpur-pulse-backend.onrender.com

vercel env add VITE_DEMO_MODE production
# Type: false

# 4. Deploy to production
vercel --prod
```

---

## Step 4: Connect Vercel & Render via Environment Variables

Make sure both ends reference each other:

1. **On Vercel**:
   - `VITE_API_BASE_URL` = `https://nagpur-pulse-backend.onrender.com` (Your Render Backend URL)
2. **On Render**:
   - `CORS_ORIGINS` = `https://nagpur-pulse.vercel.app` (Your Vercel Frontend URL)
   - `FRONTEND_URL` = `https://nagpur-pulse.vercel.app`

> [!NOTE]
> The backend in `backend/app/main.py` is pre-configured with dynamic CORS support and automatically permits all `https://*.vercel.app` domains.

---

## Step 5: Full Stack Verification Checklist

After deploying both services, run these checks to verify end-to-end functionality:

| # | Component | Verification URL / Action | Expected Result |
| :-: | :--- | :--- | :--- |
| 1 | **Frontend Load** | Open `https://nagpur-pulse.vercel.app` | UI renders with dark theme & navigation tabs |
| 2 | **SPA Page Refresh** | Navigate to `/police-command` and press `F5` | Page refreshes cleanly without 404 (handled by `vercel.json`) |
| 3 | **Backend Health** | Open `https://nagpur-pulse-backend.onrender.com/health` | Returns `{"status":"ok","service":"Nagpur Pulse Backend"}` |
| 4 | **Interactive Docs** | Open `https://nagpur-pulse-backend.onrender.com/docs` | Swagger UI loads with all endpoints |
| 5 | **Database Telemetry** | Open `https://nagpur-pulse-backend.onrender.com/api/locations` | Returns JSON array of 44 Nagpur Junctions |
| 6 | **Dispatch Routing** | In Frontend, click *"Simulate 112 Incident"* | Unit is assigned and route polyline displays on Leaflet map |

---

## 🔧 Troubleshooting & Common Fixes

### 1. Render Backend "Spin Down" on Free Tier
- **Issue**: On Render's Free tier, the web service spins down after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds to warm up.
- **Fix**: The frontend has built-in retry logic and fallback telemetry. You can also use a free uptime monitor (e.g. [UptimeRobot](https://uptimerobot.com)) to ping `https://your-backend.onrender.com/health` every 10 minutes to keep it active.

### 2. 404 Not Found When Refreshing Inner Pages on Vercel
- **Fix**: Verify [vercel.json](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/vercel.json) exists in the project root with the SPA rewrite rule:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

### 3. Mixed Content Warning in Browser Console
- **Issue**: Browser blocks HTTP API calls from HTTPS Vercel frontend.
- **Fix**: Always specify `https://` (not `http://`) in `VITE_API_BASE_URL` on Vercel.

### 4. CORS Error: `Access-Control-Allow-Origin missing`
- **Fix**: In Render web service environment variables, ensure `CORS_ORIGINS` includes your exact Vercel frontend domain without trailing slashes (e.g., `https://nagpur-pulse.vercel.app`).
