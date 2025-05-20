// src/services/reservationServices.js (agregar a las funciones existentes)
import axios from 'axios';

import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Constante para modo debug
export const DEBUG_MODE = true; // Cambiar a false en producción

/**
 * Función para buscar una reserva por ID y email
 * @param {string} reservaId - ID de la reserva
 * @param {string} email - Email del cliente
 * @returns {Promise} - Promesa con los datos de la reserva
 */
export const findReservation = async (reservaId, email) => {
  try {
    if (DEBUG_MODE) {
      // Simulamos la respuesta de API en modo debug
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular latencia
      
      // Para pruebas, aceptar cualquier ID que empiece con 'R' y un email que contenga '@'
      if (reservaId && reservaId.startsWith('R') && email && email.includes('@')) {
        return { ...datosReservaPrueba, id: reservaId };
      }
      
      throw new Error('Reserva no encontrada con los datos proporcionados');
    }
    
    // En modo producción, llamada real a la API
    const response = await axios.get(`${API_URL}/reservations/${reservaId}`, {
      params: { email }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error al buscar la reserva:', error);
    throw error.response?.data || { message: 'Error al buscar la reserva. Por favor, verifique los datos e intente nuevamente.' };
  }
};

/**
 * Calcula el precio estimado de una reserva editada.
 * @param {Object} data - Datos de la reserva editada
 * @returns {Promise<Object>} - Objeto con originalPrice, newPrice y difference
 */
export const calculateReservationPrice = async (data) => {
  if (DEBUG_MODE) {
    // Simulación: sumar 10€ por cada extra y 20€ si cambia la fecha
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
  const response = await axios.post(`${API_URL}/reservations/calculate-price`, data);
  return response.data;
};

/**
 * Edita una reserva existente.
 * @param {string} reservaId - ID de la reserva
 * @param {Object} data - Datos actualizados de la reserva
 * @returns {Promise<Object>} - Reserva actualizada
 */
export const editReservation = async (reservaId, data) => {
  if (DEBUG_MODE) {
    // Simulación: devolver los datos actualizados
    return {
      ...datosReservaPrueba,
      ...data,
      id: reservaId
    };
  }
  // Producción: llamada real a la API
  const response = await axios.put(`${API_URL}/reservations/${reservaId}`, data);
  return response.data;
};

/**
 * Cancela una reserva existente.
 * @param {string} reservaId - ID de la reserva
 * @returns {Promise<void>}
 */
export const deleteReservation = async (reservaId) => {
  if (DEBUG_MODE) {
    // Simulación: simplemente esperar y resolver
    await new Promise(resolve => setTimeout(resolve, 800));
    return;
  }
  // Producción: llamada real a la API
  await axios.delete(`${API_URL}/reservations/${reservaId}`);
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
  precioTotal: 395.16
};

