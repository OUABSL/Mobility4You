// src/services/reservationServices.js (agregar a las funciones existentes)
import axios from 'axios';

import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Constante para modo debug
export const DEBUG_MODE = false; // Cambiar a false en producción

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
    const mappedData = mapReservationDataToBackend(data);
    
    // Calcular importes según método de pago
    if (mappedData.metodo_pago === 'tarjeta') {
      mappedData.importe_pagado_inicial = mappedData.precio_total;
      mappedData.importe_pendiente_inicial = 0;
    } else { // efectivo
      mappedData.importe_pagado_inicial = 0;
      mappedData.importe_pendiente_inicial = mappedData.precio_total;
    }
    
    console.log('Sending reservation data:', mappedData);
    
    const response = await axios.post(`${API_URL}/reservations/create_new`, mappedData, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error creating reservation:', error);
    console.error('Error response:', error.response);
    
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
 * Procesa el pago de una reserva existente
 * @param {string} reservaId - ID de la reserva
 * @param {Object} paymentData - Datos del pago (método, importe, etc.)
 * @returns {Promise<Object>} - Resultado del proceso de pago
 */
export const processPayment = async (reservaId, paymentData) => {
  try {
    if (DEBUG_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      
      // Simular respuesta exitosa
      return {
        message: 'Pago procesado correctamente',
        reserva_id: reservaId,
        estado: 'confirmada',
        transaction_id: `TX-${Date.now()}`,
        importe_pendiente_total: 0
      };
    }
    
    // Producción: llamada real a la API
    const response = await axios.post(
      `${API_URL}/reservas/${reservaId}/procesar_pago/`, 
      paymentData, 
      getAuthHeaders()
    );
    
    return response.data;
  } catch (error) {
    console.error('Error processing payment:', error);
    
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.response?.data || 
                        error.message || 
                        'Error al procesar el pago.';
    
    throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Error al procesar el pago.');
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
    const mappedData = mapReservationDataToBackend(data);
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

// TODO: PLANTEAR LA LÓGICA DE PROCESAMIENTO DE PAGO: Existen otras funciones pendientes de migrar en components/reservaPasos/ReservaClientePago.js
// 3. Nueva función para procesar pagos
// export const processPayment = async (reservaId, paymentData) => {
//   try {
//     if (DEBUG_MODE) {
//       await new Promise(resolve => setTimeout(resolve, 500));
//       // Simular procesamiento de pago
//       return {
//         message: 'Pago procesado correctamente',
//         importe_pendiente_total: 0
//       };
//     }
    
//     const response = await axios.post(
//       `${API_URL}/reservations/${reservaId}/procesar_pago/`,
//       paymentData
//     );
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { message: 'Error al procesar el pago.' };
//   }
// };


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
// Mapeo de datos de reserva del frontend (camelCase/anidado) a backend (snake_case/relacional)
export const mapReservationDataToBackend = (data) => {
  // Mapea campos principales incluyendo nuevos campos de pago
  const mapped = {
    // Campos existentes
    vehiculo: data.car?.id || data.vehiculo?.id || data.vehiculo,
    lugar_recogida: data.fechas?.pickupLocation?.id || data.lugarRecogida?.id || data.lugar_recogida,
    lugar_devolucion: data.fechas?.dropoffLocation?.id || data.lugarDevolucion?.id || data.lugar_devolucion,
    fecha_recogida: data.fechas?.pickupDate || data.fechaRecogida || data.fecha_recogida,
    fecha_devolucion: data.fechas?.dropoffDate || data.fechaDevolucion || data.fecha_devolucion,
    
    // Precios
    precio_dia: data.car?.precio_dia || data.precio_dia || 0,
    precio_base: data.precioBase || data.precio_base || 0,
    precio_extras: data.precioExtras || data.precio_extras || 0,
    precio_impuestos: data.precioImpuestos || data.precio_impuestos || 0,
    descuento_promocion: data.descuentoPromocion || data.descuento_promocion || 0,
    precio_total: data.precioTotal || data.precio_total || 0,
    
    // NUEVOS CAMPOS DE PAGO
    metodo_pago: data.metodo_pago || data.metodoPago || 'tarjeta',
    importe_pagado_inicial: data.importe_pagado_inicial || 0,
    importe_pendiente_inicial: data.importe_pendiente_inicial || 0,
    importe_pagado_extra: data.importe_pagado_extra || 0,
    importe_pendiente_extra: data.importe_pendiente_extra || 0,
    
    // Relaciones (solo IDs)
    usuario: data.usuario?.id || data.usuario || null,
    politica_pago: data.politicaPago?.id || data.politica_pago || null,
    promocion: data.promocion?.id || data.promocion || null,
    
    // Arrays relacionados
    extras: Array.isArray(data.extras) ? data.extras.map(e => ({
      extra_id: e.id || e.extra_id,
      cantidad: e.cantidad || 1
    })) : [],
    
    conductores: Array.isArray(data.conductores) ? data.conductores.map(c => ({
      conductor_id: c.conductor?.id || c.conductor_id || c.id,
      rol: c.rol || 'principal',
    })) : [],
    
    // Otros campos
    notas_internas: data.notas_internas || '',
    estado: data.estado || 'pendiente',
  };

  // Validación básica de campos requeridos
  const requiredFields = ['vehiculo', 'lugar_recogida', 'lugar_devolucion', 'fecha_recogida', 'fecha_devolucion'];
  const missingFields = requiredFields.filter(field => !mapped[field]);
  
  if (missingFields.length > 0) {
    console.warn('Campos requeridos faltantes:', missingFields);
    console.warn('Datos originales:', data);
    console.warn('Datos mapeados:', mapped);
  }
  return mapped;
};