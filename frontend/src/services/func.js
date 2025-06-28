// No imports are needed for this function as it only uses built-in JavaScript features.
// Just export the function as you have done.

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';
import universalMapper from './universalDataMapper';

// Crear logger para utilidades
const logger = createServiceLogger('FUNC_UTILS');

// ========================================
// FUNCIONES DE LOGGING CENTRALIZADAS
// ========================================

/**
 * Helper para logging de información condicional
 * @param {string} message - Mensaje a loggear
 * @param {any} data - Datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export const logInfo = (message, data = null, serviceLogger = null) => {
  const targetLogger = serviceLogger || logger;
  if (DEBUG_MODE && targetLogger) {
    if (data) {
      targetLogger.info(message, data);
    } else {
      targetLogger.info(message);
    }
  }
};

/**
 * Helper para logging de errores condicional
 * @param {string} message - Mensaje de error
 * @param {Error|any} error - Error o datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export const logError = (message, error = null, serviceLogger = null) => {
  const targetLogger = serviceLogger || logger;
  if (targetLogger) {
    if (error) {
      targetLogger.error(message, error);
    } else {
      targetLogger.error(message);
    }
  }
};

/**
 * Helper para logging de warnings condicional
 * @param {string} message - Mensaje de warning
 * @param {any} data - Datos adicionales
 * @param {Object} serviceLogger - Logger específico del servicio (opcional)
 */
export const logWarning = (message, data = null, serviceLogger = null) => {
  const targetLogger = serviceLogger || logger;
  if (targetLogger) {
    if (data) {
      targetLogger.warn(message, data);
    } else {
      targetLogger.warn(message);
    }
  }
};

// ========================================
// FUNCIONES DE FORMATEO Y CÁLCULO
// ========================================

/**
 * Helper para formatear el porcentaje de impuesto
 * @param {number|null} rate - Tasa de impuesto (como decimal, ej: 0.21)
 * @returns {string} - Porcentaje formateado o cadena vacía
 */
export const formatTaxRate = (rate = null) => {
  if (rate !== null && rate !== undefined && !isNaN(rate)) {
    return ` (${(rate * 100).toFixed(0)}%)`;
  }
  // Sin fallback hardcodeado - debe venir del backend
  return '';
};

/**
 * Helper para calcular impuestos sin valores hardcodeados
 * @param {number} baseAmount - Monto base
 * @param {number|null} taxRate - Tasa de impuesto del backend
 * @returns {number} - Monto de impuestos calculado
 */
export const calculateDisplayTaxAmount = (baseAmount, taxRate = null) => {
  if (!baseAmount || isNaN(baseAmount)) return 0;

  // Si tenemos la tasa del backend, usarla
  if (taxRate !== null && taxRate !== undefined && !isNaN(taxRate)) {
    return universalMapper.roundToDecimals(baseAmount * taxRate, 2);
  }

  // Sin fallback hardcodeado - debe venir del backend
  return 0;
};

// ========================================
// FUNCIONES DE GESTIÓN DE IMÁGENES
// ========================================

/**
 * Función helper para obtener imagen de extras con fallbacks inteligentes
 * @param {Object} extra - Objeto extra con datos de imagen
 * @param {Object} imageMap - Mapeo de imágenes locales
 * @param {string} defaultImage - Imagen por defecto
 * @returns {string} - URL de la imagen a utilizar
 */
export const getImageForExtra = (extra, imageMap = {}, defaultImage = null) => {
  // 1. Si el extra tiene imagen_url del serializer optimizado
  if (
    extra.imagen_url &&
    typeof extra.imagen_url === 'string' &&
    extra.imagen_url.trim() !== ''
  ) {
    return extra.imagen_url;
  }

  // 2. Si el extra tiene estructura de imagen del universal mapper
  if (extra.imagen && typeof extra.imagen === 'object') {
    return extra.imagen.original || extra.imagen.placeholder;
  }

  // 3. Si el extra tiene imagen directa del Django admin, usarla
  if (
    extra.imagen &&
    typeof extra.imagen === 'string' &&
    extra.imagen.trim() !== ''
  ) {
    // Si la imagen ya es una URL completa, usarla directamente
    if (extra.imagen.startsWith('http')) {
      return extra.imagen;
    }
    // Si es una ruta relativa, construir la URL completa
    const baseUrl =
      process.env.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_URL?.replace('/api', '') ||
      window.location.origin;
    return `${baseUrl}${extra.imagen.startsWith('/') ? '' : '/media/extras/'}${
      extra.imagen
    }`;
  }

  // 4. Fallback a imagen local basada en palabras clave
  if (Object.keys(imageMap).length > 0) {
    const nombre = extra.nombre?.toLowerCase() || '';
    const categoria = extra.categoria?.toLowerCase() || '';

    // Buscar por palabras clave en el nombre o categoría
    for (const [key, image] of Object.entries(imageMap)) {
      if (nombre.includes(key) || categoria.includes(key)) {
        return image;
      }
    }
  }

  // 5. Imagen por defecto si no se encuentra ninguna coincidencia
  return (
    defaultImage ||
    'https://via.placeholder.com/80x80/f3e5f5/7b1fa2.png?text=Extra'
  );
};

// ========================================
// FUNCIONES DE DEBUG
// ========================================

/**
 * Función de debug para datos del backend
 * @param {any} data - Datos a debuggear
 * @param {string} context - Contexto de la operación
 */
export const debugBackendData = (data, context) => {
  if (DEBUG_MODE) {
    logger.info(`[DEBUG] ${context}:`, {
      data,
      timestamp: new Date().toISOString(),
      context,
    });
  }
};

/**
 * Función de debug para sessionStorage
 */
export const debugSessionStorage = () => {
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
};

// ========================================
// FUNCIONES DE UTILIDAD GENERAL
// ========================================

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

// utils/formatters.js - MIGRADO AL MAPPER UNIVERSAL

/**
 * Formatea un valor numérico como moneda - MIGRADO AL MAPPER UNIVERSAL
 * @deprecated Usar universalMapper.formatCurrency en su lugar
 * @param {number|string} value - El valor numérico a formatear
 * @param {Object} options - Opciones de formateo
 * @returns {string} - Cadena formateada como moneda
 */
export function formatCurrency(
  value,
  {
    locale = 'es-ES',
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = {},
) {
  logger.warn(
    '[DEPRECATED] func.formatCurrency - usar universalMapper.formatCurrency en su lugar',
  );

  // Usar el mapper universal con fallback a la implementación local
  try {
    return universalMapper.formatCurrency(value, currency);
  } catch (error) {
    // Fallback a implementación local si hay error
    let numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(numberValue)) {
      logger.warn(`[formatCurrency] Valor inválido: ${value}`);
      return '';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numberValue);
  }
}
