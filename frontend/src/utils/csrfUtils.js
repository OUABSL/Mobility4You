// src/utils/csrfUtils.js
/**
 * 🔒 UTILIDADES PARA MANEJO DE CSRF TOKEN
 *
 * Funciones utilitarias para obtener y manejar tokens CSRF
 * en aplicaciones cross-domain.
 */

import { BACKEND_URL, createServiceLogger } from '../config/appConfig';

const logger = createServiceLogger('CSRF_UTILS');

/**
 * Obtiene el token CSRF desde las cookies
 */
export const getCSRFTokenFromCookie = () => {
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

  return cookieValue;
};

/**
 * Obtiene el token CSRF desde el endpoint dedicado
 */
export const fetchCSRFToken = async () => {
  try {
    // Usar la URL centralizada del backend
    const response = await fetch(`${BACKEND_URL}/api/csrf-token/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.csrfToken) {
      // Asegurar que la cookie se establezca correctamente
      const cookieOptions =
        process.env.NODE_ENV === 'production'
          ? 'SameSite=None; Secure; Path=/'
          : 'Path=/';

      document.cookie = `csrftoken=${data.csrfToken}; ${cookieOptions}`;

      logger.info('CSRF token fetched and set successfully');
      return data.csrfToken;
    }

    throw new Error('No CSRF token received from server');
  } catch (error) {
    logger.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

/**
 * Inicializa el token CSRF para la aplicación
 */
export const initializeCSRFToken = async () => {
  try {
    // Primero verificar si ya existe en las cookies
    let token = getCSRFTokenFromCookie();

    if (!token) {
      // Si no existe, obtenerlo del servidor
      token = await fetchCSRFToken();
    }

    if (token) {
      logger.info('CSRF token initialized successfully');
      return token;
    }

    throw new Error('Could not initialize CSRF token');
  } catch (error) {
    logger.error('CSRF token initialization failed:', error);
    throw error;
  }
};

/**
 * Obtiene el token CSRF con fallback automático
 */
export const getCSRFToken = async () => {
  let token = getCSRFTokenFromCookie();

  if (!token) {
    try {
      token = await fetchCSRFToken();
    } catch (error) {
      logger.warn('Could not fetch CSRF token:', error);
    }
  }

  return token;
};

export default {
  getCSRFTokenFromCookie,
  fetchCSRFToken,
  initializeCSRFToken,
  getCSRFToken,
};
