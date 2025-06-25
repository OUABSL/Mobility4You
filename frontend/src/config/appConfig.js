// src/config/appConfig.js

/**
 * 🔧 CONFIGURACIÓN CENTRAL DE LA APLICACIÓN
 *
 * Centraliza toda la configuración de la aplicación incluyendo:
 * - Configuración de DEBUG_MODE
 * - URLs de APIs
 * - Configuración de caché
 * - Configuración de logging
 * - Variables de entorno
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-26
 */

// ========================================
// CONFIGURACIÓN DE ENTORNO
// ========================================

/**
 * Configuración central para el modo de debugging
 * SOLO debe ser true en desarrollo cuando se necesite testing
 */
export const DEBUG_MODE =
  process.env.NODE_ENV === 'development' &&
  process.env.REACT_APP_DEBUG_MODE === 'true';

/**
 * URLs de APIs principales
 */
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
export const NGINX_URL = process.env.REACT_APP_NGINX_URL || 'http://localhost';

export const API_URLS = {
  BASE: API_URL,
  BACKEND: BACKEND_URL,
  NGINX: NGINX_URL,
};

/**
 * Configuración de caché para servicios
 */
export const CACHE_CONFIG = {
  TTL: {
    SHORT: 5 * 60 * 1000, // 5 minutos
    MEDIUM: 30 * 60 * 1000, // 30 minutos
    LONG: 60 * 60 * 1000, // 1 hora
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 horas
  },
  KEYS: {
    LOCATIONS: 'app_locations',
    CARS: 'app_cars',
    STATS: 'app_stats',
    FEATURES: 'app_features',
    TESTIMONIALS: 'app_testimonials',
    DESTINATIONS: 'app_destinations',
    POLICIES: 'app_policies',
  },
  // Configuración específica por tipo de dato
  locations: {
    key: 'app_locations',
    ttl: 30 * 60 * 1000, // 30 minutos
  },
  cars: {
    key: 'app_cars',
    ttl: 10 * 60 * 1000, // 10 minutos
  },
  stats: {
    key: 'app_stats',
    ttl: 60 * 60 * 1000, // 1 hora
  },
  features: {
    key: 'app_features',
    ttl: 60 * 60 * 1000, // 1 hora
  },
  testimonials: {
    key: 'app_testimonials',
    ttl: 30 * 60 * 1000, // 30 minutos
  },
  destinations: {
    key: 'app_destinations',
    ttl: 60 * 60 * 1000, // 1 hora
  },
  policies: {
    key: 'app_policies',
    ttl: 60 * 60 * 1000, // 1 hora
  },
};

/**
 * Configuración de timeouts para peticiones
 */
export const TIMEOUT_CONFIG = {
  DEFAULT: 8000,
  LOCATIONS: 10000,
  CARS: 12000,
  POLICIES: 8000,
  RESERVATIONS: 15000,
  PAYMENTS: 30000,
};

// ========================================
// FUNCIONES DE UTILIDAD PARA DEBUG
// ========================================

/**
 * Helper para verificar si se debe usar datos de testing
 * @param {boolean} backendFailed - Si el backend falló
 * @returns {boolean} - Si se deben usar datos de testing
 */
export const shouldUseTestingData = (backendFailed = false) => {
  return DEBUG_MODE && backendFailed;
};

/**
 * Helper para logging condicional basado en DEBUG_MODE
 * @param {string} service - Nombre del servicio que loggea
 * @param {string} level - Nivel de log (info, warn, error)
 * @param {string} message - Mensaje a loggear
 * @param {any} data - Datos adicionales (opcional)
 */
export const conditionalLog = (service, level, message, data = null) => {
  if (!DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${service.toUpperCase()}]`;

  switch (level.toLowerCase()) {
    case 'info':
      console.log(`${prefix} ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${prefix} ${message}`, data || '');
      break;
    case 'error':
      console.error(`${prefix} ${message}`, data || '');
      break;
    default:
      console.log(`${prefix} ${message}`, data || '');
  }
};

/**
 * Factory para crear loggers específicos por servicio
 * @param {string} serviceName - Nombre del servicio
 * @returns {Object} - Logger específico del servicio
 */
export const createServiceLogger = (serviceName) => ({
  info: (message, data) => conditionalLog(serviceName, 'info', message, data),
  warn: (message, data) => conditionalLog(serviceName, 'warn', message, data),
  error: (message, data) => conditionalLog(serviceName, 'error', message, data),
});

// ========================================
// CONFIGURACIÓN DE PRODUCCIÓN VS DESARROLLO
// ========================================

/**
 * Configuración específica por entorno
 */
export const ENV_CONFIG = {
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',

  // Características habilitadas por entorno
  FEATURES: {
    CONSOLE_LOGGING: DEBUG_MODE,
    TESTING_DATA_FALLBACK: DEBUG_MODE,
    ERROR_BOUNDARIES: true,
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'production',
    ANALYTICS: process.env.NODE_ENV === 'production',
  },
};

/**
 * Configuración de errores y fallbacks
 */
export const ERROR_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  FALLBACK_ENABLED: DEBUG_MODE,
  SHOW_DETAILED_ERRORS: DEBUG_MODE,
};

// ========================================
// VALIDACIÓN DE CONFIGURACIÓN
// ========================================

/**
 * Valida que la configuración esté correcta al inicializar la app
 */
export const validateAppConfig = () => {
  const errors = [];

  // Validar URLs requeridas
  if (!API_URLS.BASE) {
    errors.push('REACT_APP_API_URL no está configurada');
  }

  // Validar configuración de DEBUG_MODE
  if (DEBUG_MODE && process.env.NODE_ENV === 'production') {
    console.warn(
      '⚠️ DEBUG_MODE está activo en producción. Esto no es recomendado.',
    );
  }

  // Validar timeouts
  Object.values(TIMEOUT_CONFIG).forEach((timeout, index) => {
    if (typeof timeout !== 'number' || timeout <= 0) {
      errors.push(`Timeout de configuración inválido en posición ${index}`);
    }
  });

  if (errors.length > 0) {
    console.error('❌ Errores de configuración detectados:', errors);
    throw new Error(`Configuración inválida: ${errors.join(', ')}`);
  }

  if (DEBUG_MODE) {
    console.log('✅ Configuración de aplicación validada correctamente');
    console.log(
      '🔧 Modo DEBUG activo - datos de testing disponibles como fallback',
    );
  }
};

// ========================================
// CONFIGURACIÓN ESPECÍFICA DE SERVICIOS
// ========================================

/**
 * Configuración específica para servicios individuales
 */
export const SERVICE_CONFIG = {
  RESERVATION: {
    TIMER_DURATION: 30 * 60 * 1000, // 30 minutos
    WARNING_TIME: 5 * 60 * 1000, // 5 minutos antes
    AUTO_EXTEND: false,
  },

  PAYMENT: {
    STRIPE_ENABLED: process.env.REACT_APP_STRIPE_ENABLED === 'true',
    MOCK_PAYMENTS: DEBUG_MODE,
    TIMEOUT: TIMEOUT_CONFIG.PAYMENTS,
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 3,
    DEBOUNCE_DELAY: 300,
    MAX_RESULTS: 50,
  },

  CACHE: {
    ENABLED: true,
    CLEAR_ON_ERROR: false,
    PERSIST_ON_RELOAD: true,
  },
};

export default {
  DEBUG_MODE,
  API_URLS,
  CACHE_CONFIG,
  TIMEOUT_CONFIG,
  ENV_CONFIG,
  ERROR_CONFIG,
  SERVICE_CONFIG,
  shouldUseTestingData,
  conditionalLog,
  createServiceLogger,
  validateAppConfig,
};
