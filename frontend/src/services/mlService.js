import api from './api';

export const mlService = {
  getExplanation: (patientId) => api.post('/ml/explain', { patientId }),
  getPrediction: (patientId) => api.post('/ml/predict', { patientId }),
};
