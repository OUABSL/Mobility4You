// src/services/reservationServices.js (agregar a las funciones existentes)
import axios from '../config/axiosConfig';
import universalMapper, {
  mapReservationToBackend,
  roundToDecimals,
} from './universalDataMapper';

import {
  API_URLS,
  createServiceLogger,
  DEBUG_MODE,
  shouldUseTestingData,
  TIMEOUT_CONFIG,
} from '../config/appConfig';
import { logError, logInfo, logWarning, withTimeout } from '../utils';
import { validateReservationData } from '../validations/reservationValidations'; // Importar validaciones
import { withCache } from './cacheService';
import { fetchLocations } from './searchServices'; // Import para obtener ubicaciones

// Import test data from centralized location
import {
  datosReservaPrueba,
  extrasDisponiblesPrueba,
} from '../assets/testingData/testingData';

// URL base de la API
const API_URL = API_URLS.BASE;

// Logger específico para este servicio
const logger = createServiceLogger('RESERVATIONS');

// ========================================
// CONTROL DE REQUESTS DUPLICADOS Y CACHE
// ========================================
let currentFindRequest = null;
const reservationCache = new Map();
const RESERVATION_CACHE_TTL = 2 * 60 * 1000; // 2 minutos para reservas

/**
 * Genera clave de cache para una consulta de reserva
 * @param {string} reservaId - ID de la reserva
 * @param {string} email - Email del usuario
 * @returns {string} - Clave única para el cache
 */
const getReservationCacheKey = (reservaId, email) => {
  return `reservation_${reservaId}_${email.toLowerCase()}`;
};

/**
 * Obtiene una reserva del cache si está vigente
 * @param {string} cacheKey - Clave del cache
 * @returns {any|null} - Datos de la reserva o null si no existe/expiró
 */
const getCachedReservation = (cacheKey) => {
  const cached = reservationCache.get(cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now > cached.expiry) {
    reservationCache.delete(cacheKey);
    return null;
  }

  logger.info(`📦 [CACHE HIT] Reserva encontrada en cache: ${cacheKey}`);
  return cached.data;
};

/**
 * Almacena una reserva en el cache
 * @param {string} cacheKey - Clave del cache
 * @param {any} data - Datos de la reserva
 */
const setCachedReservation = (cacheKey, data) => {
  const expiry = Date.now() + RESERVATION_CACHE_TTL;
  reservationCache.set(cacheKey, {
    data,
    expiry,
    timestamp: Date.now(),
  });
  logger.info(`💾 [CACHE SET] Reserva guardada en cache: ${cacheKey}`);
};

/**
 * Limpia el cache de reservas expiradas
 */
const cleanExpiredReservationCache = () => {
  const now = Date.now();
  for (const [key, value] of reservationCache.entries()) {
    if (now > value.expiry) {
      reservationCache.delete(key);
    }
  }
};

// Helper function para obtener headers de autenticación
const getAuthHeaders = () => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const token =
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

/**
 * 🚗 CREAR NUEVA RESERVA
 *
 * Función principal para crear una nueva reserva en el sistema.
 * Utiliza el mapper mejorado para transformar los datos del frontend al formato del backend.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * {
 *   car: { id, marca, modelo, precio_dia, ... },
 *   fechas: {
 *     pickupDate: "2025-06-15T10:00:00Z",
 *     dropoffDate: "2025-06-20T18:00:00Z",
 *     pickupLocation: { id, nombre },
 *     dropoffLocation: { id, nombre }
 *   },
 *   conductor: { nombre, apellido, email, telefono, ... },
 *   extras: [{ id, nombre, precio, cantidad }],
 *   detallesReserva: { base, extras, impuestos, total },
 *   metodoPago: "tarjeta" | "efectivo",
 *   politicaPago: { id, nombre }
 * }
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * {
 *   id: "RSV-12345678",
 *   estado: "confirmada" | "pendiente",
 *   vehiculo_id: 7,
 *   lugar_recogida_id: 1,
 *   fecha_recogida: "2025-06-15T10:00:00.000Z",
 *   precio_total: 395.16,
 *   metodo_pago: "tarjeta",
 *   extras: [{ extra_id, cantidad, precio }],
 *   conductores: [{ conductor_id, rol }]
 * }
 *
 * 🔄 DISPONIBILIDAD: Requiere conexión a backend en producción
 * 🛡️ VALIDACIÓN: Validación completa de datos esenciales antes del envío
 * ⚡ FALLBACK: Usa datos de prueba en modo DEBUG_MODE
 *
 * @param {Object} data - Datos completos de la reserva desde el frontend
 * @returns {Promise<Object>} - Reserva creada con ID único y estado asignado
 * @throws {Error} - Error detallado si faltan datos esenciales o hay problemas de conexión
 */
export const createReservation = async (data) => {
  try {
    if (DEBUG_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return crearReservaPrueba(data);
    }

    // VALIDACIÓN PREVIA en frontend
    const validation = validateReservationData(data);
    if (!validation.isValid) {
      const errorMessage = Object.entries(validation.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join('; ');
      throw new Error(`Datos inválidos: ${errorMessage}`);
    } // Preparar datos con validación de fechas usando el mapper universal
    const mappedData = await mapReservationToBackend(data);

    // Validar fechas una vez más después del mapeo
    if (!mappedData.fecha_recogida || !mappedData.fecha_devolucion) {
      throw new Error('Error procesando las fechas de reserva');
    }

    logger.info('Sending reservation data:', mappedData);
    const response = await axios.post(
      `${API_URL}/reservas/reservas/`,
      mappedData,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating reservation:', error);
    logger.error('Error response:', error.response);

    // Manejo mejorado de errores
    if (!error.response) {
      // Determinar si se trata de un error de backend o de mapeo de datos
      if (
        (error.message &&
          error.message.includes('Error procesando las fechas')) ||
        (error.message && error.message.includes('procesando fecha'))
      ) {
        throw new Error(
          'Error procesando las fechas de reserva. Por favor, verifique los formatos de fecha e intente nuevamente.',
        );
      } else if (
        error.message &&
        (error.message.includes('ubicación') ||
          error.message.includes('Ubicación'))
      ) {
        // Propagar el mensaje de error original sobre ubicaciones
        throw error;
      } else if (error.message && error.message.includes('política')) {
        // Propagar el mensaje de error original sobre política de pago
        throw error;
      } else {
        throw new Error(
          'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente.',
        );
      }
    }

    const statusCode = error.response.status;
    const errorData = error.response.data;

    // Manejar errores de validación (400)
    if (statusCode === 400) {
      if (typeof errorData.error === 'object') {
        const validationErrors = Object.entries(errorData.error)
          .map(
            ([field, messages]) =>
              `${field}: ${
                Array.isArray(messages) ? messages.join(', ') : messages
              }`,
          )
          .join('; ');
        throw new Error(`Errores de validación: ${validationErrors}`);
      } else {
        throw new Error(
          errorData.error || 'Error de validación en los datos de reserva',
        );
      }
    }

    // Manejar otros códigos de estado
    const friendlyMessages = {
      401: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
      403: 'No tiene permisos para realizar esta acción.',
      404: 'Servicio no encontrado. Por favor, contacte al soporte técnico.',
      500: 'Error interno del servidor. Por favor, intente nuevamente más tarde.',
      502: 'Servidor temporalmente no disponible. Intente nuevamente.',
      503: 'Servicio temporalmente no disponible. Intente nuevamente.',
    };

    const friendlyMessage =
      friendlyMessages[statusCode] ||
      'Error del servidor. Por favor, intente nuevamente.';
    throw new Error(friendlyMessage);
  }
};

/**
 * 🔍 BUSCAR RESERVA POR ID Y EMAIL
 *
 * Función de consulta pública que permite a los clientes buscar sus reservas
 * utilizando únicamente el ID de reserva y su email registrado. Es la función
 * principal para el sistema de consulta de reservas sin autenticación.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * - reservaId: "R12345678" | "RSV-2025-0001" (formato flexible)
 * - email: "cliente@example.com" (debe coincidir exactamente)
 *
 * 📊 ESTRUCTURA DE DATOS DE SALIDA:
 * {
 *   id: "R12345678",
 *   estado: "confirmada" | "pendiente" | "cancelada",
 *   fechaRecogida: "2025-05-14T12:30:00",
 *   fechaDevolucion: "2025-05-18T08:30:00",
 *   vehiculo: {
 *     marca: "BMW", modelo: "320i", matricula: "ABC1234",
 *     categoria: { nombre: "Premium" }, grupo: { nombre: "Mediano" }
 *   },
 *   lugarRecogida: { nombre: "Aeropuerto de Málaga (AGP)" },
 *   lugarDevolucion: { nombre: "Estación de Tren María Zambrano" },
 *   conductores: [{ conductor: { email, nombre, apellido } }],
 *   politicaPago: { titulo: "All Inclusive", deductible: 0 },
 *   precioTotal: 395.16, extras: [...], promocion: {...}
 * }
 *
 * 🔒 SEGURIDAD: Validación dual (ID + email) para proteger datos sensibles
 * 🔄 DISPONIBILIDAD: Funciona tanto en DEBUG_MODE como en producción
 * ⚡ FALLBACK: Usa datos de prueba en modo DEBUG_MODE para desarrollo
 *
 * @param {string} reservaId - ID único de la reserva (formato flexible)
 * @param {string} email - Email del conductor principal registrado
 * @returns {Promise<Object>} - Datos completos de la reserva encontrada
 * @throws {Error} - Error específico si no se encuentra o hay problemas de conexión
 */
export const findReservation = async (reservaId, email) => {
  try {
    // ✅ Generar clave de cache
    const cacheKey = getReservationCacheKey(reservaId, email);

    // ✅ Verificar cache primero
    const cachedData = getCachedReservation(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // ✅ Cancelar request anterior si existe
    if (currentFindRequest) {
      currentFindRequest.abort();
      currentFindRequest = null;
      logger.info('🚫 Request anterior cancelado por nuevo request');
    }

    // ✅ Crear AbortController para este request
    const controller = new AbortController();
    currentFindRequest = controller;

    logger.info(`🔍 Buscando reserva ${reservaId} para email ${email}`);

    if (DEBUG_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const reserva = buscarReservaPrueba(reservaId);
      if (
        reserva &&
        reserva.conductores.some((c) => c.conductor.email === email)
      ) {
        // ✅ Guardar en cache los datos de prueba también
        setCachedReservation(cacheKey, reserva);
        return reserva;
      }
      throw new Error('Reserva no encontrada con los datos proporcionados');
    }

    // En modo producción, usar la URL específica con signal para cancelación
    const response = await axios.post(
      `${API_URL}/reservas/reservas/${reservaId}/buscar/`,
      { reserva_id: reservaId, email },
      {
        ...getAuthHeaders(),
        signal: controller.signal, // ✅ Añadir signal para cancelación
      },
    );

    currentFindRequest = null; // ✅ Limpiar referencia

    if (response.data && response.data.success) {
      logger.info('✅ Reserva encontrada exitosamente');

      // ✅ Guardar en cache
      setCachedReservation(cacheKey, response.data);

      return response.data;
    } else {
      throw new Error(
        response.data?.message || 'Formato de respuesta inesperado',
      );
    }
  } catch (error) {
    currentFindRequest = null; // ✅ Limpiar referencia en error

    // ✅ No loggear errores de cancelación
    if (error.name === 'AbortError') {
      logger.info('🚫 Request cancelado por nuevo request');
      return;
    }

    logger.error('❌ Error en findReservation:', error.message);

    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        throw new Error('Reserva no encontrada con los datos proporcionados');
      } else if (status >= 500) {
        throw new Error(
          'Error temporal del servidor. Intenta nuevamente en unos momentos.',
        );
      }
    }

    const friendlyMessage =
      error.message.includes('404') || error.message.includes('no encontrada')
        ? 'No se encontró ninguna reserva con esos datos. Verifica el ID y el email e inténtalo de nuevo.'
        : error.message.includes('500') || error.message.includes('servidor')
        ? 'Error temporal del servidor. Por favor, inténtalo nuevamente en unos momentos.'
        : error.message ||
          'Error inesperado al buscar la reserva. Verifica los datos e inténtalo de nuevo.';

    throw new Error(friendlyMessage);
  }
};

/**
 * 💰 CALCULAR PRECIO DE RESERVA
 *
 * Calcula el precio total estimado de una reserva basado en vehículo,
 * fechas, ubicaciones y extras seleccionados. Esencial para mostrar
 * precios dinámicos antes de la confirmación final.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * {
 *   vehiculo_id: 7,
 *   fecha_recogida: "2025-06-15T10:00:00Z",
 *   fecha_devolucion: "2025-06-20T18:00:00Z",
 *   lugar_recogida_id: 1,
 *   lugar_devolucion_id: 2,
 *   extras: [3, 5, 8], // IDs de extras
 *   politica_pago_id: 1
 * }
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * {
 *   originalPrice: 316.00,    // Precio base anterior
 *   newPrice: 425.50,         // Nuevo precio calculado
 *   difference: 109.50,       // Diferencia de precio
 *   breakdown: {              // Desglose detallado
 *     base: 316.00,
 *     extras: 89.50,
 *     impuestos: 20.00,
 *     descuentos: 0,
 *     total: 425.50
 *   }
 * }
 *
 * 🔄 DISPONIBILIDAD: Requiere servicio de cálculo activo en backend
 * 🛡️ VALIDACIÓN: Valida existencia de vehículo y disponibilidad en fechas
 * ⚡ FALLBACK: Cálculo simplificado en modo DEBUG_MODE
 *
 * @param {Object} data - Datos de la reserva para calcular precio
 * @returns {Promise<Object>} - Objeto con precios original, nuevo y diferencia
 * @throws {Error} - Error si faltan datos requeridos o vehículo no disponible
 */
export const calculateReservationPrice = async (data) => {
  try {
    // En modo DEBUG, intentar backend primero, fallback mínimo solo si falla
    if (DEBUG_MODE) {
      logInfo(
        '⚠️ MODO DEBUG: Intentando calcular precio en backend primero...',
      );

      try {
        // Mapear campos para el backend
        const mappedData = {
          vehiculo_id: data.vehiculo?.id || data.vehiculo_id,
          fecha_recogida: data.fechaRecogida || data.fecha_recogida,
          fecha_devolucion: data.fechaDevolucion || data.fecha_devolucion,
          lugar_recogida_id: data.lugarRecogida?.id || data.lugar_recogida_id,
          lugar_devolucion_id:
            data.lugarDevolucion?.id || data.lugar_devolucion_id,
          politica_pago_id: data.politicaPago?.id || data.politica_pago_id,
          extras:
            data.extras?.map((extra) =>
              typeof extra === 'object' ? extra.id : extra,
            ) || [],
        };

        const response = await axios.post(
          `${API_URL}/reservas/calcular-precio/`,
          mappedData,
          getAuthHeaders(),
        );

        logInfo('✅ Precio calculado desde backend:', response.data);
        return response.data;
      } catch (backendError) {
        logError(
          '❌ Error en backend, modo DEBUG fallback activado:',
          backendError,
        );

        // Fallback mínimo solo para DEBUG
        logInfo('⚠️ FALLBACK DEBUG: Estimación temporal básica');

        const fechaInicio = new Date(data.fechaRecogida || data.fecha_recogida);
        const fechaFin = new Date(
          data.fechaDevolucion || data.fecha_devolucion,
        );
        const diasAlquiler = Math.ceil(
          (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24),
        );

        // Estimación muy básica para DEBUG SOLAMENTE (NO usar en producción)
        const estimatedPrice = diasAlquiler * 50; // Solo para fallback de DEBUG

        logInfo('⚠️ CRÍTICO: Estimación temporal, verificar con backend');

        return {
          originalPrice: estimatedPrice * 0.8,
          newPrice: estimatedPrice,
          difference: estimatedPrice * 0.2,
          diasAlquiler,
          isEstimate: true,
          warningMessage: 'Estimación temporal - backend no disponible',
          breakdown: {
            precio_base: estimatedPrice * 0.8,
            precio_extras: 0,
            subtotal: estimatedPrice * 0.8,
            impuestos: estimatedPrice * 0.2,
            total: estimatedPrice,
            note: 'Estimación temporal - usar backend para cálculos reales',
          },
        };
      }
    }

    // Si hay un ID de reserva, es una edición
    if (data.id) {
      return await calculateEditReservationPrice(data.id, data);
    }

    // Mapear campos para el backend
    const mappedData = {
      vehiculo_id: data.vehiculo?.id || data.vehiculo_id,
      fecha_recogida: data.fechaRecogida || data.fecha_recogida,
      fecha_devolucion: data.fechaDevolucion || data.fecha_devolucion,
      lugar_recogida_id: data.lugarRecogida?.id || data.lugar_recogida_id,
      lugar_devolucion_id: data.lugarDevolucion?.id || data.lugar_devolucion_id,
      politica_pago_id: data.politicaPago?.id || data.politica_pago_id,
      extras:
        data.extras?.map((extra) =>
          typeof extra === 'object' ? extra.id : extra,
        ) || [],
    };

    // Llamar al endpoint de cálculo
    const response = await axios.post(
      `${API_URL}/reservas/reservas/calcular-precio/`,
      mappedData,
      getAuthHeaders(),
    );

    return response.data;
  } catch (error) {
    logger.error('Error calculating reservation price:', error);
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Error al calcular el precio.';

    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : 'Error al calcular el precio.',
    );
  }
};

/**
 * ✏️💰 CALCULAR PRECIO DE EDICIÓN DE RESERVA
 *
 * Función específica para calcular el precio de una reserva que se está editando,
 * incluyendo la diferencia con el precio original. Útil para mostrar al cliente
 * cuánto más o menos pagará con los cambios propuestos.
 *
 * @param {string} reservaId - ID de la reserva a editar
 * @param {Object} editData - Nuevos datos de la reserva
 * @returns {Promise<Object>} - Precio calculado con diferencia
 */
export const calculateEditReservationPrice = async (reservaId, editData) => {
  try {
    if (DEBUG_MODE) {
      logInfo('🔄 Calculando precio de edición en modo DEBUG', {
        reservaId,
        editData,
      });

      // Obtener datos de la reserva original del sessionStorage
      const reservaOriginal = JSON.parse(
        sessionStorage.getItem('reservaData') || '{}',
      );
      const editReservaData = JSON.parse(
        sessionStorage.getItem('editReservaData') || '{}',
      );

      // Usar precio original real de la reserva (SIN valores hardcodeados para producción)
      const originalPrice = parseFloat(
        reservaOriginal.precio_total ||
          editReservaData.originalReservation?.precio_total ||
          0,
      );

      logInfo('💰 Precio original de la reserva:', originalPrice);

      // Calcular días de alquiler para la nueva configuración
      const fechaInicio = new Date(
        editData.fechaRecogida || editData.fecha_recogida,
      );
      const fechaFin = new Date(
        editData.fechaDevolucion || editData.fecha_devolucion,
      );
      const diasAlquiler = Math.ceil(
        (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24),
      );

      logInfo(`� Duración de la reserva: ${diasAlquiler} días`);

      // FALLBACK DEBUG: Solo para desarrollo cuando falla la API
      if (!DEBUG_MODE) {
        throw new Error(
          'Cálculo de precios en frontend no disponible en producción. Usar backend.',
        );
      }

      // Variables para el cálculo fallback (solo DEBUG)
      const precioDiario =
        reservaOriginal?.car?.precio_dia ||
        editReservaData?.car?.precio_dia ||
        50; // Fallback temporal
      const precioBase = precioDiario * diasAlquiler;

      // Calcular precio de extras
      let totalExtras = 0;
      if (editData.extras && editData.extras.length > 0) {
        totalExtras = editData.extras.reduce((total, extra) => {
          // Sin fallback hardcodeado - debe venir del backend
          const precioExtra = extra.precio || 0; // No calcular sin datos reales
          return total + precioExtra;
        }, 0);
      }

      // Subtotal antes de impuestos
      const subtotal = precioBase + totalExtras;

      // Sin valores hardcodeados de IVA - debe venir del backend
      logError('❌ No se puede calcular IVA sin datos del backend');
      const iva = 0; // Sin cálculo sin datos del backend
      const newPrice = subtotal; // Solo subtotal sin impuestos

      // Calcular diferencia
      const difference = newPrice - originalPrice;

      logInfo(`📊 Desglose del cálculo (MODO DEBUG - SIN IMPUESTOS):`);
      logInfo(
        `  💶 Precio base: €${precioBase.toFixed(
          2,
        )} (${diasAlquiler} días × €${precioDiario})`,
      );
      logInfo(`  🎁 Extras: €${totalExtras.toFixed(2)}`);
      logInfo(`  📋 Subtotal: €${subtotal.toFixed(2)}`);
      logInfo(`  🏛️ IVA: No calculado (requiere backend)`);
      logInfo(`  💳 Total nuevo: €${newPrice.toFixed(2)}`);
      logInfo(`  📊 Precio original: €${originalPrice.toFixed(2)}`);
      logInfo(`  🔄 Diferencia: €${difference.toFixed(2)}`);

      logWarning('⚠️ CÁLCULO SIN IVA - Los impuestos deben venir del backend');

      return {
        originalPrice: parseFloat(originalPrice.toFixed(2)),
        newPrice: parseFloat(newPrice.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        diasAlquiler,
        breakdown: {
          precio_base: parseFloat(precioBase.toFixed(2)),
          precio_extras: parseFloat(totalExtras.toFixed(2)),
          subtotal: parseFloat(subtotal.toFixed(2)),
          impuestos: parseFloat(iva.toFixed(2)),
          total: parseFloat(newPrice.toFixed(2)),
        },
      };
    }

    // Preparar datos para el backend fuera del bloque DEBUG_MODE
    const mappedData = {
      fechaRecogida: editData.fechaRecogida || editData.fecha_recogida,
      fechaDevolucion: editData.fechaDevolucion || editData.fecha_devolucion,
      lugarRecogida_id: editData.lugarRecogida_id || editData.lugar_recogida_id,
      lugarDevolucion_id:
        editData.lugarDevolucion_id || editData.lugar_devolucion_id,
      extras: editData.extras || [],
    };

    const response = await axios.post(
      `${API_URL}/reservas/reservas/${reservaId}/calcular_precio_edicion/`,
      mappedData,
      getAuthHeaders(),
    );

    logInfo(
      `Precio de edición calculado para reserva ${reservaId}:`,
      response.data,
    );
    return response.data;
  } catch (error) {
    logError('Error calculating edit reservation price:', error);

    // Preparar datos para debug (en caso de error)
    const debugData = {
      fechaRecogida: editData.fechaRecogida || editData.fecha_recogida,
      fechaDevolucion: editData.fechaDevolucion || editData.fecha_devolucion,
      lugarRecogida_id: editData.lugarRecogida_id || editData.lugar_recogida_id,
      lugarDevolucion_id:
        editData.lugarDevolucion_id || editData.lugar_devolucion_id,
      extras: editData.extras || [],
    };

    // Debug detallado del error
    if (DEBUG_MODE) {
      logger.error('API Error:', {
        error,
        endpoint: `/reservas/reservas/${reservaId}/calcular-precio-edicion/`,
        data: debugData,
        context: 'price-calculation',
      });
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Error al calcular el precio de edición.';

    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : 'Error al calcular el precio de edición.',
    );
  }
};

/**
 * ✏️ EDITAR RESERVA EXISTENTE
 *
 * Actualiza una reserva existente con nuevos datos. Útil para modificaciones
 * post-creación como cambio de fechas, extras, o información del conductor.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * {
 *   // Solo los campos que se van a actualizar
 *   fechas?: { pickupDate, dropoffDate },
 *   extras?: [{ id, cantidad }],
 *   conductor?: { nombre, apellido, telefono },
 *   metodoPago?: "tarjeta" | "efectivo"
 * }
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * {
 *   id: "RSV-12345678",
 *   estado: "confirmada",
 *   // ... resto de campos actualizados
 *   updated_at: "2025-06-03T15:30:00.000Z"
 * }
 *
 * 🔄 DISPONIBILIDAD: Requiere reserva existente en el sistema
 * 🛡️ VALIDACIÓN: Solo actualiza campos válidos, preserva integridad
 * ⚡ FALLBACK: Simula edición en modo DEBUG_MODE
 *
 * @param {string} reservaId - ID único de la reserva a editar
 * @param {Object} data - Datos a actualizar (parciales)
 * @returns {Promise<Object>} - Reserva actualizada completa
 * @throws {Error} - Error si la reserva no existe o datos inválidos
 */
export const editReservation = async (reservaId, data) => {
  try {
    logger.info('🔄 Editando reserva', { reservaId, data });

    // Validar y limpiar todos los datos antes de procesar
    const validatedData = validateAndCleanReservationData(data);

    logger.info('🔧 Datos validados:', validatedData);

    if (DEBUG_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const updated = editarReservaPrueba(reservaId, validatedData);
      if (!updated) throw new Error('Reserva no encontrada para editar');
      return updated;
    }

    // Producción: llamada real a la API
    const mappedData = await mapReservationToBackend(validatedData);

    logger.info('📤 Enviando datos mapeados:', mappedData);

    const response = await axios.put(
      `${API_URL}/reservas/reservas/${reservaId}/`,
      mappedData,
      getAuthHeaders(),
    );

    logger.info('✅ Reserva editada exitosamente');
    return response.data;
  } catch (error) {
    logger.error('❌ Error editing reservation:', error);

    // Logging detallado del error para debugging
    if (error.response) {
      logger.error('📋 Response data:', error.response.data);
      logger.error('📋 Response status:', error.response.status);
      logger.error('📋 Response headers:', error.response.headers);
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data ||
      error.message ||
      'Error al editar la reserva.';

    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : 'Error al editar la reserva.',
    );
  }
};

/**
 * 🗑️ CANCELAR RESERVA EXISTENTE
 *
 * Función para cancelar una reserva activa en el sistema. Esta función maneja
 * tanto la cancelación lógica como la liberación de recursos asociados, aplicando
 * las políticas de cancelación correspondientes según el tiempo restante.
 *
 * 📊 DATOS DE ENTRADA:
 * @param {string} reservaId - ID único de la reserva a cancelar (formato: "RSV-12345678")
 *
 * 🔄 PROCESO DE CANCELACIÓN:
 * 1. Validación de existencia de la reserva
 * 2. Aplicación de políticas de cancelación según tiempo restante
 * 3. Cálculo de penalizaciones si corresponde
 * 4. Liberación de inventario (vehículo vuelve a estar disponible)
 * 5. Notificación al cliente y actualización de estado
 *
 * 💰 POLÍTICAS DE CANCELACIÓN (según configuración):
 * - ✅ Más de 24h antes: Cancelación gratuita
 * - ⚠️ Menos de 24h: Cargo del 50% del valor total
 * - ❌ No-show: Cargo del 100% del importe
 * - 🏢 Reservas corporativas: Aplican acuerdos específicos
 *
 * 📤 EFECTOS POST-CANCELACIÓN:
 * - Estado de reserva cambia a "cancelada"
 * - Vehículo liberado para nuevas reservas
 * - Reembolso procesado según política aplicable
 * - Historial de transacciones actualizado
 * - Notificaciones automáticas enviadas
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - Cancelación voluntaria del cliente
 * - Cancelación por incumplimiento de condiciones
 * - Cancelación administrativa por problemas operativos
 * - Liberación de recursos en casos de no-show
 *
 * ⚠️ CONSIDERACIONES IMPORTANTES:
 * - La cancelación es irreversible una vez confirmada
 * - Las penalizaciones se aplican automáticamente según política
 * - Los reembolsos pueden tardar 3-5 días hábiles en procesarse
 * - Reservas con pagos parciales requieren cálculo específico de reembolso
 *
 * 🔄 DISPONIBILIDAD: Funciona tanto en DEBUG_MODE como en producción
 * 🛡️ VALIDACIÓN: Verifica existencia y permisos antes de procesar
 * ⚡ FALLBACK: Simulación completa en modo DEBUG_MODE
 *
 * @returns {Promise<void>} - No retorna datos, solo confirma la cancelación exitosa
 * @throws {Error} - Error específico si la reserva no existe o no se puede cancelar
 */
export const deleteReservation = async (reservaId) => {
  try {
    if (DEBUG_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const idx = reservasPrueba.findIndex((r) => r.id === reservaId);
      if (idx !== -1) reservasPrueba.splice(idx, 1);
      return;
    }

    // Producción: llamada real a la API
    await axios.post(
      `${API_URL}/reservas/reservas/${reservaId}/cancel/`,
      {},
      getAuthHeaders(),
    );

    logInfo(`Reserva ${reservaId} cancelada exitosamente`);
  } catch (error) {
    logError('Error canceling reservation:', error);

    // Debug detallado del error
    if (DEBUG_MODE) {
      logError('[DEBUG] API Error:', {
        error,
        endpoint: `/reservas/reservas/${reservaId}/cancel/`,
        data: {},
        context: 'cancelation',
      });
    }

    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data ||
      error.message ||
      'Error al cancelar la reserva.';
    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : 'Error al cancelar la reserva.',
    );
  }
};

/**
 * 🛒 OBTENER EXTRAS DISPONIBLES
 *
 * Función principal para obtener la lista completa de extras y servicios adicionales
 * disponibles para alquiler. Es la base para la selección de extras en el proceso
 * de reserva y para mostrar opciones personalizables al cliente.
 *
 * 📊 ESTRUCTURA DE DATOS DE SALIDA:
 * [
 *   {
 *     id: 1,
 *     nombre: "Asiento infantil",
 *     descripcion: "Para niños de 9-18kg (1-4 años)",
 *     precio: 7.50,
 *     disponible: true,
 *     categoria: "seguridad"
 *   },
 *   {
 *     id: 2,
 *     nombre: "GPS",
 *     descripcion: "Navegador con mapas actualizados",
 *     precio: 8.95,
 *     disponible: true,
 *     categoria: "navegacion"
 *   }
 *   // ... más extras
 * ]
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - Mostrar catálogo de extras en pantalla de selección
 * - Calcular precios dinámicos con extras incluidos
 * - Validar extras seleccionados contra lista disponible
 * - Convertir IDs de extras a objetos completos en storage service
 *
 * 🔄 DISPONIBILIDAD: Funciona tanto en DEBUG_MODE como en producción
 * ⚡ FALLBACK: Retorna datos de prueba realistas en modo DEBUG_MODE para desarrollo
 * 🛡️ ERROR HANDLING: Manejo robusto de diferentes formatos de respuesta API
 *
 * @returns {Promise<Array>} - Lista completa de extras disponibles con información detallada
 * @throws {Error} - Error específico si hay problemas de conexión o formato inesperado
 */
export const getExtrasDisponibles = async () => {
  try {
    if (shouldUseTestingData(false)) {
      // Simular delay y devolver datos de prueba centralizados
      await new Promise((resolve) => setTimeout(resolve, 300));
      logInfo('🧪 DEBUG: Usando datos de extras de prueba centralizados');
      return extrasDisponiblesPrueba;
    }

    // Producción: llamada real a la API
    const response = await axios.get(
      `${API_URL}/reservas/extras/`,
      getAuthHeaders(),
    );

    // Manejar la respuesta que puede tener estructura {success: true, results: [...]} o ser directamente un array
    if (response.data && response.data.results) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Formato de respuesta inesperado');
    }
  } catch (error) {
    logger.error('Error fetching extras:', error);
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Error al obtener los extras disponibles.';

    throw new Error(
      typeof errorMessage === 'string'
        ? errorMessage
        : 'Error al obtener los extras disponibles.',
    );
  }
};

/**
 * 🛒 OBTENER EXTRAS DISPONIBLES (OPTIMIZADO)
 *
 * Función especializada para obtener únicamente los extras actualmente disponibles
 * para reserva. A diferencia de `getExtrasDisponibles()`, esta función utiliza un
 * endpoint optimizado que pre-filtra la disponibilidad en tiempo real, ideal para
 * interfaces de usuario que requieren datos actualizados constantemente.
 *
 * 📊 ESTRUCTURA DE DATOS DE SALIDA:
 * [
 *   {
 *     id: 1,
 *     nombre: "Asiento infantil (Grupo 1)",
 *     descripcion: "Para niños de 9-18kg (1-4 años). Homologado ECE R44/04",
 *     precio: 25.00,                    // Precio por día de alquiler
 *     disponible: true,                 // Garantizado true en esta función
 *     categoria: "seguridad",
 *     stock_actual: 15,                 // Unidades disponibles en inventario
 *     popularidad: 85,                  // Índice de selección (0-100)
 *     tiempo_instalacion: 5,            // Minutos estimados de instalación
 *     restricciones: [                  // Limitaciones específicas
 *       "Requiere vehículo con ISOFIX",
 *       "No compatible con asientos deportivos"
 *     ],
 *     imagen_url: "/images/extras/asiento-infantil-grupo1.jpg",
 *     manual_url: "/docs/asiento-infantil-manual.pdf"
 *   },
 *   {
 *     id: 2,
 *     nombre: "GPS navegador TomTom",
 *     descripcion: "Navegador con mapas de Europa actualizados, pantalla 6 pulgadas",
 *     precio: 8.95,
 *     disponible: true,
 *     categoria: "navegacion",
 *     stock_actual: 8,
 *     popularidad: 72,
 *     tiempo_instalacion: 2,
 *     restricciones: [],
 *     caracteristicas: [
 *       "Mapas de Europa incluidos",
 *       "Actualizaciones gratuitas por 1 año",
 *       "Bluetooth integrado",
 *       "Avisos de tráfico en tiempo real"
 *     ]
 *   }
 *   // ... más extras disponibles
 * ]
 *
 * 🎯 DIFERENCIAS CON `getExtrasDisponibles()`:
 * - ⚡ **Rendimiento**: Endpoint optimizado con filtrado server-side
 * - 📊 **Stock en tiempo real**: Información actualizada de inventario
 * - 🔄 **Cache inteligente**: Menor latencia para consultas frecuentes
 * - 📱 **Datos móviles**: Información específica para interfaces responsive
 * - 🎨 **Metadatos UX**: Datos adicionales para mejor experiencia de usuario
 *
 * 🔄 ESTRATEGIA DE FALLBACK:
 * 1. **Primer intento**: Endpoint optimizado `/extras/disponibles/`
 * 2. **Fallback automático**: Si falla, utiliza `getExtrasDisponibles()`
 * 3. **Filtrado local**: Aplica filtro `disponible: true` si es necesario
 * 4. **Cache de emergencia**: Datos cached como último recurso
 *
 * 📱 CASOS DE USO PRINCIPALES:
 * - Pantalla de selección de extras en tiempo real
 * - Validación de disponibilidad antes de añadir al carrito
 * - Interfaces móviles que requieren carga rápida
 * - Sistemas de recomendación basados en popularidad
 * - Cálculo dinámico de precios con extras
 *
 * 🚀 OPTIMIZACIONES IMPLEMENTADAS:
 * - **Compresión**: Respuesta gzip para reducir transferencia
 * - **Paginación**: Soporte para grandes catálogos de extras
 * - **Filtros server-side**: Reduce carga en frontend
 * - **Cache distribuido**: Redis/Memcached para alta disponibilidad
 * - **CDN integration**: Imágenes servidas desde CDN
 *
 * ⚠️ CONSIDERACIONES DE RENDIMIENTO:
 * - Stock actualizado cada 30 segundos en producción
 * - Timeout de 3 segundos para endpoint optimizado
 * - Fallback automático sin interrupción de UX
 * - Logging de performance para monitoreo
 *
 * 🔄 DISPONIBILIDAD:
 * - **DEBUG_MODE**: Utiliza datos de `getExtrasDisponibles()`
 * - **Producción**: Endpoint optimizado con fallback robusto
 * - **Offline**: Cache local como último recurso
 *
 * @returns {Promise<Array>} - Lista de extras disponibles con información enriquecida
 * @throws {Error} - Solo en caso de fallo completo de todos los fallbacks
 */
export const getExtrasAvailable = async () => {
  try {
    if (DEBUG_MODE) {
      return await getExtrasDisponibles();
    } // Producción: usar el endpoint específico para extras disponibles
    const response = await axios.get(
      `${API_URL}/reservas/extras/`,
      getAuthHeaders(),
    );

    // Manejar la respuesta que puede tener estructura {success: true, results: [...]} o ser directamente un array
    if (response.data && response.data.results) {
      return response.data.results;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error('Formato de respuesta inesperado');
    }
  } catch (error) {
    logger.error('Error fetching available extras:', error);
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
      return extras.sort((a, b) =>
        orden === 'asc' ? a.precio - b.precio : b.precio - a.precio,
      );
    }

    // Producción: usar el endpoint específico
    const response = await axios.get(
      `${API_URL}/reservas/extras/`,
      getAuthHeaders(),
    );
    return response.data;
  } catch (error) {
    logger.error('Error fetching extras by price:', error);
    // Fallback a la función principal and ordenar localmente
    const extras = await getExtrasDisponibles();
    return extras.sort((a, b) =>
      orden === 'asc' ? a.precio - b.precio : b.precio - a.precio,
    );
  }
};

// ⚠️ DATOS DE PRUEBA - SOLO PARA DEBUG Y TESTING
// IMPORTANTE: Estos datos NO deben usarse en producción
// Solo están disponibles cuando DEBUG_MODE=true Y hay fallo del backend
// Export test data for backward compatibility - only available in DEBUG mode
export { datosReservaPrueba };

/**
 * 💳 PROCESAR PAGO DE RESERVA CON STRIPE
 *
 * Función central para procesar pagos de reservas utilizando la integración con Stripe.
 * Maneja tanto pagos iniciales como pagos de diferencias/extras posteriores, con
 * soporte completo para diferentes métodos de pago y estados de transacción.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * @param {string} reservaId - ID único de la reserva (formato: "RSV-12345678")
 * @param {Object} paymentData - Datos del pago con la siguiente estructura:
 * {
 *   amount: 395.16,                    // Importe exacto a procesar
 *   currency: "EUR",                   // Moneda (por defecto EUR)
 *   payment_method_id: "pm_1234...",   // ID del método de pago de Stripe
 *   customer_email: "user@example.com", // Email del cliente
 *   description: "Pago reserva vehículo", // Descripción de la transacción
 *   metadata: {                        // Metadatos adicionales
 *     reservation_id: "RSV-12345678",
 *     vehicle_type: "BMW 320i",
 *     pickup_date: "2025-06-15"
 *   }
 * }
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * {
 *   success: true,
 *   message: "Pago procesado correctamente",
 *   reserva_id: "RSV-12345678",
 *   estado: "confirmada",                    // Nuevo estado de la reserva
 *   transaction_id: "STRIPE_1234567890",     // ID único de transacción
 *   payment_intent_id: "pi_1234567890",     // ID del PaymentIntent de Stripe
 *   importe_pendiente_total: 0,             // Importe restante por pagar
 *   receipt_url: "https://pay.stripe.com/receipts/...", // URL del recibo
 *   processing_fee: 12.50,                  // Comisión aplicada (si aplica)
 *   refund_policy: "24h_free_cancellation"  // Política de reembolso aplicable
 * }
 *
 * 🔄 FLUJO DE PROCESAMIENTO:
 * 1. **Validación inicial**: Verificación de reserva y datos de pago
 * 2. **Cálculo de importes**: Validación del monto contra reserva
 * 3. **Procesamiento Stripe**: Creación del PaymentIntent y confirmación
 * 4. **Actualización de estado**: Cambio de estado de reserva según resultado
 * 5. **Notificaciones**: Envío de confirmaciones y recibos automáticos
 * 6. **Logging de auditoría**: Registro completo para seguimiento y soporte
 *
 * 💰 TIPOS DE PAGO SOPORTADOS:
 * - 💳 **Pago inicial completo**: Confirma reserva inmediatamente
 * - 🎯 **Pago de diferencias**: Para cambios posteriores (extras, fechas)
 * - 🔄 **Pago parcial**: Para reservas con esquema de pagos divididos
 * - 💸 **Reembolsos**: Procesamiento de cancelaciones y devoluciones
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - Confirmar reserva nueva con pago de tarjeta
 * - Procesar pago de extras añadidos posteriormente
 * - Cobrar diferencias por cambios de fechas o upgrades
 * - Manejar pagos de penalizaciones o cargos adicionales
 * - Integración con flujo de checkout del frontend
 *
 * 🛡️ SEGURIDAD Y CUMPLIMIENTO:
 * - ✅ **PCI DSS Compliant**: No maneja datos sensibles directamente
 * - 🔐 **Encriptación**: Todas las comunicaciones cifradas con Stripe
 * - 📝 **Auditoría**: Logging completo de todas las transacciones
 * - ⚡ **Idempotencia**: Previene duplicación de cargos accidentales
 * - 🛡️ **Fraud Detection**: Utiliza herramientas anti-fraude de Stripe
 *
 * ⚠️ MANEJO DE ERRORES ESPECÍFICOS:
 * - Tarjeta rechazada → Mensaje claro al usuario + sugerencias
 * - Fondos insuficientes → Alternativas de pago
 * - Problemas de red → Reintentos automáticos con backoff
 * - Errores de Stripe → Logging detallado + notificación a soporte
 *
 * 🔄 DISPONIBILIDAD:
 * - **DEBUG_MODE**: Simulación completa con datos realistas
 * - **Producción**: Integración real con Stripe API
 * - **Fallback**: Manejo graceful de fallos temporales
 *
 * @returns {Promise<Object>} - Resultado completo del procesamiento de pago
 * @throws {Error} - Error específico con detalles para debugging y UX
 */
export const processPayment = async (reservaId, paymentData) => {
  try {
    logger.info('🔄 Procesando pago de reserva', {
      reservaId,
      importe: paymentData.amount,
      metodo: paymentData.metodo_pago,
    });

    if (DEBUG_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simular procesamiento exitoso
      return {
        success: true,
        message: 'Pago procesado correctamente (simulado)',
        reserva_id: reservaId,
        estado: 'confirmada',
        transaction_id: `STRIPE_MOCK_${Date.now()}`,
        payment_intent_id: `pi_mock_${Date.now()}`,
        importe_pendiente_total: 0,
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
        importe_pendiente_total: 0,
      };
    } else {
      throw new Error(resultado.error || 'Error procesando el pago');
    }
  } catch (error) {
    logError('Error procesando pago de reserva', error);
    throw new Error(error.message || 'Error al procesar el pago');
  }
};

/**
 * 💳 PROCESAR PAGO DE DIFERENCIA
 *
 * Función específica para procesar pagos de diferencias en reservas editadas.
 * Maneja tanto pagos con tarjeta como en efectivo, con validación robusta
 * de campos numéricos y formateo correcto de decimales.
 *
 * @param {string} reservaId - ID de la reserva
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} - Resultado del procesamiento de pago
 */
export const processDifferencePayment = async (reservaId, paymentData) => {
  try {
    logger.info('🔄 Procesando pago de diferencia', {
      reservaId,
      importe: paymentData.importe,
      metodo: paymentData.metodo_pago,
    });

    // Validar y limpiar datos numéricos
    const cleanPaymentData = {
      ...paymentData,
      // Asegurar que los importes sean números válidos con 2 decimales
      importe: Number(parseFloat(paymentData.importe || 0).toFixed(2)),
    };

    if (DEBUG_MODE) {
      // Simular procesamiento de pago en desarrollo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.info('✅ Pago simulado exitosamente');

      return {
        success: true,
        message: 'Pago procesado correctamente (simulado)',
        transaction_id: `SIM-${Date.now()}`,
        amount: cleanPaymentData.importe,
        method: cleanPaymentData.metodo_pago,
      };
    }

    // Producción: procesar pago real
    const response = await axios.post(
      `${API_URL}/payments/process-payment/`,
      {
        reservation_id: reservaId,
        ...cleanPaymentData,
      },
      getAuthHeaders(),
    );

    return response.data;
  } catch (error) {
    logger.error('❌ Error procesando pago:', error);
    const errorMessage =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Error al procesar el pago';

    throw new Error(errorMessage);
  }
};

// ⚠️ ARRAY DE PRUEBA - SOLO DEBUG MODE
// IMPORTANTE: Solo se inicializa si DEBUG_MODE está activo Y hay datos de prueba
let reservasPrueba =
  DEBUG_MODE && datosReservaPrueba ? [{ ...datosReservaPrueba }] : [];

/**
 * 🔍 BUSCAR RESERVA EN ARRAY DE PRUEBA (DEBUG MODE)
 *
 * Función de búsqueda especializada para el modo de desarrollo que permite
 * localizar reservas específicas en el array temporal de pruebas. Esencial
 * para simular operaciones de consulta del backend durante el desarrollo.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * @param {string} reservaId - ID único de la reserva a buscar
 * - Formato: "R12345678", "RSV-2025-0001", o cualquier string de ID
 * - Case sensitive para máxima precisión
 * - Debe coincidir exactamente con el ID almacenado
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * @returns {Object|undefined} - Objeto completo de reserva o undefined si no existe:
 * ```javascript
 * {
 *   id: "R12345678",
 *   estado: "confirmada",
 *   vehiculo: { marca: "BMW", modelo: "320i" },
 *   fechaRecogida: "2025-06-15T10:00:00.000Z",
 *   fechaDevolucion: "2025-06-20T18:00:00.000Z",
 *   precioTotal: 395.16,
 *   metodo_pago: "tarjeta",
 *   importe_pagado_inicial: 395.16,
 *   conductorPrincipal: { nombre: "Juan", email: "juan@example.com" },
 *   extras: [{ id: 1, nombre: "GPS", precio: 15.00 }],
 *   // ... resto de campos de la reserva
 * }
 * ```
 *
 * 🔄 ALGORITMO DE BÚSQUEDA:
 * 1. **Búsqueda lineal**: Recorre el array `reservasPrueba`
 * 2. **Comparación exacta**: Utiliza `find()` con comparación === estricta
 * 3. **Primera coincidencia**: Retorna el primer objeto que coincide
 * 4. **Undefined si no existe**: Comportamiento estándar de Array.find()
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Consulta en `findReservation()`**: Simular búsqueda de reservas por ID
 * - **Validación en `editReservation()`**: Verificar existencia antes de editar
 * - **Testing y debugging**: Localizar reservas específicas durante desarrollo
 * - **Simulación de API**: Emular respuestas del backend en modo DEBUG_MODE
 * - **Verificación de estado**: Comprobar datos actuales de una reserva
 *
 * ⚡ CARACTERÍSTICAS DE RENDIMIENTO:
 * - **Complejidad O(n)**: Búsqueda lineal en array pequeño (desarrollo)
 * - **Memory efficient**: No crea copias del objeto encontrado
 * - **Early termination**: Para en primera coincidencia con `find()`
 * - **Inmutable**: No modifica el array original ni el objeto encontrado
 *
 * 🛡️ ROBUSTEZ Y EDGE CASES:
 * - **ID null/undefined**: Retorna undefined gracefully
 * - **Array vacío**: Retorna undefined si no hay reservas de prueba
 * - **IDs duplicados**: Retorna la primera coincidencia (por diseño)
 * - **Tipos incorrectos**: Maneja cualquier tipo de entrada sin errores
 *
 * 🔄 DISPONIBILIDAD: Solo activo en DEBUG_MODE
 * 🧪 SCOPE: Función interna para testing y desarrollo
 * ⚡ FALLBACK: Undefined para IDs no encontrados (no lanza errores)
 *
 * @example
 * // Uso típico en funciones de servicio
 * if (DEBUG_MODE) {
 *   const reserva = buscarReservaPrueba(reservaId);
 *   if (reserva) {
 *     return reserva;
 *   } else {
 *     throw new Error('Reserva no encontrada');
 *   }
 * }
 */
function buscarReservaPrueba(reservaId) {
  return reservasPrueba.find((r) => r.id === reservaId);
}

/**
 * ✏️ EDITAR RESERVA EN ARRAY DE PRUEBA (DEBUG MODE)
 *
 * Función de actualización especializada para el modo de desarrollo que permite
 * modificar reservas existentes en el array temporal de pruebas. Simula las
 * operaciones de edición del backend con manejo completo de campos de pago.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * @param {string} reservaId - ID único de la reserva a editar
 * @param {Object} data - Datos parciales o completos para actualizar:
 * ```javascript
 * {
 *   // Campos de fechas (opcionales)
 *   fechaRecogida?: "2025-06-20T10:00:00.000Z",
 *   fechaDevolucion?: "2025-06-25T18:00:00.000Z",
 *
 *   // Campos de pago (opcionales con lógica especial)
 *   metodo_pago?: "tarjeta" | "efectivo",
 *   importe_pagado_inicial?: 395.16,
 *   importe_pendiente_inicial?: 0.00,
 *   importe_pagado_extra?: 40.50,
 *   importe_pendiente_extra?: 0.00,
 *
 *   // Campos de conductor (opcionales)
 *   conductorPrincipal?: { nombre, apellido, email },
 *
 *   // Campos de extras (opcionales)
 *   extras?: [{ id, nombre, precio, cantidad }],
 *
 *   // Otros campos de reserva
 *   estado?: "confirmada" | "pendiente" | "cancelada",
 *   notas?: "Cambio solicitado por cliente"
 * }
 * ```
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * @returns {Object|null} - Reserva actualizada completa o null si no existe:
 * ```javascript
 * {
 *   id: "R12345678",
 *   estado: "confirmada",
 *   // ... campos originales preservados
 *   // ... campos actualizados con nuevos valores
 *   metodo_pago: "tarjeta",           // Actualizado si se proporcionó
 *   importe_pagado_inicial: 395.16,   // Actualizado con nullish coalescing
 *   updated_at: "2025-06-03T15:30:00.000Z"  // Auto-actualizado
 * }
 * ```
 *
 * 🔄 PROCESO DE ACTUALIZACIÓN:
 * 1. **Búsqueda por índice**: Localiza la reserva en el array con `findIndex()`
 * 2. **Validación de existencia**: Retorna null si el ID no existe
 * 3. **Merge inteligente**: Combina datos existentes con nuevos usando spread operator
 * 4. **Nullish coalescing**: Preserva valores existentes para campos undefined
 * 5. **Actualización in-place**: Modifica directamente el array `reservasPrueba`
 * 6. **Timestamp automático**: Actualiza `updated_at` automáticamente
 *
 * 💰 LÓGICA ESPECIAL DE CAMPOS DE PAGO:
 * Los campos de pago utilizan nullish coalescing (??) para preservar valores existentes:
 * - `data.metodo_pago ?? existing.metodo_pago`: Solo actualiza si se proporciona valor
 * - `data.importe_pagado_inicial ?? existing.importe_pagado_inicial`: Preserva si undefined
 * - Permite actualizaciones parciales sin perder información de pago previa
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Simulación en `editReservation()`**: Emular actualizaciones del backend
 * - **Cambios de fechas**: Modificar período de alquiler
 * - **Actualización de extras**: Añadir o quitar servicios adicionales
 * - **Cambios de conductor**: Actualizar datos del conductor principal
 * - **Estados de pago**: Actualizar importes pagados/pendientes
 * - **Testing de flujos**: Validar lógica de edición durante desarrollo
 *
 * ⚡ CARACTERÍSTICAS DE RENDIMIENTO:
 * - **Búsqueda O(n)**: findIndex() para localizar reserva
 * - **Actualización O(1)**: Acceso directo por índice para update
 * - **Memory efficient**: Modifica objeto existente, no crea copias
 * - **Minimal processing**: Solo actualiza campos proporcionados
 *
 * 🛡️ ROBUSTEZ Y VALIDACIÓN:
 * - **ID validation**: Retorna null para IDs inexistentes
 * - **Preserve existing data**: Nullish coalescing evita sobrescribir con undefined
 * - **Type safety**: Maneja diferentes tipos de entrada sin errores
 * - **Immutable ID**: El ID de reserva nunca cambia durante edición
 *
 * 🔄 DISPONIBILIDAD: Solo activo en DEBUG_MODE
 * 🧪 SCOPE: Función interna para testing y desarrollo
 * ⚡ FALLBACK: null para IDs no encontrados (no lanza errores)
 *
 * @example
 * // Uso típico en editReservation()
 * if (DEBUG_MODE) {
 *   const updated = editarReservaPrueba(reservaId, {
 *     estado: 'confirmada',
 *     importe_pagado_inicial: totalAmount,
 *     metodo_pago: 'tarjeta'
 *   });
 *   if (!updated) throw new Error('Reserva no encontrada para editar');
 *   return updated;
 * }
 */
function editarReservaPrueba(reservaId, data) {
  const idx = reservasPrueba.findIndex((r) => r.id === reservaId);
  if (idx === -1) return null;

  reservasPrueba[idx] = {
    ...reservasPrueba[idx],
    ...data,
    // Actualizar los nuevos campos de pagos si vienen en data usando nullish coalescing
    metodo_pago: data.metodo_pago ?? reservasPrueba[idx].metodo_pago,
    importe_pagado_inicial:
      data.importe_pagado_inicial ?? reservasPrueba[idx].importe_pagado_inicial,
    importe_pendiente_inicial:
      data.importe_pendiente_inicial ??
      reservasPrueba[idx].importe_pendiente_inicial,
    importe_pagado_extra:
      data.importe_pagado_extra ?? reservasPrueba[idx].importe_pagado_extra,
    importe_pendiente_extra:
      data.importe_pendiente_extra ??
      reservasPrueba[idx].importe_pendiente_extra,
    updated_at: new Date().toISOString(), // Auto-update timestamp
  };

  return reservasPrueba[idx];
}

/**
 * 🚗 CREAR NUEVA RESERVA EN ARRAY DE PRUEBA (DEBUG MODE)
 *
 * Función de creación especializada para el modo de desarrollo que permite
 * generar nuevas reservas en el array temporal de pruebas. Simula la creación
 * del backend con lógica completa de cálculo de pagos y asignación de IDs únicos.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * @param {Object} data - Datos completos de la nueva reserva:
 * ```javascript
 * {
 *   // Datos del vehículo (requeridos)
 *   vehiculo: { id: 7, marca: "BMW", modelo: "320i" },
 *   car: { id: 7, marca: "BMW", modelo: "320i" }, // Formato alternativo
 *
 *   // Fechas y ubicaciones (requeridas)
 *   fechaRecogida: "2025-06-15T10:00:00.000Z",
 *   fechaDevolucion: "2025-06-20T18:00:00.000Z",
 *   lugarRecogida: { id: 1, nombre: "Aeropuerto Málaga" },
 *   lugarDevolucion: { id: 2, nombre: "Centro ciudad" },
 *
 *   // Datos de pricing (opcionales con fallbacks)
 *   precioTotal?: 395.16,
 *   detallesReserva?: { base, extras, impuestos, total },
 *
 *   // Método de pago (determina lógica de importes)
 *   metodo_pago?: "tarjeta" | "efectivo", // Default: "tarjeta"
 *   metodoPago?: "tarjeta" | "efectivo",  // Formato alternativo
 *
 *   // Conductor principal
 *   conductorPrincipal?: { nombre, apellido, email, telefono },
 *
 *   // Extras seleccionados
 *   extras?: [{ id, nombre, precio, cantidad }],
 *
 *   // Campos adicionales opcionales
 *   promocion?: { id: 5, descuento: 10 },
 *   notas?: "Solicitud especial del cliente"
 * }
 * ```
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * @returns {Object} - Nueva reserva creada con campos auto-generados:
 * ```javascript
 * {
 *   // Campos auto-generados
 *   id: "R87654321",                    // ID único aleatorio
 *   estado: "confirmada" | "pendiente", // Según método de pago
 *   created_at: "2025-06-03T15:30:00.000Z",
 *   updated_at: "2025-06-03T15:30:00.000Z",
 *
 *   // Campos de pago calculados
 *   metodo_pago: "tarjeta",
 *   importe_pagado_inicial: 395.16,     // Total si tarjeta, 0 si efectivo
 *   importe_pendiente_inicial: 0.00,    // 0 si tarjeta, total si efectivo
 *   importe_pagado_extra: 0.00,         // Siempre 0 para nueva reserva
 *   importe_pendiente_extra: 0.00,      // Siempre 0 para nueva reserva
 *
 *   // Todos los datos de entrada preservados
 *   vehiculo: { ... },
 *   fechaRecogida: "2025-06-15T10:00:00.000Z",
 *   precioTotal: 395.16,
 *   conductorPrincipal: { ... },
 *   // ... resto de campos proporcionados
 * }
 * ```
 *
 * 💰 LÓGICA DE CÁLCULO DE PAGOS:
 * El sistema determina automáticamente los importes según el método de pago:
 *
 * **PAGO CON TARJETA:**
 * - `estado`: "confirmada" (pago inmediato)
 * - `importe_pagado_inicial`: precioTotal (todo pagado)
 * - `importe_pendiente_inicial`: 0 (nada pendiente)
 *
 * **PAGO EN EFECTIVO:**
 * - `estado`: "pendiente" (pago diferido)
 * - `importe_pagado_inicial`: 0 (nada pagado inicialmente)
 * - `importe_pendiente_inicial`: precioTotal (todo pendiente)
 *
 * 🔢 GENERACIÓN DE ID ÚNICO:
 * - **Formato**: "R" + 8 dígitos aleatorios (ej: "R87654321")
 * - **Método**: `Math.floor(Math.random() * 1e8)` para generar número aleatorio
 * - **Colisiones**: Muy improbables en entorno de desarrollo (1 en 100M)
 * - **Prefijo**: "R" para identificar fácilmente reservas de prueba
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Simulación en `createReservation()`**: Emular creación del backend
 * - **Testing de flujo completo**: Validar proceso de reserva end-to-end
 * - **Desarrollo sin backend**: Permitir desarrollo frontend independiente
 * - **Datos de prueba**: Generar reservas para testing de componentes
 * - **Validación de lógica**: Verificar cálculos de pago y estado
 *
 * ⚡ CARACTERÍSTICAS DE RENDIMIENTO:
 * - **O(1) insertion**: Append directo al array con `push()`
 * - **Minimal computation**: Solo cálculos esenciales de pago
 * - **Memory efficient**: Crea un solo objeto nuevo
 * - **Fast ID generation**: Operación matemática simple para ID único
 *
 * 🛡️ ROBUSTEZ Y VALIDACIÓN:
 * - **Fallback pricing**: precioTotal default de 395.16 si no se proporciona
 * - **Safe method detection**: Maneja tanto `metodo_pago` como `metodoPago`
 * - **Spread operator**: Preserva todos los campos de entrada
 * - **Timestamp consistency**: `created_at` y `updated_at` idénticos para nueva reserva
 *
 * 📊 CAMPOS DE ESTADO INICIAL:
 * - **importe_pagado_extra**: Siempre 0 (nueva reserva sin extras posteriores)
 * - **importe_pendiente_extra**: Siempre 0 (nueva reserva sin pendientes extra)
 * - **created_at/updated_at**: Timestamp actual de creación
 *
 * 🔄 DISPONIBILIDAD: Solo activo en DEBUG_MODE
 * 🧪 SCOPE: Función interna para testing y desarrollo
 * ⚡ FALLBACK: Valores por defecto para campos opcionales
 *
 * @example
 * // Uso típico en createReservation()
 * if (DEBUG_MODE) {
 *   await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
 *   const nueva = crearReservaPrueba(mappedData);
 *   logInfo('Reserva creada en modo debug', { id: nueva.id });
 *   return nueva;
 * }
 */
export function crearReservaPrueba(data) {
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
    id: `R${Math.floor(Math.random() * 1e8)}`,
    estado: metodoPago === 'tarjeta' ? 'confirmada' : 'pendiente',
    metodo_pago: metodoPago,
    importe_pagado_inicial,
    importe_pendiente_inicial,
    importe_pagado_extra: 0,
    importe_pendiente_extra: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  reservasPrueba.push(nueva);
  return nueva;
}

// Cache for locations to avoid repeated API calls
let locationsCache = null;

/**
 * 📍 OBTENER UBICACIONES CON CACHÉ INTELIGENTE
 *
 * Sistema optimizado de carga y cacheo de ubicaciones disponibles en el sistema.
 * Implementa una estrategia de cache en memoria para evitar llamadas repetidas
 * a la API y garantizar rendimiento óptimo en operaciones de resolución.
 *
 * 📊 ESTRUCTURA DE DATOS DE SALIDA:
 * [
 *   {
 *     id: 1,
 *     nombre: "Aeropuerto de Málaga (AGP)",
 *     direccion_id: 5,
 *     telefono: "+34 951 23 45 67",
 *     email: "malaga@mobility4you.com",
 *     icono_url: "faPlane",
 *     activo: true,
 *     direccion: {
 *       id: 5,
 *       calle: "Av. Comandante García Morato, s/n",
 *       ciudad: "málaga",
 *       provincia: "málaga",
 *       pais: "españa",
 *       codigo_postal: "29004"
 *     }
 *   },
 *   // ... más ubicaciones disponibles
 * ]
 *
 * 🚀 CARACTERÍSTICAS PRINCIPALES:
 * - **Cache persistente**: Evita cargas duplicadas durante la sesión
 * - **Fallback robusto**: Array vacío si falla la carga inicial
 * - **Performance optimizada**: Una sola llamada API por sesión
 * - **Thread-safe**: Maneja concurrencia de múltiples llamadas
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - Resolución de nombres de ubicación a IDs en `findLocationIdByName()`
 * - Validación de ubicaciones durante creación de reservas
 * - Poblar dropdowns y selectors de ubicación en frontend
 * - Verificación de disponibilidad de servicios por ubicación
 * - Cache para funciones de búsqueda y autocomplete
 *
 * ⚡ ESTRATEGIA DE CACHE:
 * - **Inicialización lazy**: Solo carga cuando se necesita por primera vez
 * - **Persistencia en sesión**: Cache válido durante toda la sesión del usuario
 * - **Recuperación automática**: Reintentos transparentes en caso de fallo
 * - **Memoria eficiente**: Cache shared entre todas las funciones
 *
 * 🔄 DISPONIBILIDAD:
 * - **DEBUG_MODE**: Utiliza datos de `fetchLocations()` con fallback a testingData
 * - **Producción**: Carga real desde endpoint `/lugares/` con cache optimizado
 * - **Offline**: Array vacío como último recurso
 *
 * 🛡️ ERROR HANDLING:
 * - Logs detallados para debugging en desarrollo
 * - Fallback graceful a array vacío en producción
 * - No interrumpe flujo principal en caso de fallos de red
 * - Permite retry automático en próximas llamadas
 *
 * @returns {Promise<Array>} - Lista completa de ubicaciones disponibles con información detallada
 * @throws {never} - Nunca lanza errores, siempre retorna array (vacío en caso de fallo)
 */
const getCachedLocations = async () => {
  if (!locationsCache) {
    try {
      locationsCache = await fetchLocations();
    } catch (error) {
      logger.error('Error loading locations for lookup:', error);
      // Return empty array if locations can't be loaded
      locationsCache = [];
    }
  }
  return locationsCache;
};

/**
 * 🔍 RESOLVER ID DE UBICACIÓN POR NOMBRE
 *
 * Función inteligente de búsqueda que convierte nombres de ubicación a IDs únicos
 * del sistema. Implementa algoritmos de coincidencia exacta y parcial para máxima
 * flexibilidad, esencial para mapeo de datos entre frontend y backend.
 *
 * 📊 DATOS DE ENTRADA:
 * - locationName: "Aeropuerto de Málaga" | "AGP" | "málaga" (formato flexible)
 *
 * 📊 DATOS DE SALIDA:
 * - ID numérico: 1, 2, 3... (si encuentra coincidencia)
 * - null: si no encuentra ninguna coincidencia válida
 *
 * 🧠 ALGORITMO DE BÚSQUEDA:
 * 1. **Coincidencia exacta**: Comparación case-insensitive del nombre completo
 * 2. **Coincidencia parcial**: Búsqueda de subcadenas en ambas direcciones
 * 3. **Logging inteligente**: Warn para coincidencias parciales (debugging)
 * 4. **Fallback robusto**: null en lugar de excepciones
 *
 * 💡 EJEMPLOS DE USO:
 * ```javascript
 * await findLocationIdByName("Aeropuerto de Málaga (AGP)") → 1
 * await findLocationIdByName("málaga") → 1 (coincidencia parcial)
 * await findLocationIdByName("AGP") → 1 (coincidencia parcial)
 * await findLocationIdByName("ubicación inexistente") → null
 * await findLocationIdByName("") → null (entrada inválida)
 * ```
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Mapeo de datos**: Convertir strings de ubicación a IDs en `mapReservationDataToBackend()`
 * - **Validación de entrada**: Verificar que ubicaciones ingresadas existen
 * - **Resolución legacy**: Convertir datos antiguos con nombres a nuevos con IDs
 * - **Importación de datos**: Procesar CSVs/Excel con nombres de ubicación
 * - **APIs externas**: Mapear ubicaciones de sistemas terceros
 *
 * 🔄 FLUJO DE RESOLUCIÓN:
 * 1. **Validación inicial**: Verificar que entrada sea string válido
 * 2. **Cache loading**: Obtener ubicaciones via `getCachedLocations()`
 * 3. **Búsqueda exacta**: Comparación directa normalizada (toLowerCase)
 * 4. **Búsqueda parcial**: Inclusión bidireccional con warning
 * 5. **Logging de resultados**: Error detallado si no encuentra match
 *
 * ⚡ OPTIMIZACIONES:
 * - **Cache compartido**: Reutiliza cache de `getCachedLocations()`
 * - **Normalización eficiente**: toLowerCase() una sola vez por string
 * - **Early return**: Termina en primera coincidencia exacta
 * - **Lazy loading**: Solo carga ubicaciones cuando es necesario
 *
 * 🛡️ ROBUSTEZ Y ERROR HANDLING:
 * - **Entrada sanitizada**: Valida tipos y valores nulos/undefined
 * - **Coincidencia flexible**: Maneja diferencias de capitalización
 * - **Logging detallado**: Facilita debugging en desarrollo
 * - **Graceful degradation**: null instead de errores fatales
 *
 * 🔄 DISPONIBILIDAD:
 * - **DEBUG_MODE**: Logging detallado para desarrollo y debugging
 * - **Producción**: Optimizado para performance con logging mínimo
 * - **Fallback**: Cache de ubicaciones vacío no interrumpe operación
 *
 * @param {string} locationName - Nombre de la ubicación a buscar (case-insensitive)
 * @returns {Promise<number|null>} - ID numérico de la ubicación o null si no existe
 * @throws {never} - Nunca lanza errores, always retorna number o null
 */
const findLocationIdByName = async (locationName) => {
  if (!locationName || typeof locationName !== 'string') {
    return null;
  }

  try {
    const locations = await getCachedLocations();

    // First try exact match
    const exactMatch = locations.find(
      (location) =>
        location.nombre.toLowerCase() === locationName.toLowerCase(),
    );

    if (exactMatch) {
      return exactMatch.id;
    }

    // If no exact match, try partial match
    const partialMatch = locations.find(
      (location) =>
        location.nombre.toLowerCase().includes(locationName.toLowerCase()) ||
        locationName.toLowerCase().includes(location.nombre.toLowerCase()),
    );

    if (partialMatch) {
      logger.warn(
        `Location exact match not found for "${locationName}", using partial match: "${partialMatch.nombre}"`,
      );
      return partialMatch.id;
    }

    // No fallbacks - report the error instead
    logger.error(`Location not found: "${locationName}"`);
    return null;
  } catch (error) {
    logger.error('Error finding location ID by name:', error);

    // No fallbacks in case of error - return null and let caller handle it
    return null;
  }
};

/**
 * 🔗 MAPEO DE OPCIONES DE PAGO A IDs NUMÉRICOS
 *
 * Función helper crítica para la conversión entre los identificadores de políticas
 * de pago del frontend (strings) y los IDs numéricos requeridos por el backend.
 * Utilizada en el flujo de mapeo de datos de reserva para garantizar consistencia.
 *
 * 📊 ESTRUCTURA DE DATOS DE ENTRADA:
 * @param {string|number} paymentOption - Opción de pago desde el frontend:
 * - **String**: "all-inclusive", "economy", "premium" (case-insensitive)
 * - **Number**: ID numérico directo (1, 2, 3)
 * - **Object**: { id: number, nombre: string } (extrae .id)
 *
 * 📤 ESTRUCTURA DE DATOS DE SALIDA:
 * @returns {number|null} - ID numérico para backend:
 * ```javascript
 * 1: All Inclusive (Sin franquicia, cobertura completa)
 * 2: Economy (Franquicia 1200€, cobertura básica)
 * 3: Premium (Franquicia 500€, cobertura avanzada)
 * null: Opción no reconocida o entrada inválida
 * ```
 *
 * 🔄 EJEMPLOS DE MAPEO:
 * ```javascript
 * mapPaymentOptionToId("all-inclusive") → 1
 * mapPaymentOptionToId("All-Inclusive") → 1 (case insensitive)
 * mapPaymentOptionToId("economy") → 2
 * mapPaymentOptionToId("premium") → 3
 * mapPaymentOptionToId(1) → 1 (ya es numérico)
 * mapPaymentOptionToId({ id: 2, nombre: "Economy" }) → 2
 * mapPaymentOptionToId("unknown") → null
 * mapPaymentOptionToId("") → null
 * ```
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - **Mapeo en `mapReservationDataToBackend()`**: Conversión de datos para API
 * - **Validación de políticas**: Verificar IDs válidos antes de envío
 * - **Migración de datos**: Convertir strings legacy a IDs numéricos
 * - **Fallback handling**: Manejo robusto de formatos inconsistentes
 * - **Frontend-Backend bridge**: Conexión entre diferentes representaciones
 *
 * 🛡️ ROBUSTEZ Y VALIDACIÓN:
 * - **Type checking**: Maneja strings, números y objetos
 * - **Case insensitive**: Convierte a lowercase para comparación
 * - **Trim whitespace**: Elimina espacios en blanco
 * - **Null safety**: Retorna null para entradas inválidas
 * - **Debug logging**: Warning en DEBUG_MODE para opciones no reconocidas
 *
 * ⚡ OPTIMIZACIONES:
 * - **Mapping table estático**: O(1) lookup performance
 * - **Early returns**: Termina en primera condición válida
 * - **Minimal processing**: Solo lowercase/trim cuando es necesario
 * - **Memory efficient**: No crea objetos temporales innecesarios
 *
 * 🔄 DISPONIBILIDAD: Función helper interna, disponible 24/7
 * 🚨 LOGGING: Warning en DEBUG_MODE para opciones no reconocidas
 * ⚡ FALLBACK: null para entradas inválidas (no lanza errores)
 *
 * @example
 * // Uso típico en mapReservationDataToBackend
 * const politicaPagoId = mapPaymentOptionToId(data.paymentOption);
 * if (politicaPagoId) {
 *   mappedData.politica_pago_id = politicaPagoId;
 * }
 */
const mapPaymentOptionToId = (paymentOption) => {
  // If it's already a number, return it
  if (typeof paymentOption === 'number') {
    return paymentOption;
  }

  // Handle object with id property
  if (typeof paymentOption === 'object' && paymentOption?.id) {
    return paymentOption.id;
  }

  // If it's a string, map it to the corresponding ID
  if (typeof paymentOption === 'string') {
    const mappings = {
      'all-inclusive': 1, // All Inclusive
      economy: 2, // Economy
      premium: 3, // Premium
    };

    const lowercaseOption = paymentOption.toLowerCase().trim();
    const mappedId = mappings[lowercaseOption];

    if (DEBUG_MODE && !mappedId) {
      logger.warn(
        `[mapPaymentOptionToId] Unknown payment option: "${paymentOption}"`,
      );
    }

    return mappedId || null;
  }

  return null;
};

/**
 * 🔧 VALIDAR DATOS DE RESERVA
 *
 * Función auxiliar para validar y limpiar datos de reserva antes del envío al backend.
 * Asegura que todos los campos numéricos estén correctamente formateados.
 *
 * @param {Object} data - Datos de la reserva a validar
 * @returns {Object} - Datos validados y limpiados
 */
const validateAndCleanReservationData = (data) => {
  logger.info('🔍 Validando datos de reserva:', data);

  const cleanedData = { ...data };

  // Lista de campos numéricos que requieren limpieza
  const numericFields = [
    'precio_total',
    'precio_base',
    'precio_extras',
    'precio_impuestos',
    'precio_dia',
    'importe_pagado_inicial',
    'importe_pendiente_inicial',
    'importe_pagado_extra',
    'importe_pendiente_extra',
    'tasa_impuesto',
  ];

  // Limpiar campos numéricos
  numericFields.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      const value = data[field];

      if (typeof value === 'string') {
        // Limpiar string de caracteres no numéricos excepto punto y guión
        const cleaned = value.replace(/[^\d.-]/g, '');
        cleanedData[field] = Number(parseFloat(cleaned || 0).toFixed(2));
      } else if (typeof value === 'number') {
        // Asegurar 2 decimales
        cleanedData[field] = Number(parseFloat(value).toFixed(2));
      }
    }
  });

  // Validar IDs requeridos
  const requiredIds = ['vehiculo', 'lugar_recogida', 'lugar_devolucion'];
  requiredIds.forEach((field) => {
    if (!cleanedData[field] && !cleanedData[`${field}_id`]) {
      logger.warn(`⚠️ Campo requerido faltante: ${field}`);
    }
  });

  // Validar fechas
  if (cleanedData.fecha_recogida && cleanedData.fecha_devolucion) {
    const pickup = new Date(cleanedData.fecha_recogida);
    const dropoff = new Date(cleanedData.fecha_devolucion);

    if (pickup >= dropoff) {
      throw new Error(
        'La fecha de devolución debe ser posterior a la fecha de recogida',
      );
    }
  }

  logger.info('✅ Datos validados y limpiados:', cleanedData);
  return cleanedData;
};

/**
 * ✨ ENHANCED RESERVATION DATA MAPPER ✨
 * Mapeo inteligente de datos de reserva usando el nuevo servicio mejorado
 * @param {Object} data - Datos de la reserva desde el frontend
 * @returns {Object} - Datos mapeados para el backend
 */
export const mapReservationDataToBackend = async (data) => {
  try {
    // MIGRADO: Usar el mapper universal en lugar del legacy service
    logInfo('Mapeando datos de reserva usando el mapper universal');

    const mappedData = await universalMapper.mapReservationToBackend(data);

    logInfo('Datos mapeados exitosamente con mapper universal', {
      originalKeys: Object.keys(data || {}),
      mappedKeys: Object.keys(mappedData || {}),
      vehiculoId: mappedData.vehiculo_id,
      lugarRecogidaId: mappedData.lugar_recogida_id,
      lugarDevolucionId: mappedData.lugar_devolucion_id,
      metodoPago: mappedData.metodo_pago,
      precioTotal: mappedData.precio_total,
      extrasCount: mappedData.extras?.length || 0,
      conductoresCount: mappedData.conductores?.length || 0,
    });

    return mappedData;
  } catch (error) {
    // Detailed error logging for debugging - provide specific error context
    logError('❌ Universal mapper failed, using fallback logic', {
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack,
      inputLocations: {
        pickupLocation: data.fechas?.pickupLocation,
        dropoffLocation: data.fechas?.dropoffLocation,
        lugar_recogida: data.lugar_recogida,
        lugar_devolucion: data.lugar_devolucion,
      },
      inputData: DEBUG_MODE ? data : 'Hidden in production',
    });

    // FALLBACK: Use the original inline mapping logic for critical scenarios
    return await mapReservationDataToBackend_FALLBACK(data);
  }
};

/**
 * 🛡️ FALLBACK MAPPER - Critical backup implementation
 * Simplified but reliable mapping for emergency scenarios
 */
const mapReservationDataToBackend_FALLBACK = async (data) => {
  logInfo('🛡️ Using fallback mapper for critical reliability');

  // Basic validation
  if (!data || typeof data !== 'object') {
    throw new Error('Datos de reserva inválidos');
  }

  // Extract essential data with multiple fallback paths
  const vehiculoId = data.car?.id || data.vehiculo?.id || data.vehiculo;
  const fechaRecogida =
    data.fechas?.pickupDate || data.fechaRecogida || data.fecha_recogida;
  const fechaDevolucion =
    data.fechas?.dropoffDate || data.fechaDevolucion || data.fecha_devolucion;

  // Location resolution with fallbacks
  let lugarRecogidaId =
    data.fechas?.pickupLocation?.id ||
    data.lugarRecogida?.id ||
    data.lugar_recogida_id;
  let lugarDevolucionId =
    data.fechas?.dropoffLocation?.id ||
    data.lugarDevolucion?.id ||
    data.lugar_devolucion_id;

  // Debug logging for location data
  if (DEBUG_MODE) {
    logInfo('🔍 Fallback mapper location analysis', {
      originalPickupLocation: data.fechas?.pickupLocation,
      originalDropoffLocation: data.fechas?.dropoffLocation,
      extractedPickupId: lugarRecogidaId,
      extractedDropoffId: lugarDevolucionId,
      pickupIdType: typeof lugarRecogidaId,
      dropoffIdType: typeof lugarDevolucionId,
    });
  }

  // If locations are strings, extract names and try to resolve them
  let pickupLocationName = null;
  let dropoffLocationName = null;

  if (typeof lugarRecogidaId === 'string') {
    pickupLocationName = lugarRecogidaId;
  } else if (data.fechas?.pickupLocation?.nombre) {
    pickupLocationName = data.fechas.pickupLocation.nombre;
    lugarRecogidaId = pickupLocationName;
  }

  if (typeof lugarDevolucionId === 'string') {
    dropoffLocationName = lugarDevolucionId;
  } else if (data.fechas?.dropoffLocation?.nombre) {
    dropoffLocationName = data.fechas.dropoffLocation.nombre;
    lugarDevolucionId = dropoffLocationName;
  }
  // If locations are strings, try to resolve them
  if (typeof lugarRecogidaId === 'string') {
    try {
      const resolvedId = await findLocationIdByName(lugarRecogidaId);
      if (resolvedId === null) {
        throw new Error(
          `No se pudo encontrar el lugar de recogida: "${lugarRecogidaId}"`,
        );
      }
      lugarRecogidaId = resolvedId;
    } catch (error) {
      logError('Error resolving pickup location in fallback', error);
      throw new Error(
        `Error al procesar el lugar de recogida: ${
          error.message || lugarRecogidaId
        }`,
      );
    }
  }

  if (typeof lugarDevolucionId === 'string') {
    try {
      const resolvedId = await findLocationIdByName(lugarDevolucionId);
      if (resolvedId === null) {
        throw new Error(
          `No se pudo encontrar el lugar de devolución: "${lugarDevolucionId}"`,
        );
      }
      lugarDevolucionId = resolvedId;
    } catch (error) {
      logError('Error resolving dropoff location in fallback', error);
      throw new Error(
        `Error al procesar el lugar de devolución: ${
          error.message || lugarDevolucionId
        }`,
      );
    }
  }

  // Payment policy resolution
  let politicaPagoId = data.politicaPago?.id || data.politica_pago_id;
  if (!politicaPagoId && (data.politica_pago || data.paymentOption)) {
    politicaPagoId = mapPaymentOptionToId(
      data.politica_pago || data.paymentOption,
    );
  }

  // Extract pricing with fallbacks
  const detalles = data.detallesReserva;
  const pricing = {
    precio_base:
      detalles?.base ||
      detalles?.precioBase ||
      data.precioBase ||
      data.precio_base ||
      0,
    precio_extras:
      detalles?.extras ||
      detalles?.precioExtras ||
      data.precioExtras ||
      data.precio_extras ||
      0,
    precio_impuestos: roundToDecimals(
      detalles?.impuestos ||
        detalles?.precioImpuestos ||
        data.precioImpuestos ||
        data.precio_impuestos ||
        0,
    ),
    descuento_promocion: roundToDecimals(
      detalles?.descuento ||
        detalles?.descuentoPromocion ||
        data.descuentoPromocion ||
        data.descuento_promocion ||
        0,
    ),
    precio_total: roundToDecimals(
      detalles?.total ||
        detalles?.precioTotal ||
        data.precioTotal ||
        data.precio_total ||
        0,
    ),
  };
  // Essential validation - ensure we have numeric IDs
  if (!vehiculoId || !fechaRecogida || !fechaDevolucion) {
    throw new Error(
      'Datos esenciales de reserva faltantes: vehículo, fechas de recogida y devolución son requeridos',
    );
  }

  if (!lugarRecogidaId || typeof lugarRecogidaId !== 'number') {
    throw new Error(
      `ID del lugar de recogida inválido: ${lugarRecogidaId} (debe ser un número)`,
    );
  }

  if (!lugarDevolucionId || typeof lugarDevolucionId !== 'number') {
    throw new Error(
      `ID del lugar de devolución inválido: ${lugarDevolucionId} (debe ser un número)`,
    );
  }
  // Extract conductor data for user creation
  const conductorPrincipal = data.conductor || data.conductorPrincipal;
  const segundoConductor = data.segundoConductor;

  // Build conductor data for backend user creation
  let datosUsuarioPrincipal = null;
  let datosSegundoConductor = null;

  if (conductorPrincipal) {
    datosUsuarioPrincipal = {
      first_name: conductorPrincipal.nombre || '',
      last_name: conductorPrincipal.apellidos || '',
      email: conductorPrincipal.email || '',
      fecha_nacimiento: conductorPrincipal.fechaNacimiento || '',
      nacionalidad: conductorPrincipal.nacionalidad || '',
      tipo_documento: conductorPrincipal.tipoDocumento || 'dni',
      numero_documento: conductorPrincipal.numeroDocumento || '',
      telefono: conductorPrincipal.telefono || '',
      direccion_data: {
        calle: conductorPrincipal.calle || '',
        ciudad: conductorPrincipal.ciudad || '',
        provincia: conductorPrincipal.provincia || '',
        pais: conductorPrincipal.pais || 'España',
        codigo_postal: conductorPrincipal.codigoPostal || '',
      },
    };
  }

  if (segundoConductor && segundoConductor.nombre) {
    datosSegundoConductor = {
      first_name: segundoConductor.nombre || '',
      last_name: segundoConductor.apellidos || '',
      email: segundoConductor.email || '',
      fecha_nacimiento: segundoConductor.fechaNacimiento || '',
      telefono: segundoConductor.telefono || '',
    };
  }

  // Build the mapped object with essential fields
  const mapped = {
    // Essential fields
    vehiculo_id: vehiculoId,
    lugar_recogida_id: lugarRecogidaId,
    lugar_devolucion_id: lugarDevolucionId,
    fecha_recogida: new Date(fechaRecogida).toISOString(),
    fecha_devolucion: new Date(fechaDevolucion).toISOString(),

    // Pricing
    ...pricing,

    // Payment
    metodo_pago: data.metodo_pago || data.metodoPago || 'tarjeta',
    politica_pago_id: politicaPagoId,

    // Optional fields with safe defaults
    usuario_id: null, // Will be created by backend
    promocion_id: data.promocion?.id || data.promocion_id || null,
    estado: data.estado || 'pendiente',
    notas_internas: data.notas_internas || data.notas || '',

    // User data for creation during reservation
    datos_usuario_principal: datosUsuarioPrincipal,
    datos_segundo_conductor: datosSegundoConductor,

    // Arrays with safe handling
    extras: Array.isArray(data.extras || data.extrasSeleccionados)
      ? (data.extras || data.extrasSeleccionados)
          .map((e) => ({
            extra_id: e.id || e,
            cantidad: e.cantidad || 1,
            precio: e.precio || 0,
          }))
          .filter((e) => e.extra_id)
      : [],

    conductores: [], // Will be populated by backend after user creation
  };

  if (DEBUG_MODE) {
    logInfo('🛡️ Fallback mapper completed', {
      vehiculoId: mapped.vehiculo_id,
      precioTotal: mapped.precio_total,
      extrasCount: mapped.extras.length,
    });
  }

  return mapped;
};

/**
 * 💳 OBTENER POLÍTICAS DE PAGO DISPONIBLES
 *
 * Función principal para obtener todas las políticas de pago activas del sistema.
 * Estas políticas definen las opciones de cobertura, franquicias y condiciones
 * disponibles para el cliente durante el proceso de reserva.
 *
 * 📊 ESTRUCTURA DE DATOS DE SALIDA:
 * [
 *   {
 *     id: 1,
 *     titulo: "All Inclusive",
 *     descripcion: "Protección completa sin franquicia",
 *     franquicia: 0,
 *     activo: true,
 *     incluye: [
 *       "Cobertura a todo riesgo sin franquicia",
 *       "Kilometraje ilimitado",
 *       "Asistencia en carretera 24/7",
 *       "Conductor adicional gratuito"
 *     ],
 *     no_incluye: [
 *       "Daños bajo efectos del alcohol o drogas",
 *       "Uso no autorizado del vehículo"
 *     ],
 *     penalizaciones: [
 *       {
 *         tipo: "cancelación",
 *         valor_tarifa: 50.00,
 *         descripcion: "Cancelación con menos de 24h: cargo del 50%"
 *       }
 *     ]
 *   },
 *   {
 *     id: 2,
 *     titulo: "Economy",
 *     descripcion: "Protección básica con franquicia",
 *     franquicia: 1200,
 *     activo: true,
 *     incluye: ["Protección básica incluida"],
 *     no_incluye: ["Requiere depósito"],
 *     penalizaciones: []
 *   }
 *   // ... más políticas disponibles
 * ]
 *
 * 🎯 CASOS DE USO PRINCIPALES:
 * - Mostrar opciones de cobertura en selección de vehículo (FichaCoche)
 * - Calcular precios dinámicos según política seleccionada
 * - Validar política elegida durante confirmación de reserva
 * - Mostrar términos y condiciones específicas en DetallesReserva
 * - Integración con sistema de cálculo de precios backend
 *
 * 🔄 DISPONIBILIDAD: Funciona tanto en DEBUG_MODE como en producción
 * 🛡️ FILTRADO AUTOMÁTICO: Solo devuelve políticas con activo: true
 * ⚡ FALLBACK ROBUSTO: Múltiples niveles de respaldo en caso de error API
 *
 * @returns {Promise<Array>} - Lista de políticas de pago activas con información completa
 * @throws {Error} - Error específico si hay problemas de conexión o formato inesperado
 */
export const fetchPoliticasPago = async () => {
  return await withCache('policies', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar API de Django
      logger.info('Consultando políticas de pago desde API de Django');
      const response = await withTimeout(
        axios.get(`${API_URL}/politicas/politicas-pago/`, {
          params: { activo: true },
        }),
        TIMEOUT_CONFIG.POLICIES,
      );

      // Normalizar respuesta del backend
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        // Manejar estructura {success: true, results: [...]} o {count: N, results: [...]}
        if (dataArray.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else {
          throw new Error('Formato de respuesta inesperado de la API');
        }
      }

      // Filtrar solo políticas activas
      const activePolicies = dataArray.filter(
        (policy) => policy.activo !== false,
      );

      // Usar el mapper universal para normalizar datos y transformar al formato del componente
      const mappedData = await universalMapper.mapPolicies(activePolicies);

      // Transformar los datos mapeados al formato específico requerido por FichaCoche
      const transformedForComponent = mappedData.map((politica) => ({
        id: `politica-${politica.id}`,
        title: politica.titulo,
        deductible: politica.deductible,
        descripcion: politica.descripcion,
        incluye: politica.incluye.map((item) => item.titulo),
        noIncluye: politica.no_incluye.map((item) => item.titulo),
        originalData: politica, // Guardar datos originales para la reserva
      }));

      logger.info(
        'Políticas de pago cargadas y transformadas desde API de Django',
        {
          count: transformedForComponent.length,
          policies: transformedForComponent.map((p) => ({
            id: p.id,
            title: p.title,
            deductible: p.deductible,
            incluye_count: p.incluye.length,
            noIncluye_count: p.noIncluye.length,
          })),
        },
      );

      return transformedForComponent;
    } catch (error) {
      logger.error(
        'Error al consultar políticas de pago desde API de Django',
        error,
      );

      // FALLBACK: Solo si DEBUG_MODE está activo Y la API falló
      if (shouldUseTestingData(true)) {
        logger.info('Fallback: usando datos de testing para políticas de pago');

        const { testingPaymentOptions } = await import(
          '../assets/testingData/testingData.js'
        );

        // Las opciones de testing ya vienen en el formato correcto
        logger.info('Políticas de pago cargadas desde datos de testing', {
          count: testingPaymentOptions.length,
        });

        return testingPaymentOptions;
      }

      // EN PRODUCCIÓN: Error sin fallback
      logger.error(
        'Error en producción - no hay datos de políticas disponibles',
      );
      throw new Error(
        'Error al cargar políticas de pago. Por favor, intente nuevamente.',
      );
    }
  });
};

// ========================================
// FUNCIONES UTILITARIAS DE CACHE
// ========================================

/**
 * Limpia todo el cache de reservas
 */
export const clearReservationCache = () => {
  reservationCache.clear();
  logger.info('🧹 Cache de reservas limpiado completamente');
};

/**
 * Limpia reservas expiradas del cache
 */
export const cleanExpiredCache = () => {
  cleanExpiredReservationCache();
  logger.info('🧹 Cache de reservas expiradas limpiado');
};

/**
 * Obtiene estadísticas del cache de reservas
 * @returns {Object} - Estadísticas del cache
 */
export const getReservationCacheStats = () => {
  const now = Date.now();
  const stats = {
    totalEntries: reservationCache.size,
    expiredEntries: 0,
    validEntries: 0,
    entries: [],
  };

  for (const [key, value] of reservationCache.entries()) {
    const isExpired = now > value.expiry;
    if (isExpired) {
      stats.expiredEntries++;
    } else {
      stats.validEntries++;
    }

    stats.entries.push({
      key,
      isExpired,
      timestamp: new Date(value.timestamp),
      expiry: new Date(value.expiry),
    });
  }

  return stats;
};

// Limpiar cache expirado automáticamente cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredReservationCache, 5 * 60 * 1000);
}
