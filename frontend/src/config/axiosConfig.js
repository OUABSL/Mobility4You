// frontend/src/config/axiosConfig.js
import axios from 'axios';
import { createServiceLogger } from './appConfig';

// Crear logger para el config de axios
const logger = createServiceLogger('AXIOS_CONFIG');

// Función para obtener el token CSRF desde las cookies
const getCSRFToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }

  // Log para debug
  if (process.env.NODE_ENV === 'development') {
    logger.info('CSRF Token from cookie:', cookieValue);
  }
  return cookieValue;
};

// Función para obtener el token CSRF al cargar la página
const ensureCSRFToken = async () => {
  const existing = getCSRFToken();
  if (existing) {
    return existing;
  }

  try {
    // Hacer una petición GET simple para obtener el token CSRF
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';
    const response = await axios.get(`${API_URL}/vehiculos/`, {
      headers: {
        Accept: 'application/json',
      },
    });
    return getCSRFToken();
  } catch (error) {
    logger.warn('Failed to obtain CSRF token:', error);
    return null;
  }
};

// Configurar axios para incluir automáticamente el token CSRF
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

// Interceptor para requests
axios.interceptors.request.use(
  async (config) => {
    // Asegurar que el token CSRF se incluya en las solicitudes
    let csrfToken = getCSRFToken();

    // Si no hay token y es una petición POST/PUT/PATCH/DELETE, intentar obtenerlo
    if (
      !csrfToken &&
      ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())
    ) {
      csrfToken = await ensureCSRFToken();
    }

    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    // Asegurar que las cookies se envíen
    config.withCredentials = true;

    // Log para debugging
    if (process.env.NODE_ENV === 'development') {
      logger.info('Axios request config:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        withCredentials: config.withCredentials,
        csrfToken: csrfToken ? 'present' : 'missing',
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para responses
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (process.env.NODE_ENV === 'development') {
      logger.error('Axios response error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    // Si es un error 403 de CSRF, intentar renovar el token y reintentar una vez
    if (
      error.response?.status === 403 &&
      (error.response?.data?.detail?.includes('CSRF') ||
        error.response?.data?.error?.includes('CSRF') ||
        String(error.response?.data).includes('CSRF'))
    ) {
      logger.warn('CSRF token error detected. Attempting to refresh token...');

      // Intentar obtener un nuevo token
      const newToken = await ensureCSRFToken();

      if (newToken && !error.config._retry) {
        error.config._retry = true;
        error.config.headers['X-CSRFToken'] = newToken;
        return axios.request(error.config);
      }
    }
    return Promise.reject(error);
  },
);

// Inicializar token CSRF al cargar el módulo
if (typeof window !== 'undefined') {
  // Intentar obtener el token al cargar la página
  setTimeout(() => {
    ensureCSRFToken().catch(logger.warn);
  }, 100);
}

export default axios;
