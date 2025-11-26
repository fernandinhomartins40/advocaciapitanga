import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Importante para enviar cookies
});

// Interceptor para renovar token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 e não for a rota de refresh, login ou me
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/me')
    ) {
      originalRequest._retry = true;

      try {
        // Tentar renovar o token
        await api.post('/auth/refresh');
        // Repetir a requisição original
        return api(originalRequest);
      } catch (refreshError) {
        // Se falhar ao renovar, não redirecionar automaticamente
        // Deixar o componente decidir
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
