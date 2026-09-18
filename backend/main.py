from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.routers import auth, centres, bookings, ws, farmers, reports

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Procurement Centre API",
    description="API for managing crop procurement queueing and tracking.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(centres.router)
app.include_router(bookings.router)
app.include_router(farmers.router)
app.include_router(reports.router)
app.include_router(ws.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Procurement Centre API. Visit /docs for Swagger UI."}
