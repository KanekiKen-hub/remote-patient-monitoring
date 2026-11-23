# Models Directory

This directory stores trained model artifacts. The files here are **generated** by running the training script — they are **not** committed to source control.

## Files Generated

| File | Description |
|---|---|
| `rf_model.pkl` | Trained `RandomForestClassifier` serialized with `joblib` |
| `scaler.pkl` | Fitted `StandardScaler` used to normalize input features |
| `feature_names.json` | Ordered list of feature names expected by the model |
| `metrics.json` | Test-set evaluation metrics (accuracy, per-class precision/recall/F1) |

## How to Generate

From the `ml-service/` directory, run:

```bash
# Activate virtual environment first
.\venv\Scripts\activate          # Windows
source venv/bin/activate          # macOS / Linux

# Train the model
python training/train_model.py
```

Training reads `training/demo_dataset.csv`, fits a `RandomForestClassifier`, evaluates it on a held-out 20% test split, then writes the four files above.

> **PROTOTYPE DISCLAIMER**
> The model is trained on **synthetic demo data** and is intended for prototype / demonstration purposes only.
> It has **not** been clinically validated and must **not** be used for real medical decisions.
