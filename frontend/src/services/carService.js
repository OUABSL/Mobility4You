import testingCars from '../assets/testingData/testingData';
import { API_URL, createServiceLogger, shouldUseTestingData } from '../config/appConfig';
import axios from '../config/axiosConfig';
import { withCache } from './cacheService';
import { withTimeout } from './func';
import {
  extractFilterOptions,
  searchAvailableVehicles,
} from './searchServices';
import universalMapper from './universalDataMapper';

// Crear logger para el servicio de carros
const logger = createServiceLogger('CAR_SERVICE');



/**
 * Busca vehículos disponibles según criterios (usa servicio unificado)
 * @param {Object} searchParams - Parámetros de búsqueda
 * @returns {Promise<Object>} - Resultados de la búsqueda
 */
export const searchAvailableVehiclesFromCars = searchAvailableVehicles;

/**
 * Fetch principal para obtener coches (testing o API real)
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas a la API
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * ACTUALIZADO: Usa el mapper universal para la transformación de datos
 * @param {Object} filterValues - Valores de filtro
 * @returns {Promise<Object>} - Resultados con coches, total y opciones de filtro
 */
export const fetchCarsService = async (filterValues = {}) => {
  // Crear una clave única basada en los filtros para caché inteligente
  const cacheKey = `cars_${JSON.stringify(filterValues)}`;

  return await withCache(
    'cars',
    async () => {
      try {
        // PRIMERA PRIORIDAD: Intentar consultar la API real
        logger.info(
          '🔍 [fetchCarsService] Consultando API con filtros:',
          filterValues,
        );

        const response = await withTimeout(
          axios.get(`${API_URL}/vehiculos/`, {
            params: filterValues,
          }),
          10000,
        );

        // Manejar tanto estructura antigua como nueva usando el mapper universal
        const data = response.data;
        const rawCars = data.results || data.cars || [];
        const count = data.count || data.total || 0;

        // Usar el mapper universal para transformar los datos de vehículos
        const mappedCars = await universalMapper.mapVehicles(rawCars);
        const filterOptions =
          data.filterOptions || extractFilterOptions(mappedCars);

        logger.info(
          '✅ [fetchCarsService] Datos cargados desde API y mapeados:',
          mappedCars.length,
          'vehículos',
        );

        return {
          cars: mappedCars,
          total: count,
          filterOptions,
          success: data.success !== undefined ? data.success : true,
        };
      } catch (error) {
        logger.warn(
          '⚠️ [fetchCarsService] Error consultando API:',
          error.message,
        );

        // FALLBACK: Solo si DEBUG_MODE está activo Y backend falló
        if (shouldUseTestingData(true)) {
          logger.info(
            '🔄 [fetchCarsService] DEBUG_MODE activo y backend falló - usando datos de testing como fallback',
          );

          // Usar el mapper universal para mapear los datos de testing
          const mappedTestingCars = await universalMapper.mapVehicles(
            testingCars,
          );
          let filteredCars = [...mappedTestingCars];

          // Aplicar filtros
          if (filterValues.marca) {
            filteredCars = filteredCars.filter(
              (car) => car.marca === filterValues.marca,
            );
          }
          if (filterValues.modelo) {
            filteredCars = filteredCars.filter(
              (car) => car.modelo === filterValues.modelo,
            );
          }
          if (filterValues.combustible) {
            filteredCars = filteredCars.filter(
              (car) => car.combustible === filterValues.combustible,
            );
          }

          // Aplicar ordenación
          if (filterValues.orden) {
            switch (filterValues.orden) {
              case 'Precio ascendente':
                filteredCars.sort((a, b) => a.precio_dia - b.precio_dia);
                break;
              case 'Precio descendente':
                filteredCars.sort((a, b) => b.precio_dia - a.precio_dia);
                break;
              case 'Marca A-Z':
                filteredCars.sort((a, b) => a.marca.localeCompare(b.marca));
                break;
              case 'Marca Z-A':
                filteredCars.sort((a, b) => b.marca.localeCompare(a.marca));
                break;
              default:
                break;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 300)); // Simular delay de red

          return {
            cars: filteredCars,
            total: mappedTestingCars.length,
            filterOptions: extractFilterOptions(mappedTestingCars),
          };
        }

        // EN PRODUCCIÓN: Manejar error gracefully sin fallback
        logger.error(
          '❌ [fetchCarsService] Error en producción - no hay fallback disponible',
        );
        let message =
          'No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.';
        if (error.code === 'ECONNABORTED') {
          message = 'La solicitud ha tardado demasiado. Intenta de nuevo.';
        } else if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          message = error.response.data.message;
        }
        throw new Error(message);
      }
    },
    15,
  ); // Cache por 15 minutos para datos de vehículos
};
