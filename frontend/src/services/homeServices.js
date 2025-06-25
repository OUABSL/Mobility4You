import {
  shouldUseTestingData,
  testingCaracteristicas,
  testingDestinos,
  testingEstadisticas,
  testingLocationsData,
  testingTestimonios,
} from '../assets/testingData/testingData';
import axios from '../config/axiosConfig';
import { withCache } from './cacheService';
import { withTimeout } from './func';
import universalMapper from './universalDataMapper';

// ========================================
// CONFIGURACIÓN Y CONSTANTES
// ========================================
import { API_URLS, createServiceLogger, DEBUG_MODE } from '../config/appConfig';

const API_URL = API_URLS.BASE;

// Crear logger para el servicio
const logger = createServiceLogger('HOME_SERVICE');

// Helper functions para logging condicional
const logInfo = (message, data = null) => {
  if (DEBUG_MODE) {
    logger.info(message, data);
  }
};

const logError = (message, error = null) => {
  if (DEBUG_MODE) {
    logger.error(message, error);
  }
};

// ========================================
// FUNCIONES DE DATOS - MIGRADAS A MAPPER UNIVERSAL
// ========================================

/**
 * Obtiene las ubicaciones disponibles para mostrar en componentes del home
 * MIGRADO: Usa el mapper universal y prioriza base de datos
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de ubicaciones
 */
const fetchLocations = async () => {
  return await withCache('locations', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando ubicaciones desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/lugares/lugares/`, {
          params: { activo: true },
        }),
        8000,
      );

      // Normalizar respuesta
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        if (dataArray?.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray?.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          throw new Error('Estructura de datos inesperada');
        }
      }

      // Usar el mapper universal
      const mappedData = await universalMapper.mapLocations(
        dataArray.filter((item) => item && item.activo !== false),
      );

      logInfo('Ubicaciones cargadas desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar ubicaciones desde BD', error);

      // FALLBACK: Solo si DEBUG_MODE está activo Y el backend falló
      if (shouldUseTestingData(true)) {
        logInfo(
          'DEBUG_MODE activo - usando ubicaciones de testing como fallback',
        );
        return await universalMapper.mapLocations(testingLocationsData);
      }

      // EN PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de ubicaciones disponibles');
      throw new Error(
        'Error al cargar ubicaciones. Por favor, intente nuevamente.',
      );
    }
  });
};

/**
 * Obtiene las estadísticas para mostrar en el home
 * MIGRADO: Usa el mapper universal y prioriza base de datos
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de estadísticas
 */
const fetchEstadisticas = async () => {
  return await withCache('stats', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando estadísticas desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/comunicacion/estadisticas/`, {
          params: { activo: true },
        }),
        8000,
      );

      // Normalizar respuesta
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        if (dataArray?.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray?.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          throw new Error('Estructura de datos inesperada');
        }
      }

      // Usar el mapper universal
      const mappedData = await universalMapper.mapStatistics(
        dataArray.filter((item) => item && item.activo),
      );

      logInfo('Estadísticas cargadas desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar estadísticas desde BD', error);

      // FALLBACK: Solo si DEBUG_MODE está activo Y el backend falló
      if (shouldUseTestingData(true)) {
        logInfo(
          'DEBUG_MODE activo - usando estadísticas de testing como fallback',
        );
        return await universalMapper.mapStatistics(testingEstadisticas);
      }

      // EN PRODUCCIÓN: Error sin fallback
      logError(
        'Error en producción - no hay datos de estadísticas disponibles',
      );
      throw new Error(
        'Error al cargar estadísticas. Por favor, intente nuevamente.',
      );
    }
  });
};

/**
 * Obtiene las características para mostrar en el home
 * MIGRADO: Usa el mapper universal y prioriza base de datos
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de características
 */
const fetchCaracteristicas = async () => {
  return await withCache('features', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando características desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/comunicacion/caracteristicas/`, {
          params: { activo: true },
        }),
        8000,
      );

      // Normalizar respuesta
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        if (dataArray?.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray?.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          throw new Error('Estructura de datos inesperada');
        }
      }

      // Usar el mapper universal
      const mappedData = await universalMapper.mapFeatures(
        dataArray.filter((item) => item && item.activo),
      );

      logInfo('Características cargadas desde BD', {
        count: mappedData.length,
      });
      return mappedData;
    } catch (error) {
      logError('Error al consultar características desde BD', error);

      // FALLBACK: Solo si DEBUG_MODE está activo Y el backend falló
      if (shouldUseTestingData(true)) {
        logInfo(
          'DEBUG_MODE activo - usando características de testing como fallback',
        );
        return await universalMapper.mapFeatures(testingCaracteristicas);
      }

      // EN PRODUCCIÓN: Error sin fallback
      logError(
        'Error en producción - no hay datos de características disponibles',
      );
      throw new Error(
        'Error al cargar características. Por favor, intente nuevamente.',
      );
    }
  });
};

/**
 * Obtiene los testimonios para mostrar en el home
 * MODIFICADO: Usa el mapper universal - configuración temporal con datos de testing
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de testimonios
 */
const fetchTestimonios = async () => {
  logInfo('Iniciando fetchTestimonios con mapper universal');
  return await withCache('testimonials', async () => {
    try {
      // CONFIGURACIÓN TEMPORAL: Siempre usar datos de testing para testimonios
      logInfo('Usando testimonios de testing data (configuración temporal)');

      // Usar el mapper universal para mapear testimonios
      const mappedTestimonios = await universalMapper.mapTestimonials(
        testingTestimonios,
      );

      logInfo('Testimonios mapeados con mapper universal', {
        count: mappedTestimonios.length,
      });

      return mappedTestimonios;
    } catch (error) {
      logError('Error al procesar testimonios', error);

      // Fallback básico
      return [
        {
          id: 1,
          nombre: 'Usuario Demo',
          ubicacion: 'España',
          rating: 5,
          comentario: 'Excelente servicio de alquiler de vehículos.',
          avatar: null,
        },
      ];
    }
  });
};

/**
 * Obtiene los destinos populares para mostrar en el home
 * MIGRADO: Usa el mapper universal y prioriza base de datos
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de destinos
 */
const fetchDestinos = async () => {
  return await withCache('destinations', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando destinos populares desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/lugares/lugares/`, {
          params: { popular: true, activo: true },
        }),
        8000,
      );

      // Normalizar respuesta
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        if (dataArray?.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray?.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          throw new Error('Estructura de datos inesperada');
        }
      }

      // Usar el mapper universal
      const mappedData = await universalMapper.mapDestinations(dataArray);

      logInfo('Destinos populares cargados desde BD', {
        count: mappedData.length,
      });
      return mappedData;
    } catch (error) {
      logError('Error al consultar destinos desde BD', error);

      // FALLBACK: Solo si DEBUG_MODE está activo Y el backend falló
      if (shouldUseTestingData(true)) {
        logInfo('DEBUG_MODE activo - usando destinos de testing como fallback');
        return await universalMapper.mapDestinations(testingDestinos);
      }

      // EN PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de destinos disponibles');
      throw new Error(
        'Error al cargar destinos. Por favor, intente nuevamente.',
      );
    }
  });
};

// ========================================
// EXPORTS
// ========================================
export {
  fetchCaracteristicas,
  fetchDestinos,
  fetchEstadisticas,
  fetchLocations,
  fetchTestimonios,
};
