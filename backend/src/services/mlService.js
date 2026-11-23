/**
 * src/services/mlService.js
 * Client for the Python ML microservice.
 * All calls are wrapped with graceful fallback so the API continues
 * to operate even when the ML service is unavailable.
 */
const axios = require('axios');

/** Base URL of the ML service (configured via .env). */
const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/** Timeout (ms) to wait for the ML service before giving up. */
const ML_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Axios instance with pre-configured base URL and timeout
// ---------------------------------------------------------------------------
const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  timeout: ML_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a numeric prediction level to its human-readable label.
 * @param {number} level - 1, 2, or 3
 * @returns {string}
 */
const levelToLabel = (level) => {
  const map = {
    1: 'Normal',
    2: 'Attention Needed',
    3: 'Doctor Attention Recommended',
  };
  return map[level] || 'Normal';
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * getPrediction — Send vital-sign features to the ML service for classification.
 *
 * @param {Object} features
 * @param {number} features.heartRate
 * @param {number} features.spo2
 * @param {number} [features.prevHeartRate]
 * @param {number} [features.prevSpo2]
 * @param {number} [features.hrChange]
 * @param {number} [features.spo2Change]
 * @returns {Promise<Object>} { level, label, confidence, features, mlAvailable }
 */
const getPrediction = async (features) => {
  try {
    const response = await mlClient.post('/predict', features);
    const data = response.data;

    return {
      level: data.level || 1,
      label: data.label || levelToLabel(data.level || 1),
      confidence: data.confidence || null,
      features: data.features || features,
      mlAvailable: true,
    };
  } catch (err) {
    // ML service unavailable — fall back to a rule-based level 1 response
    console.warn(
      `[mlService] ML service unreachable (${err.message}). Using fallback.`
    );

    // Simple rule-based fallback so the system keeps running
    let fallbackLevel = 1;
    if (features.spo2 < 92 || features.heartRate > 120 || features.heartRate < 40) {
      fallbackLevel = 3;
    } else if (features.spo2 < 95 || features.heartRate > 100 || features.heartRate < 50) {
      fallbackLevel = 2;
    }

    return {
      level: fallbackLevel,
      label: levelToLabel(fallbackLevel),
      confidence: null,
      features,
      mlAvailable: false, // flag: consumer can note ML was unavailable
    };
  }
};

/**
 * getExplanation — Fetch SHAP explanation values for a given reading.
 *
 * @param {Object} features - Same shape as getPrediction features
 * @returns {Promise<Object>} { shapValues, mlAvailable } or fallback null
 */
const getExplanation = async (features) => {
  try {
    const response = await mlClient.post('/explain', features);
    return {
      ...response.data,
      mlAvailable: true,
    };
  } catch (err) {
    console.warn(
      `[mlService] ML explain endpoint unreachable (${err.message}). Returning null.`
    );
    return {
      shapValues: null,
      mlAvailable: false,
    };
  }
};

module.exports = { getPrediction, getExplanation, levelToLabel };
