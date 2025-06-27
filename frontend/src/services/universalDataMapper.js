/**
 * 🚀 UNIVERSAL DATA MAPPER SERVICE
 *
 * Servicio centralizado y unificado para todo el mapeo de datos entre frontend y backend.
 * Reemplaza a reservationDataMapperService.js y centralizedDataMapper.js con una
 * arquitectura más limpia, eficiente y mantenible.
 *
 * 🎯 CARACTERÍSTICAS PRINCIPALES:
 * - Mapeo bidireccional universal (Frontend ↔ Backend)
 * - Cache inteligente con TTL configurable
 * - Validación robusta con esquemas declarativos
 * - Transformadores modulares y reutilizables
 * - Manejo de errores contextual y detallado
 * - Resolución automática de ubicaciones con cache
 * - Soporte completo para datos anidados
 * - Logging condicional para desarrollo
 * - API simple y consistente
 *
 * 📊 TIPOS DE DATOS SOPORTADOS:
 * - Reservaciones (reservations)
 * - Estadísticas (statistics)
 * - Características (features)
 * - Destinos (destinations)
 * - Testimonios (testimonials)
 * - Ubicaciones (locations)
 * - Vehículos (vehicles)
 * - Pagos Stripe (payments)
 * - Usuarios (users)
 * - Extras (extras)
 * - Conductores (drivers)
 *
 * @author OUAEL BOUSSIALI
 * @version 4.0.0
 * @created 2025-06-20
 */

import { testingLocationsData } from '../assets/testingData/testingData';
import {
  API_URL,
  createServiceLogger,
  DEBUG_MODE,
  shouldUseTestingData,
} from '../config/appConfig';
import axios from '../config/axiosConfig';
import { getCachedData, invalidateCache, setCachedData } from './cacheService';
import { withTimeout } from './func';

// ========================================
// CONFIGURACIÓN GLOBAL
// ========================================

const CONFIG = {
  CACHE: {
    short: 5 * 60 * 1000, // 5 minutos
    medium: 30 * 60 * 1000, // 30 minutos
    long: 60 * 60 * 1000, // 1 hora
  },
  RETRY: {
    maxAttempts: 3,
    delay: 1000,
  },
  TIMEOUT: {
    default: 8000,
    locations: 10000,
  },
  // Usar el DEBUG_MODE centralizado de la configuración
  DEBUG_MODE,
};

// ========================================
// LOGGING CENTRALIZADO
// ========================================
const appLogger = createServiceLogger('UNIVERSAL_MAPPER');

const logger = {
  info: (message, data = null) => {
    if (CONFIG.DEBUG_MODE) {
      appLogger.info(`🚀 [UNIVERSAL_MAPPER] ${message}`, data || '');
    }
  },
  warn: (message, data = null) => {
    if (CONFIG.DEBUG_MODE) {
      appLogger.warn(`⚠️ [UNIVERSAL_MAPPER] ${message}`, data || '');
    }
  },
  error: (message, error = null, data = null) => {
    if (CONFIG.DEBUG_MODE) {
      appLogger.error(
        `❌ [UNIVERSAL_MAPPER] ${message}`,
        error || '',
        data || '',
      );
    }
  },
};

// ========================================
// CLASES DE ERROR CUSTOMIZADAS
// ========================================
class UniversalMappingError extends Error {
  constructor(message, code = 'MAPPING_ERROR', context = {}) {
    super(message);
    this.name = 'UniversalMappingError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends UniversalMappingError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.field = field;
    this.value = value;
  }
}

class LocationResolutionError extends UniversalMappingError {
  constructor(message, locationName = null, locationType = null) {
    super(message, 'LOCATION_RESOLUTION_ERROR', { locationName, locationType });
    this.locationName = locationName;
    this.locationType = locationType;
  }
}

// ========================================
// HELPERS Y TRANSFORMADORES REUTILIZABLES
// ========================================

/**
 * Transformador seguro para valores numéricos
 * Convierte strings y otros tipos a números de forma robusta
 * @param {any} value - El valor a transformar
 * @param {number} defaultValue - Valor por defecto si la conversión falla
 * @returns {number} - El valor numérico transformado
 */
const safeNumberTransformer = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return defaultValue;
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

/**
 * Validador para valores numéricos no negativos
 * @param {any} v - Valor a validar
 * @returns {boolean} - true si es válido
 */
const nonNegativeNumberValidator = (v) => typeof v === 'number' && v >= 0;

/**
 * Validador para valores numéricos positivos
 * @param {any} v - Valor a validar
 * @returns {boolean} - true si es válido
 */
const positiveNumberValidator = (v) => typeof v === 'number' && v > 0;

/**
 * Función para redondear números a dos decimales de forma precisa
 * Evita problemas de precisión de JavaScript con números flotantes
 * @param {number|string} value - El valor a redondear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {number} - El valor redondeado
 */
const roundToDecimals = (value, decimals = 2) => {
  const numValue = safeNumberTransformer(value, 0);
  if (numValue === 0) return 0;

  // Usar Math.round con multiplicación para evitar problemas de precisión
  const factor = Math.pow(10, decimals);
  return Math.round((numValue + Number.EPSILON) * factor) / factor;
};

/**
 * Función específica para calcular impuestos redondeados
 * @param {number|string} baseAmount - El monto base
 * @param {number} taxRate - La tasa de impuesto (por defecto 0.21 = 21%)
 * @returns {number} - Los impuestos calculados y redondeados
 */
const calculateTaxAmount = (baseAmount, taxRate = 0.21) => {
  const base = safeNumberTransformer(baseAmount, 0);
  const tax = base * taxRate;
  return roundToDecimals(tax, 2);
};

/**
 * Función para calcular el precio total con impuestos
 * @param {number|string} baseAmount - El monto base
 * @param {number} taxRate - La tasa de impuesto (por defecto 0.21 = 21%)
 * @returns {object} - Objeto con base, impuestos y total redondeados
 */
const calculatePriceWithTax = (baseAmount, taxRate = 0.21) => {
  const base = roundToDecimals(baseAmount, 2);
  const tax = calculateTaxAmount(base, taxRate);
  const total = roundToDecimals(base + tax, 2);

  return {
    base,
    impuestos: tax,
    total,
  };
};

// ========================================
// ESQUEMAS DE MAPEO DECLARATIVOS
// ========================================

/**
 * Esquemas de transformación para cada tipo de dato
 * Define de forma declarativa cómo mapear datos entre frontend y backend
 */
const MAPPING_SCHEMAS = {
  // ESTADÍSTICAS: Backend -> Frontend
  statistics: {
    fromBackend: {
      icono: {
        sources: ['icono_url'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      numero: {
        sources: ['info_adicional'],
        default: '0',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'numero', '0'),
      },
      texto: {
        sources: ['subtitulo'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      color: {
        sources: ['info_adicional'],
        default: '#007bff',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'color', '#007bff'),
      },
    },
  },

  // CARACTERÍSTICAS: Backend -> Frontend
  features: {
    fromBackend: {
      icono: {
        sources: ['info_adicional'],
        default: 'faCheck',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'icono', 'faCheck'),
      },
      titulo: {
        sources: ['titulo'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      descripcion: {
        sources: ['descripcion'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      color: {
        sources: ['info_adicional'],
        default: '#007bff',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'color', '#007bff'),
      },
    },
  },

  // DESTINOS: Backend -> Frontend
  destinations: {
    fromBackend: {
      nombre: {
        sources: ['info_adicional', 'nombre'],
        default: 'Destino',
        transformer: (item) =>
          extractFromJsonField(
            item.info_adicional,
            'paises',
            item.nombre || 'Destino',
          ),
      },
      ciudades: {
        sources: ['info_adicional', 'direccion.ciudad'],
        default: 'Ciudad',
        transformer: (item) => {
          const ciudadesExtra = extractFromJsonField(
            item.info_adicional,
            'ciudades',
            null,
          );
          if (ciudadesExtra) return ciudadesExtra;
          return item.direccion?.ciudad || 'Ciudad';
        },
      },
      imagen: {
        sources: ['info_adicional'],
        default: 'default.jpg',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'imagen', 'default.jpg'),
      },
    },
  },

  // POLÍTICAS DE PAGO: Backend -> Frontend
  policies: {
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
      titulo: {
        sources: ['titulo'],
        required: true,
        validator: (v) => typeof v === 'string' && v.length > 0,
      },
      descripcion: {
        sources: ['descripcion'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      deductible: {
        sources: ['deductible'],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      // Campo de compatibilidad legacy
      franquicia: {
        sources: ['deductible'],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      activo: {
        sources: ['activo'],
        default: true,
        validator: (v) => typeof v === 'boolean',
      },
      incluye: {
        sources: ['items'],
        default: [],
        transformer: (item, value) => {
          if (!Array.isArray(value)) return [];
          return value
            .filter((i) => i.incluye === true || i.incluye === 1)
            .map((i) => ({
              id: i.id || Date.now() + Math.random(),
              titulo: i.item,
              descripcion: i.descripcion || '',
            }));
        },
      },
      no_incluye: {
        sources: ['items'],
        default: [],
        transformer: (item, value) => {
          if (!Array.isArray(value)) return [];
          return value
            .filter((i) => i.incluye === false || i.incluye === 0)
            .map((i) => ({
              id: i.id || Date.now() + Math.random(),
              titulo: i.item,
              descripcion: i.descripcion || '',
            }));
        },
      },
      penalizaciones: {
        sources: ['penalizaciones'],
        default: [],
        transformer: (item, value) => {
          if (!Array.isArray(value)) return [];
          return value.map((p) => ({
            tipo: p.tipo_penalizacion?.nombre || 'No especificado',
            horas_previas: p.horas_previas || 0,
            valor: p.tipo_penalizacion?.valor_tarifa || 0,
            tipo_tarifa: p.tipo_penalizacion?.tipo_tarifa || 'fijo',
          }));
        },
      },
      created_at: {
        sources: ['created_at'],
        default: null,
        transformer: (item, value) =>
          value ? new Date(value).toISOString() : null,
      },
      updated_at: {
        sources: ['updated_at'],
        default: null,
        transformer: (item, value) =>
          value ? new Date(value).toISOString() : null,
      },
    },
  },

  // TESTIMONIOS: Backend -> Frontend
  testimonials: {
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: (v) => typeof v === 'number' && v > 0,
      },
      nombre: {
        sources: ['nombre', 'apellido'],
        default: 'Usuario',
        transformer: (item) =>
          `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'Usuario',
      },
      ubicacion: {
        sources: ['direccion'],
        default: 'Ubicación',
        transformer: (item) => {
          if (!item.direccion) return 'Ubicación';
          const ciudad = item.direccion.ciudad || '';
          const pais = item.direccion.pais || '';
          return (
            `${ciudad}, ${pais}`.replace(/^,\s*|,\s*$/g, '') || 'Ubicación'
          );
        },
      },
      rating: {
        sources: ['info_adicional'],
        default: 5,
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'rating', 5),
        validator: (v) => typeof v === 'number' && v >= 1 && v <= 5,
      },
      comentario: {
        sources: ['info_adicional'],
        default: '',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'comentario', ''),
      },
      avatar: {
        sources: ['avatar_url'],
        default: null,
        transformer: () => null, // Avatar temporalmente deshabilitado
      },
    },
  },
  // RESERVACIONES: Frontend -> Backend y Backend -> Frontend
  reservations: {
    toBackend: {
      vehiculo: {
        sources: ['car.id', 'vehiculo.id', 'vehiculo_id'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
        error: 'ID de vehículo inválido o no seleccionado',
      },
      lugar_recogida: {
        sources: [
          'fechas.pickupLocation.id',
          'lugarRecogida.id',
          'lugar_recogida_id',
          'pickupLocation.id',
        ],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
        error: 'El lugar de recogida es requerido',
      },
      lugar_devolucion: {
        sources: [
          'fechas.dropoffLocation.id',
          'lugarDevolucion.id',
          'lugar_devolucion_id',
          'dropoffLocation.id',
        ],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
        error: 'El lugar de devolución es requerido',
      },
      fecha_recogida: {
        sources: [
          'fechas.pickupDate',
          'fechaRecogida',
          'fecha_recogida',
          'pickupDate',
        ],
        required: true,
        transformer: (item, value) => {
          if (!value) return null;
          const date = new Date(value);
          if (isNaN(date.getTime())) throw new Error('Fecha inválida');
          return date.toISOString();
        },
        validator: (v) => {
          if (!v) return false;
          const date = new Date(v);
          return !isNaN(date.getTime()); // Remover validación de fecha futura temporalmente
        },
        error: 'Fecha de recogida inválida',
      },
      fecha_devolucion: {
        sources: [
          'fechas.dropoffDate',
          'fechaDevolucion',
          'fecha_devolucion',
          'dropoffDate',
        ],
        required: true,
        transformer: (item, value) => {
          if (!value) return null;
          const date = new Date(value);
          if (isNaN(date.getTime())) throw new Error('Fecha inválida');
          return date.toISOString();
        },
        validator: (v) => {
          if (!v) return false;
          const date = new Date(v);
          return !isNaN(date.getTime()); // Remover validación de fecha futura temporalmente
        },
        error: 'Fecha de devolución inválida',
      },
      politica_pago: {
        sources: [
          'politicaPago.id',
          'politica_pago_id',
          'politica_pago',
          'paymentOption',
        ],
        required: true,
        transformer: (item, value) => {
          if (typeof value === 'number') return value;

          // Si es un objeto (como los de FichaCoche), extraer el ID
          if (typeof value === 'object' && value !== null) {
            // Primero intentar extraer de originalData
            if (value.originalData && value.originalData.id) {
              return value.originalData.id;
            }
            // Si no hay originalData, buscar en id directo
            if (value.id) {
              // Si el id es string del tipo "politica-N", extraer N
              if (
                typeof value.id === 'string' &&
                value.id.startsWith('politica-')
              ) {
                const numericId = parseInt(value.id.replace('politica-', ''));
                if (!isNaN(numericId)) return numericId;
              }
              // Si es numérico, devolverlo directamente
              if (typeof value.id === 'number') return value.id;
            }
          }

          if (typeof value === 'string') {
            // Si es string del tipo "politica-N", extraer N
            if (value.startsWith('politica-')) {
              const numericId = parseInt(value.replace('politica-', ''));
              if (!isNaN(numericId)) return numericId;
            }
            // Mapeos predefinidos para compatibilidad
            const mappings = {
              'all-inclusive': 1,
              economy: 2,
              premium: 3,
            };
            const mapped = mappings[value.toLowerCase().trim()];
            if (mapped) return mapped;
            return safeNumberTransformer(value, null);
          }
          return safeNumberTransformer(value, null);
        },
        validator: positiveNumberValidator,
        error: 'Política de pago no seleccionada o inválida',
      },
      precio_total: {
        sources: [
          'detallesReserva.total',
          'precioTotal',
          'precio_total',
          'total',
        ],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      precio_base: {
        sources: [
          'detallesReserva.base',
          'detallesReserva.precioCocheBase',
          'precioBase',
          'precio_base',
        ],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      precio_extras: {
        sources: [
          'detallesReserva.extras',
          'detallesReserva.precioExtras',
          'precioExtras',
          'precio_extras',
        ],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      precio_impuestos: {
        sources: [
          'detallesReserva.impuestos',
          'detallesReserva.iva',
          'precioImpuestos',
          'precio_impuestos',
        ],
        default: 0,
        validator: nonNegativeNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      metodo_pago: {
        sources: ['metodoPago', 'metodo_pago'],
        default: 'tarjeta',
        validator: (v) => ['tarjeta', 'efectivo'].includes(v),
      },
      estado: {
        sources: ['estado'],
        default: 'pendiente',
        validator: (v) => ['pendiente', 'confirmada', 'cancelada'].includes(v),
      },
      usuario: {
        sources: ['usuario.id', 'usuario_id', 'user.id'],
        required: false, // Se asigna automáticamente en el backend desde request.user
        validator: (v) => !v || positiveNumberValidator(v),
        transformer: (item, value) =>
          value ? safeNumberTransformer(value, null) : null,
      },
      promocion: {
        sources: ['promocion.id', 'promocion_id'],
        required: false,
        default: null,
        validator: (v) => !v || positiveNumberValidator(v),
        transformer: (item, value) =>
          value ? safeNumberTransformer(value, null) : null,
      },
      precio_dia: {
        sources: [
          'car.precio_dia',
          'vehiculo.precio_dia',
          'precioDay',
          'precio_dia',
        ],
        required: false, // Se puede calcular automáticamente
        validator: (v) => !v || nonNegativeNumberValidator(v),
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
    },
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
      estado: {
        sources: ['estado'],
        default: 'pendiente',
        validator: (v) => ['pendiente', 'confirmada', 'cancelada'].includes(v),
      },
      fechaRecogida: {
        sources: ['fecha_recogida'],
        required: true,
        transformer: (item, value) => {
          if (!value) return null;
          return new Date(value).toISOString();
        },
      },
      fechaDevolucion: {
        sources: ['fecha_devolucion'],
        required: true,
        transformer: (item, value) => {
          if (!value) return null;
          return new Date(value).toISOString();
        },
      },
      vehiculo: {
        sources: ['vehiculo_detail', 'vehiculo'],
        transformer: (item, value) => {
          if (!value) {
            // Crear objeto básico desde campos planos
            return {
              id: item.vehiculo,
              marca: item.vehiculo_marca || '',
              modelo: item.vehiculo_modelo || '',
              matricula: item.vehiculo_matricula || '',
              imagenPrincipal: ImageUtils.prepareImageData(
                item.vehiculo_imagen_principal,
                'vehicle',
              ),
              precio_dia: safeNumberTransformer(item.vehiculo_precio_dia, 0),
              categoria: { nombre: '' },
              grupo: { nombre: '' },
              combustible: '',
              numPasajeros: 0,
              numPuertas: 0,
              imagenes: [],
            };
          }

          // Si tenemos el objeto completo del vehículo
          return {
            id: value.id,
            marca: value.marca || '',
            modelo: value.modelo || '',
            matricula: value.matricula || '',
            precio_dia: safeNumberTransformer(value.precio_dia, 0),
            combustible: value.combustible || '',
            numPasajeros: value.num_pasajeros || 0,
            numPuertas: value.num_puertas || 0,
            categoria: {
              nombre: value.categoria?.nombre || '',
            },
            grupo: {
              nombre: value.grupo?.nombre || '',
            },
            // Usar imagen_principal del backend o la primera imagen marcada como portada
            imagenPrincipal: ImageUtils.prepareImageData(
              value.imagen_principal ||
                value.imagenes?.find((img) => img.portada)?.imagen_url ||
                value.imagenes?.[0]?.imagen_url,
              'vehicle',
            ),
            // Procesar todas las imágenes disponibles
            imagenes: value.imagenes
              ? value.imagenes.map((img) => ({
                  id: img.id,
                  url: ImageUtils.processImageUrl(img.imagen_url || img.imagen),
                  esPortada: img.portada || false,
                  alt: `${value.marca} ${value.modelo}`,
                }))
              : [],
          };
        },
      },
      lugarRecogida: {
        sources: ['lugar_recogida_detail', 'lugar_recogida'],
        transformer: (item, value) => {
          if (!value) {
            return {
              id: item.lugar_recogida,
              nombre: item.lugar_recogida_nombre || 'Ubicación',
            };
          }
          return value;
        },
      },
      lugarDevolucion: {
        sources: ['lugar_devolucion_detail', 'lugar_devolucion'],
        transformer: (item, value) => {
          if (!value) {
            return {
              id: item.lugar_devolucion,
              nombre: item.lugar_devolucion_nombre || 'Ubicación',
            };
          }
          return value;
        },
      },
      politicaPago: {
        sources: ['politica_pago_detail', 'politica_pago'],
        transformer: (item, value) => {
          if (!value) {
            return {
              id: item.politica_pago,
              titulo: item.politica_pago_titulo || 'Política de Pago',
            };
          }
          return value;
        },
      },
      usuario: {
        sources: ['usuario'],
        transformer: (item, value) => ({
          id: value || item.usuario,
          nombre: item.usuario_nombre || '',
          email: item.usuario_email || '',
        }),
      },
      extras: {
        sources: ['extras_detail', 'extras'],
        default: [],
        transformer: (item, value) => {
          if (!value || !Array.isArray(value)) return [];

          return value.map((extra) => ({
            id: extra.id,
            nombre: extra.nombre || extra.extra_nombre || 'Extra',
            precio: safeNumberTransformer(
              extra.precio || extra.extra_precio,
              0,
            ),
            cantidad: safeNumberTransformer(extra.cantidad, 1),
            imagen: ImageUtils.prepareImageData(
              extra.imagen_url || extra.imagen || extra.extra_imagen,
              'extra',
            ),
            descripcion: extra.descripcion || extra.extra_descripcion || '',
          }));
        },
      },
      precioExtras: {
        sources: ['precio_extras'],
        default: 0,
        transformer: (item, value) => {
          // Si no hay valor directo, calcular desde los extras
          if (value === null || value === undefined) {
            const extras = item.extras_detail || item.extras || [];
            return extras.reduce((total, extra) => {
              const precio = safeNumberTransformer(
                extra.precio || extra.extra_precio,
                0,
              );
              const cantidad = safeNumberTransformer(extra.cantidad, 1);
              return total + precio * cantidad;
            }, 0);
          }
          return safeNumberTransformer(value, 0);
        },
      },
      conductores: {
        sources: ['conductores'],
        default: [],
        transformer: (item, value) => {
          if (!value || !Array.isArray(value)) return [];

          return value.map((conductorRelacion) => {
            // El backend solo nos da información básica del conductor
            // Crear un objeto conductor con la información disponible
            const conductor = {
              id: conductorRelacion.id || Date.now() + Math.random(),
              email: conductorRelacion.conductor_email || '',
              nombre: 'Conductor', // Información no disponible en esta respuesta
              apellido: '', // Información no disponible en esta respuesta
              documento: '', // Información no disponible en esta respuesta
              telefono: '', // Información no disponible en esta respuesta
              nacionalidad: '', // Información no disponible en esta respuesta
              // Agregar más campos por defecto si es necesario
            };

            return {
              id: conductorRelacion.id,
              rol: conductorRelacion.rol || 'principal',
              conductor: conductor,
            };
          });
        },
      },
      precioTotal: {
        sources: ['precio_total'],
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      precioImpuestos: {
        sources: ['precio_impuestos'],
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      metodoPago: {
        sources: ['metodo_pago'],
        default: 'tarjeta',
      },
    },
  },

  // TESTIMONIOS: Backend -> Frontend
  testimonials: {
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: (v) => typeof v === 'number' && v > 0,
      },
      nombre: {
        sources: ['nombre', 'apellido'],
        default: 'Usuario',
        transformer: (item) =>
          `${item.nombre || ''} ${item.apellido || ''}`.trim() || 'Usuario',
      },
      ubicacion: {
        sources: ['direccion'],
        default: 'Ubicación',
        transformer: (item) => {
          if (!item.direccion) return 'Ubicación';
          const ciudad = item.direccion.ciudad || '';
          const pais = item.direccion.pais || '';
          return (
            `${ciudad}, ${pais}`.replace(/^,\s*|,\s*$/g, '') || 'Ubicación'
          );
        },
      },
      rating: {
        sources: ['info_adicional'],
        default: 5,
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'rating', 5),
        validator: (v) => typeof v === 'number' && v >= 1 && v <= 5,
      },
      comentario: {
        sources: ['info_adicional'],
        default: '',
        transformer: (item) =>
          extractFromJsonField(item.info_adicional, 'comentario', ''),
      },
      avatar: {
        sources: ['avatar_url'],
        default: null,
        transformer: () => null, // Avatar temporalmente deshabilitado
      },
    },
  },

  // UBICACIONES: Backend -> Frontend
  locations: {
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
      nombre: {
        sources: ['nombre'],
        required: true,
        validator: (v) => typeof v === 'string' && v.length > 0,
      },
      codigo: {
        sources: ['codigo'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      activo: {
        sources: ['activo'],
        default: true,
        validator: (v) => typeof v === 'boolean',
      },
    },
  },
  // VEHÍCULOS: Backend -> Frontend
  vehicles: {
    fromBackend: {
      id: {
        sources: ['id'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
      marca: {
        sources: ['marca'],
        required: true,
        validator: (v) => typeof v === 'string' && v.length > 0,
      },
      modelo: {
        sources: ['modelo'],
        required: true,
        validator: (v) => typeof v === 'string' && v.length > 0,
      },
      matricula: {
        sources: ['matricula'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      precio_dia: {
        sources: ['precio_dia'],
        required: true,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, null),
      },
      combustible: {
        sources: ['combustible'],
        default: 'Gasolina',
        validator: (v) => typeof v === 'string',
      },
      transmision: {
        sources: ['transmision'],
        default: 'Manual',
        validator: (v) => typeof v === 'string',
      },
      num_pasajeros: {
        sources: ['num_pasajeros'],
        default: 4,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 4),
      },
      num_puertas: {
        sources: ['num_puertas'],
        default: 4,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 4),
      },
      capacidad_maletero: {
        sources: ['capacidad_maletero'],
        default: 350,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 350),
      },
      anio: {
        sources: ['anio'],
        default: new Date().getFullYear(),
        validator: positiveNumberValidator,
        transformer: (item, value) =>
          safeNumberTransformer(value, new Date().getFullYear()),
      },
      categoria: {
        sources: ['categoria'],
        default: { id: null, nombre: '' },
        transformer: (item, value) => ({
          id: value?.id || null,
          nombre: value?.nombre || 'Categoría',
        }),
      },
      grupo: {
        sources: ['grupo'],
        default: { id: null, nombre: '', edad_minima: 21 },
        transformer: (item, value) => ({
          id: value?.id || null,
          nombre: value?.nombre || 'Grupo',
          edad_minima: value?.edad_minima || 21,
        }),
      },
      descripcion: {
        sources: ['descripcion'],
        default: '',
        validator: (v) => typeof v === 'string',
      },
      fianza: {
        sources: ['fianza'],
        default: 0,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      kilometraje: {
        sources: ['kilometraje'],
        default: 0,
        validator: positiveNumberValidator,
        transformer: (item, value) => safeNumberTransformer(value, 0),
      },
      disponible: {
        sources: ['disponible'],
        default: true,
        validator: (v) => typeof v === 'boolean',
      },
      activo: {
        sources: ['activo'],
        default: true,
        validator: (v) => typeof v === 'boolean',
      },
      imagenPrincipal: {
        sources: ['imagen_principal', 'imagenes'],
        transformer: (item, value) => {
          // Si hay imagen_principal directa desde el serializer
          if (value && typeof value === 'string') {
            return ImageUtils.prepareImageData(value, 'vehicle');
          }

          // Buscar en el array de imágenes la que esté marcada como portada
          if (item.imagenes && Array.isArray(item.imagenes)) {
            const imagenPortada = item.imagenes.find((img) => img.portada);
            if (imagenPortada) {
              return ImageUtils.prepareImageData(
                imagenPortada.imagen_url || imagenPortada.imagen,
                'vehicle',
              );
            }

            // Si no hay portada marcada, usar la primera disponible
            if (item.imagenes.length > 0) {
              return ImageUtils.prepareImageData(
                item.imagenes[0].imagen_url || item.imagenes[0].imagen,
                'vehicle',
              );
            }
          }

          // Fallback a placeholder
          return ImageUtils.prepareImageData(null, 'vehicle');
        },
      },
      imagenes: {
        sources: ['imagenes'],
        default: [],
        transformer: (item, value) => {
          if (!value || !Array.isArray(value)) return [];

          return value.map((img) => ({
            id: img.id,
            url: ImageUtils.processImageUrl(img.imagen_url || img.imagen),
            esPortada: img.portada || false,
            alt:
              `${item.marca || ''} ${item.modelo || ''}`.trim() || 'Vehículo',
            ancho: img.ancho || null,
            alto: img.alto || null,
          }));
        },
      },
    },
  },
};

// ========================================
// UTILIDADES DE GESTIÓN DE IMÁGENES
// ========================================

const ImageUtils = {
  /**
   * Procesar URL de imagen del backend
   */
  processImageUrl(url, baseUrl = null) {
    if (!url) return null;

    // Si es una URL completa, devolverla tal cual
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Obtener base URL del backend
    // En desarrollo con nginx, las imágenes se sirven desde la misma URL base
    const backendUrl =
      baseUrl ||
      process.env.REACT_APP_BACKEND_URL ||
      process.env.REACT_APP_API_URL?.replace('/api', '') ||
      window.location.origin;

    // Si es una ruta relativa del backend que ya empieza con /media/
    if (url.startsWith('/media/')) {
      return `${backendUrl}${url}`;
    }

    // Si es una ruta que empieza con media/ (sin barra inicial)
    if (url.startsWith('media/')) {
      return `${backendUrl}/${url}`;
    }

    // Si es solo el nombre del archivo, detectar el tipo basado en el contexto
    if (!url.startsWith('/') && !url.includes('/')) {
      // Detectar tipo de imagen por patrones en el nombre
      if (url.match(/\d+_\d+\./)) {
        // Patrón de imagen de vehículo: vehiculoId_imagenId.extensión
        return `${backendUrl}/media/vehiculos/${url}`;
      } else {
        // Por defecto, asumir que es un extra
        return `${backendUrl}/media/extras/${url}`;
      }
    }

    // Para cualquier otra ruta relativa
    if (!url.startsWith('/')) {
      return `${backendUrl}/media/${url}`;
    }

    return `${backendUrl}${url}`;
  },

  /**
   * Obtener placeholder por tipo
   */
  getPlaceholder(type = 'default', width = 300, height = 200) {
    const placeholders = {
      default: `https://via.placeholder.com/${width}x${height}/f0f0f0/666666.png?text=Sin+Imagen`,
      vehicle: `https://via.placeholder.com/${width}x${height}/e3f2fd/1976d2.png?text=Vehículo`,
      extra: `https://via.placeholder.com/${width}x${height}/f3e5f5/7b1fa2.png?text=Extra`,
      user: `https://via.placeholder.com/${width}x${height}/e8f5e8/388e3c.png?text=Usuario`,
      location: `https://via.placeholder.com/${width}x${height}/fff3e0/f57c00.png?text=Ubicación`,
    };

    return placeholders[type] || placeholders.default;
  },

  /**
   * Preparar datos de imagen con fallbacks
   */
  prepareImageData(imageUrl, type = 'default', dimensions = {}) {
    const { width = 300, height = 200 } = dimensions;

    return {
      original: this.processImageUrl(imageUrl),
      placeholder: this.getPlaceholder(type, width, height),
      hasImage: !!imageUrl,
      type,
    };
  },
};

// ========================================
// FUNCIONES AUXILIARES
// ========================================

/**
 * Extrae valor de campo JSON de forma segura
 * @param {string|object} jsonField - Campo JSON a procesar
 * @param {string} key - Clave a extraer
 * @param {*} defaultValue - Valor por defecto
 * @returns {*} Valor extraído o valor por defecto
 */
function extractFromJsonField(jsonField, key, defaultValue = null) {
  try {
    let data = jsonField;
    if (typeof jsonField === 'string') {
      data = JSON.parse(jsonField);
    }
    return data?.[key] ?? defaultValue;
  } catch (error) {
    logger.warn(`Error extrayendo ${key} de campo JSON:`, error);
    return defaultValue;
  }
}

/**
 * Extrae valor usando notación de puntos
 * @param {object} obj - Objeto fuente
 * @param {string} path - Ruta con notación de puntos
 * @returns {*} Valor extraído o undefined
 */
function extractByPath(obj, path) {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // Logica mejorada para extraer valor con notación de puntos
  try {
    const result = path.split('.').reduce((current, key) => {
      if (current === null || current === undefined) {
        return undefined;
      }
      return current[key];
    }, obj);

    if (CONFIG.DEBUG_MODE) {
      appLogger.info(`[EXTRACT_PATH] ${path} from object -> ${result}`);
    }

    return result;
  } catch (error) {
    if (CONFIG.DEBUG_MODE) {
      appLogger.warn(`[EXTRACT_PATH] Error extracting ${path}:`, error);
    }
    return undefined;
  }
}

/**
 * Valida que una fecha sea futura
 * @param {string|Date} dateValue - Valor de fecha
 * @returns {boolean} True si la fecha es válida y futura
 */
function isValidFutureDate(dateValue) {
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) && date > new Date();
  } catch {
    return false;
  }
}

// ========================================
// RESOLVEDOR DE UBICACIONES
// ========================================
class LocationResolver {
  constructor() {
    this.cacheKey = 'universal_mapper_locations';
    this.cacheTTL = CONFIG.CACHE.medium;
  }

  /**
   * Obtiene todas las ubicaciones con cache
   * @returns {Promise<Array>} Array de ubicaciones
   */
  async getAllLocations() {
    try {
      let locations = getCachedData(this.cacheKey);

      if (!locations) {
        logger.info('Cargando ubicaciones desde API (cache miss)');
        locations = await this.fetchLocationsWithRetry();
        setCachedData(this.cacheKey, locations, this.cacheTTL);
        logger.info(
          `Ubicaciones cacheadas: ${locations.length} items por ${this.cacheTTL}ms`,
        );
      } else {
        logger.info(`Usando ubicaciones cacheadas: ${locations.length} items`);
      }

      return locations;
    } catch (error) {
      logger.error('Error obteniendo ubicaciones:', error);
      throw new UniversalMappingError(
        'No se pudieron cargar las ubicaciones',
        'LOCATION_FETCH_ERROR',
        { originalError: error.message },
      );
    }
  }

  /**
   * Fetch de ubicaciones con reintentos
   * @returns {Promise<Array>} Array de ubicaciones
   */
  async fetchLocationsWithRetry() {
    let lastError;

    for (let attempt = 1; attempt <= CONFIG.RETRY.maxAttempts; attempt++) {
      try {
        const response = await withTimeout(
          axios.get(`${API_URL}/lugares/lugares/`),
          CONFIG.TIMEOUT.locations,
        );

        let locations = response.data;
        if (!Array.isArray(locations)) {
          if (locations.results && Array.isArray(locations.results)) {
            locations = locations.results;
          } else if (locations.data && Array.isArray(locations.data)) {
            locations = locations.data;
          } else {
            throw new Error('Formato de respuesta inesperado');
          }
        }

        return locations.filter((loc) => loc && loc.activo !== false);
      } catch (error) {
        lastError = error;
        logger.warn(
          `Intento ${attempt}/${CONFIG.RETRY.maxAttempts} falló:`,
          error.message,
        );

        if (attempt < CONFIG.RETRY.maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.RETRY.delay * attempt),
          );
        }
      }
    }

    // Fallback a datos de testing si está habilitado
    if (shouldUseTestingData(true)) {
      logger.info('Usando datos de testing como fallback para ubicaciones');
      return testingLocationsData;
    }

    throw lastError;
  }

  /**
   * Resuelve ID de ubicación por nombre
   * @param {string} locationName - Nombre de la ubicación
   * @param {string} locationType - Tipo de ubicación (recogida/devolución)
   * @returns {Promise<number>} ID de la ubicación
   */
  async resolveLocationId(locationName, locationType) {
    if (!locationName || typeof locationName !== 'string') {
      throw new LocationResolutionError(
        `El lugar de ${locationType} es requerido`,
        locationName,
        locationType,
      );
    }

    try {
      const locations = await this.getAllLocations();

      // Búsqueda exacta primero
      const exactMatch = locations.find(
        (loc) => loc.nombre.toLowerCase() === locationName.toLowerCase(),
      );

      if (exactMatch) {
        logger.info(
          `Coincidencia exacta encontrada: ${exactMatch.nombre} (ID: ${exactMatch.id})`,
        );
        return exactMatch.id;
      }

      // Búsqueda parcial como fallback
      const partialMatch = locations.find(
        (loc) =>
          loc.nombre.toLowerCase().includes(locationName.toLowerCase()) ||
          locationName.toLowerCase().includes(loc.nombre.toLowerCase()),
      );

      if (partialMatch) {
        logger.warn(
          `Usando coincidencia parcial: "${partialMatch.nombre}" para "${locationName}"`,
        );
        return partialMatch.id;
      }

      // No se encontró coincidencia
      const availableLocations = locations.map((l) => l.nombre).join(', ');
      throw new LocationResolutionError(
        `Ubicación "${locationName}" no encontrada para ${locationType}. Disponibles: ${availableLocations}`,
        locationName,
        locationType,
      );
    } catch (error) {
      if (error instanceof LocationResolutionError) {
        throw error;
      }

      logger.error(
        `Error resolviendo ubicación "${locationName}" para ${locationType}:`,
        error,
      );
      throw new LocationResolutionError(
        `Error procesando ubicación de ${locationType}. Verifique que la ubicación sea válida.`,
        locationName,
        locationType,
      );
    }
  }

  /**
   * Limpia el cache de ubicaciones
   */
  clearCache() {
    invalidateCache(this.cacheKey);
    logger.info('Cache de ubicaciones limpiado');
  }
}

// ========================================
// PROCESADOR DE EXTRAS
// ========================================
class ExtrasProcessor {
  /**
   * Procesa array de extras del frontend al formato backend
   * @param {Array} extras - Array de extras
   * @returns {Array} Array de extras procesados
   */
  processExtras(extras = []) {
    if (!Array.isArray(extras)) {
      logger.warn('Extras no es un array, devolviendo array vacío');
      return [];
    }

    return extras
      .map((extra, index) => {
        try {
          return this.processSingleExtra(extra, index);
        } catch (error) {
          logger.error(
            `Error procesando extra en posición ${index}:`,
            error,
            extra,
          );
          throw new UniversalMappingError(
            `Error procesando extra en posición ${index + 1}: ${error.message}`,
            'EXTRA_PROCESSING_ERROR',
            { index, extra, originalError: error.message },
          );
        }
      })
      .filter(Boolean);
  }

  /**
   * Procesa un extra individual
   * @param {object|string|number} extra - Extra a procesar
   * @param {number} index - Índice para reportes de error
   * @returns {object} Extra procesado
   */
  processSingleExtra(extra, index) {
    // Formato objeto completo
    if (typeof extra === 'object' && extra.id) {
      return {
        extra_id: extra.id,
        cantidad: extra.cantidad || 1,
        precio: extra.precio || 0,
        nombre: extra.nombre,
        descripcion: extra.descripcion,
      };
    }

    // Formato ID primitivo (compatibilidad legacy)
    if (typeof extra === 'number' || typeof extra === 'string') {
      const extraId = parseInt(extra);
      if (isNaN(extraId) || extraId <= 0) {
        throw new Error(`ID de extra inválido: ${extra}`);
      }

      return {
        extra_id: extraId,
        cantidad: 1,
        precio: 0, // El backend resolverá el precio
      };
    }

    throw new Error(`Formato de extra inválido en posición ${index + 1}`);
  }
}

// ========================================
// PROCESADOR DE CONDUCTORES
// ========================================
class DriversProcessor {
  /**
   * Procesa datos de conductores del frontend al formato backend
   * @param {object} data - Datos originales
   * @returns {Array} Array de conductores procesados
   */
  processDrivers(data) {
    try {
      const conductores = [];

      // Manejar array existente de conductores
      if (Array.isArray(data.conductores)) {
        return data.conductores.map((c) => ({
          rol: c.rol || 'principal',
          ...this.extractDriverDetails(c.conductor || c),
        }));
      }

      // Manejar conductor principal
      const conductorPrincipal = data.conductor || data.conductorPrincipal;
      if (conductorPrincipal) {
        conductores.push({
          rol: 'principal',
          ...this.extractDriverDetails(conductorPrincipal),
        });
      }

      // Manejar segundo conductor si existe
      if (data.tieneSegundoConductor && data.segundoConductor) {
        conductores.push({
          rol: 'adicional',
          ...this.extractDriverDetails(data.segundoConductor),
        });
      }

      logger.info(`Procesados ${conductores.length} conductores`);
      return conductores;
    } catch (error) {
      logger.error('Error procesando conductores:', error, data);
      // En lugar de lanzar error, devolver array vacío y continuar
      logger.warn('Continuando con array vacío de conductores');
      return [];
    }
  }
  /**
   * Extrae detalles del conductor para creación
   * @param {object} conductor - Datos del conductor
   * @returns {object} Detalles extraídos
   */
  extractDriverDetails(conductor) {
    const details = {
      nombre: conductor.nombre || conductor.first_name || '',
      apellidos:
        conductor.apellidos || conductor.apellido || conductor.last_name || '',
      email: conductor.email || '',
      fecha_nacimiento:
        conductor.fecha_nacimiento || conductor.fechaNacimiento || '',
      sexo: conductor.sexo || conductor.genero || 'no_indicado',
      nacionalidad: conductor.nacionalidad || '',
      tipo_documento:
        conductor.tipo_documento || conductor.tipoDocumento || 'dni',
      numero_documento:
        conductor.numero_documento || conductor.numeroDocumento || '',
      telefono: conductor.telefono || conductor.phone || '',
    };

    // Crear dirección desde datos anidados o datos planos del formulario
    if (conductor.direccion) {
      details.direccion = {
        calle: conductor.direccion.calle || conductor.direccion.direccion || '',
        ciudad: conductor.direccion.ciudad || '',
        provincia: conductor.direccion.provincia || '',
        pais: conductor.direccion.pais || 'España',
        codigo_postal:
          conductor.direccion.codigo_postal ||
          conductor.direccion.codigoPostal ||
          '',
      };
    } else if (conductor.calle || conductor.ciudad || conductor.provincia) {
      // Datos planos del formulario (caso de ReservaClienteConfirmar)
      details.direccion = {
        calle: conductor.calle || '',
        ciudad: conductor.ciudad || '',
        provincia: conductor.provincia || '',
        pais: conductor.pais || 'España',
        codigo_postal: conductor.codigoPostal || '',
      };
    }

    return details;
  }
}

// ========================================
// CLASE PRINCIPAL DEL MAPPER UNIVERSAL
// ========================================
class UniversalDataMapper {
  constructor() {
    this.locationResolver = new LocationResolver();
    this.extrasProcessor = new ExtrasProcessor();
    this.driversProcessor = new DriversProcessor();

    logger.info('UniversalDataMapper inicializado');
  }

  // ========================================
  // MÉTODOS DE MAPEO PRINCIPAL
  // ========================================

  /**
   * Mapea datos usando esquema especificado
   * @param {Array|object} data - Datos a mapear
   * @param {string} dataType - Tipo de datos
   * @param {string} direction - Dirección del mapeo (fromBackend/toBackend)
   * @returns {Promise<Array|object>} Datos mapeados
   */
  async mapData(data, dataType, direction = 'fromBackend') {
    logger.info(`Iniciando mapeo de ${dataType} (${direction})`, {
      isArray: Array.isArray(data),
      itemCount: Array.isArray(data) ? data.length : 1,
    });

    try {
      const schema = MAPPING_SCHEMAS[dataType]?.[direction];
      if (!schema) {
        throw new UniversalMappingError(
          `Esquema no encontrado para ${dataType}.${direction}`,
          'SCHEMA_NOT_FOUND',
          { dataType, direction },
        );
      }

      if (Array.isArray(data)) {
        const results = [];
        for (const item of data) {
          if (item && typeof item === 'object') {
            const mappedItem = await this.mapSingleItem(item, schema);
            results.push(mappedItem);
          }
        }
        logger.info(`Mapeo completado: ${results.length} items procesados`);
        return results;
      } else {
        const result = await this.mapSingleItem(data, schema);
        logger.info('Mapeo de item único completado');
        return result;
      }
    } catch (error) {
      logger.error(`Error en mapeo de ${dataType}:`, error);
      throw error instanceof UniversalMappingError
        ? error
        : new UniversalMappingError(
            `Error mapeando ${dataType}: ${error.message}`,
            'MAPPING_FAILED',
            { dataType, direction, originalError: error.message },
          );
    }
  }

  /**
   * Mapea un item individual usando el esquema
   * @param {object} item - Item a mapear
   * @param {object} schema - Esquema de mapeo
   * @returns {Promise<object>} Item mapeado
   */
  async mapSingleItem(item, schema) {
    const result = {};
    const resolvers = {
      location: async (locationValue, fieldName) => {
        const locationType = fieldName.includes('recogida')
          ? 'recogida'
          : 'devolución';
        return await this.locationResolver.resolveLocationId(
          locationValue,
          locationType,
        );
      },
    };
    for (const [targetField, fieldConfig] of Object.entries(schema)) {
      let value = null; // Move declaration to proper scope

      try {
        // Buscar valor en las fuentes especificadas
        for (const source of fieldConfig.sources) {
          value = extractByPath(item, source);
          if (value !== null && value !== undefined) {
            break;
          }
        }
        // Aplicar transformador si existe
        if (fieldConfig.transformer && value !== null && value !== undefined) {
          value = fieldConfig.transformer(item, value);
        }

        // Resolver valores asincrónicos (ubicaciones)
        if (
          fieldConfig.async &&
          fieldConfig.resolver &&
          resolvers[fieldConfig.resolver]
        ) {
          if (value) {
            value = await resolvers[fieldConfig.resolver](value, targetField);
          }
        }

        // Usar valor por defecto si no se encontró valor
        if (
          (value === null || value === undefined) &&
          fieldConfig.hasOwnProperty('default')
        ) {
          value = fieldConfig.default;
        }

        // Validar campos requeridos
        if (fieldConfig.required && (value === null || value === undefined)) {
          throw new ValidationError(
            fieldConfig.error || `Campo requerido faltante: ${targetField}`,
            targetField,
            value,
          );
        }

        // Aplicar validador si existe
        if (fieldConfig.validator && value !== null && value !== undefined) {
          const isValid = fieldConfig.validator(value);
          if (!isValid) {
            throw new ValidationError(
              fieldConfig.error || `Valor inválido para ${targetField}`,
              targetField,
              value,
            );
          }
        }

        result[targetField] = value;
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }

        logger.error(`Error procesando campo ${targetField}:`, error, {
          fieldConfig,
          value,
        });

        if (fieldConfig.required) {
          throw new UniversalMappingError(
            `Error procesando campo requerido ${targetField}: ${error.message}`,
            'FIELD_MAPPING_ERROR',
            { field: targetField, originalError: error.message },
          );
        }

        logger.warn(`Campo opcional ${targetField} falló, continuando...`);
      }
    }

    return result;
  }

  // ========================================
  // MÉTODOS ESPECÍFICOS POR TIPO DE DATO
  // ========================================

  /**
   * Mapea estadísticas del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Estadísticas mapeadas
   */
  async mapStatistics(backendData) {
    return await this.mapData(backendData, 'statistics', 'fromBackend');
  }

  /**
   * Mapea características del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Características mapeadas
   */
  async mapFeatures(backendData) {
    return await this.mapData(backendData, 'features', 'fromBackend');
  }

  /**
   * Mapea destinos del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Destinos mapeados
   */
  async mapDestinations(backendData) {
    return await this.mapData(backendData, 'destinations', 'fromBackend');
  }

  /**
   * Mapea testimonios del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array} Testimonios mapeados
   */
  async mapTestimonials(backendData) {
    return await this.mapData(backendData, 'testimonials', 'fromBackend');
  }

  /**
   * Mapea ubicaciones del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Ubicaciones mapeadas
   */
  async mapLocations(backendData) {
    return await this.mapData(backendData, 'locations', 'fromBackend');
  }

  /**
   * Mapea vehículos del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Vehículos mapeados
   */
  async mapVehicles(backendData) {
    return await this.mapData(backendData, 'vehicles', 'fromBackend');
  }

  /**
   * Mapea políticas de pago del backend al frontend
   * @param {Array} backendData - Datos del backend
   * @returns {Promise<Array>} Políticas mapeadas
   */
  async mapPolicies(backendData) {
    return await this.mapData(backendData, 'policies', 'fromBackend');
  }

  /**
   * Mapea datos de reservación del frontend al backend
   * @param {object} frontendData - Datos del frontend
   * @returns {Promise<object>} Datos de reservación mapeados
   */
  async mapReservationToBackend(frontendData) {
    logger.info('Iniciando mapeo completo de reservación frontend -> backend');

    try {
      // Validación inicial
      if (!frontendData || typeof frontendData !== 'object') {
        throw new ValidationError('Datos de reserva inválidos o faltantes');
      }

      // Mapear campos del esquema
      const result = await this.mapData(
        frontendData,
        'reservations',
        'toBackend',
      );

      // Procesar datos complejos adicionales
      result.extras = this.extrasProcessor.processExtras(
        frontendData.extras || frontendData.extrasSeleccionados || [],
      );

      result.conductores = this.driversProcessor.processDrivers(frontendData);

      // Campos adicionales no cubiertos por el esquema principal
      this.addAdditionalReservationFields(result, frontendData);

      // Validación final
      this.validateMappedReservation(result);
      logger.info('Mapeo de reservación completado exitosamente', {
        vehiculo: result.vehiculo,
        lugarRecogida: result.lugar_recogida,
        lugarDevolucion: result.lugar_devolucion,
        extrasCount: result.extras?.length || 0,
        conductoresCount: result.conductores?.length || 0,
        precioTotal: result.precio_total,
      });

      return result;
    } catch (error) {
      logger.error('Error en mapeo de reservación:', error, frontendData);

      // Re-lanzar errores específicos
      if (
        error instanceof ValidationError ||
        error instanceof LocationResolutionError ||
        error instanceof UniversalMappingError
      ) {
        throw error;
      }

      // Envolver errores inesperados
      throw new UniversalMappingError(
        `Error inesperado durante el mapeo de reservación: ${error.message}`,
        'UNEXPECTED_ERROR',
        { originalError: error.message },
      );
    }
  }

  /**
   * Mapear reserva desde formato backend a frontend
   */
  async mapReservationFromBackend(backendData) {
    logger.info(
      '🔄 [RESERVATION MAPPING] Mapeando desde backend...',
      backendData,
    );

    try {
      const result = await this.mapData(
        backendData,
        'reservations',
        'fromBackend',
      );

      logger.info(
        '✅ [RESERVATION MAPPING] Mapeo completado exitosamente',
        result,
      );

      return result;
    } catch (error) {
      logger.error(
        '❌ [RESERVATION MAPPING] Error en mapeo desde backend:',
        error,
        backendData,
      );
      throw new UniversalMappingError(
        `Error mapeando reserva desde backend: ${error.message}`,
        'RESERVATION_MAPPING_ERROR',
        { backendData, originalError: error },
      );
    }
  }

  /**
   * DEBUG: Función de debugging específica para mapeo de reservas
   * @param {object} frontendData - Datos del frontend
   * @returns {Promise<object>} Datos de reservación mapeados con logs detallados
   */
  async debugReservationMapping(frontendData) {
    appLogger.info('🔍 [DEBUG RESERVATION MAPPING] Iniciando debug...');
    appLogger.info(
      '📋 Datos de entrada:',
      JSON.stringify(frontendData, null, 2),
    );

    // Verificar campos específicos que están causando problemas
    appLogger.info('🎯 Verificando campos específicos:');
    appLogger.info('- car.id:', extractByPath(frontendData, 'car.id'));
    appLogger.info(
      '- fechas.pickupLocation.id:',
      extractByPath(frontendData, 'fechas.pickupLocation.id'),
    );
    appLogger.info(
      '- fechas.dropoffLocation.id:',
      extractByPath(frontendData, 'fechas.dropoffLocation.id'),
    );
    appLogger.info(
      '- fechas.pickupDate:',
      extractByPath(frontendData, 'fechas.pickupDate'),
    );
    appLogger.info(
      '- fechas.dropoffDate:',
      extractByPath(frontendData, 'fechas.dropoffDate'),
    );
    appLogger.info(
      '- paymentOption:',
      extractByPath(frontendData, 'paymentOption'),
    );
    appLogger.info(
      '- detallesReserva.total:',
      extractByPath(frontendData, 'detallesReserva.total'),
    );
    appLogger.info(
      '- detallesReserva.precioCocheBase:',
      extractByPath(frontendData, 'detallesReserva.precioCocheBase'),
    );

    appLogger.info('🔧 Procediendo con mapeo normal...');
    try {
      const result = await this.mapReservationToBackend(frontendData);
      appLogger.info('✅ Mapeo exitoso:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      appLogger.error('❌ Error en mapeo:', error);
      throw error;
    }
  }

  /**
   * Añade campos adicionales a la reservación
   * @param {object} mappedData - Datos ya mapeados
   * @param {object} originalData - Datos originales
   */
  addAdditionalReservationFields(mappedData, originalData) {
    // Datos de transacción
    mappedData.transaction_id = originalData.transaction_id || null;
    mappedData.fecha_pago = originalData.fecha_pago || null;
    mappedData.estado_pago = originalData.estado_pago || 'pendiente';

    // Importes adicionales
    mappedData.importe_pagado_inicial =
      originalData.importe_pagado_inicial || 0;
    mappedData.importe_pendiente_inicial =
      originalData.importe_pendiente_inicial || 0;
    mappedData.importe_pagado_extra = originalData.importe_pagado_extra || 0;
    mappedData.importe_pendiente_extra =
      originalData.importe_pendiente_extra || 0;

    // Datos de pago adicionales
    mappedData.datos_pago = originalData.datos_pago || null;

    // Notas internas
    mappedData.notas_internas =
      originalData.notas_internas || originalData.notas || '';
  }
  /**
   * Valida datos de reservación mapeados
   * @param {object} mappedData - Datos mapeados
   */
  validateMappedReservation(mappedData) {
    const requiredFields = [
      'vehiculo',
      'lugar_recogida',
      'lugar_devolucion',
      'fecha_recogida',
      'fecha_devolucion',
      'politica_pago',
    ];

    const missingFields = requiredFields.filter(
      (field) => mappedData[field] === null || mappedData[field] === undefined,
    );

    if (missingFields.length > 0) {
      throw new ValidationError(
        `Campos requeridos faltantes: ${missingFields.join(', ')}`,
        'missing_required_fields',
        missingFields,
      );
    }

    // Validar orden de fechas
    if (mappedData.fecha_recogida && mappedData.fecha_devolucion) {
      const pickupDate = new Date(mappedData.fecha_recogida);
      const dropoffDate = new Date(mappedData.fecha_devolucion);

      if (pickupDate >= dropoffDate) {
        throw new ValidationError(
          'La fecha de devolución debe ser posterior a la fecha de recogida',
          'invalid_date_order',
          {
            pickup: mappedData.fecha_recogida,
            dropoff: mappedData.fecha_devolucion,
          },
        );
      }
    }
  }

  // ========================================
  // MÉTODOS UTILITARIOS
  // ========================================

  /**
   * Limpia todos los caches
   */
  clearAllCaches() {
    this.locationResolver.clearCache();
    logger.info('Todos los caches limpiados');
  }

  /**
   * Obtiene estadísticas del mapper
   * @returns {object} Estadísticas del mapper
   */
  getStats() {
    return {
      supportedDataTypes: Object.keys(MAPPING_SCHEMAS),
      config: CONFIG,
      timestamp: new Date().toISOString(),
    };
  }

  // ========================================
  // UTILIDADES DE FORMATEO DE PAGOS
  // ========================================

  /**
   * Formatea cantidad monetaria
   * @param {number} amount - Cantidad a formatear
   * @param {string} currency - Moneda (EUR por defecto)
   * @returns {string} Cantidad formateada
   */
  formatCurrency(amount, currency = 'EUR') {
    try {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      logger.error('Error formateando moneda:', error);
      return `${amount} ${currency}`;
    }
  }

  /**
   * Formatea fecha de pago
   * @param {string} dateString - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  formatPaymentDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      logger.error('Error formateando fecha de pago:', error);
      return dateString;
    }
  }

  /**
   * Mapea estados de Stripe a estados locales
   * @param {string} stripeStatus - Estado de Stripe
   * @returns {string} Estado local
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      succeeded: 'COMPLETADO',
      processing: 'PROCESANDO',
      requires_payment_method: 'PENDIENTE',
      requires_confirmation: 'PENDIENTE',
      requires_action: 'PENDIENTE',
      canceled: 'CANCELADO',
      failed: 'FALLIDO',
    };

    return statusMap[stripeStatus] || 'DESCONOCIDO';
  }
}

// ========================================
// INSTANCIA SINGLETON Y EXPORTS
// ========================================

// Instancia singleton del mapper universal
const universalMapper = new UniversalDataMapper();

// Exports principales
export default universalMapper;

// Exports de la clase para instanciación manual si es necesaria
export { UniversalDataMapper };

// Exports de clases de error para manejo específico
export { LocationResolutionError, UniversalMappingError, ValidationError };

// Exports de funciones específicas para compatibilidad con código existente
export const mapStatistics = (data) => universalMapper.mapStatistics(data);
export const mapFeatures = (data) => universalMapper.mapFeatures(data);
export const mapDestinations = (data) => universalMapper.mapDestinations(data);
export const mapTestimonials = (data) => universalMapper.mapTestimonials(data);
export const mapLocations = (data) => universalMapper.mapLocations(data);
export const mapVehicles = (data) => universalMapper.mapVehicles(data);
export const mapPolicies = (data) => universalMapper.mapPolicies(data);
export const mapReservationToBackend = (data) =>
  universalMapper.mapReservationToBackend(data);
export const mapReservationFromBackend = (data) =>
  universalMapper.mapReservationFromBackend(data);

// Exports de funciones utilitarias
export const clearMappingCaches = () => universalMapper.clearAllCaches();
export const getMappingStats = () => universalMapper.getStats();

// Exports de funciones de redondeo y cálculo de impuestos
export { calculatePriceWithTax, calculateTaxAmount, roundToDecimals };

// Export de función principal genérica
export const mapData = (data, dataType, direction) =>
  universalMapper.mapData(data, dataType, direction);

// Export de función de debugging específica
export const debugReservationMapping = (data) =>
  universalMapper.debugReservationMapping(data);

// Logging de inicialización del servicio
logger.info('🚀 UniversalDataMapper service loaded successfully');
logger.info(`Supported data types: ${Object.keys(MAPPING_SCHEMAS).join(', ')}`);

// Export ImageUtils para uso externo
export { ImageUtils };
