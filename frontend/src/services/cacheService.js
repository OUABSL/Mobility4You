// src/services/cacheService.js

import { CACHE_CONFIG, createServiceLogger } from '../config/appConfig';

/**
 * Servicio de caché global para evitar llamadas duplicadas a la API
 * Implementa un sistema de caché en memoria con invalidación automática
 */

// Cache global para almacenar datos en memoria
const dataCache = new Map();
const pendingRequests = new Map();

// Crear logger para el servicio de caché
const logger = createServiceLogger('CACHE');

/**
 * Obtiene datos del caché si están vigentes
 * @param {string} cacheKey - Clave del caché
 * @returns {any|null} - Datos del caché o null si no existen/están expirados
 */
const getCachedData = (cacheKey) => {
  const cached = dataCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.expiry) {
    dataCache.delete(cacheKey);
    return null;
  }

  logger.info(
    `📦 [CACHE HIT] ${cacheKey} - datos válidos hasta`,
    new Date(cached.expiry),
  );
  return cached.data;
};

/**
 * Almacena datos en el caché
 * @param {string} cacheKey - Clave del caché
 * @param {any} data - Datos a almacenar
 * @param {number} ttl - Time to live en milisegundos
 */
const setCachedData = (cacheKey, data, ttl) => {
  const expiry = Date.now() + ttl;
  dataCache.set(cacheKey, {
    data,
    expiry,
    timestamp: Date.now(),
  });
  logger.info(`💾 [CACHE SET] ${cacheKey} - válido hasta`, new Date(expiry));
};

/**
 * Invalida el caché para una clave específica
 * @param {string} cacheKey - Clave del caché a invalidar
 */
const invalidateCache = (cacheKey) => {
  dataCache.delete(cacheKey);
  logger.info(`🗑️ [CACHE INVALIDATED] ${cacheKey}`);
};

/**
 * Invalida todas las claves de caché que coincidan con un patrón
 * @param {string} pattern - Patrón para buscar claves (ej: 'search_')
 */
const invalidateCacheByPattern = (pattern) => {
  let deletedCount = 0;
  for (const [key] of dataCache.entries()) {
    if (key.includes(pattern)) {
      dataCache.delete(key);
      deletedCount++;
    }
  }
  logger.info(
    `🗑️ [CACHE PATTERN INVALIDATED] ${deletedCount} entradas eliminadas con patrón: ${pattern}`,
  );
};

/**
 * Limpia todo el caché
 */
const clearAllCache = () => {
  dataCache.clear();
  pendingRequests.clear();
  logger.info('🧹 [CACHE CLEARED] Todo el caché ha sido limpiado');
};

/**
 * Ejecuta una función con caché automático
 * Evita llamadas duplicadas usando promesas pendientes
 * @param {string} dataType - Tipo de dato (locations, cars, etc.) o clave única
 * @param {Function} fetchFunction - Función que obtiene los datos
 * @param {number} customTTL - TTL personalizado en minutos (opcional)
 * @returns {Promise<any>} - Datos obtenidos
 */
const withCache = async (dataType, fetchFunction, customTTL = null) => {
  // Para claves dinámicas (como búsquedas), usar directamente como clave
  let cacheKey = dataType;
  let ttl = customTTL ? customTTL * 60 * 1000 : 5 * 60 * 1000; // Default 5 minutos

  // Para tipos configurados, usar la configuración predefinida
  const config = CACHE_CONFIG[dataType];
  if (config) {
    cacheKey = config.key;
    ttl = customTTL ? customTTL * 60 * 1000 : config.ttl;
  } else if (dataType.startsWith('search_')) {
    // Para búsquedas, usar TTL corto (2 minutos)
    ttl = customTTL ? customTTL * 60 * 1000 : 2 * 60 * 1000;
    logger.info(`🔍 [CACHE] Búsqueda con TTL: ${ttl / 1000 / 60} minutos`);
  }

  // 1. Verificar si hay datos en caché válidos
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    logger.info(
      `✅ [CACHE HIT] ${cacheKey.substring(0, 50)}... - datos desde caché`,
    );
    return cachedData;
  }

  // 2. Verificar si hay una petición pendiente para evitar duplicados
  if (pendingRequests.has(cacheKey)) {
    logger.info(
      `⏳ [CACHE PENDING] Esperando petición en curso para ${cacheKey.substring(
        0,
        50,
      )}...`,
    );
    return await pendingRequests.get(cacheKey);
  }

  // 3. Crear nueva petición y almacenarla como pendiente
  const fetchPromise = (async () => {
    try {
      logger.info(
        `🌐 [CACHE FETCH] Obteniendo datos frescos para ${cacheKey.substring(
          0,
          50,
        )}...`,
      );
      const data = await fetchFunction();

      // Validar datos antes de almacenar en caché
      if (
        data &&
        (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)
      ) {
        setCachedData(cacheKey, data, ttl * 60 * 1000); // Convertir minutos a ms
        logger.info(
          `💾 [CACHE STORED] ${cacheKey} almacenado con TTL ${ttl} min`,
        );
      } else {
        logger.warn(
          `⚠️ [CACHE] Datos vacíos para ${cacheKey}, no se almacenan en caché`,
        );
      }

      return data;
    } catch (error) {
      logger.error(
        `❌ [CACHE ERROR] Error obteniendo ${cacheKey}:`,
        error.message,
      );

      // Manejo inteligente de errores de red
      if (
        error.code === 'ECONNABORTED' ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('Connection refused') ||
        error.message.includes('Network Error')
      ) {
        logger.warn(
          `🚫 [CACHE] Evitando reintento automático para ${cacheKey} debido a error de conexión`,
        );

        // Intentar obtener datos expirados como fallback
        const expiredData = dataCache.get(cacheKey);
        if (expiredData && expiredData.data) {
          logger.info(
            `🔄 [CACHE FALLBACK] Usando datos expirados para ${cacheKey}`,
          );
          return expiredData.data;
        }

        throw new Error(
          `Servicio temporalmente no disponible para ${dataType}. Intenta de nuevo en unos momentos.`,
        );
      }

      throw error;
    } finally {
      // Remover de peticiones pendientes
      pendingRequests.delete(cacheKey);
    }
  })();

  // Almacenar la promesa como pendiente
  pendingRequests.set(cacheKey, fetchPromise);

  return await fetchPromise;
};

/**
 * Hook para invalidar caché cuando cambian ciertos datos
 * @param {string} dataType - Tipo de dato que cambió
 */
const invalidateRelatedCache = (dataType) => {
  switch (dataType) {
    case 'locations':
      // Si cambian las ubicaciones, invalidar también destinos relacionados
      invalidateCache(CACHE_CONFIG.locations.key);
      invalidateCache(CACHE_CONFIG.destinations.key);
      break;
    case 'cars':
      invalidateCache(CACHE_CONFIG.cars.key);
      break;
    default:
      invalidateCache(CACHE_CONFIG[dataType]?.key);
  }
};

/**
 * Obtiene estadísticas del caché actual
 * @returns {Object} - Estadísticas del caché
 */
const getCacheStats = () => {
  const stats = {
    totalEntries: dataCache.size,
    pendingRequests: pendingRequests.size,
    entries: [],
  };

  for (const [key, value] of dataCache.entries()) {
    const isExpired = Date.now() > value.expiry;
    stats.entries.push({
      key,
      isExpired,
      timestamp: new Date(value.timestamp),
      expiry: new Date(value.expiry),
      dataSize: Array.isArray(value.data) ? value.data.length : 1,
    });
  }

  return stats;
};

export {
  clearAllCache,
  getCachedData,
  getCacheStats,
  invalidateCache,
  invalidateCacheByPattern,
  invalidateRelatedCache,
  setCachedData,
  withCache,
};
