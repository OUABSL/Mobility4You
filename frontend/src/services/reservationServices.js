// src/services/reservationServices.js (agregar a las funciones existentes)
import axios from '../config/axiosConfig';

import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';
import { withTimeout } from './func';
import { fetchLocations } from './searchServices'; // Import para obtener ubicaciones

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Constante para modo debug
export const DEBUG_MODE = true; // TEMPORAL: Activado para resolver 502 errors

// Funciones de logging condicional
const logInfo = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`[RESERVATIONS] ${message}`, data);
  }
};

const logError = (message, error = null) => {
  if (DEBUG_MODE) {
    console.error(`[RESERVATIONS ERROR] ${message}`, error);
  }
};

// Helper function para obtener headers de autenticación
const getAuthHeaders = () => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
};

/*
  * Función para crear una nueva reserva
  * @param {Object} data - Datos de la reserva
  * @returns {Promise<Object>} - Reserva creada
  * @throws {Error} - Error si la reserva no se puede crear
  * @description
  * Esta función crea una nueva reserva. En modo DEBUG_MODE, simula la creación de una reserva
  * utilizando datos de prueba. En producción, realiza una llamada a la API para crear la reserva.
  * @example
  * const nuevaReserva = await createReservation(datosReserva);
  * console.log(nuevaReserva);
  * @returns {Promise<Object>} - Reserva creada
  * @throws {Error} - Error si la reserva no se puede crear
*/
export const createReservation = async (data) => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return crearReservaPrueba(data);
    }
      // Preparar datos con lógica de pagos
    const mappedData = await mapReservationDataToBackend(data);
    
    // Calcular importes según método de pago
    if (mappedData.metodo_pago === 'tarjeta') {
      mappedData.importe_pagado_inicial = mappedData.precio_total;
      mappedData.importe_pendiente_inicial = 0;
    } else { // efectivo
      mappedData.importe_pagado_inicial = 0;
      mappedData.importe_pendiente_inicial = mappedData.precio_total;
    }
      console.log('Sending reservation data:', mappedData);
    
    const response = await axios.post(`${API_URL}/reservations/create-new/`, mappedData, getAuthHeaders());
    return response.data;  } catch (error) {
    console.error('Error creating reservation:', error);
    console.error('Error response:', error.response);
    
    // Handle network errors (no response)
    if (!error.response) {
      throw new Error('Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.');
    }
    
    // Handle HTML error responses (like 404 pages)
    const contentType = error.response.headers?.['content-type'] || '';
    if (contentType.includes('text/html')) {
      const statusCode = error.response.status;
      let friendlyMessage = 'Error del servidor. Por favor, intente nuevamente.';
      
      switch (statusCode) {
        case 404:
          friendlyMessage = 'Servicio no encontrado. Por favor, contacte al soporte técnico.';
          break;
        case 500:
          friendlyMessage = 'Error interno del servidor. Por favor, intente nuevamente más tarde.';
          break;
        case 403:
          friendlyMessage = 'No tiene permisos para realizar esta acción.';
          break;
        case 401:
          friendlyMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
          break;
      }
      
      throw new Error(friendlyMessage);
    }
    
    // Handle JSON error responses
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.response?.data || 
                        error.message || 
                        'Error al crear la reserva.';
    
    // Si es un objeto de errores de validación, convertirlo a string legible
    if (typeof errorMessage === 'object' && errorMessage !== null) {
      const errorMessages = Object.entries(errorMessage)
        .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
        .join('; ');
      throw new Error(errorMessages || 'Error de validación al crear la reserva.');
    }
    
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al crear la reserva.');
  }
};


/**
 * Función para buscar una reserva por ID y email
 * @param {string} reservaId - ID de la reserva
 * @param {string} email - Email del cliente
 * @returns {Promise} - Promesa con los datos de la reserva
 */
export const findReservation = async (reservaId, email) => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const reserva = buscarReservaPrueba(reservaId);
      if (reserva && reserva.conductores.some(c => c.conductor.email === email)) {
        return reserva;
      }
      throw new Error('Reserva no encontrada con los datos proporcionados');
    }
    
    // En modo producción, usar la URL específica definida en backend/api/urls.py
    const response = await axios.post(`${API_URL}/reservations/${reservaId}/find/`, { email }, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error finding reservation:', error);
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data || 
                        error.message || 
                        'Error al buscar la reserva.';
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al buscar la reserva.');
  }
};


/**
 * Calcula el precio estimado de una reserva editada.
 * @param {Object} data - Datos de la reserva editada
 * @returns {Promise<Object>} - Objeto con originalPrice, newPrice y difference
 */
export const calculateReservationPrice = async (data) => {
  try {
    if (DEBUG_MODE) {
      const base = 316;
      const extras = (data.extras?.length || 0) * 10;
      const dateDiff = (data.fechaRecogida !== datosReservaPrueba.fechaRecogida || data.fechaDevolucion !== datosReservaPrueba.fechaDevolucion) ? 20 : 0;
      const newPrice = base + extras + dateDiff;
      return {
        originalPrice: base,
        newPrice,
        difference: newPrice - base
      };
    }
    
    // Mapear campos para el backend
    const mappedData = {
      vehiculo_id: data.vehiculo?.id || data.vehiculo_id,
      fecha_recogida: data.fechaRecogida || data.fecha_recogida,
      fecha_devolucion: data.fechaDevolucion || data.fecha_devolucion,
      lugar_recogida_id: data.lugarRecogida?.id || data.lugar_recogida_id,
      lugar_devolucion_id: data.lugarDevolucion?.id || data.lugar_devolucion_id,
      politica_pago_id: data.politicaPago?.id || data.politica_pago_id,
      extras: data.extras?.map(extra => typeof extra === 'object' ? extra.id : extra) || []
    };
    
    // Llamar al endpoint de cálculo
    const response = await axios.post(
      `${API_URL}/reservations/calculate-price/`, 
      mappedData, 
      getAuthHeaders()
    );
    
    return response.data;
  } catch (error) {
    console.error('Error calculating reservation price:', error);
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message || 
                        'Error al calcular el precio.';
    
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al calcular el precio.');
  }
};

/**
 * Edita una reserva existente.
 * @param {string} reservaId - ID de la reserva
 * @param {Object} data - Datos actualizados de la reserva
 * @returns {Promise<Object>} - Reserva actualizada
 */
export const editReservation = async (reservaId, data) => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const updated = editarReservaPrueba(reservaId, data);
      if (!updated) throw new Error('Reserva no encontrada para editar');
      return updated;
    }
      // Producción: llamada real a la API
    const mappedData = await mapReservationDataToBackend(data);
    const response = await axios.put(`${API_URL}/reservas/${reservaId}/`, mappedData, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error editing reservation:', error);
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data || 
                        error.message || 
                        'Error al editar la reserva.';
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al editar la reserva.');
  }
};

/**
 * Cancela una reserva existente.
 * @param {string} reservaId - ID de la reserva
 * @returns {Promise<void>}
 */
export const deleteReservation = async (reservaId) => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const idx = reservasPrueba.findIndex(r => r.id === reservaId);
      if (idx !== -1) reservasPrueba.splice(idx, 1);
      return;
    }
    
    // Producción: llamada real a la API
    await axios.post(`${API_URL}/reservas/${reservaId}/cancelar/`, {}, getAuthHeaders());  
  } catch (error) {
    console.error('Error canceling reservation:', error);
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data || 
                        error.message || 
                        'Error al cancelar la reserva.';
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al cancelar la reserva.');
  }
};

/**
 * Función para obtener todos los extras disponibles
 * @returns {Promise<Array>} - Lista de extras disponibles
 */
export const getExtrasDisponibles = async () => {
  try {
    if (DEBUG_MODE) {
      // Simular delay y devolver datos de prueba
      await new Promise(resolve => setTimeout(resolve, 300));
      return [
        {
          id: 1,
          nombre: 'Asiento infantil',
          descripcion: 'Para niños de 9-18kg (1-4 años)',
          precio: 7.50,
          disponible: true,
          categoria: 'seguridad'
        },
        {
          id: 2,
          nombre: 'GPS',
          descripcion: 'Navegador con mapas actualizados',
          precio: 8.95,
          disponible: true,
          categoria: 'navegacion'
        },
        {
          id: 3,
          nombre: 'Conductor adicional',
          descripcion: 'Añade un conductor adicional a tu reserva',
          precio: 5.00,
          disponible: true,
          categoria: 'conductor'
        },
        {
          id: 4,
          nombre: 'Wi-Fi portátil',
          descripcion: 'Conexión 4G en todo el vehículo',
          precio: 6.95,
          disponible: true,
          categoria: 'conectividad'
        }
      ];
    }    // Producción: llamada real a la API
    const response = await axios.get(`${API_URL}/extras/`, getAuthHeaders());
    
    // Manejar la respuesta que puede tener estructura {success: true, results: [...]} o ser directamente un array
    if (response.data && response.data.results) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Formato de respuesta inesperado');
    }
  } catch (error) {
    console.error('Error fetching extras:', error);
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message || 
                        'Error al obtener los extras disponibles.';
    
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al obtener los extras disponibles.');
  }
};

/**
 * Función para obtener extras disponibles (alias de getExtrasDisponibles)
 * @returns {Promise<Array>} - Lista de extras disponibles ordenados por disponibilidad
 */
export const getExtrasAvailable = async () => {
  try {
    if (DEBUG_MODE) {
      return await getExtrasDisponibles();
    }    // Producción: usar el endpoint específico para extras disponibles
    const response = await axios.get(`${API_URL}/extras/disponibles/`, getAuthHeaders());
    
    // Manejar la respuesta que puede tener estructura {success: true, results: [...]} o ser directamente un array
    if (response.data && response.data.results) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Formato de respuesta inesperado');
    }
  } catch (error) {
    console.error('Error fetching available extras:', error);
    // Fallback a la función principal si el endpoint específico falla
    return await getExtrasDisponibles();
  }
};

/**
 * Función para obtener extras ordenados por precio
 * @param {string} orden - 'asc' para ascendente, 'desc' para descendente
 * @returns {Promise<Array>} - Lista de extras ordenados por precio
 */
export const getExtrasPorPrecio = async (orden = 'asc') => {
  try {
    if (DEBUG_MODE) {
      const extras = await getExtrasDisponibles();
      return extras.sort((a, b) => orden === 'asc' ? a.precio - b.precio : b.precio - a.precio);
    }

    // Producción: usar el endpoint específico
    const response = await axios.get(`${API_URL}/extras/por_precio/?orden=${orden}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error fetching extras by price:', error);
    // Fallback a la función principal y ordenar localmente
    const extras = await getExtrasDisponibles();
    return extras.sort((a, b) => orden === 'asc' ? a.precio - b.precio : b.precio - a.precio);
  }
};

// Datos de prueba actualizados según esquema (usar el mismo que ya se usa en DetallesReserva)
export const datosReservaPrueba = {
  id: 'R12345678',
  estado: 'confirmada',
  fechaRecogida: '2025-05-14T12:30:00',
  fechaDevolucion: '2025-05-18T08:30:00',
  
  vehiculo: {
    id: 7,
    categoria_id: 2,
    grupo_id: 3,
    combustible: 'Diésel',
    marca: 'BMW',
    modelo: '320i',
    matricula: 'ABC1234',
    anio: 2023,
    color: 'Negro',
    num_puertas: 5,
    num_pasajeros: 5,
    capacidad_maletero: 480,
    disponible: 1,
    activo: 1,
    fianza: 0,
    kilometraje: 10500,
    categoria: {
      id: 2,
      nombre: 'Berlina Premium'
    },
    grupo: {
      id: 3,
      nombre: 'Segmento D',
      edad_minima: 21
    },
    imagenPrincipal: bmwImage,
    imagenes: [
      { id: 1, vehiculo_id: 7, url: bmwImage, portada: 1 }
    ]
  },
  
  lugarRecogida: {
    id: 1,
    nombre: 'Aeropuerto de Málaga (AGP)',
    direccion_id: 5,
    telefono: '+34 951 23 45 67',
    email: 'malaga@mobility4you.com',
    icono_url: 'faPlane',
    direccion: {
      id: 5,
      calle: 'Av. Comandante García Morato, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29004'
    }
  },
  lugarDevolucion: {
    id: 1,
    nombre: 'Aeropuerto de Málaga (AGP)',
    direccion_id: 5,
    telefono: '+34 951 23 45 67',
    email: 'malaga@mobility4you.com',
    icono_url: 'faPlane',
    direccion: {
      id: 5,
      calle: 'Av. Comandante García Morato, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29004'
    }
  },
  
  politicaPago: {
    id: 1,
    titulo: 'All Inclusive',
    deductible: 0,
    descripcion: 'Cobertura completa sin franquicia y con kilometraje ilimitado',
    items: [
      { politica_id: 1, item: 'Cobertura a todo riesgo sin franquicia', incluye: 1 },
      { politica_id: 1, item: 'Kilometraje ilimitado', incluye: 1 },
      { politica_id: 1, item: 'Asistencia en carretera 24/7', incluye: 1 },
      { politica_id: 1, item: 'Conductor adicional gratuito', incluye: 1 },
      { politica_id: 1, item: 'Cancelación gratuita hasta 24h antes', incluye: 1 },
      { politica_id: 1, item: 'Daños bajo efectos del alcohol o drogas', incluye: 0 }
    ],
    penalizaciones: [
      { 
        politica_pago_id: 1, 
        tipo_penalizacion_id: 1, 
        horas_previas: 24,
        tipo_penalizacion: {
          id: 1,
          nombre: 'cancelación',
          tipo_tarifa: 'porcentaje',
          valor_tarifa: 50.00,
          descripcion: 'Cancelación con menos de 24h: cargo del 50% del valor total'
        }
      }
    ]
  },
  
  extras: [
    { id: 1, nombre: 'Asiento infantil (Grupo 1)', precio: 25.00 },
    { id: 2, nombre: 'GPS navegador', precio: 15.00 }
  ],
  
  conductores: [
    {
      reserva_id: 'R12345678',
      conductor_id: 123,
      rol: 'principal',
      conductor: {
        id: 123,
        nombre: 'Juan',
        apellido: 'Pérez García',
        email: 'juan.perez@example.com',
        fecha_nacimiento: '1985-06-15',
        sexo: 'masculino',
        nacionalidad: 'española',
        tipo_documento: 'dni',
        numero_documento: '12345678A',
        telefono: '+34 600 123 456',
        direccion_id: 10,
        rol: 'cliente',
        idioma: 'es',
        activo: 1,
        registrado: 1,
        verificado: 1,
        direccion: {
          id: 10,
          calle: 'Calle Principal 123',
          ciudad: 'madrid',
          provincia: 'madrid',
          pais: 'españa',
          codigo_postal: '28001'
        }
      }
    },
    {
      reserva_id: 'R12345678',
      conductor_id: 124,
      rol: 'secundario',
      conductor: {
        id: 124,
        nombre: 'María',
        apellido: 'López Sánchez',
        email: 'maria.lopez@example.com',
        fecha_nacimiento: '1987-04-22',
        sexo: 'femenino',
        nacionalidad: 'española',
        tipo_documento: 'dni',
        numero_documento: '87654321B',
        telefono: '+34 600 789 012',
        direccion_id: 11,
        rol: 'cliente',
        idioma: 'es',
        activo: 1,
        registrado: 1,
        verificado: 1,
        direccion: {
          id: 11,
          calle: 'Calle Secundaria 456',
          ciudad: 'madrid',
          provincia: 'madrid',
          pais: 'españa',
          codigo_postal: '28002'
        }
      }
    }
  ],
  
  promocion: {
    id: 5,
    nombre: 'Descuento Mayo 2025',
    descuento_pct: 10.00,
    fecha_inicio: '2025-05-01',
    fecha_fin: '2025-05-31',
    activo: 1
  },
  
  penalizaciones: [],
  
  precio_dia: 79.00,
  precioBase: 316.00,
  precioExtras: 40.00,
  precioImpuestos: 74.76,
  descuentoPromocion: 35.60,
  precioTotal: 395.16,
  diferenciaPendiente: 0,
  metodoPagoDiferencia: null,
  diferenciaPagada: null,

  // NUEVOS CAMPOS DE CONTROL DE PAGOS
  metodo_pago: 'tarjeta', // o 'efectivo'
  importe_pagado_inicial: 395.16, // Si es tarjeta, todo pagado; si es efectivo, 0
  importe_pendiente_inicial: 0.00, // Si es tarjeta, 0; si es efectivo, todo el total
  importe_pagado_extra: 0.00, // Importe pagado posteriormente (extras/diferencias)
  importe_pendiente_extra: 0.00 // Importe pendiente de extras/diferencias
};

/**
 * Procesa el pago de una reserva usando Stripe
 * @param {string} reservaId - ID de la reserva
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} - Resultado del procesamiento de pago
 */
export const processPayment = async (reservaId, paymentData) => {
  try {
    logInfo('Procesando pago de reserva con Stripe', { reservaId, paymentData });
    
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular procesamiento exitoso
      return {
        success: true,
        message: 'Pago procesado correctamente (simulado)',
        reserva_id: reservaId,
        estado: 'confirmada',
        transaction_id: `STRIPE_MOCK_${Date.now()}`,
        payment_intent_id: `pi_mock_${Date.now()}`,
        importe_pendiente_total: 0
      };
    }
    
    // En producción, usar el servicio de Stripe
    const { processPaymentLegacy } = await import('./stripePaymentServices');
    const resultado = await processPaymentLegacy(reservaId, paymentData);
    
    if (resultado.success) {
      return {
        success: true,
        message: resultado.message,
        reserva_id: reservaId,
        estado: 'confirmada',
        transaction_id: resultado.transaction_id,
        payment_intent_id: resultado.payment_intent_id,
        importe_pendiente_total: 0
      };
    } else {
      throw new Error(resultado.error || 'Error procesando el pago');
    }
    
  } catch (error) {
    logError('Error procesando pago de reserva', error);
    throw new Error(error.message || 'Error al procesar el pago');
  }
};


// Array de reservas de prueba para simular flujo completo en DEBUG_MODE
let reservasPrueba = [ { ...datosReservaPrueba } ];

// Función para buscar una reserva en el array de prueba
function buscarReservaPrueba(reservaId) {
  return reservasPrueba.find(r => r.id === reservaId);
}

// Función para editar una reserva en el array de prueba
function editarReservaPrueba(reservaId, data) {
  const idx = reservasPrueba.findIndex(r => r.id === reservaId);
  if (idx === -1) return null;
  reservasPrueba[idx] = {
    ...reservasPrueba[idx],
    ...data,
    // Actualizar los nuevos campos de pagos si vienen en data
    metodo_pago: data.metodo_pago ?? reservasPrueba[idx].metodo_pago,
    importe_pagado_inicial: data.importe_pagado_inicial ?? reservasPrueba[idx].importe_pagado_inicial,
    importe_pendiente_inicial: data.importe_pendiente_inicial ?? reservasPrueba[idx].importe_pendiente_inicial,
    importe_pagado_extra: data.importe_pagado_extra ?? reservasPrueba[idx].importe_pagado_extra,
    importe_pendiente_extra: data.importe_pendiente_extra ?? reservasPrueba[idx].importe_pendiente_extra,
  };
  return reservasPrueba[idx];
}

// Función para crear una nueva reserva en el array de prueba
function crearReservaPrueba(data) {
  // Calcular importes según método de pago
  const metodoPago = data.metodo_pago || data.metodoPago || 'tarjeta';
  const precioTotal = data.precioTotal || 395.16;
  
  let importe_pagado_inicial = 0;
  let importe_pendiente_inicial = 0;
  
  if (metodoPago === 'tarjeta') {
    importe_pagado_inicial = precioTotal;
    importe_pendiente_inicial = 0;
  } else {
    importe_pagado_inicial = 0;
    importe_pendiente_inicial = precioTotal;
  }
  
  const nueva = {
    ...data,
    id: `R${Math.floor(Math.random()*1e8)}`,
    estado: metodoPago === 'tarjeta' ? 'confirmada' : 'pendiente',
    metodo_pago: metodoPago,
    importe_pagado_inicial,
    importe_pendiente_inicial,
    importe_pagado_extra: 0,
    importe_pendiente_extra: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  reservasPrueba.push(nueva);
  return nueva;
}

// Cache for locations to avoid repeated API calls
let locationsCache = null;

/**
 * Obtiene todas las ubicaciones disponibles con cache
 * @returns {Promise<Array>} Array de ubicaciones
 */
const getCachedLocations = async () => {
  if (!locationsCache) {
    try {
      locationsCache = await fetchLocations();
    } catch (error) {
      console.error('Error loading locations for lookup:', error);
      // Return empty array if locations can't be loaded
      locationsCache = [];
    }
  }
  return locationsCache;
};

/**
 * Busca el ID de una ubicación por su nombre
 * @param {string} locationName - Nombre de la ubicación 
 * @returns {Promise<number|null>} ID de la ubicación o null si no se encuentra
 */
const findLocationIdByName = async (locationName) => {
  if (!locationName || typeof locationName !== 'string') {
    return null;
  }

  try {
    const locations = await getCachedLocations();
    
    // First try exact match
    const exactMatch = locations.find(location => 
      location.nombre.toLowerCase() === locationName.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch.id;
    }

    // If no exact match, try partial match
    const partialMatch = locations.find(location =>
      location.nombre.toLowerCase().includes(locationName.toLowerCase()) ||
      locationName.toLowerCase().includes(location.nombre.toLowerCase())
    );

    if (partialMatch) {
      console.warn(`Location exact match not found for "${locationName}", using partial match: "${partialMatch.nombre}"`);
      return partialMatch.id;
    }

    console.error(`Location not found: "${locationName}"`);
    return null;
  } catch (error) {
    console.error('Error finding location ID:', error);
    return null;
  }
};

/**
 * Mapeo de datos de reserva del frontend (camelCase/anidado) a backend (snake_case/relacional)
 * @param {Object} data - Datos de la reserva desde el frontend
 * @returns {Object} - Datos mapeados para el backend
 */
export const mapReservationDataToBackend = async (data) => {  // Debug: Log the input data structure
  if (DEBUG_MODE) {
    console.log('🔍 [mapReservationDataToBackend] Input data structure:', {
      hasData: !!data,
      keys: data ? Object.keys(data) : [],
      vehicle: {
        hasCar: !!data.car,
        hasVehiculo: !!data.vehiculo,
        carId: data.car?.id,
        vehiculoId: data.vehiculo?.id
      },
      extras: {
        hasExtras: !!(data.extras || data.extrasSeleccionados),
        extrasCount: (data.extras || data.extrasSeleccionados || []).length,
        extrasTypes: (data.extras || data.extrasSeleccionados || []).map(e => 
          typeof e === 'object' ? `${e.id}(obj:${e.nombre})` : `${e}(id)`
        ),
        hasCompleteObjects: (data.extras || data.extrasSeleccionados || []).every(e => 
          typeof e === 'object' && e.nombre && e.precio
        )
      },
      locations: {
        hasFechas: !!data.fechas,
        hasLugarRecogida: !!data.lugarRecogida,
        hasLugarDevolucion: !!data.lugarDevolucion,
        fechasPickupLocationId: data.fechas?.pickupLocation?.id,
        fechasDropoffLocationId: data.fechas?.dropoffLocation?.id,
        lugarRecogidaId: data.lugarRecogida?.id,
        lugarDevolucionId: data.lugarDevolucion?.id
      },
      policy: {
        hasPoliticaPago: !!data.politicaPago,
        politicaPagoId: data.politicaPago?.id,
        hasPoliticaPagoId: !!data.politica_pago_id,
        politicaPagoIdValue: data.politica_pago_id
      },
      dates: {
        fechaRecogida: data.fechaRecogida,
        fechaDevolucion: data.fechaDevolucion,
        fechasPickupDate: data.fechas?.pickupDate,
        fechasDropoffDate: data.fechas?.dropoffDate
      }
    });
  }

  // Helper function to safely extract pricing from detallesReserva
  const extractPricing = (data) => {
    const detalles = data.detallesReserva;
    return {
      precio_base: detalles?.base || detalles?.precioBase || data.precioBase || data.precio_base || 0,
      precio_extras: detalles?.extras || detalles?.precioExtras || data.precioExtras || data.precio_extras || 0,
      precio_impuestos: detalles?.impuestos || detalles?.precioImpuestos || data.precioImpuestos || data.precio_impuestos || 0,
      descuento_promocion: detalles?.descuento || detalles?.descuentoPromocion || data.descuentoPromocion || data.descuento_promocion || 0,
      precio_total: detalles?.total || detalles?.precioTotal || data.precioTotal || data.precio_total || 0
    };
  };

  // Helper function to extract conductor data
  const extractConductorData = (data) => {
    const conductor = data.conductor || data.conductorPrincipal;
    if (!conductor) return [];

    return [{
      conductor_id: conductor.id || null,
      rol: 'principal',
      // Include conductor details for creation
      conductor: conductor.id ? null : {
        nombre: conductor.nombre || conductor.first_name || '',
        apellido: conductor.apellido || conductor.apellidos || conductor.last_name || '',
        email: conductor.email || '',
        fecha_nacimiento: conductor.fecha_nacimiento || conductor.fechaNacimiento || '',
        sexo: conductor.sexo || conductor.genero || '',
        nacionalidad: conductor.nacionalidad || '',
        tipo_documento: conductor.tipo_documento || conductor.tipoDocumento || 'dni',
        numero_documento: conductor.numero_documento || conductor.numeroDocumento || '',
        telefono: conductor.telefono || conductor.phone || '',
        direccion: conductor.direccion ? {
          calle: conductor.direccion.calle || conductor.direccion.direccion || '',
          ciudad: conductor.direccion.ciudad || '',
          provincia: conductor.direccion.provincia || '',
          pais: conductor.direccion.pais || '',
          codigo_postal: conductor.direccion.codigo_postal || conductor.direccion.codigoPostal || ''
        } : null
      }
    }];
  };
  // Extract pricing information
  const pricing = extractPricing(data);

  // Resolve location IDs if they come as strings
  let lugarRecogidaId = data.fechas?.pickupLocation?.id || data.lugarRecogida?.id || data.lugar_recogida_id || data.lugar_recogida;
  let lugarDevolucionId = data.fechas?.dropoffLocation?.id || data.lugarDevolucion?.id || data.lugar_devolucion_id || data.lugar_devolucion;

  // Check if locations are strings and need to be resolved to IDs
  if (typeof lugarRecogidaId === 'string') {
    if (DEBUG_MODE) {
      console.log('🔍 [mapReservationDataToBackend] Resolving pickup location string:', lugarRecogidaId);
    }
    lugarRecogidaId = await findLocationIdByName(lugarRecogidaId);
    if (DEBUG_MODE) {
      console.log('🔍 [mapReservationDataToBackend] Resolved pickup location ID:', lugarRecogidaId);
    }
  }

  if (typeof lugarDevolucionId === 'string') {
    if (DEBUG_MODE) {
      console.log('🔍 [mapReservationDataToBackend] Resolving dropoff location string:', lugarDevolucionId);
    }
    lugarDevolucionId = await findLocationIdByName(lugarDevolucionId);
    if (DEBUG_MODE) {
      console.log('🔍 [mapReservationDataToBackend] Resolved dropoff location ID:', lugarDevolucionId);
    }
  }

    // Mapea campos principales incluyendo nuevos campos de pago
  const mapped = {
    // Campos básicos de reserva (using _id suffix for foreign keys as expected by backend)
    vehiculo_id: data.car?.id || data.vehiculo?.id || data.vehiculo,
    lugar_recogida_id: lugarRecogidaId,
    lugar_devolucion_id: lugarDevolucionId,
    fecha_recogida: data.fechas?.pickupDate || data.fechaRecogida || data.fecha_recogida,
    fecha_devolucion: data.fechas?.dropoffDate || data.fechaDevolucion || data.fecha_devolucion,
    
    // Pricing information (extracted from detallesReserva or fallback)
    precio_dia: data.car?.precio_dia || data.precio_dia || 0,
    ...pricing,
    
    // Payment information
    metodo_pago: data.metodo_pago || data.metodoPago || 'tarjeta',
    importe_pagado_inicial: data.importe_pagado_inicial || 0,
    importe_pendiente_inicial: data.importe_pendiente_inicial || 0,
    importe_pagado_extra: data.importe_pagado_extra || 0,
    importe_pendiente_extra: data.importe_pendiente_extra || 0,
    
    // Payment processing data
    transaction_id: data.transaction_id || null,
    fecha_pago: data.fecha_pago || null,
    estado_pago: data.estado_pago || 'pendiente',
      // Relaciones (usando _id suffix como espera el backend)
    usuario_id: data.usuario?.id || data.usuario || null,
    politica_pago_id: data.politicaPago?.id || data.politica_pago_id || data.politica_pago || null,
    promocion_id: data.promocion?.id || data.promocion_id || data.promocion || null,
      // Arrays relacionados - Extras with proper pricing preservation
    extras: Array.isArray(data.extras) || Array.isArray(data.extrasSeleccionados) ? 
      (data.extras || data.extrasSeleccionados).map(e => {
        // Manejar tanto objetos completos como IDs simples
        if (typeof e === 'object' && e.id) {
          return {
            extra_id: e.id,
            cantidad: e.cantidad || 1,
            precio: e.precio || 0,
            nombre: e.nombre, // Preservar información adicional para debugging
            descripcion: e.descripcion
          };
        } else if (typeof e === 'number' || typeof e === 'string') {
          // Compatibilidad con IDs legacy
          return {
            extra_id: parseInt(e),
            cantidad: 1,
            precio: 0 // El backend deberá resolver el precio
          };
        }
        return null;
      }).filter(Boolean) : [],
    
    // Conductores with enhanced mapping
    conductores: Array.isArray(data.conductores) ? 
      data.conductores.map(c => ({
        conductor_id: c.conductor?.id || c.conductor_id || c.id,
        rol: c.rol || 'principal',
      })) : extractConductorData(data),
    
    // Additional data preservation
    notas_internas: data.notas_internas || data.notas || '',
    estado: data.estado || 'pendiente',
    
    // Datos de pago adicionales para preservar información del flujo
    datos_pago: data.datos_pago || null,
  };

  // Ensure date formats are consistent (ISO format for backend)
  if (mapped.fecha_recogida && typeof mapped.fecha_recogida === 'string') {
    try {
      const pickupDate = new Date(mapped.fecha_recogida);
      if (!isNaN(pickupDate.getTime())) {
        mapped.fecha_recogida = pickupDate.toISOString();
      }
    } catch (e) {
      logError('Error formatting pickup date', e);
    }
  }
  
  if (mapped.fecha_devolucion && typeof mapped.fecha_devolucion === 'string') {
    try {
      const dropoffDate = new Date(mapped.fecha_devolucion);
      if (!isNaN(dropoffDate.getTime())) {
        mapped.fecha_devolucion = dropoffDate.toISOString();
      }
    } catch (e) {
      logError('Error formatting dropoff date', e);
    }
  }
  // Enhanced validation with better error reporting
  const requiredFields = ['vehiculo_id', 'lugar_recogida_id', 'lugar_devolucion_id', 'fecha_recogida', 'fecha_devolucion'];
  const missingFields = requiredFields.filter(field => !mapped[field]);
  
  if (missingFields.length > 0) {
    logError('Campos requeridos faltantes en mapReservationDataToBackend', {
      missingFields,
      originalData: data,
      mappedData: mapped
    });
  }
  // Log successful mapping in debug mode
  if (DEBUG_MODE) {
    logInfo('Mapeo de datos completado', {
      vehiculoId: mapped.vehiculo_id,
      lugarRecogidaId: mapped.lugar_recogida_id,
      lugarDevolucionId: mapped.lugar_devolucion_id,
      metodoPago: mapped.metodo_pago,
      precioTotal: mapped.precio_total,
      extrasCount: mapped.extras?.length || 0,
      conductoresCount: mapped.conductores?.length || 0,
      hasDetallesReserva: !!data.detallesReserva
    });

    // Debug: Log the complete mapped output
    console.log('🎯 [mapReservationDataToBackend] Complete mapped output:', mapped);
    
    // Debug: Specifically check required fields
    const requiredFieldsCheck = {
      vehiculo_id: mapped.vehiculo_id,
      lugar_recogida_id: mapped.lugar_recogida_id,
      lugar_devolucion_id: mapped.lugar_devolucion_id,
      politica_pago_id: mapped.politica_pago_id,
      fecha_recogida: mapped.fecha_recogida,
      fecha_devolucion: mapped.fecha_devolucion
    };
    
    console.log('✅ [mapReservationDataToBackend] Required fields check:', requiredFieldsCheck);
    
    const missingRequired = Object.entries(requiredFieldsCheck)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
      
    if (missingRequired.length > 0) {
      console.error('❌ [mapReservationDataToBackend] Missing required fields:', missingRequired);
    } else {
      console.log('✅ [mapReservationDataToBackend] All required fields present');
    }
  }
  
  return mapped;
};
