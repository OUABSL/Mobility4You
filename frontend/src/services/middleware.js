// MIDDLEWARE CORS PARA DESARROLLO
// configurar interceptor:

import axios from 'axios';

// Configurar axios con la URL base del backend
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';


// TODO: Aquí se agregará la gestión de sesiones, autenticación, y protección CSRF.

// Interceptor para manejar errores globalmente
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      console.error('Endpoint no encontrado:', error.config.url);
    }
    return Promise.reject(error);
  }
);
