// src/services/searchServices.js
import { testingLocationsData } from '../assets/testingData/testingData';
import {
  API_URL,
  createServiceLogger,
  shouldUseTestingData,
} from '../config/appConfig';
import axios from '../config/axiosConfig';
import { withTimeout } from '../utils';
import { withCache } from './cacheService';

// Crear logger para el servicio de búsqueda
const logger = createServiceLogger('SEARCH_SERVICE');

/**
 * Obtiene las ubicaciones disponibles para recogida/devolución
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de ubicaciones
 */
export const fetchLocations = async () => {
  return await withCache('locations', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos (rutas modulares)
      const response = await withTimeout(
        axios.get(`${API_URL}/lugares/lugares/`),
        8000,
      );

      // Manejar formato de respuesta estructurado del backend mejorado
      let locations;

      // Verificar si la respuesta tiene estructura de éxito
      if (response.data && response.data.success !== false) {
        if (response.data.results && Array.isArray(response.data.results)) {
          // Formato estructurado: {success: true, count: X, results: [...]}
          locations = response.data.results;
          logger.info(
            '✅ [fetchLocations] Datos cargados desde BD (estructura nueva):',
            locations.length,
            'ubicaciones',
          );
        } else if (Array.isArray(response.data)) {
          // Formato directo legacy: []
          locations = response.data;
          logger.info(
            '✅ [fetchLocations] Datos cargados desde BD (array directo):',
            locations.length,
            'ubicaciones',
          );
        } else {
          logger.warn(
            '⚠️ [fetchLocations] Formato de respuesta inesperado:',
            response.data,
          );
          locations = [];
        }
      } else {
        // El backend devolvió success: false
        logger.warn(
          '⚠️ [fetchLocations] Backend devolvió error:',
          response.data.message || response.data.error || 'Error desconocido',
        );
        locations = [];
      }

      // Guardar en localStorage como backup
      if (locations.length > 0) {
        try {
          localStorage.setItem('cachedLocations', JSON.stringify(locations));
          localStorage.setItem('cacheTimestamp', Date.now().toString());
        } catch (e) {
          logger.warn('⚠️ No se pudo guardar cache de ubicaciones:', e);
        }
      }

      return locations;
    } catch (error) {
      // Manejo mejorado de errores de axios
      let errorMessage = 'Error desconocido';
      let shouldUseFallback = false;
      if (error.response) {
        // El servidor respondió con un código de error
        const status = error.response.status;
        const data = error.response.data;

        if (data && data.message) {
          errorMessage = data.message;
        } else if (data && data.error) {
          errorMessage = data.error;
        } else {
          errorMessage = `Error HTTP ${status}: ${error.response.statusText}`;
        } // Para errores 404, no hay lugares disponibles
        if (status === 404) {
          logger.warn(
            '⚠️ [fetchLocations] No hay lugares disponibles en la base de datos',
          );
          // En caso de 404, devolver array vacío sin intentar fallbacks
          return [];
        }
        // Para errores 500, intentar fallback
        else if (status >= 500) {
          shouldUseFallback = true;
          logger.error('❌ [fetchLocations] Error del servidor:', errorMessage);
        } else if (status >= 400) {
          logger.warn('⚠️ [fetchLocations] Error del cliente:', errorMessage);
        }
      } else if (error.request) {
        // No hubo respuesta del servidor
        errorMessage = 'Sin respuesta del servidor';
        shouldUseFallback = true;
        logger.error('❌ [fetchLocations] Sin respuesta del servidor');
      } else {
        // Error en la configuración de la petición
        errorMessage = error.message;
        logger.error(
          '❌ [fetchLocations] Error de configuración:',
          errorMessage,
        );
      }

      // Intentar recuperación desde cache para errores de servidor
      if (shouldUseFallback) {
        logger.warn(
          '🔄 [fetchLocations] Intentando recuperación desde cache...',
        );

        try {
          const cachedLocations = localStorage.getItem('cachedLocations');
          const cacheTimestamp = localStorage.getItem('cacheTimestamp');

          if (cachedLocations && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            // Usar cache si tiene menos de 24 horas
            if (cacheAge < 24 * 60 * 60 * 1000) {
              logger.info(
                '✅ [fetchLocations] Usando ubicaciones cacheadas como fallback',
              );
              return JSON.parse(cachedLocations);
            } else {
              logger.warn('⚠️ [fetchLocations] Cache expirado (>24h)');
            }
          }
        } catch (cacheError) {
          logger.warn(
            '⚠️ [fetchLocations] Error accediendo al cache local:',
            cacheError,
          );
        }
      } // FALLBACK FINAL: Solo si DEBUG_MODE está activo Y el backend falló
      if (shouldUseFallback && shouldUseTestingData(true)) {
        logger.info(
          '🔄 [fetchLocations] Usando datos de testing como último recurso (DEBUG_MODE + backend error)',
        );
        await new Promise((resolve) => setTimeout(resolve, 300)); // Simular delay de red
        return testingLocationsData;
      }

      // EN PRODUCCIÓN: Devolver array vacío para evitar crashes
      logger.error(
        '❌ [fetchLocations] Sin fallbacks disponibles - modo producción o DEBUG_MODE desactivado',
      );
      return [];
    }
  });
};

/**
 * Extrae opciones únicas para los filtros
 * @param {Array} carsData - Array de coches
 * @returns {Object} - Opciones de filtrado
 */
export const extractFilterOptions = (carsData) => {
  if (!Array.isArray(carsData) || carsData.length === 0) {
    return {
      marca: [],
      modelo: [],
      combustible: [],
      orden: [
        'Precio ascendente',
        'Precio descendente',
        'Marca A-Z',
        'Marca Z-A',
      ],
    };
  }

  const marcas = [...new Set(carsData.map((car) => car.marca))].sort();
  const modelos = [...new Set(carsData.map((car) => car.modelo))].sort();
  const combustibles = [
    ...new Set(carsData.map((car) => car.combustible)),
  ].sort();

  return {
    marca: marcas,
    modelo: modelos,
    combustible: combustibles,
    orden: [
      'Precio ascendente',
      'Precio descendente',
      'Marca A-Z',
      'Marca Z-A',
    ],
  };
};

/**
 * Valida los datos del formulario de búsqueda
 * @param {Object} formData - Datos del formulario
 * @returns {Object} - {isValid, errors}
 */
export const validateSearchForm = (formData) => {
  const errors = {};

  // Validar ubicación de recogida
  if (!formData.pickupLocation) {
    errors.pickupLocation = 'Por favor, selecciona una ubicación de recogida';
  }

  // Validar fecha de recogida
  if (!formData.pickupDate) {
    errors.pickupDate = 'Por favor, selecciona una fecha de recogida';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pickupDate = new Date(formData.pickupDate);
    pickupDate.setHours(0, 0, 0, 0);

    if (pickupDate < today) {
      errors.pickupDate = 'La fecha de recogida no puede ser anterior a hoy';
    }
  }

  // Validar fecha de devolución
  if (!formData.dropoffDate) {
    errors.dropoffDate = 'Por favor, selecciona una fecha de devolución';
  } else {
    const pickupDate = new Date(formData.pickupDate);
    pickupDate.setHours(0, 0, 0, 0);
    const dropoffDate = new Date(formData.dropoffDate);
    dropoffDate.setHours(0, 0, 0, 0);

    if (dropoffDate < pickupDate) {
      errors.dropoffDate =
        'La fecha de devolución debe ser posterior a la de recogida';
    }
  }

  // Validar edad del conductor
  if (formData.checkMayor21 === false) {
    errors.mayor21 = 'Debes tener al menos 21 años para alquilar un vehículo';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Busca vehículos disponibles según criterios de búsqueda
 * UNIFICADO: Una sola llamada que obtiene vehículos disponibles para fechas específicas
 * OPTIMIZADO: Implementa caché y manejo de errores robusto
 * @param {Object} searchParams - Parámetros de búsqueda
 * @returns {Promise<Object>} - Resultados de la búsqueda con estructura unificada
 */
export const searchAvailableVehicles = async (searchParams) => {
  const searchKey = `search_${JSON.stringify(searchParams)}`;

  return await withCache(
    'search_results',
    async () => {
      try {
        const { isValid, errors } = validateSearchForm(searchParams);
        if (!isValid) {
          const errorMessage = Object.values(errors).join('. ');
          throw new Error(errorMessage);
        }

        logger.info(
          '🔍 [searchAvailableVehicles] Consultando disponibilidad en BD con parámetros:',
          searchParams,
        );

        // Asegurar que las fechas estén en formato ISO
        const formatearFecha = (fecha) => {
          if (!fecha) return null;
          const date = new Date(fecha);
          return date.toISOString();
        };

        // Transformar parámetros para el backend con formato mejorado
        const backendParams = {
          fecha_recogida: formatearFecha(searchParams.pickupDate),
          fecha_devolucion: formatearFecha(searchParams.dropoffDate),
          lugar_recogida_id: parseInt(searchParams.pickupLocation),
          lugar_devolucion_id: parseInt(
            searchParams.dropoffLocation || searchParams.pickupLocation,
          ),
          categoria_id: searchParams.categoria_id
            ? parseInt(searchParams.categoria_id)
            : undefined,
          grupo_id: searchParams.grupo_id
            ? parseInt(searchParams.grupo_id)
            : undefined,
        };

        // Limpiar parámetros undefined
        Object.keys(backendParams).forEach((key) => {
          if (backendParams[key] === undefined) {
            delete backendParams[key];
          }
        });

        // UNIFICADA: Una sola llamada para obtener vehículos disponibles
        const response = await withTimeout(
          axios.post(`${API_URL}/vehiculos/disponibilidad/`, backendParams),
          12000,
        );

        logger.info(
          '✅ [searchAvailableVehicles] Datos cargados desde BD:',
          response.data.count || 0,
          'vehículos disponibles',
        );

        // Validar estructura de respuesta
        if (!response.data || typeof response.data.success === 'undefined') {
          logger.warn('⚠️ Formato de respuesta inesperado:', response.data);
          // Intentar procesar de todos modos si hay datos
          if (response.data && Array.isArray(response.data.results)) {
            return {
              success: true,
              count: response.data.results.length,
              results: response.data.results,
              filterOptions: extractFilterOptions(response.data.results),
              message: 'Búsqueda completada',
            };
          }
          throw new Error('Formato de respuesta inválido del servidor');
        }

        if (!response.data.success) {
          const errorMsg =
            response.data.error ||
            response.data.message ||
            'Error en la búsqueda de vehículos';
          throw new Error(errorMsg);
        }

        // Manejar caso de cero resultados de forma elegante
        const results = response.data.results || [];
        const count = response.data.count || 0;

        if (count === 0) {
          logger.info(
            'ℹ️ [searchAvailableVehicles] No se encontraron vehículos disponibles para los criterios especificados',
          );
          return {
            success: true,
            count: 0,
            results: [],
            filterOptions: {},
            message:
              'No hay vehículos disponibles para las fechas y ubicación seleccionadas. Intenta con otras fechas o ubicaciones.',
            isEmpty: true,
          };
        }

        return {
          success: true,
          count,
          results,
          filterOptions:
            response.data.filterOptions || extractFilterOptions(results),
          message: `Se encontraron ${count} vehículo${
            count !== 1 ? 's' : ''
          } disponible${count !== 1 ? 's' : ''}`,
        };
      } catch (error) {
        logger.warn(
          '⚠️ [searchAvailableVehicles] Error consultando BD:',
          error.message,
        );

        // Mejorar manejo de errores específicos
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data;

          if (status === 400) {
            throw new Error(
              errorData.error ||
                errorData.message ||
                'Parámetros de búsqueda inválidos',
            );
          } else if (status === 404) {
            // 404 puede significar que no hay vehículos disponibles, no un error
            logger.info(
              'ℹ️ [searchAvailableVehicles] No hay vehículos disponibles (404)',
            );
            return {
              success: true,
              count: 0,
              results: [],
              filterOptions: {},
              message:
                'No hay vehículos disponibles para las fechas y ubicación seleccionadas.',
              isEmpty: true,
            };
          } else if (status >= 500) {
            throw new Error(
              'Error temporal del servidor. Intenta nuevamente en unos minutos.',
            );
          }
        }

        // Manejar errores de conectividad específicos
        if (error.code === 'ECONNABORTED') {
          throw new Error(
            'La búsqueda está tardando demasiado. Verifica tu conexión e intenta nuevamente.',
          );
        }

        if (error.message && error.message.includes('Network Error')) {
          throw new Error(
            'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
          );
        }

        // FALLBACK: Solo si DEBUG_MODE está activo
        if (shouldUseTestingData(true)) {
          logger.info(
            '🔄 [searchAvailableVehicles] Usando datos de testing como fallback',
          );

          const { testingCarsData } = await import(
            '../assets/testingData/testingData'
          );
          await new Promise((resolve) => setTimeout(resolve, 800));

          return {
            success: true,
            message: 'Búsqueda realizada con éxito (datos de testing)',
            count: testingCarsData.length,
            results: testingCarsData,
            filterOptions: extractFilterOptions(testingCarsData),
          };
        }

        // EN PRODUCCIÓN: Error claro al usuario
        throw new Error(
          error.message ||
            'Error al buscar vehículos disponibles. Verifica tu conexión e intenta nuevamente.',
        );
      }
    },
    5,
  ); // Cache por 5 minutos para búsquedas específicas
};

/**
 * Función legacy de compatibilidad - usar searchAvailableVehicles en su lugar
 * @deprecated Usar searchAvailableVehicles para nueva funcionalidad
 */
export const performSearch = searchAvailableVehicles;

/**
 * Guarda los parámetros de búsqueda en sessionStorage
 * MEJORADO: Asegura que siempre se guarde toda la información necesaria para el modo collapsed
 * @param {Object} searchParams - Parámetros de búsqueda
 */
export const saveSearchParams = (searchParams) => {
  try {
    const storedData = sessionStorage.getItem('reservaData') || '{}';
    const currentData = JSON.parse(storedData);

    // Actualizar con estructura consistente con el backend
    const updatedData = {
      ...currentData,
      fechas: {
        pickupLocation: searchParams.pickupLocation,
        pickupDate: searchParams.pickupDate,
        pickupTime: searchParams.pickupTime,
        dropoffLocation:
          searchParams.dropoffLocation || searchParams.pickupLocation,
        dropoffDate: searchParams.dropoffDate,
        dropoffTime: searchParams.dropoffTime,
      },
      mayor21: searchParams.mayor21,
      // MEJORADO: Siempre guardar información completa del lugar para el modo collapsed
      lugares: {
        recogida: searchParams.pickupLocationData || {
          id: searchParams.pickupLocation,
          nombre:
            searchParams.pickupLocationData?.nombre || 'Ubicación seleccionada',
        },
        devolucion: searchParams.dropoffLocationData ||
          searchParams.pickupLocationData || {
            id: searchParams.dropoffLocation || searchParams.pickupLocation,
            nombre:
              searchParams.dropoffLocationData?.nombre ||
              searchParams.pickupLocationData?.nombre ||
              'Ubicación seleccionada',
          },
      },
      // Añadir metadatos para mejor recuperación
      meta: {
        lastUpdated: new Date().toISOString(),
        showDropoffLocation:
          searchParams.dropoffLocation !== searchParams.pickupLocation,
        tipo: searchParams.tipo,
        grupo: searchParams.grupo,
      },
      grupo_id: searchParams.grupo_id,
    };

    sessionStorage.setItem('reservaData', JSON.stringify(updatedData));
    logger.info(
      '💾 [saveSearchParams] Datos guardados correctamente:',
      updatedData,
    );
    return true;
  } catch (error) {
    logger.error('❌ [saveSearchParams] Error saving search params:', error);
    return false;
  }
};

/**
 * Recupera los parámetros de búsqueda guardados
 * @returns {Object|null} - Parámetros de búsqueda o null si no hay
 */
export const getStoredSearchParams = () => {
  try {
    const storedData = sessionStorage.getItem('reservaData');
    if (!storedData) return null;

    const data = JSON.parse(storedData);
    if (!data.fechas) return null;

    return {
      pickupLocation: data.fechas.pickupLocation,
      pickupDate: new Date(data.fechas.pickupDate),
      pickupTime: data.fechas.pickupTime,
      dropoffLocation: data.fechas.dropoffLocation,
      dropoffDate: new Date(data.fechas.dropoffDate),
      dropoffTime: data.fechas.dropoffTime,
      mayor21: data.mayor21,
      grupo: data.meta?.grupo,
      grupo_id: data.grupo_id,
    };
  } catch (error) {
    logger.error('Error retrieving search params:', error);
    return null;
  }
};

// Datos de prueba para horarios disponibles
export const availableTimes = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
];

export const timeSlots = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
];

// ========================================
// DATOS ESTÁTICOS ELIMINADOS - MIGRACIÓN COMPLETADA
// ========================================
// Los datos de ubicaciones hardcodeados han sido migrados a:
// - Base de datos (fuente principal en producción)
// - testingData.js (fallback solo con DEBUG_MODE = true)
//
// Se eliminaron las siguientes constantes estáticas:
// - locationsData (array de ubicaciones hardcodeadas)
// - Cualquier otra data estática relacionada con ubicaciones
//
// El sistema ahora prioriza la base de datos y solo usa datos
// de testing cuando DEBUG_MODE = true Y la API falla
