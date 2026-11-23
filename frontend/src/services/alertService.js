import api from './api';

export const alertService = {
  getAlerts: (params) => api.get('/alerts', { params }),
  getPatientAlerts: (patientId) => api.get(`/alerts/patient/${patientId}`),
  reviewAlert: (id) => api.put(`/alerts/${id}/review`),
  submitFeedback: (alertId, readingId, predictionCorrect, notes) =>
    api.post('/feedback', { alertId, readingId, predictionCorrect, notes }),
};
