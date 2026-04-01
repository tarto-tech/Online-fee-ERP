import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    const originalRequest = error.config;

    // Auto-refresh access token on 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('studentRefreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.REACT_APP_API_URL || '/api'}/auth/refresh`,
            { refreshToken }
          );
          localStorage.setItem('studentToken', data.accessToken);
          if (data.refreshToken) localStorage.setItem('studentRefreshToken', data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed — force logout
        }
      }
      localStorage.removeItem('studentToken');
      localStorage.removeItem('studentRefreshToken');
      localStorage.removeItem('studentUser');
      window.location.href = '/';
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
