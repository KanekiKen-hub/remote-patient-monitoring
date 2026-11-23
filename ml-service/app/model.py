"""
Model loader and inference logic for the RPM ML Service.
Uses a trained RandomForestClassifier with SHAP TreeExplainer for explanations.
"""
import joblib
import numpy as np
import shap
import json
import os
from pathlib import Path

FEATURE_NAMES = ["heartRate", "spo2", "prevHeartRate", "prevSpo2", "hrChange", "spo2Change"]
LEVEL_LABELS  = {1: "Normal", 2: "Attention Needed", 3: "Doctor Attention Recommended"}


class HealthMonitorModel:
    """Singleton wrapper around the trained RandomForest + StandardScaler."""

    def __init__(self):
        self.model    = None
        self.scaler   = None
        self.explainer = None
        self.loaded   = False

    # ── Loading ───────────────────────────────────────────────────────────────
    def load(self, model_path: str, scaler_path: str) -> None:
        """Load the serialised model and scaler, then build the SHAP explainer."""
        model_p  = Path(model_path)
        scaler_p = Path(scaler_path)

        if not model_p.exists():
            print(f"[WARNING] Model file not found: {model_p} — run training/train_model.py first.")
            return
        if not scaler_p.exists():
            print(f"[WARNING] Scaler file not found: {scaler_p} — run training/train_model.py first.")
            return

        self.model  = joblib.load(model_p)
        self.scaler = joblib.load(scaler_p)

        # TreeExplainer is fast and exact for RandomForest
        self.explainer = shap.TreeExplainer(self.model)
        self.loaded = True
        print(f"[INFO] Model loaded from {model_p}")
        print(f"[INFO] Scaler loaded from {scaler_p}")

    # ── Feature engineering ───────────────────────────────────────────────────
    def prepare_features(
        self,
        heartRate: float,
        spo2: float,
        prevHeartRate: float = None,
        prevSpo2: float = None,
    ) -> np.ndarray:
        """
        Build the 6-feature vector.
        If previous readings are absent, treat them as equal to current
        (i.e. zero change).
        """
        prev_hr   = prevHeartRate if prevHeartRate is not None else heartRate
        prev_spo2 = prevSpo2      if prevSpo2      is not None else spo2
        hr_change   = heartRate - prev_hr
        spo2_change = spo2      - prev_spo2
        return np.array([[heartRate, spo2, prev_hr, prev_spo2, hr_change, spo2_change]])

    # ── Prediction ────────────────────────────────────────────────────────────
    def predict(
        self,
        heartRate: float,
        spo2: float,
        prevHeartRate: float = None,
        prevSpo2: float = None,
    ) -> dict:
        """
        Returns a dict with keys:
            level, label, confidence, features_dict
        """
        X_raw = self.prepare_features(heartRate, spo2, prevHeartRate, prevSpo2)
        X_scaled = self.scaler.transform(X_raw)

        pred_class = int(self.model.predict(X_scaled)[0])
        proba      = self.model.predict_proba(X_scaled)[0]

        # Map class index to probability (classes_ may be [1, 2, 3])
        class_idx  = list(self.model.classes_).index(pred_class)
        confidence = float(round(proba[class_idx], 4))

        features_dict = {
            name: round(float(val), 2)
            for name, val in zip(FEATURE_NAMES, X_raw[0])
        }

        return {
            "level":         pred_class,
            "label":         LEVEL_LABELS.get(pred_class, "Unknown"),
            "confidence":    confidence,
            "features_dict": features_dict,
        }

    # ── Explanation ───────────────────────────────────────────────────────────
    def explain(
        self,
        heartRate: float,
        spo2: float,
        prevHeartRate: float = None,
        prevSpo2: float = None,
    ) -> dict:
        """
        Returns SHAP-based explanation for the predicted class.
        Uses actual SHAP TreeExplainer — no mock data.
        """
        X_raw    = self.prepare_features(heartRate, spo2, prevHeartRate, prevSpo2)
        X_scaled = self.scaler.transform(X_raw)

        # Predicted class
        pred_class = int(self.model.predict(X_scaled)[0])
        class_idx  = list(self.model.classes_).index(pred_class)

        # SHAP values: shape can be (n_samples, n_features, n_classes) in newer SHAP or list in older
        shap_values_all = self.explainer.shap_values(X_scaled)
        if isinstance(shap_values_all, list):
            shap_for_class = shap_values_all[class_idx][0]
        elif isinstance(shap_values_all, np.ndarray):
            if shap_values_all.ndim == 3:
                # Shape (n_samples, n_features, n_classes)
                shap_for_class = shap_values_all[0, :, class_idx]
            elif shap_values_all.ndim == 2:
                # Shape (n_samples, n_features)
                shap_for_class = shap_values_all[0]
            else:
                shap_for_class = np.array(shap_values_all).flatten()[:len(FEATURE_NAMES)]
        else:
            shap_for_class = np.zeros(len(FEATURE_NAMES))

        # Expected base value for class
        exp_val = self.explainer.expected_value
        if hasattr(exp_val, '__len__'):
            base_value = float(exp_val[class_idx])
        else:
            base_value = float(exp_val)

        # Prediction value = base + sum(SHAP)
        prediction_value = float(base_value + np.sum(shap_for_class))

        # Build per-feature records
        shap_features = []
        for i, fname in enumerate(FEATURE_NAMES):
            sv = float(shap_for_class[i])
            shap_features.append({
                "feature":      fname,
                "value":        round(float(X_raw[0][i]), 2),
                "shapValue":    round(sv, 6),
                "contribution": "positive" if sv >= 0 else "negative",
            })

        # Normalise absolute SHAP values to [0, 1] for UI bar widths
        abs_shap  = np.abs(shap_for_class)
        max_abs   = abs_shap.max() if abs_shap.max() > 0 else 1.0
        importance = {
            fname: round(float(abs_shap[i] / max_abs), 4)
            for i, fname in enumerate(FEATURE_NAMES)
        }

        return {
            "level":            pred_class,
            "label":            LEVEL_LABELS.get(pred_class, "Unknown"),
            "shapValues":       shap_features,
            "baseValue":        round(base_value, 6),
            "predictionValue":  round(prediction_value, 6),
            "featureImportance": importance,
        }


# ── Module-level singleton ────────────────────────────────────────────────────
health_model = HealthMonitorModel()
