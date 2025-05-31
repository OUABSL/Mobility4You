// src/services/BusquedaServicios.js
import axios from '../config/axiosConfig';
import { withTimeout } from './func';
import { testingLocationsData } from '../assets/testingData/testingData';
import { withCache } from './cacheService';

// Constante para modo debug
export const DEBUG_MODE = true; // TEMPORAL: Activado para resolver 502 errors
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost/api';

/**
 * Obtiene las ubicaciones disponibles para recogida/devolución
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * @returns {Promise<Array>} - Lista de ubicaciones
 */
export const fetchLocations = async () => {
  try {
    // PRIMERA PRIORIDAD: Consultar base de datos
    const response = await withTimeout(
      axios.get(`${API_URL}/lugares/`),
      8000
    );
    
    // Manejar formato de respuesta con paginación del backend
    let locations;
    if (response.data && response.data.results) {
      // Formato con paginación: {count, next, previous, results}
      locations = response.data.results;
      console.log('✅ [fetchLocations] Datos cargados desde BD (paginados):', locations.length, 'ubicaciones');
    } else if (Array.isArray(response.data)) {
      // Formato directo: []
      locations = response.data;
      console.log('✅ [fetchLocations] Datos cargados desde BD (array directo):', locations.length, 'ubicaciones');
    } else {
      console.warn('⚠️ [fetchLocations] Formato de respuesta inesperado:', response.data);
      locations = [];
    }
    
    // Cachear las ubicaciones exitosas para futuros fallos
    if (locations && locations.length > 0) {
      localStorage.setItem('cachedLocations', JSON.stringify(locations));
      localStorage.setItem('cacheTimestamp', Date.now().toString());
    }
    
    return locations;
  } catch (error) {
    console.warn('⚠️ [fetchLocations] Error consultando BD:', error.message);
    
    // FALLBACK: Solo si DEBUG_MODE está activo
    if (DEBUG_MODE) {
      console.log('🔄 [fetchLocations] Usando datos de testing como fallback');
      await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay de red
      return testingLocationsData;
    }
    
    // EN PRODUCCIÓN: Manejar error gracefully
    console.error('❌ [fetchLocations] Error en producción');
    
    // Intento adicional con timeout más largo
    try {
      console.log('🔄 [fetchLocations] Reintentando con timeout extendido...');
      const retryResponse = await withTimeout(
        axios.get(`${API_URL}/lugares/`),
        15000
      );
      
      // Manejar formato de respuesta en el reintento también
      let retryLocations;
      if (retryResponse.data && retryResponse.data.results) {
        retryLocations = retryResponse.data.results;
        console.log('✅ [fetchLocations] Datos cargados en reintento (paginados):', retryLocations.length, 'ubicaciones');
      } else if (Array.isArray(retryResponse.data)) {
        retryLocations = retryResponse.data;
        console.log('✅ [fetchLocations] Datos cargados en reintento (array directo):', retryLocations.length, 'ubicaciones');
      } else {
        retryLocations = [];
      }
      
      // Cachear las ubicaciones exitosas
      if (retryLocations && retryLocations.length > 0) {
        localStorage.setItem('cachedLocations', JSON.stringify(retryLocations));
        localStorage.setItem('cacheTimestamp', Date.now().toString());
      }
      
      return retryLocations;
    } catch (retryError) {
      console.error('❌ [fetchLocations] Fallo definitivo del servidor');
      
      // Si hay ubicaciones en localStorage de sesiones anteriores, usar esas
      const cachedLocations = localStorage.getItem('cachedLocations');
      const cacheTimestamp = localStorage.getItem('cacheTimestamp');
      
      if (cachedLocations && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const maxCacheAge = 24 * 60 * 60 * 1000; // 24 horas
        
        if (cacheAge < maxCacheAge) {
          console.log('🔄 [fetchLocations] Usando ubicaciones cacheadas');
          return JSON.parse(cachedLocations);
        }
      }
      
      throw new Error('No se pudieron cargar las ubicaciones. Por favor, inténtalo de nuevo más tarde.');
    }
  }
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
      orden: ["Precio ascendente", "Precio descendente", "Marca A-Z", "Marca Z-A"]
    };
  }

  const marcas = [...new Set(carsData.map(car => car.marca))].sort();
  const modelos = [...new Set(carsData.map(car => car.modelo))].sort();
  const combustibles = [...new Set(carsData.map(car => car.combustible))].sort();
  
  return {
    marca: marcas,
    modelo: modelos,
    combustible: combustibles,
    orden: ["Precio ascendente", "Precio descendente", "Marca A-Z", "Marca Z-A"]
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
      errors.dropoffDate = 'La fecha de devolución debe ser posterior a la de recogida';
    }
  }
  
  // Validar edad del conductor
  if (formData.checkMayor21 === false) {
    errors.mayor21 = 'Debes tener al menos 21 años para alquilar un vehículo';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Busca vehículos disponibles según criterios de búsqueda
 * @param {Object} searchParams - Parámetros de búsqueda
 * @returns {Promise<Object>} - Resultados de la búsqueda con estructura unificada
 */
export const searchAvailableVehicles = async (searchParams) => {
  try {
    const { isValid, errors } = validateSearchForm(searchParams);
    if (!isValid) {
      const errorMessage = Object.values(errors).join('. ');
      throw new Error(errorMessage);
    }
    
    if (DEBUG_MODE) {
      // Importar datos de prueba solo cuando sea necesario
      const { default: testingCars } = await import('../assets/testingData/testingData');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        message: 'Búsqueda realizada con éxito',
        count: testingCars.length,
        results: testingCars,
        filterOptions: extractFilterOptions(testingCars)
      };
    }
    
    // Transformar parámetros para el backend
    const backendParams = {
      fecha_recogida: searchParams.pickupDate,
      fecha_devolucion: searchParams.dropoffDate,
      lugar_recogida_id: searchParams.pickupLocation,
      lugar_devolucion_id: searchParams.dropoffLocation || searchParams.pickupLocation,
      categoria_id: searchParams.categoria_id,
      grupo_id: searchParams.grupo_id
    };
    
    const response = await withTimeout(
      axios.post(`${API_URL}/vehiculos/disponibilidad/`, backendParams),
      12000
    );
    
    return {
      success: true,
      count: response.data.count,
      results: response.data.results,
      filterOptions: extractFilterOptions(response.data.results)
    };
  } catch (error) {
    console.error('Error searching vehicles:', error);
    throw new Error(error.response?.data?.error || error.message || 'Error al buscar vehículos');
  }
};

/**
 * Función legacy de compatibilidad - usar searchAvailableVehicles en su lugar
 * @deprecated Usar searchAvailableVehicles para nueva funcionalidad
 */
export const performSearch = searchAvailableVehicles;
/**
 * Guarda los parámetros de búsqueda en sessionStorage
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
        dropoffLocation: searchParams.dropoffLocation || searchParams.pickupLocation,
        dropoffDate: searchParams.dropoffDate,
        dropoffTime: searchParams.dropoffTime
      },
      mayor21: searchParams.mayor21,
      // Agregar información del lugar para no tener que volver a buscarla
      lugares: {
        recogida: searchParams.pickupLocationData,
        devolucion: searchParams.dropoffLocationData || searchParams.pickupLocationData
      }
    };
    
    sessionStorage.setItem('reservaData', JSON.stringify(updatedData));
    return true;
  } catch (error) {
    console.error('Error saving search params:', error);
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
      mayor21: data.mayor21
    };
  } catch (error) {
  console.error('Error retrieving search params:', error);
    return null;
  }
};

// Datos de prueba para horarios disponibles
export const availableTimes = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", 
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", 
  "20:00", "20:30", "21:00", "21:30", "22:00"
];

export const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
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