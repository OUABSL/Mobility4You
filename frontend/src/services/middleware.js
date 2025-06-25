// MIDDLEWARE CORS PARA DESARROLLO
// configurar interceptor:

import axios from 'axios';
import { createServiceLogger } from '../config/appConfig';

// Crear logger para middleware
const logger = createServiceLogger('MIDDLEWARE');

// Configurar axios con la URL base del backend (usando nginx proxy)
// NOTA: Los servicios individuales manejan sus propias URLs completas
// axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Interceptor para manejar errores globalmente
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      logger.error('Endpoint no encontrado:', error.config.url);
    }
    return Promise.reject(error);
  },
);
