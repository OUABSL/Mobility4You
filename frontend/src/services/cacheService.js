// src/services/cacheService.js

/**
 * Servicio de caché global para evitar llamadas duplicadas a la API
 * Implementa un sistema de caché en memoria con invalidación automática
 */

// Cache global para almacenar datos en memoria
const dataCache = new Map();
const pendingRequests = new Map();

// Configuración de caché por tipo de dato
const CACHE_CONFIG = {
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
  }
};

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
  
  console.log(`📦 [CACHE HIT] ${cacheKey} - datos válidos hasta`, new Date(cached.expiry));
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
    timestamp: Date.now()
  });
  console.log(`💾 [CACHE SET] ${cacheKey} - válido hasta`, new Date(expiry));
};

/**
 * Invalida el caché para una clave específica
 * @param {string} cacheKey - Clave del caché a invalidar
 */
const invalidateCache = (cacheKey) => {
  dataCache.delete(cacheKey);
  console.log(`🗑️ [CACHE INVALIDATED] ${cacheKey}`);
};

/**
 * Limpia todo el caché
 */
const clearAllCache = () => {
  dataCache.clear();
  pendingRequests.clear();
  console.log('🧹 [CACHE CLEARED] Todo el caché ha sido limpiado');
};

/**
 * Ejecuta una función con caché automático
 * Evita llamadas duplicadas usando promesas pendientes
 * @param {string} dataType - Tipo de dato (locations, cars, etc.)
 * @param {Function} fetchFunction - Función que obtiene los datos
 * @returns {Promise<any>} - Datos obtenidos
 */
const withCache = async (dataType, fetchFunction) => {
  const config = CACHE_CONFIG[dataType];
  if (!config) {
    throw new Error(`Tipo de dato no configurado: ${dataType}`);
  }

  const { key: cacheKey, ttl } = config;

  // 1. Verificar si hay datos en caché válidos
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // 2. Verificar si hay una petición pendiente para evitar duplicados
  if (pendingRequests.has(cacheKey)) {
    console.log(`⏳ [CACHE PENDING] Esperando petición en curso para ${cacheKey}`);
    return await pendingRequests.get(cacheKey);
  }

  // 3. Crear nueva petición y almacenarla como pendiente
  const fetchPromise = (async () => {
    try {
      console.log(`🌐 [CACHE FETCH] Obteniendo datos frescos para ${cacheKey}`);
      const data = await fetchFunction();
      
      // Almacenar en caché solo si la respuesta es válida
      if (data && (Array.isArray(data) ? data.length > 0 : true)) {
        setCachedData(cacheKey, data, ttl);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ [CACHE ERROR] Error obteniendo ${cacheKey}:`, error.message);
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
    entries: []
  };

  for (const [key, value] of dataCache.entries()) {
    const isExpired = Date.now() > value.expiry;
    stats.entries.push({
      key,
      isExpired,
      timestamp: new Date(value.timestamp),
      expiry: new Date(value.expiry),
      dataSize: Array.isArray(value.data) ? value.data.length : 1
    });
  }

  return stats;
};

export {
  withCache,
  getCachedData,
  setCachedData,
  invalidateCache,
  clearAllCache,
  invalidateRelatedCache,
  getCacheStats,
  CACHE_CONFIG
};
