import axios from '../config/axiosConfig';
import { withTimeout } from './func';
import { searchAvailableVehicles, extractFilterOptions } from './searchServices';

// Configuración de API y modo testing
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';
const IS_TESTING = process.env.REACT_APP_TESTING === 'on' || process.env.NODE_ENV === 'development';

/**
 * Busca vehículos disponibles según criterios (usa servicio unificado)
 * @param {Object} searchParams - Parámetros de búsqueda
 * @returns {Promise<Object>} - Resultados de la búsqueda
 */
export const searchAvailableVehiclesFromCars = searchAvailableVehicles;

// Fetch principal para obtener coches (testing o API real)
export const fetchCarsService = async (filterValues = {}) => {
  try {
    if (IS_TESTING) {
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
      
      return {
        cars: filteredCars,
        total: testingCars.length,
        filterOptions: extractFilterOptions(testingCars)
      };
    } else {      const response = await withTimeout(
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
      
      return {
        cars,
        total: count,
        filterOptions,
        success: data.success !== undefined ? data.success : true
      };
    }
  } catch (error) {
    let message = 'No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.';
    if (error.code === 'ECONNABORTED') {
      message = 'La solicitud ha tardado demasiado. Intenta de nuevo.';
    } else if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    }
    throw new Error(message);
  }
};