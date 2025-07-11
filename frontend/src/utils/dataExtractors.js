/**
 * 🔍 UTILIDADES DE EXTRACCIÓN DE DATOS
 *
 * Funciones para extraer valores de objetos complejos, campos JSON
 * y navegación por propiedades usando notación de puntos.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-30
 */

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';

// Crear logger para las utilidades de extracción
const logger = createServiceLogger('DATA_EXTRACTORS');

/**
 * Extrae valor de campo JSON de forma segura
 * @param {string|object} jsonField - Campo JSON a procesar
 * @param {string} key - Clave a extraer
 * @param {*} defaultValue - Valor por defecto
 * @returns {*} Valor extraído o valor por defecto
 */
export function extractFromJsonField(jsonField, key, defaultValue = null) {
  try {
    let data = jsonField;
    if (typeof jsonField === 'string') {
      data = JSON.parse(jsonField);
    }
    return data?.[key] ?? defaultValue;
  } catch (error) {
    if (DEBUG_MODE) {
      logger.warn(`Error extrayendo ${key} de campo JSON:`, error);
    }
    return defaultValue;
  }
}

/**
 * Extrae valor usando notación de puntos
 * @param {object} obj - Objeto fuente
 * @param {string} path - Ruta con notación de puntos
 * @returns {*} Valor extraído o undefined
 */
export function extractByPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // Lógica mejorada para extraer valor con notación de puntos
  try {
    const result = path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      return current[key];
    }, obj);

    if (DEBUG_MODE) {
      logger.info(`[EXTRACT_PATH] ${path} from object -> ${result}`);
    }

    return result;
  } catch (error) {
    if (DEBUG_MODE) {
      logger.warn(`[EXTRACT_PATH] Error extracting ${path}:`, error);
    }
    return undefined;
  }
}

/**
 * Extrae múltiples valores usando múltiples rutas (busca hasta encontrar uno válido)
 * @param {object} obj - Objeto fuente
 * @param {string[]} paths - Array de rutas con notación de puntos
 * @param {*} defaultValue - Valor por defecto si ninguna ruta retorna un valor
 * @returns {*} Primer valor válido encontrado o valor por defecto
 */
export function extractFromMultiplePaths(obj, paths, defaultValue = undefined) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return defaultValue;
  }

  for (const path of paths) {
    const value = extractByPath(obj, path);
    if (value !== null && value !== undefined) {
      return value;
    }
  }

  return defaultValue;
}

/**
 * Extrae propiedades específicas de un objeto de forma segura
 * @param {object} obj - Objeto fuente
 * @param {string[]} properties - Array de propiedades a extraer
 * @param {object} defaults - Objeto con valores por defecto para cada propiedad
 * @returns {object} Objeto con las propiedades extraídas
 */
export function extractProperties(obj, properties, defaults = {}) {
  if (!obj || typeof obj !== 'object' || !Array.isArray(properties)) {
    return defaults;
  }

  const result = {};

  properties.forEach((prop) => {
    const value = obj[prop];
    result[prop] = value !== undefined ? value : defaults[prop];
  });

  return result;
}

/**
 * Busca un valor en un objeto usando múltiples estrategias
 * @param {object} obj - Objeto fuente
 * @param {string} targetKey - Clave objetivo a buscar
 * @param {*} defaultValue - Valor por defecto
 * @returns {*} Valor encontrado o valor por defecto
 */
export function deepSearch(obj, targetKey, defaultValue = null) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  // Búsqueda directa
  if (obj.hasOwnProperty(targetKey)) {
    return obj[targetKey];
  }

  // Búsqueda recursiva en objetos anidados
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
      const result = deepSearch(obj[key], targetKey, undefined);
      if (result !== undefined) {
        return result;
      }
    }
  }

  return defaultValue;
}

/**
 * Convierte un objeto plano en uno anidado usando notación de puntos
 * @param {object} flatObj - Objeto plano
 * @returns {object} Objeto anidado
 */
export function unflattenObject(flatObj) {
  const result = {};

  for (const key in flatObj) {
    if (flatObj.hasOwnProperty(key)) {
      const keys = key.split('.');
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }

      current[keys[keys.length - 1]] = flatObj[key];
    }
  }

  return result;
}

/**
 * Aplana un objeto anidado usando notación de puntos
 * @param {object} obj - Objeto anidado
 * @param {string} prefix - Prefijo para las claves
 * @returns {object} Objeto plano
 */
export function flattenObject(obj, prefix = '') {
  const result = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        obj[key] !== null &&
        typeof obj[key] === 'object' &&
        !Array.isArray(obj[key])
      ) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }

  return result;
}
