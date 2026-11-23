"""
Training script for the RPM Health Monitor model.

NOTE: This model is trained on synthetic demo data for prototype purposes only.
      It is not validated for clinical use.
"""
import os
import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).resolve().parent.parent
DATA_PATH  = BASE_DIR / "training" / "demo_dataset.csv"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH   = MODELS_DIR / "rf_model.pkl"
SCALER_PATH  = MODELS_DIR / "scaler.pkl"
FEATURES_PATH = MODELS_DIR / "feature_names.json"
METRICS_PATH  = MODELS_DIR / "metrics.json"

FEATURE_NAMES = ["heartRate", "spo2", "prevHeartRate", "prevSpo2", "hrChange", "spo2Change"]
LABEL_NAMES   = {1: "Normal", 2: "Attention Needed", 3: "Doctor Attention Recommended"}

# ── Load data ────────────────────────────────────────────────────────────────
print("Loading dataset ...")
df = pd.read_csv(DATA_PATH)
print(f"  Rows: {len(df)}, Columns: {list(df.columns)}")
print(f"  Label distribution:\n{df['label'].value_counts().sort_index().to_string()}")

X = df[FEATURE_NAMES].values
y = df["label"].values

# ── Split ────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")

# ── Scale ────────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_s = scaler.fit_transform(X_train)
X_test_s  = scaler.transform(X_test)

# ── Train ────────────────────────────────────────────────────────────────────
print("\nTraining RandomForestClassifier ...")
clf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight="balanced"
)
clf.fit(X_train_s, y_train)
print("  Training complete.")

# ── Evaluate ─────────────────────────────────────────────────────────────────
y_pred = clf.predict(X_test_s)
acc    = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred, target_names=["Normal","Attention","Alert"],
                                output_dict=True)
cm     = confusion_matrix(y_test, y_pred).tolist()

print("\n" + "="*60)
print(f"  Accuracy : {acc:.4f}  ({acc*100:.2f}%)")
print("  Per-class metrics:")
for cls_name in ["Normal", "Attention", "Alert"]:
    m = report[cls_name]
    print(f"    {cls_name:<24} precision={m['precision']:.3f}  recall={m['recall']:.3f}  f1={m['f1-score']:.3f}  support={int(m['support'])}")
print("  Confusion Matrix (rows=actual, cols=predicted):")
for row in cm:
    print("    ", row)
print("="*60)

# ── Save metrics ─────────────────────────────────────────────────────────────
metrics = {
    "accuracy": round(acc, 4),
    "per_class": {
        "Normal":    {k: round(v, 4) for k, v in report["Normal"].items()},
        "Attention": {k: round(v, 4) for k, v in report["Attention"].items()},
        "Alert":     {k: round(v, 4) for k, v in report["Alert"].items()},
    },
    "confusion_matrix": cm,
    "training_samples": int(len(X_train)),
    "test_samples": int(len(X_test)),
    "disclaimer": (
        "Metrics computed on a synthetic demo dataset. "
        "This model is not validated for clinical use."
    )
}
with open(METRICS_PATH, "w") as f:
    json.dump(metrics, f, indent=2)

# ── Save model artefacts ──────────────────────────────────────────────────────
joblib.dump(clf,    MODEL_PATH)
joblib.dump(scaler, SCALER_PATH)
with open(FEATURES_PATH, "w") as f:
    json.dump(FEATURE_NAMES, f)

print("\nModel saved successfully")
print(f"  {MODEL_PATH}")
print(f"  {SCALER_PATH}")
print(f"  {FEATURES_PATH}")
print(f"  {METRICS_PATH}")
print("\nNOTE: This model is trained on synthetic demo data for prototype purposes only.")
print("      It is not validated for clinical use.")
