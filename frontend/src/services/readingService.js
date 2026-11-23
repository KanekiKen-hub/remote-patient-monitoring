import api from './api';

export const readingService = {
  getReadings: (patientId, limit = 50) =>
    api.get(`/readings/${patientId}`, { params: { limit } }),
  getLatestReading: (patientId) => api.get(`/readings/latest/${patientId}`),
  sendReading: (deviceId, deviceToken, heartRate, spo2) =>
    api.post(
      '/iot/readings',
      { deviceId, heartRate, spo2 },
      { headers: { 'X-Device-Token': deviceToken } }
    ),
  sendMockReading: (patientId, heartRate, spo2) =>
    api.post('/readings/mock', { patientId, heartRate, spo2 }),
};
