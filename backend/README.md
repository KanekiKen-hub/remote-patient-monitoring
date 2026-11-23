# Remote Patient Monitoring — Backend

## Prerequisites
- Node.js >= 18
- MongoDB Atlas cluster (or local MongoDB)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

3. **Seed the database:**
   ```bash
   npm run seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | None | Login |
| GET | /api/auth/me | JWT | Current user |
| POST | /api/auth/register | Admin | Register admin/doctor |
| GET | /api/patients | JWT | List patients |
| POST | /api/patients | Doctor/Admin | Create patient |
| GET | /api/patients/:id | JWT | Patient details |
| PUT | /api/patients/:id | Doctor/Admin | Update patient |
| GET | /api/devices | JWT | List devices |
| POST | /api/devices | Doctor/Admin | Provision device |
| PUT | /api/devices/:id/assign | Doctor/Admin | Assign to patient |
| PUT | /api/devices/:id/unassign | Doctor/Admin | Unassign device |
| PUT | /api/devices/:id/activate | Admin | Activate device |
| PUT | /api/devices/:id/deactivate | Admin | Deactivate device |
| GET | /api/readings/:patientId | JWT | Reading history |
| GET | /api/readings/latest/:patientId | JWT | Latest reading |
| POST | /api/iot/readings | Device Token | Submit IoT reading |
| GET | /api/recommendations/:patientId | JWT | Get recommendations |
| POST | /api/recommendations | Doctor | Create/upsert |
| PUT | /api/recommendations/:id | Doctor | Update |
| GET | /api/alerts | Doctor/Admin | List alerts |
| GET | /api/alerts/patient/:patientId | JWT | Patient alerts |
| PUT | /api/alerts/:id/review | Doctor/Admin | Mark reviewed |
| POST | /api/feedback | Doctor | Submit feedback |
| GET | /api/feedback | Doctor/Admin | List feedback |
| POST | /api/ml/predict | JWT | ML prediction |
| POST | /api/ml/explain | JWT | SHAP explanation |
| GET | /api/admin/users | Admin | List users |
| POST | /api/admin/users | Admin | Create user |
| PUT | /api/admin/users/:id | Admin | Update user |
| PUT | /api/admin/users/:id/deactivate | Admin | Deactivate user |
| GET | /api/admin/stats | Admin | System statistics |

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rpm.local | Admin@123 |
| Doctor | doctor@rpm.local | Doctor@123 |
| Patient | p001@rpm.local | Patient@123 |
| Patient | p002@rpm.local | Patient@123 |
| Patient | p003@rpm.local | Patient@123 |

## IoT Device Authentication

Devices authenticate using `Authorization: Bearer <rawDeviceToken>` header.
The raw token is displayed **only once** when the device is created via `POST /api/devices`.

## Project Structure

```
backend/
├── src/
│   ├── server.js              # App entry point
│   ├── models/
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Device.js
│   │   ├── HealthReading.js
│   │   ├── Recommendation.js
│   │   ├── Alert.js
│   │   └── Feedback.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── patientController.js
│   │   ├── deviceController.js
│   │   ├── readingController.js
│   │   ├── iotController.js
│   │   ├── recommendationController.js
│   │   ├── alertController.js
│   │   ├── feedbackController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── devices.js
│   │   ├── readings.js
│   │   ├── iot.js
│   │   ├── recommendations.js
│   │   ├── alerts.js
│   │   ├── feedback.js
│   │   ├── ml.js
│   │   └── admin.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   └── deviceAuthMiddleware.js
│   ├── services/
│   │   └── mlService.js
│   └── utils/
│       ├── AppError.js
│       └── catchAsync.js
├── seed.js
├── package.json
├── .env
└── .env.example
```
