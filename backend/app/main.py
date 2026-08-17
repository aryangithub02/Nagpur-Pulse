import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.health import router as health_router

load_dotenv()

app = FastAPI(
    title="Nagpur Pulse Backend",
    description="FastAPI service for Nagpur Pulse traffic risk monitoring and analysis",
    version="0.1.0"
)

# Configure CORS Middleware for frontend communication
raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
