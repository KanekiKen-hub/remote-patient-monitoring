# HealthMonitor RPM

## Privacy-Preserving AI-Based Remote Patient Monitoring with Explainable AI

A full-stack research prototype demonstrating remote patient health monitoring using IoT sensors, machine learning classification, SHAP-based explainability, and role-based privacy controls.

> **⚠️ Medical Disclaimer**: This is a research/academic prototype and is **NOT** a medical device. Alert levels are configurable prototype categories and are not validated clinical thresholds. This system must not be used for medical diagnosis, treatment decisions, or as a substitute for professional medical advice. Always consult a qualified healthcare provider.

---

## Problem & Motivation

Patients with chronic conditions benefit from continuous health monitoring, but frequent hospital visits are burdensome and impractical. Remote monitoring systems can bridge this gap — but they must be:

- **Privacy-aware** — patient data must be protected and minimized
- **Explainable** — patients and doctors must understand why alerts occur
- **Trustworthy** — no medication prescriptions, no false clinical claims
- **Secure** — authenticated devices, role-based access, backend-enforced authorization

This project addresses all of these requirements in a working prototype.

---

## Architecture

```
[ESP32 + MAX30102]  OR  [Mock Sensor (Web UI)]
        |
        | HTTP POST /api/iot/readings (Device Token Auth)
        v
[Node.js / Express Backend :5000]
        |
        +──── [MongoDB Atlas / Local]
        |
        +──── [Python FastAPI ML Service :8000]
                    |
                    +── scikit-learn RandomForestClassifier
                    +── SHAP TreeExplainer (actual values)
        |
        v
[React + Vite Frontend :5173]
```

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 JWT Authentication | Secure login with role-based access |
| 👥 Three Roles | Admin, Doctor, Patient |
| 📱 IoT Device Binding | Device ID + token authentication |
| 🤖 ML Classification | Real scikit-learn model (3 alert levels) |
| 🔍 SHAP Explanations | Actual SHAP values, not fake percentages |
| 👨‍⚕️ Doctor Recommendations | Pre-configured, level-specific guidance |
| 🔒 Privacy Controls | Data minimization, pseudonymous ML IDs |
| 🧪 Mock Sensor Mode | Full demo without hardware |
| 📊 Live Dashboard | Auto-polling every 2-5 seconds |
| 📈 Historical Charts | Recharts dual-line time series |

---

## Technology Stack

### Frontend
- React 18 + Vite
- React Router DOM v6
- Axios
- Recharts (charts)
- Tailwind CSS
- Lucide React (icons)

### Backend
- Node.js + Express.js
- Mongoose (MongoDB ODM)
- JSON Web Tokens (JWT)
- bcryptjs
- Helmet, CORS, Morgan

### Database
- MongoDB (Atlas or local)

### ML / XAI
- Python 3.9+
- FastAPI + Uvicorn
- scikit-learn (RandomForestClassifier)
- SHAP (TreeExplainer)
- NumPy, Pandas, Joblib

### IoT (Future)
- ESP32 NodeMCU 30-pin
- MAX30102 Pulse Oximeter Sensor

---

## Project Structure

```
remote-patient-monitoring/
├── frontend/                    # React + Vite app
├── backend/                     # Node.js + Express API
├── ml-service/                  # Python FastAPI + ML
├── esp32/                       # ESP32 Arduino code + guide
└── README.md
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (or local MongoDB)
- npm / pip

---

### 1. Clone / Navigate to Project

```bash
cd remote-patient-monitoring
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
```

### 3. ML Service Setup

```bash
cd ml-service
python -m venv venv

# Windows:
.\venv\Scripts\activate
pip install -r requirements.txt

# Train the model (required before starting the service):
python training/train_model.py
```

### 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# .env already has VITE_API_URL=http://localhost:5000/api
```

---

## Environment Variables

### backend/.env
```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rpm_db
JWT_SECRET=change_this_to_a_long_random_secret_string
JWT_EXPIRES_IN=24h
ML_SERVICE_URL=http://localhost:8000
```

### frontend/.env
```env
VITE_API_URL=http://localhost:5000/api
```

### ml-service/.env
```env
PORT=8000
MODEL_PATH=models/rf_model.pkl
SCALER_PATH=models/scaler.pkl
```

---

## Running the Application

### Terminal 1 — ML Service
```bash
cd ml-service
.\venv\Scripts\activate       # Windows
python run.py
# Service running at http://localhost:8000
```

### Terminal 2 — Backend
```bash
cd backend
npm run dev
# Server running at http://localhost:5000
```

### Terminal 3 — Frontend
```bash
cd frontend
npm run dev
# App running at http://localhost:5173
```

### Seed the Database
```bash
cd backend
npm run seed
# Creates all demo users, patients, devices, readings
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rpm.local | Admin@123 |
| Doctor | doctor@rpm.local | Doctor@123 |
| Patient 1 | p001@rpm.local | Patient@123 |
| Patient 2 | p002@rpm.local | Patient@123 |
| Patient 3 | p003@rpm.local | Patient@123 |

> Device tokens are printed to the console when you run `npm run seed`. Store these securely — they are only shown once.

---

## Mock Sensor Mode

The Mock Sensor panel appears on the Patient Dashboard and Doctor's Patient Detail view. No hardware required.

| Button | Heart Rate Range | SpO2 Range |
|--------|-----------------|------------|
| Simulate Normal | 70–90 BPM | 96–100% |
| Simulate Attention | 95–110 BPM | 90–94% |
| Simulate Alert | 115–140 BPM | 82–89% |

You can also enter custom values manually for testing edge cases.

> **Note**: These ranges are for demonstration only and do not represent universal medical thresholds.

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |

### Patients
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/patients | Doctor/Admin | List patients |
| POST | /api/patients | Doctor/Admin | Register patient |
| GET | /api/patients/:id | Doctor/Admin/Patient(own) | Patient details |
| PUT | /api/patients/:id | Doctor/Admin | Update patient |

### Devices
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/devices | Doctor/Admin | List devices |
| POST | /api/devices | Admin/Doctor | Create device |
| PUT | /api/devices/:id/assign | Doctor/Admin | Assign to patient |

### IoT (ESP32 Endpoint)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/iot/readings | Device Token | Submit health reading |

### Health Readings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/readings/latest/:patientId | Auth | Latest reading |
| GET | /api/readings/:patientId | Auth | Reading history |
| POST | /api/readings/mock | Auth (Doctor/Patient) | Mock sensor |

### ML
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/ml/predict | Auth | Get prediction |
| POST | /api/ml/explain | Auth | Get SHAP explanation |

### Recommendations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/recommendations/:patientId | Auth | Get recommendation |
| POST | /api/recommendations | Doctor | Create recommendation |
| PUT | /api/recommendations/:id | Doctor | Update recommendation |

---

## Privacy & Security Architecture

### Authentication
- JWT tokens signed with HS256, 24h expiry
- bcryptjs password hashing (cost factor 12)
- No passwords in API responses

### Authorization (Backend-enforced)
- **Patient**: Can only access own data. Backend compares `req.user._id` with patient record.
- **Doctor**: Can only access their assigned patients. Backend filters by `assignedDoctor`.
- **Admin**: System-wide access for management only.
- Frontend hiding is NOT the security layer. All checks happen server-side.

### Device Security
- Each device has a unique Device ID (DEV_001, etc.)
- Device tokens: random 32-byte hex, hashed with bcrypt before storage
- Raw token shown once at creation — store it securely (e.g., in ESP32 firmware)
- IoT endpoint validates: device exists → token matches → device is assigned → reading accepted

### Data Minimization
- ML service receives only: `{ heartRate, spo2, prevHeartRate, prevSpo2 }`
- Patient name, email, contact — never sent to ML service
- Pseudonymous patient IDs (P001, P002) used in ML-related records

---

## ML Approach

### Model
- **Algorithm**: RandomForestClassifier (scikit-learn)
- **Rationale**: Robust to noisy sensor data, handles non-linear patterns, supports exact SHAP values via TreeExplainer
- **Features**: heartRate, spo2, prevHeartRate, prevSpo2, hrChange, spo2Change
- **Classes**: Level 1 (Normal), Level 2 (Attention Needed), Level 3 (Doctor Attention Recommended)

### Training Data
- Synthetic demo dataset (~600 samples)
- Clearly labeled as prototype/demo data
- Class-balanced using `class_weight='balanced'`

### Performance Metrics
Metrics are computed from an actual 80/20 train/test split (not hardcoded). Run `python training/train_model.py` to see current metrics.

### Disclaimer
This model is trained on synthetic data for prototype purposes only. It has no clinical validation and must not be used for medical decision-making.

---

## SHAP / Explainable AI

- Uses `shap.TreeExplainer` for exact SHAP values (no approximation)
- For each prediction, SHAP values show how much each feature pushed the prediction toward higher or lower alert levels
- Feature contributions displayed as color-coded bars (positive = pushes toward alert, negative = pushes toward normal)
- All SHAP values computed at inference time — never hardcoded or cached improperly

---

## Alert Levels

| Level | Label | Description |
|-------|-------|-------------|
| 1 | Normal | Readings within expected range |
| 2 | Attention Needed | Pattern detected that warrants monitoring |
| 3 | Doctor Attention Recommended | Pattern warrants contacting healthcare provider |

> These are configurable prototype categories, not universal medical standards.

---

## ESP32 Integration

See [esp32/README.md](esp32/README.md) for hardware connection and firmware guide.

The backend is ready to receive readings from the ESP32 at:
```
POST /api/iot/readings
Authorization: Bearer <DEVICE_TOKEN>
Content-Type: application/json

{
  "deviceId": "DEV_001",
  "heartRate": 78,
  "spo2": 98
}
```

---

## Limitations

- Trained on synthetic data — not validated on real patient populations
- No MQTT support in current version (HTTP polling used)
- Model not calibrated for specific demographics or conditions
- SHAP explanations reflect model behavior, not clinical cause-effect relationships
- Prototype thresholds are not universal medical standards

---

## Future Enhancements

- [ ] MQTT protocol support for lower latency IoT communication
- [ ] WebSocket for real-time dashboard updates
- [ ] Temperature sensor integration (MAX30102 + separate thermistor)
- [ ] Multi-doctor patient management
- [ ] Model retraining pipeline using collected feedback data
- [ ] Mobile app (React Native)
- [ ] Encrypted health data at rest (MongoDB field-level encryption)
- [ ] Audit logging for all data access

---

## License

This project is created for academic/research purposes. Not licensed for commercial or clinical use.
