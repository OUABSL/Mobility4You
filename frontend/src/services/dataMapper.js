/**
 * SIMPLE DATA MAPPER - Versión optimizada y directa
 *
 * Mapeo directo y eficiente entre frontend y backend.
 * Sin flexibilidad innecesaria, nombres exactos, sin cache complejo.
 *
 * @version 1.0.0
 * @created 2025-09-11
 */

import { createServiceLogger } from '../config/appConfig';
import { prepareImageData, processImageUrl, roundToDecimals } from '../utils';

const logger = createServiceLogger('SIMPLE_MAPPER');

// ========================================
// FUNCIONES CORE DE MAPEO DE RESERVAS
// ========================================

/**
 * Mapea datos de reserva del frontend al backend (CREATE/UPDATE)
 * Nombres exactos, sin búsqueda múltiple
 */
export const mapReservationToBackend = (data) => {
  try {
    // Validación básica
    if (!data) throw new Error('Datos de reserva requeridos');

    const mapped = {
      // IDs directos del frontend
      vehiculo: data.car?.id || data.vehiculo_id,
      lugar_recogida: data.fechas?.pickupLocation?.id || data.lugar_recogida_id,
      lugar_devolucion:
        data.fechas?.dropoffLocation?.id || data.lugar_devolucion_id,

      // Fechas en formato ISO
      fecha_recogida: data.fechas?.pickupDate
        ? new Date(data.fechas.pickupDate).toISOString()
        : null,
      fecha_devolucion: data.fechas?.dropoffDate
        ? new Date(data.fechas.dropoffDate).toISOString()
        : null,

      // Política de pago
      politica_pago: (() => {
        const paymentOption = data.paymentOption;
        if (typeof paymentOption === 'object' && paymentOption?.id) {
          // Si es un objeto con ID numérico, usar el ID
          return typeof paymentOption.id === 'number'
            ? paymentOption.id
            : paymentOption.id;
        }
        if (typeof paymentOption === 'string') {
          // Si es un string, podría ser 'emergency-fallback' u otro identificador
          return paymentOption;
        }
        if (typeof paymentOption === 'number') {
          // Si ya es un número, usarlo directamente
          return paymentOption;
        }
        // Fallback: devolver el valor tal como está
        return paymentOption;
      })(),

      // Precios directos - corregir mapeo de precio_extras
      precio_total: roundToDecimals(data.detallesReserva?.total || 0, 2),
      precio_base: roundToDecimals(
        data.detallesReserva?.precioCocheBase || 0,
        2,
      ),
      precio_extras: roundToDecimals(
        data.detallesReserva?.precioExtras ||
          data.detallesReserva?.extras ||
          data.precioExtras ||
          0,
        2,
      ),

      // Método de pago - manejar múltiples formatos
      metodo_pago: data.metodoPago || data.metodo_pago || 'efectivo',

      // Estado
      estado: data.estado || 'pendiente',

      // Extras
      extras: (data.extras || []).map((extra, index) => {
        const extraMapped = {
          extra_id: extra.id || extra.extra_id,
          cantidad: extra.cantidad || 1,
        };
        return extraMapped;
      }),

      // Conductores - convertir conductor principal a array de conductores
      conductores: data.conductor
        ? [
            {
              nombre: data.conductor.nombre,
              apellidos: data.conductor.apellidos,
              email: data.conductor.email,
              telefono: data.conductor.telefono,
              numero_documento: data.conductor.documento,
              tipo_documento: data.conductor.tipo_documento || 'dni',
              nacionalidad: data.conductor.nacionalidad || '',
              fecha_nacimiento: data.conductor.fecha_nacimiento || null,
              sexo: data.conductor.sexo || 'no_indicado',
              rol: 'principal',
            },
          ]
        : [],
    };

    // Validación de campos requeridos
    const required = [
      'vehiculo',
      'lugar_recogida',
      'lugar_devolucion',
      'fecha_recogida',
      'fecha_devolucion',
    ];
    const missing = required.filter((field) => !mapped[field]);
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(', ')}`);
    }

    return mapped;
  } catch (error) {
    logger.error('Error mapeo reserva frontend -> backend:', error);
    throw error;
  }
};

/**
 * Mapea datos de reserva del backend al frontend (READ)
 * Estructura directa del backend a frontend - VERSIÓN LEGACY
 */
export const mapReservationFromBackend = (data) => {
  try {
    if (!data) return null;

    const mapped = {
      id: data.id,
      numero_reserva: data.numero_reserva,
      estado: data.estado,
      metodo_pago: data.metodo_pago,

      // Fechas
      fechaRecogida: data.fecha_recogida,
      fechaDevolucion: data.fecha_devolucion,
      created_at: data.created_at,
      updated_at: data.updated_at,

      // Vehículo - usar datos detallados si están disponibles
      vehiculo: data.vehiculo_detail
        ? {
            id: data.vehiculo_detail.id,
            marca: data.vehiculo_detail.marca,
            modelo: data.vehiculo_detail.modelo,
            matricula: data.vehiculo_detail.matricula,
            precio_dia: data.vehiculo_detail.precio_dia,
            combustible: data.vehiculo_detail.combustible,
            categoria: data.vehiculo_detail.categoria,
            grupo: data.vehiculo_detail.grupo,
            anio: data.vehiculo_detail.anio,
            color: data.vehiculo_detail.color,
            num_puertas: data.vehiculo_detail.num_puertas,
            num_pasajeros: data.vehiculo_detail.num_pasajeros,
            capacidad_maletero: data.vehiculo_detail.capacidad_maletero,
            imagenPrincipal: prepareImageData(
              data.vehiculo_detail.imagen_principal,
              'vehicle',
            ),
            imagenes: data.vehiculo_detail.imagenes || [],
          }
        : {
            id: data.vehiculo,
            marca: data.vehiculo_marca || '',
            modelo: data.vehiculo_modelo || '',
            categoria: data.vehiculo_categoria || '',
          },

      // Ubicaciones
      lugarRecogida: data.lugar_recogida_detail
        ? {
            id: data.lugar_recogida_detail.id,
            nombre: data.lugar_recogida_detail.nombre,
            direccion: data.lugar_recogida_detail.direccion,
            direccion_completa: data.lugar_recogida_detail.direccion_completa,
            telefono: data.lugar_recogida_detail.telefono,
            email: data.lugar_recogida_detail.email,
            info_adicional: data.lugar_recogida_detail.info_adicional,
          }
        : {
            id: data.lugar_recogida,
            nombre: data.lugar_recogida_nombre || 'Ubicación',
          },

      lugarDevolucion: data.lugar_devolucion_detail
        ? {
            id: data.lugar_devolucion_detail.id,
            nombre: data.lugar_devolucion_detail.nombre,
            direccion: data.lugar_devolucion_detail.direccion,
            direccion_completa: data.lugar_devolucion_detail.direccion_completa,
            telefono: data.lugar_devolucion_detail.telefono,
            email: data.lugar_devolucion_detail.email,
            info_adicional: data.lugar_devolucion_detail.info_adicional,
          }
        : {
            id: data.lugar_devolucion,
            nombre: data.lugar_devolucion_nombre || 'Ubicación',
          },

      // Política de pago
      politicaPago: data.politica_pago_detail
        ? {
            id: data.politica_pago_detail.id,
            titulo: data.politica_pago_detail.titulo || '',
            descripcion: data.politica_pago_detail.descripcion || '',
            tarifa: data.politica_pago_detail.tarifa || 0,
            deductible: data.politica_pago_detail.deductible || 0,
            items: data.politica_pago_detail.items || [],
          }
        : data.politica_pago
        ? {
            id: data.politica_pago,
            titulo: data.politica_pago_titulo || '',
            descripcion: data.politica_pago_descripcion || '',
            tarifa: data.politica_pago_tarifa || 0,
            deductible: data.politica_pago_deductible || 0,
            items: [],
          }
        : null,

      // IDs para compatibilidad con formularios
      politicaPago_id: data.politica_pago_detail?.id || data.politica_pago,
      lugarRecogida_id: data.lugar_recogida_detail?.id || data.lugar_recogida,
      lugarDevolucion_id:
        data.lugar_devolucion_detail?.id || data.lugar_devolucion,
      vehiculo_id: data.vehiculo_detail?.id || data.vehiculo,

      // Usuario - NO valores por defecto vacíos
      usuario: data.usuario_detail
        ? {
            id: data.usuario_detail.id,
            nombre: data.usuario_detail.nombre || '',
            apellidos: data.usuario_detail.apellidos || '',
            email: data.usuario_detail.email || '',
            telefono: data.usuario_detail.telefono || '',
            documento: data.usuario_detail.documento || '',
            tipo_documento: data.usuario_detail.tipo_documento || '',
            nacionalidad: data.usuario_detail.nacionalidad || '',
          }
        : data.usuario
        ? {
            id: data.usuario,
            nombre: data.usuario_nombre,
            email: data.usuario_email || data.usuario_email,
          }
        : null,

      // Datos básicos del usuario para mostrar
      usuario_email: data.usuario_email,
      usuario_nombre_completo: data.usuario_nombre_completo,

      // Contadores
      total_extras: data.total_extras || 0,
      conductores_count: data.conductores_count || 0,

      // Precios - solo mapear si existen, NO valores por defecto de 0 - CON LOGGING
      precioTotal: (() => {
        const rawValue =
          data.precio_total !== undefined
            ? data.precio_total
            : data.precio_total_original !== undefined
            ? data.precio_total_original
            : data.total !== undefined
            ? data.total
            : null;

        if (rawValue === null || rawValue === undefined) {
          console.log(`🔍 [MAPPER] precioTotal: null/undefined -> null`);
          return null;
        }

        // Convertir explícitamente a número para manejar strings
        const numericValue =
          typeof rawValue === 'string'
            ? parseFloat(rawValue)
            : Number(rawValue);
        const valor = isNaN(numericValue)
          ? 0
          : roundToDecimals(numericValue, 2);

        console.log(
          `🔍 [MAPPER] precioTotal: ${rawValue} (${typeof rawValue}) -> ${valor}`,
        );
        return valor;
      })(),

      precioBase: (() => {
        const rawValue =
          data.precio_base !== undefined
            ? data.precio_base
            : data.precio_vehiculo !== undefined
            ? data.precio_vehiculo
            : data.precio_dia !== undefined
            ? data.precio_dia
            : null;

        if (rawValue === null || rawValue === undefined) {
          console.log(`🔍 [MAPPER] precioBase: null/undefined -> null`);
          return null;
        }

        // Convertir explícitamente a número para manejar strings
        const numericValue =
          typeof rawValue === 'string'
            ? parseFloat(rawValue)
            : Number(rawValue);
        const valor = isNaN(numericValue)
          ? 0
          : roundToDecimals(numericValue, 2);

        console.log(
          `🔍 [MAPPER] precioBase: ${rawValue} (${typeof rawValue}) -> ${valor}`,
        );
        return valor;
      })(),

      precioExtras: (() => {
        const rawValue =
          data.precio_extras !== undefined
            ? data.precio_extras
            : data.extras_precio !== undefined
            ? data.extras_precio
            : null;

        if (rawValue === null || rawValue === undefined) {
          console.log(`🔍 [MAPPER] precioExtras: null/undefined -> null`);
          return null;
        }

        // Convertir explícitamente a número para manejar strings
        const numericValue =
          typeof rawValue === 'string'
            ? parseFloat(rawValue)
            : Number(rawValue);
        const valor = isNaN(numericValue)
          ? 0
          : roundToDecimals(numericValue, 2);

        console.log(
          `🔍 [MAPPER] precioExtras: ${rawValue} (${typeof rawValue}) -> ${valor}`,
        );
        return valor;
      })(),

      // Información adicional para el desglose de precios - solo si existe - CON LOGGING
      diasAlquiler:
        data.dias_alquiler ||
        calculateDaysFromDates(data.fecha_recogida, data.fecha_devolucion) ||
        null,
      iva: (() => {
        const rawValue =
          data.iva_display !== undefined
            ? data.iva_display
            : data.iva !== undefined
            ? data.iva
            : null;

        if (rawValue === null || rawValue === undefined) {
          console.log(`🔍 [MAPPER] iva: null/undefined -> null`);
          return null;
        }

        // Convertir explícitamente a número para manejar strings
        const numericValue =
          typeof rawValue === 'string'
            ? parseFloat(rawValue)
            : Number(rawValue);
        const valor = isNaN(numericValue)
          ? 0
          : roundToDecimals(numericValue, 2);

        console.log(
          `🔍 [MAPPER] iva: ${rawValue} (${typeof rawValue}) -> ${valor}`,
        );
        return valor;
      })(),
      tasaIva: data.iva_percentage || null,
      tarifaPolitica:
        data.tarifa_politica !== undefined
          ? roundToDecimals(data.tarifa_politica, 2)
          : null,

      // Importes específicos
      importe_pagado_inicial:
        data.importe_pagado_inicial !== undefined
          ? roundToDecimals(data.importe_pagado_inicial, 2)
          : null,
      importe_pendiente_inicial:
        data.importe_pendiente_inicial !== undefined
          ? roundToDecimals(data.importe_pendiente_inicial, 2)
          : null,

      // Descuento de promoción si existe
      descuentoPromocion:
        data.descuento_promocion !== undefined
          ? roundToDecimals(data.descuento_promocion, 2)
          : null,

      // Promoción si existe
      promocion: data.promocion_detail
        ? {
            id: data.promocion_detail.id,
            nombre: data.promocion_detail.nombre,
            descuentoPct: data.promocion_detail.descuento_pct,
          }
        : null,

      // Extras - CORREGIDO con logging específico
      extras: (data.extras_detail || []).map((extra, index) => {
        const precioRaw = extra.extra_precio || extra.precio || 0;
        const precioNumerico =
          typeof precioRaw === 'string'
            ? parseFloat(precioRaw)
            : Number(precioRaw);
        const precioRedondeado = isNaN(precioNumerico)
          ? 0
          : roundToDecimals(precioNumerico, 2);

        const mapped = {
          id: extra.id,
          extra_id: extra.extra_id,
          nombre: extra.extra_nombre || extra.nombre,
          precio: precioRedondeado,
          cantidad: extra.cantidad || 1,
          descripcion: extra.extra_descripcion || extra.descripcion,
          imagen: extra.extra_imagen || extra.imagen,
        };

        return mapped;
      }),

      // Conductores
      conductores: (data.conductores_detail || []).map((conductor) => ({
        id: conductor.id,
        rol: conductor.rol,
        es_principal: conductor.rol === 'principal',
        conductor_detail: conductor.conductor_detail,
      })),

      // Penalizaciones
      penalizaciones: data.penalizaciones_detail || [],

      // Notas internas
      notas_internas: data.notas_internas || '',

      // Método de pago
      metodoPago: data.metodo_pago || 'efectivo',
    };

    return mapped;
  } catch (error) {
    logger.error('Error mapeo reserva backend -> frontend:', error);
    throw error;
  }
};

// ========================================
// FUNCIONES AUXILIARES SIMPLES
// ========================================

/**
 * Mapea vehículos del backend al frontend
 */
export const mapVehicles = (vehicles) => {
  if (!Array.isArray(vehicles)) return [];

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    marca: vehicle.marca,
    modelo: vehicle.modelo,
    precio_dia: vehicle.precio_dia,
    combustible: vehicle.combustible,
    transmision: vehicle.transmision,
    num_pasajeros: vehicle.num_pasajeros,
    num_puertas: vehicle.num_puertas,
    categoria: vehicle.categoria?.nombre || '',
    grupo: vehicle.grupo?.nombre || null, // Campo grupo opcional para furgonetas
    imagenPrincipal: prepareImageData(vehicle.imagen_principal, 'vehicle'),
    imagenes: (vehicle.imagenes || []).map((img) => ({
      id: img.id,
      url: processImageUrl(img.imagen_url),
      esPortada: img.portada || false,
    })),
  }));
};

/**
 * Mapea ubicaciones del backend al frontend
 */
export const mapLocations = (locations) => {
  if (!Array.isArray(locations)) return [];

  return locations.map((location) => ({
    id: location.id,
    nombre: location.nombre,
    codigo: location.codigo,
    activo: location.activo,
  }));
};

/**
 * Mapea políticas de pago del backend al frontend
 */
export const mapPolicies = (policies) => {
  if (!Array.isArray(policies)) return [];

  return policies.map((policy) => ({
    id: policy.id,
    title: policy.titulo, // Mapear titulo del backend a title para el frontend
    descripcion: policy.descripcion,
    tarifa: policy.tarifa,
    deductible: policy.deductible,
    activo: policy.activo,
  }));
};

/**
 * Mapea estadísticas del backend al frontend
 */
export const mapStatistics = (stats) => {
  if (!Array.isArray(stats)) return [];

  return stats.map((stat) => ({
    icono: stat.icono_url || '',
    numero: extractFromJson(stat.info_adicional, 'numero', '0'),
    texto: stat.subtitulo || '',
    color: extractFromJson(stat.info_adicional, 'color', '#007bff'),
  }));
};

/**
 * Mapea características del backend al frontend
 */
export const mapFeatures = (features) => {
  if (!Array.isArray(features)) return [];

  return features.map((feature) => ({
    icono: extractFromJson(feature.info_adicional, 'icono', 'faCheck'),
    titulo: feature.titulo || '',
    descripcion: feature.descripcion || '',
    color: extractFromJson(feature.info_adicional, 'color', '#007bff'),
  }));
};

/**
 * Mapea testimonios del backend al frontend
 */
export const mapTestimonials = (testimonials) => {
  if (!Array.isArray(testimonials)) return [];

  return testimonials.map((testimonial) => ({
    id: testimonial.id,
    nombre:
      `${testimonial.nombre || ''} ${testimonial.apellido || ''}`.trim() ||
      'Usuario',
    ubicacion: testimonial.direccion
      ? `${testimonial.direccion.ciudad || ''}, ${
          testimonial.direccion.pais || ''
        }`.replace(/^,\s*|,\s*$/g, '') || 'Ubicación'
      : 'Ubicación',
    rating: extractFromJson(testimonial.info_adicional, 'rating', 5),
    comentario: extractFromJson(testimonial.info_adicional, 'comentario', ''),
    avatar: null, // Temporalmente deshabilitado
  }));
};

/**
 * Mapea destinos del backend al frontend
 */
export const mapDestinations = (destinations) => {
  if (!Array.isArray(destinations)) return [];

  return destinations.map((destination) => ({
    nombre: extractFromJson(
      destination.info_adicional,
      'paises',
      destination.nombre || 'Destino',
    ),
    ciudades: extractFromJson(
      destination.info_adicional,
      'ciudades',
      destination.direccion?.ciudad || 'Ciudad',
    ),
    imagen: extractFromJson(
      destination.info_adicional,
      'imagen',
      'default.jpg',
    ),
  }));
};

/**
 * Mapea contacto del frontend al backend
 * Frontend usa: name, subject, message
 * Backend espera: nombre, asunto, mensaje
 */
export const mapContactToBackend = (data) => {
  return {
    nombre: data.name, // Frontend 'name' -> Backend 'nombre'
    email: data.email, // Igual en ambos
    asunto: data.subject, // Frontend 'subject' -> Backend 'asunto'
    mensaje: data.message, // Frontend 'message' -> Backend 'mensaje'
  };
};

/**
 * Mapea contacto del backend al frontend
 */
export const mapContactFromBackend = (data) => {
  if (Array.isArray(data)) {
    return data.map((contact) => mapSingleContactFromBackend(contact));
  }
  return mapSingleContactFromBackend(data);
};

const mapSingleContactFromBackend = (contact) => {
  return {
    id: contact.id,
    nombre: contact.nombre,
    email: contact.email,
    asunto: contact.asunto,
    mensaje: contact.mensaje,
    estado: contact.estado || 'pendiente',
    fechaCreacion: contact.fecha_creacion,
    fechaRespuesta: contact.fecha_respuesta,
    respuesta: contact.respuesta || '',
    respondidoPor: contact.respondido_por || '',
    esReciente: contact.es_reciente || false,
  };
};

// ========================================
// UTILIDADES SIMPLES
// ========================================

/**
 * Extrae valor de un campo JSON
 */
const extractFromJson = (jsonField, key, defaultValue = null) => {
  try {
    if (!jsonField) return defaultValue;
    const parsed =
      typeof jsonField === 'string' ? JSON.parse(jsonField) : jsonField;
    return parsed[key] !== undefined ? parsed[key] : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Calcula días entre dos fechas
 */
const calculateDaysFromDates = (startDate, endDate) => {
  try {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

// Export del mapper como instancia por defecto para compatibilidad
const simpleMapper = {
  mapReservationToBackend,
  mapReservationFromBackend,
  mapVehicles,
  mapLocations,
  mapPolicies,
  mapStatistics,
  mapFeatures,
  mapTestimonials,
  mapDestinations,
  mapContactToBackend,
  mapContactFromBackend,

  // ===== FUNCIONES DE UTILIDAD PARA STRIPE =====
  // Formateo de moneda
  formatCurrency: (amount, currency = 'EUR') => {
    if (amount === null || amount === undefined) return '0,00 €';

    const numericAmount =
      typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '0,00 €';

    const formatter = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(numericAmount);
  },

  // Formateo de fechas para pagos
  formatPaymentDate: (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  },

  // Mapeo de estados de Stripe
  mapStripeStatus: (stripeStatus) => {
    const statusMap = {
      succeeded: 'completado',
      pending: 'pendiente',
      failed: 'fallido',
      canceled: 'cancelado',
      processing: 'procesando',
      requires_payment_method: 'requiere_metodo_pago',
      requires_confirmation: 'requiere_confirmacion',
      requires_action: 'requiere_accion',
    };

    return statusMap[stripeStatus] || stripeStatus;
  },
};

export default simpleMapper;
