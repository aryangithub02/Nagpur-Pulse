# Nagpur Pulse

Nagpur Pulse is a real-time traffic monitoring and traffic-risk prediction platform for Nagpur.

---

## Backend Setup & Execution Guide

Follow these step-by-step instructions to set up, run, and test the FastAPI backend on Windows.

### 1. Navigate to the `backend` directory

Open your terminal (PowerShell or Command Prompt) and navigate into the `backend` directory:

```bash
cd backend
```

### 2. Create the Virtual Environment

Create a Python virtual environment named `venv`:

```powershell
python -m venv venv
```

### 3. Activate the Virtual Environment on Windows

#### PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```

*(Note: If PowerShell blocks script execution, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

#### Command Prompt (cmd):
```cmd
venv\Scripts\activate.bat
```

### 4. Install Dependencies

Upgrade `pip` and install all required dependencies from `requirements.txt`:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Environment Configuration

Copy the example environment file `.env.example` to `.env`:

```powershell
copy .env.example .env
```

### 6. Start the FastAPI Server

Run the server using `uvicorn` with auto-reload enabled:

```bash
uvicorn app.main:app --reload
```

The server will launch at `http://127.0.0.1:8000`.

---

## Testing & Documentation

### Test `/health` Endpoint

You can test the health-check endpoint using PowerShell, curl, or your browser:

- **Browser / GET Request**: Open `http://127.0.0.1:8000/health`
- **Expected Response**:
  ```json
  {
    "status": "ok",
    "service": "Nagpur Pulse Backend"
  }
  ```

- **PowerShell Command**:
  ```powershell
  Invoke-RestMethod -Uri http://127.0.0.1:8000/health
  ```

### Interactive Swagger Documentation

Open your browser and navigate to:

```text
http://127.0.0.1:8000/docs
```

Here you can interactively test all available API endpoints via the Swagger UI.
