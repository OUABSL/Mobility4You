// src/services/BusquedaServicios.js
import axios from 'axios';
import { withTimeout } from './func';

// Constante para modo debug
export const DEBUG_MODE = false; // Cambiar a false en producción
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

/**
 * Obtiene las ubicaciones disponibles para recogida/devolución
 * @returns {Promise<Array>} - Lista de ubicaciones
 */
export const fetchLocations = async () => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return locationsData;
    }
    
    // CAMBIADO: usar el endpoint correcto según urls.py
    const response = await withTimeout(
      axios.get(`${API_URL}/lugares/`),
      8000
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw new Error('No se pudieron cargar las ubicaciones. Por favor, inténtalo de nuevo más tarde.');
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

// src/services/dataMock.js
// Este archivo contiene datos de prueba para usar en modo debug

// Datos de prueba para ubicaciones
export const locationsData = [
  {
    id: 1,
    nombre: "Aeropuerto de Málaga (AGP)",
    icono_url: "faPlane",
    latitud: 36.6749,
    longitud: -4.4991,
    telefono: "+34 951 23 45 67",
    email: "malaga@mobility4you.com",
    direccion: {
      id: 1,
      calle: "Av. Comandante García Morato, s/n",
      ciudad: "málaga",
      provincia: "málaga", 
      pais: "españa",
      codigo_postal: "29004"
    }
  },
  {
    id: 2,
    nombre: "Centro de Málaga",
    icono_url: "faCity",
    latitud: 36.7213,
    longitud: -4.4214,
    telefono: "+34 951 23 45 68",
    email: "centro@mobility4you.com",
    direccion: {
      id: 2,
      calle: "Calle Larios, 1",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa", 
      codigo_postal: "29005"
    }
  },
  {
    id: 3,
    nombre: "Estación de Tren María Zambrano",
    icono_url: "faTrain",
    latitud: 36.7171,
    longitud: -4.4210,
    telefono: "+34 951 23 45 69",
    email: "estacion@mobility4you.com",
    direccion: {
      id: 3,
      calle: "Explanada de la Estación, s/n",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29002"
    }
  },
  {
    id: 4,
    nombre: "Puerto de Málaga",
    icono_url: "faShip",
    latitud: 36.7193,
    longitud: -4.4142,
    telefono: "+34 951 23 45 70",
    email: "puerto@mobility4you.com",
    direccion: {
      id: 4,
      calle: "Muelle Uno, s/n",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29001"
    }
  },
  {
    id: 5,
    nombre: "Marbella Centro",
    icono_url: "faCity",
    latitud: 36.5097,
    longitud: -4.8855,
    telefono: "+34 951 23 45 71",
    email: "marbella@mobility4you.com",
    direccion: {
      id: 5,
      calle: "Av. Ricardo Soriano, 2",
      ciudad: "marbella",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29601"
    }
  }
];