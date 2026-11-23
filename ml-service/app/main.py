"""
FastAPI application for the RPM ML Service.
PROTOTYPE ONLY — not validated for clinical use.
"""
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .model import health_model, FEATURE_NAMES
from .schemas import (
    ExplainRequest,
    ExplainResponse,
    HealthResponse,
    PredictRequest,
    PredictResponse,
    SHAPFeature,
)

load_dotenv()

DISCLAIMER = (
    "This explanation reflects the ML model's pattern analysis on the provided readings. "
    "It is not a medical diagnosis."
)


# ── Startup / shutdown ────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    model_path  = os.getenv("MODEL_PATH",  "models/rf_model.pkl")
    scaler_path = os.getenv("SCALER_PATH", "models/scaler.pkl")
    health_model.load(model_path, scaler_path)
    yield


# ── Application ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="RPM ML Service",
    description=(
        "Machine Learning service for Remote Patient Monitoring — "
        "**PROTOTYPE ONLY. Not validated for clinical use.**"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def _require_model() -> None:
    if not health_model.loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Run training/train_model.py first.",
        )


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """Service liveness and model-load status."""
    return HealthResponse(
        status="ok",
        modelLoaded=health_model.loaded,
        modelType="RandomForestClassifier (scikit-learn)" if health_model.loaded else "not loaded",
        features=FEATURE_NAMES,
    )


@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
async def predict(request: PredictRequest):
    """
    Predict the health alert level for the provided vitals.

    Returns:
    - **level** 1 = Normal, 2 = Attention Needed, 3 = Doctor Attention Recommended
    - **confidence** probability of the predicted class (0–1)
    """
    _require_model()
    result = health_model.predict(
        heartRate=request.heartRate,
        spo2=request.spo2,
        prevHeartRate=request.prevHeartRate,
        prevSpo2=request.prevSpo2,
    )
    return PredictResponse(
        level=result["level"],
        label=result["label"],
        confidence=result["confidence"],
        explanationAvailable=True,
        features=result["features_dict"],
    )


@app.post("/explain", response_model=ExplainResponse, tags=["Inference"])
async def explain(request: ExplainRequest):
    """
    Return a SHAP-based explanation for the prediction on the provided vitals.
    Uses a real TreeExplainer — values are not mocked.
    """
    _require_model()
    result = health_model.explain(
        heartRate=request.heartRate,
        spo2=request.spo2,
        prevHeartRate=request.prevHeartRate,
        prevSpo2=request.prevSpo2,
    )
    shap_features = [SHAPFeature(**sf) for sf in result["shapValues"]]
    return ExplainResponse(
        level=result["level"],
        label=result["label"],
        shapValues=shap_features,
        baseValue=result["baseValue"],
        predictionValue=result["predictionValue"],
        featureImportance=result["featureImportance"],
        disclaimer=DISCLAIMER,
    )


@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """
    Return model evaluation metrics computed during training.
    Requires training/train_model.py to have been run.
    """
    metrics_path = Path(os.getenv("MODEL_PATH", "models/rf_model.pkl")).parent / "metrics.json"
    if not metrics_path.exists():
        return {
            "available": False,
            "message": "Run training/train_model.py to generate metrics.",
        }
    with open(metrics_path) as f:
        data = json.load(f)
    return {"available": True, **data}
