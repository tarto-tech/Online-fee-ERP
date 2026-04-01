import api from './client';

export const authAPI = {
  login: (data) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/admin/me'),
  changePassword: (data) => api.patch('/auth/admin/change-password', data),
};

export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.patch(`/students/${id}`, data),
  deactivate: (id) => api.delete(`/students/${id}`),
  permanentDelete: (id) => api.delete(`/students/${id}/permanent`),
  promote: (data) => api.post('/students/promote', data),
  bulkUpload: (file, courseId, currentYear, academicYear) => {
    const form = new FormData();
    form.append('file', file);
    form.append('courseId', courseId);
    form.append('currentYear', currentYear);
    form.append('academicYear', academicYear);
    return api.post('/students/bulk-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.patch(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  permanentDelete: (id) => api.delete(`/courses/${id}/permanent`),
};

export const feeStructuresAPI = {
  getAll: (params) => api.get('/fee-structures', { params }),
  create: (data) => api.post('/fee-structures', data),
  update: (id, data) => api.patch(`/fee-structures/${id}`, data),
  deactivate: (id) => api.delete(`/fee-structures/${id}`),
  permanentDelete: (id) => api.delete(`/fee-structures/${id}/permanent`),
};

export const feeWaiversAPI = {
  getAll: (params) => api.get('/fee-waivers', { params }),
  create: (data) => api.post('/fee-waivers', data),
  update: (id, data) => api.patch(`/fee-waivers/${id}`, data),
  delete: (id) => api.delete(`/fee-waivers/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/admin/payments', { params }),
  exportCSV: (params) => api.get('/admin/export/payments', { params, responseType: 'blob' }),
};

export const dashboardAPI = {
  getStats: (params) => api.get('/admin/stats', { params }),
};
