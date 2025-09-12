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

      // Política de pago - extraer ID si es objeto
      politica_pago:
        typeof data.paymentOption === 'object'
          ? data.paymentOption.id
          : data.paymentOption,

      // Precios directos
      precio_total: roundToDecimals(data.detallesReserva?.total || 0, 2),
      precio_base: roundToDecimals(
        data.detallesReserva?.base ||
          data.detallesReserva?.precioCocheBase ||
          0,
        2,
      ),
      precio_extras: roundToDecimals(data.detallesReserva?.extras || 0, 2),

      // Método de pago
      metodo_pago: data.metodoPago || 'tarjeta',

      // Estado
      estado: data.estado || 'pendiente',

      // Extras - mapeo directo del array
      extras: (data.extras || []).map((extra) => ({
        extra_id: extra.id,
        cantidad: extra.cantidad || 1,
        precio: roundToDecimals(extra.precio || 0, 2),
      })),

      // Conductor principal - solo datos básicos
      conductor_principal: data.conductor
        ? {
            nombre: data.conductor.nombre,
            apellidos: data.conductor.apellidos,
            email: data.conductor.email,
            telefono: data.conductor.telefono,
            documento: data.conductor.documento,
          }
        : null,
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

    logger.info('Mapeo reserva frontend -> backend exitoso', {
      vehiculo: mapped.vehiculo,
    });
    return mapped;
  } catch (error) {
    logger.error('Error mapeo reserva frontend -> backend:', error);
    throw error;
  }
};

/**
 * Mapea datos de reserva del backend al frontend (READ)
 * Estructura directa del backend a frontend
 */
export const mapReservationFromBackend = (data) => {
  try {
    if (!data) return null;

    const mapped = {
      id: data.id,
      estado: data.estado,

      // Fechas
      fechaRecogida: data.fecha_recogida,
      fechaDevolucion: data.fecha_devolucion,

      // Vehículo - usar datos detallados si están disponibles
      vehiculo: data.vehiculo_detail
        ? {
            id: data.vehiculo_detail.id,
            marca: data.vehiculo_detail.marca,
            modelo: data.vehiculo_detail.modelo,
            matricula: data.vehiculo_detail.matricula,
            precio_dia: data.vehiculo_detail.precio_dia,
            imagenPrincipal: prepareImageData(
              data.vehiculo_detail.imagen_principal,
              'vehicle',
            ),
          }
        : {
            id: data.vehiculo,
            marca: data.vehiculo_marca || '',
            modelo: data.vehiculo_modelo || '',
          },

      // Ubicaciones
      lugarRecogida: data.lugar_recogida_detail || {
        id: data.lugar_recogida,
        nombre: data.lugar_recogida_nombre || 'Ubicación',
      },

      lugarDevolucion: data.lugar_devolucion_detail || {
        id: data.lugar_devolucion,
        nombre: data.lugar_devolucion_nombre || 'Ubicación',
      },

      // Política de pago
      politicaPago: data.politica_pago_detail || {
        id: data.politica_pago,
        titulo: data.politica_pago_titulo || 'Política',
      },

      // Usuario
      usuario: data.usuario_detail || {
        id: data.usuario,
        nombre: data.usuario_nombre || '',
        email: data.usuario_email || '',
      },

      // Precios
      precioTotal: roundToDecimals(data.precio_total || 0, 2),
      precioBase: roundToDecimals(data.precio_base || 0, 2),
      precioExtras: roundToDecimals(data.precio_extras || 0, 2),

      // Extras
      extras: (data.extras_detail || []).map((extra) => ({
        id: extra.id,
        nombre: extra.nombre || extra.extra_nombre,
        precio: roundToDecimals(extra.precio || 0, 2),
        cantidad: extra.cantidad || 1,
      })),

      // Método de pago
      metodoPago: data.metodo_pago || 'tarjeta',
    };

    logger.info('Mapeo reserva backend -> frontend exitoso', { id: mapped.id });
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
    titulo: policy.titulo,
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
 */
export const mapContactToBackend = (data) => {
  return {
    nombre: data.name || data.nombre,
    email: data.email,
    asunto: data.subject || data.asunto,
    mensaje: data.message || data.mensaje,
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

logger.info('SimpleDataMapper cargado - versión optimizada');
