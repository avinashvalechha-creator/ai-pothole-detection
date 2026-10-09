from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.hazards import router as hazards_router
from backend.app.api.observations import router as obs_router
from backend.app.api.simulator import router as sim_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.system import router as system_router

# Ensure tables are created on module load
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print(f"[{settings.PROJECT_NAME}] Database tables verified and initialized.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Automotive ADAS & Road Hazard Intelligence Backend with Computer Vision and Multi-Vehicle Verification",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware for modern React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(hazards_router, prefix=settings.API_V1_PREFIX)
app.include_router(obs_router, prefix=settings.API_V1_PREFIX)
app.include_router(sim_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(system_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def read_root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "api_docs": "/docs",
        "api_v1_prefix": settings.API_V1_PREFIX,
        "note": "Connect via frontend dashboard at http://localhost:5173"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
