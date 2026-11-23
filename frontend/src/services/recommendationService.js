import api from './api';

export const recommendationService = {
  getRecommendation: (patientId) => api.get(`/recommendations/${patientId}`),
  createRecommendation: (data) => api.post('/recommendations', data),
  updateRecommendation: (id, data) => api.put(`/recommendations/${id}`, data),
};
