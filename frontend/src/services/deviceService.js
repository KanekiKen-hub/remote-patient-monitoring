import api from './api';

export const deviceService = {
  getDevices: () => api.get('/devices'),
  createDevice: () => api.post('/devices'),
  assignDevice: (deviceId, patientId) => api.put(`/devices/${deviceId}/assign`, { patientId }),
  unassignDevice: (deviceId) => api.put(`/devices/${deviceId}/unassign`),
};
