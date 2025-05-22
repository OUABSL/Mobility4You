// src/services/reservationServices.js (agregar a las funciones existentes)
import axios from 'axios';

import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Constante para modo debug
export const DEBUG_MODE = false; // Cambiar a false en producción

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
    // Producción: llamada real a la API
    const mappedData = mapReservationDataToBackend(data);
    const response = await axios.post(`${API_URL}/reservations/`, mappedData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error al crear la reserva.' };
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
    // En modo producción, llamada real a la API usando POST
    const response = await axios.post(`${API_URL}/reservations/${reservaId}/find/`, { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error al buscar la reserva.' };
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
    // Producción: llamada real a la API
    const mappedData = mapReservationDataToBackend(data);
    const response = await axios.post(`${API_URL}/reservations/calculate-price`, mappedData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error al calcular el precio.' };
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
    const response = await axios.put(`${API_URL}/reservations/${reservaId}`, mappedData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error al editar la reserva.' };
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
    await axios.delete(`${API_URL}/reservations/${reservaId}`);
  } catch (error) {
    throw error.response?.data || { message: 'Error al cancelar la reserva.' };
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
  metodo_pago_inicial: 'tarjeta', // o 'efectivo'
  importe_pagado_inicial: 395.16, // Si es tarjeta, todo pagado; si es efectivo, 0
  importe_pendiente_inicial: 0.00, // Si es tarjeta, 0; si es efectivo, todo el total
  importe_pagado_extra: 0.00, // Importe pagado posteriormente (extras/diferencias)
  importe_pendiente_extra: 0.00 // Importe pendiente de extras/diferencias
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
    metodo_pago_inicial: data.metodo_pago_inicial ?? reservasPrueba[idx].metodo_pago_inicial,
    importe_pagado_inicial: data.importe_pagado_inicial ?? reservasPrueba[idx].importe_pagado_inicial,
    importe_pendiente_inicial: data.importe_pendiente_inicial ?? reservasPrueba[idx].importe_pendiente_inicial,
    importe_pagado_extra: data.importe_pagado_extra ?? reservasPrueba[idx].importe_pagado_extra,
    importe_pendiente_extra: data.importe_pendiente_extra ?? reservasPrueba[idx].importe_pendiente_extra,
  };
  return reservasPrueba[idx];
}

// Función para crear una nueva reserva en el array de prueba
function crearReservaPrueba(data) {
  // Inicializar los campos de pago según el método
  let metodo_pago_inicial = data.metodo_pago_inicial || data.metodoPago || 'tarjeta';
  let importe_pagado_inicial = 0;
  let importe_pendiente_inicial = 0;
  if (metodo_pago_inicial === 'tarjeta') {
    importe_pagado_inicial = data.precioTotal || 0;
    importe_pendiente_inicial = 0;
  } else {
    importe_pagado_inicial = 0;
    importe_pendiente_inicial = data.precioTotal || 0;
  }
  const nueva = {
    ...data,
    id: `R${Math.floor(Math.random()*1e8)}`,
    metodo_pago_inicial,
    importe_pagado_inicial,
    importe_pendiente_inicial,
    importe_pagado_extra: 0,
    importe_pendiente_extra: 0
  };
  reservasPrueba.push(nueva);
  return nueva;
}

// Mapeo de datos de reserva del frontend (camelCase/anidado) a backend (snake_case/relacional)
function mapReservationDataToBackend(data) {
  // Mapea campos principales
  return {
    vehiculo: data.car?.id || data.vehiculo?.id || data.vehiculo,
    lugar_recogida: data.fechas?.pickupLocation?.id || data.lugarRecogida?.id || data.lugar_recogida,
    lugar_devolucion: data.fechas?.dropoffLocation?.id || data.lugarDevolucion?.id || data.lugar_devolucion,
    fecha_recogida: data.fechas?.pickupDate || data.fechaRecogida || data.fecha_recogida,
    fecha_devolucion: data.fechas?.dropoffDate || data.fechaDevolucion || data.fecha_devolucion,
    precio_dia: data.car?.precio_dia || data.precio_dia,
    precio_base: data.precioBase || data.precio_base,
    precio_extras: data.precioExtras || data.precio_extras,
    precio_impuestos: data.precioImpuestos || data.precio_impuestos,
    descuento_promocion: data.descuentoPromocion || data.descuento_promocion,
    precio_total: data.precioTotal || data.precio_total,
    metodo_pago_inicial: data.metodo_pago_inicial || data.metodoPago || 'tarjeta',
    importe_pagado_inicial: data.importe_pagado_inicial || 0,
    importe_pendiente_inicial: data.importe_pendiente_inicial || 0,
    importe_pagado_extra: data.importe_pagado_extra || 0,
    importe_pendiente_extra: data.importe_pendiente_extra || 0,
    usuario: data.usuario || null, // Si hay login
    politica_pago: data.politicaPago?.id || data.politica_pago,
    promocion: data.promocion?.id || data.promocion,
    extras: Array.isArray(data.extras) ? data.extras.map(e => e.id || e) : [],
    conductores: Array.isArray(data.conductores) ? data.conductores.map(c => ({
      conductor: c.conductor?.id || c.conductor_id || c.id,
      rol: c.rol || 'principal',
    })) : [],
    notas_internas: data.notas_internas || '',
    referencia_externa: data.referencia_externa || '',
  };
}

