import axios from '../config/axiosConfig';
import { withTimeout } from './func';
import { searchAvailableVehicles, extractFilterOptions } from './searchServices';
import { withCache } from './cacheService';

// Configuración de API y modo testing
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';
// Usar DEBUG_MODE de manera consistente con otros servicios
const DEBUG_MODE = true; // TEMPORAL: Activado para resolver 502 errors

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
 * @param {Object} filterValues - Valores de filtro
 * @returns {Promise<Object>} - Resultados con coches, total y opciones de filtro
 */
export const fetchCarsService = async (filterValues = {}) => {
  // Crear una clave única basada en los filtros para caché inteligente
  const cacheKey = `cars_${JSON.stringify(filterValues)}`;
  
  return await withCache('cars', async () => {
    try {
      // PRIMERA PRIORIDAD: Intentar consultar la API real
      console.log('🔍 [fetchCarsService] Consultando API con filtros:', filterValues);
      
      const response = await withTimeout(
        axios.get(`${API_URL}/vehiculos/`, {
          params: filterValues
        }),
        10000
      );
      
      // Manejar tanto estructura antigua como nueva
      const data = response.data;
      const cars = data.results || data.cars || [];
      const count = data.count || data.total || 0;
      const filterOptions = data.filterOptions || extractFilterOptions(cars);
      
      console.log('✅ [fetchCarsService] Datos cargados desde API:', cars.length, 'vehículos');
      
      return {
        cars,
        total: count,
        filterOptions,
        success: data.success !== undefined ? data.success : true
      };
      
    } catch (error) {
      console.warn('⚠️ [fetchCarsService] Error consultando API:', error.message);
      
      // FALLBACK: Solo si DEBUG_MODE está activo
      if (DEBUG_MODE) {
        console.log('🔄 [fetchCarsService] Usando datos de testing como fallback');
        
        // Importar datos de prueba solo cuando sea necesario
        const { default: testingCars } = await import('../assets/testingData/testingData');
        let filteredCars = [...testingCars];
        
        // Aplicar filtros
        if (filterValues.marca) {
          filteredCars = filteredCars.filter(car => car.marca === filterValues.marca);
        }
        if (filterValues.modelo) {
          filteredCars = filteredCars.filter(car => car.modelo === filterValues.modelo);
        }
        if (filterValues.combustible) {
          filteredCars = filteredCars.filter(car => car.combustible === filterValues.combustible);
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
        
        await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay de red
        
        return {
          cars: filteredCars,
          total: testingCars.length,
          filterOptions: extractFilterOptions(testingCars)
        };
      }
      
      // EN PRODUCCIÓN: Manejar error gracefully
      console.error('❌ [fetchCarsService] Error en producción');
      let message = 'No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.';
      if (error.code === 'ECONNABORTED') {
        message = 'La solicitud ha tardado demasiado. Intenta de nuevo.';
      } else if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      }
      throw new Error(message);
    }
  }, 15); // Cache por 15 minutos para datos de vehículos
};