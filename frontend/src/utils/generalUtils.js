/**
 * 🛠️ UTILIDADES GENERALES
 *
 * Funciones de utilidad general que no encajan en categorías específicas.
 * Incluye validadores, helpers de timeout, debugging y otras utilidades.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-30
 */

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';

// Crear logger para utilidades generales
const logger = createServiceLogger('GENERAL_UTILS');

// ========================================
// FUNCIONES DE LOGGING CENTRALIZADAS
// ========================================

/**
 * Helper para logging de información condicional
 * @param {string} message - Mensaje a loggear
 * @param {any} data - Datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export function logInfo(message, data = null, serviceLogger = null) {
  const targetLogger = serviceLogger || logger;
  if (DEBUG_MODE && targetLogger) {
    if (data) {
      targetLogger.info(message, data);
    } else {
      targetLogger.info(message);
    }
  }
}

/**
 * Helper para logging de errores condicional
 * @param {string} message - Mensaje de error
 * @param {Error|any} error - Error o datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export function logError(message, error = null, serviceLogger = null) {
  const targetLogger = serviceLogger || logger;
  if (targetLogger) {
    if (error) {
      targetLogger.error(message, error);
    } else {
      targetLogger.error(message);
    }
  }
}

/**
 * Helper para logging de warnings condicional
 * @param {string} message - Mensaje de warning
 * @param {any} data - Datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export function logWarning(message, data = null, serviceLogger = null) {
  const targetLogger = serviceLogger || logger;
  if (targetLogger) {
    if (data) {
      targetLogger.warn(message, data);
    } else {
      targetLogger.warn(message);
    }
  }
}

/**
 * Envuelve una promesa con un timeout
 * @param {Promise} promise - Promesa a envolver
 * @param {number} ms - Tiempo límite en milisegundos (por defecto 10s)
 * @returns {Promise} Promesa con timeout
 */
export function withTimeout(promise, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          'La consulta está tardando demasiado. Inténtalo de nuevo más tarde.',
        ),
      );
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Debounce una función para evitar llamadas excesivas
 * @param {Function} func - Función a debounce
 * @param {number} wait - Tiempo de espera en milisegundos
 * @param {boolean} immediate - Si ejecutar inmediatamente
 * @returns {Function} Función con debounce aplicado
 */
export function debounce(func, wait, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Throttle una función para limitar la frecuencia de ejecución
 * @param {Function} func - Función a throttle
 * @param {number} limit - Límite de tiempo en milisegundos
 * @returns {Function} Función con throttle aplicado
 */
export function throttle(func, limit) {
  let inThrottle;

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Genera un ID único aleatorio
 * @param {number} length - Longitud del ID (por defecto 8)
 * @param {string} prefix - Prefijo opcional
 * @returns {string} ID único generado
 */
export function generateUniqueId(length = 8, prefix = '') {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = prefix;

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Capitaliza la primera letra de una cadena
 * @param {string} str - Cadena a capitalizar
 * @returns {string} Cadena capitalizada
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitaliza cada palabra en una cadena
 * @param {string} str - Cadena a procesar
 * @returns {string} Cadena con cada palabra capitalizada
 */
export function capitalizeWords(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Limpia una cadena de caracteres especiales para uso en URLs
 * @param {string} str - Cadena a limpiar
 * @returns {string} Cadena limpia para URL
 */
export function slugify(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .trim()
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} True si el email es válido
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida un número de teléfono español
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} True si el teléfono es válido
 */
export function isValidSpanishPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Limpiar el número
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Patrones para números españoles
  const patterns = [
    /^\+34[6-9]\d{8}$/, // +34 seguido de móvil
    /^34[6-9]\d{8}$/, // 34 seguido de móvil
    /^[6-9]\d{8}$/, // Móvil directo
    /^\+34[8-9]\d{8}$/, // +34 seguido de fijo
    /^34[8-9]\d{8}$/, // 34 seguido de fijo
    /^[8-9]\d{8}$/, // Fijo directo
  ];

  return patterns.some((pattern) => pattern.test(cleaned));
}

/**
 * Normaliza un número de teléfono al formato estándar
 * @param {string} phone - Teléfono a normalizar
 * @returns {string} Teléfono normalizado
 */
export function normalizeSpanishPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  let cleaned = phone.replace(/[\s\-()]/g, '');

  // Si empieza con +34, remover para añadir después
  if (cleaned.startsWith('+34')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('34')) {
    cleaned = cleaned.substring(2);
  }

  // Si es un número válido español, añadir prefijo
  if (/^[6-9]\d{8}$/.test(cleaned)) {
    return `+34${cleaned}`;
  }

  return phone; // Retornar original si no se puede normalizar
}

/**
 * Función de debug para datos del backend
 * @param {any} data - Datos a debuggear
 * @param {string} context - Contexto de la operación
 */
export function debugBackendData(data, context) {
  if (DEBUG_MODE) {
    logger.info(`[DEBUG] ${context}:`, {
      data,
      timestamp: new Date().toISOString(),
      context,
    });
  }
}

/**
 * Función de debug para sessionStorage
 */
export function debugSessionStorage() {
  if (DEBUG_MODE) {
    const storageData = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      try {
        storageData[key] = JSON.parse(sessionStorage.getItem(key));
      } catch (e) {
        storageData[key] = sessionStorage.getItem(key);
      }
    }
    logger.info('[DEBUG] SessionStorage state:', storageData);
  }
}

/**
 * Función de debug para localStorage
 */
export function debugLocalStorage() {
  if (DEBUG_MODE) {
    const storageData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        storageData[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        storageData[key] = localStorage.getItem(key);
      }
    }
    logger.info('[DEBUG] LocalStorage state:', storageData);
  }
}

/**
 * Compara dos objetos superficialmente
 * @param {object} obj1 - Primer objeto
 * @param {object} obj2 - Segundo objeto
 * @returns {boolean} True si son iguales superficialmente
 */
export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }

  if (!obj1 || !obj2 || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => obj1[key] === obj2[key]);
}

/**
 * Clona un objeto de forma profunda (sin funciones)
 * @param {any} obj - Objeto a clonar
 * @returns {any} Copia profunda del objeto
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item));
  }

  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }

  return obj;
}

/**
 * Convierte un valor a boolean de forma inteligente
 * @param {any} value - Valor a convertir
 * @returns {boolean} Valor boolean
 */
export function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return ['true', 'yes', 'si', 'sí', '1', 'on'].includes(lower);
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

/**
 * Formatea un número como ordinal en español
 * @param {number} num - Número a formatear
 * @returns {string} Número ordinal
 */
export function formatOrdinal(num) {
  if (typeof num !== 'number' || isNaN(num)) {
    return '';
  }

  const ordinals = {
    1: '1º',
    2: '2º',
    3: '3º',
    4: '4º',
    5: '5º',
    6: '6º',
    7: '7º',
    8: '8º',
    9: '9º',
    10: '10º',
  };

  return ordinals[num] || `${num}º`;
}

/**
 * Espera un tiempo determinado (útil para testing y demos)
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promesa que se resuelve después del tiempo especificado
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retorna un valor si está definido, sino el valor por defecto
 * @param {any} value - Valor a evaluar
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} Valor o valor por defecto
 */
export function defaultIfUndefined(value, defaultValue) {
  return value !== undefined ? value : defaultValue;
}

/**
 * Retorna un valor si no es null ni undefined, sino el valor por defecto
 * @param {any} value - Valor a evaluar
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} Valor o valor por defecto
 */
export function defaultIfNullish(value, defaultValue) {
  return value != null ? value : defaultValue;
}
