"""
Pydantic request/response schemas for the RPM ML Service.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class PredictRequest(BaseModel):
    heartRate: float = Field(..., ge=20, le=300, description="Current heart rate (bpm)")
    spo2: float = Field(..., ge=50, le=100, description="Current blood oxygen saturation (%)")
    prevHeartRate: Optional[float] = Field(None, ge=20, le=300, description="Previous heart rate reading")
    prevSpo2: Optional[float] = Field(None, ge=50, le=100, description="Previous SpO2 reading")


class SHAPFeature(BaseModel):
    feature: str
    value: float
    shapValue: float
    contribution: str  # 'positive' or 'negative'


class PredictResponse(BaseModel):
    level: int
    label: str
    confidence: float
    explanationAvailable: bool
    features: Dict  # processed feature values used for prediction


class ExplainRequest(BaseModel):
    heartRate: float
    spo2: float
    prevHeartRate: Optional[float] = None
    prevSpo2: Optional[float] = None


class ExplainResponse(BaseModel):
    level: int
    label: str
    shapValues: List[SHAPFeature]
    baseValue: float
    predictionValue: float
    featureImportance: Dict  # normalized 0-1 for UI bar widths
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    modelType: str
    features: List[str]
