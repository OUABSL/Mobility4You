// src/validations/reservationValidations.js
/**
 * 🔍 VALIDACIONES DE RESERVAS
 *
 * Validaciones completas para los datos de reserva antes de enviarlos al backend.
 * Incluye validación de fechas, ubicaciones, vehículos y datos del conductor.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-19
 */

import { createServiceLogger } from '../config/appConfig';
import { validateReservationDates } from '../utils/dateValidators';

// Crear logger para validaciones
const logger = createServiceLogger('RESERVATION_VALIDATIONS');

/**
 * Valida los datos de reserva antes de enviarlos al backend
 * @param {Object} data - Datos de la reserva a validar
 * @returns {Object} - {isValid, errors}
 */
export const validateReservationData = (data) => {
  const errors = {};

  try {
    const vehiculoId =
      data.car?.id ||
      data.vehiculo?.id ||
      data.vehiculo_id ||
      (typeof data.car === 'number' ? data.car : null) ||
      (typeof data.vehiculo === 'number' ? data.vehiculo : null);
    if (!vehiculoId) {
      errors.vehiculo = 'Se requiere seleccionar un vehículo';
    }

    const fechaRecogida =
      data.fechas?.pickupDate || data.fechaRecogida || data.fecha_recogida;
    const fechaDevolucion =
      data.fechas?.dropoffDate || data.fechaDevolucion || data.fecha_devolucion;

    if (!fechaRecogida || !fechaDevolucion) {
      errors.fechas = 'Se requieren fechas de recogida y devolución';
    } else {
      // ✅ USAR VALIDACIÓN UNIFICADA con contexto 'new'
      const dateValidation = validateReservationDates(
        fechaRecogida,
        fechaDevolucion,
        'new',
      );

      if (!dateValidation.isValid) {
        // Agregar errores específicos de fechas
        dateValidation.errors.forEach((error) => {
          if (error.includes('recogida')) {
            errors.fechaRecogida = error;
          } else if (error.includes('devolución')) {
            errors.fechaDevolucion = error;
          } else {
            errors.fechas = error;
          }
        });
      }

      // Agregar warnings si existen
      if (dateValidation.warnings?.length > 0) {
        errors.advertencias = dateValidation.warnings.join('; ');
      }
    }

    const lugarRecogidaId =
      data.fechas?.pickupLocation?.id ||
      data.lugarRecogida?.id ||
      data.lugar_recogida_id ||
      (typeof data.fechas?.pickupLocation === 'number'
        ? data.fechas.pickupLocation
        : null);

    const lugarDevolucionId =
      data.fechas?.dropoffLocation?.id ||
      data.lugarDevolucion?.id ||
      data.lugar_devolucion_id ||
      (typeof data.fechas?.dropoffLocation === 'number'
        ? data.fechas.dropoffLocation
        : null);

    if (!lugarRecogidaId) {
      errors.lugarRecogida = 'Se requiere especificar el lugar de recogida';
    }

    if (!lugarDevolucionId) {
      errors.lugarDevolucion = 'Se requiere especificar el lugar de devolución';
    }

    // VALIDAR HORARIOS si están presentes
    if (data.fechas?.pickupTime && !isValidTime(data.fechas.pickupTime)) {
      errors.horaRecogida = 'La hora de recogida no es válida';
    }

    if (data.fechas?.dropoffTime && !isValidTime(data.fechas.dropoffTime)) {
      errors.horaDevolucion = 'La hora de devolución no es válida';
    }

    // VALIDAR CONDUCTOR - Múltiples formatos
    const conductor = data.conductor || data.conductorPrincipal;
    if (!conductor) {
      errors.conductor = 'Se requieren los datos del conductor';
    } else {
      if (!conductor.nombre || conductor.nombre.trim() === '') {
        errors.conductorNombre = 'El nombre del conductor es requerido';
      }
      if (!conductor.apellidos || conductor.apellidos.trim() === '') {
        errors.conductorApellidos =
          'Los apellidos del conductor son requeridos';
      }
      if (!conductor.email || !isValidEmail(conductor.email)) {
        errors.conductorEmail = 'Se requiere un email válido para el conductor';
      }
      if (!conductor.telefono || !isValidPhone(conductor.telefono)) {
        errors.conductorTelefono =
          'Se requiere un teléfono válido para el conductor';
      }
    }

    // VALIDAR MÉTODO DE PAGO - Múltiples formatos
    const metodoPago = data.metodoPago || data.metodo_pago;
    if (!metodoPago || !['tarjeta', 'efectivo'].includes(metodoPago)) {
      errors.metodoPago = 'Se requiere especificar un método de pago válido';
    }

    // ✅ VALIDAR POLÍTICA DE PAGO
    const politicaPago =
      data.politica_pago_id ||
      data.paymentOption?.id ||
      (typeof data.paymentOption === 'number' ? data.paymentOption : null);
    if (!politicaPago) {
      errors.politicaPago = 'Se requiere seleccionar una política de pago';
    }

    // VALIDAR PRECIO TOTAL - Múltiples formatos
    const precioTotal =
      data.detallesReserva?.total || data.precioTotal || data.precio_total;
    if (!precioTotal || precioTotal <= 0) {
      errors.precioTotal = 'El precio total debe ser mayor que cero';
    }

    const isValid = Object.keys(errors).length === 0;

    if (!isValid) {
      logger.warn('Errores de validación encontrados:', errors);
    }

    return { isValid, errors };
  } catch (error) {
    logger.error('Error durante la validación:', error);
    return {
      isValid: false,
      errors: { general: 'Error interno durante la validación' },
    };
  }
};

// Validar formato de tiempo
export const isValidTime = (time) => {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida formato de teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - True si es válido
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[\d\s\-()]{9,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Valida que no haya vehículos duplicados en una búsqueda
 * @param {Array} vehiculos - Lista de vehículos
 * @returns {Object} - {isValid, errors, vehiculosLimpios}
 */
export const validateVehiculosDisponibles = (vehiculos) => {
  if (!Array.isArray(vehiculos)) {
    return {
      isValid: false,
      errors: ['La lista de vehículos no es válida'],
      vehiculosLimpios: [],
    };
  }

  // Eliminar duplicados basados en ID
  const vehiculosUnicos = vehiculos.filter(
    (vehiculo, index, self) =>
      index === self.findIndex((v) => v.id === vehiculo.id),
  );

  const errors = [];
  if (vehiculosUnicos.length !== vehiculos.length) {
    errors.push('Se encontraron vehículos duplicados que fueron eliminados');
  }

  if (vehiculosUnicos.length === 0) {
    errors.push('No hay vehículos disponibles para las fechas seleccionadas');
  }

  return {
    isValid: vehiculosUnicos.length > 0,
    errors,
    vehiculosLimpios: vehiculosUnicos,
  };
};

/**
 * Validación específica para formulario de búsqueda
 * @param {Object} searchData - Datos del formulario de búsqueda
 * @returns {Object} - {isValid, errors}
 */
export const validateSearchFormData = (searchData) => {
  const errors = {};

  if (!searchData.pickupLocation?.id) {
    errors.pickupLocation = 'Selecciona un lugar de recogida';
  }

  if (!searchData.dropoffLocation?.id) {
    errors.dropoffLocation = 'Selecciona un lugar de devolución';
  }

  // ✅ VALIDAR FECHAS usando validación unificada
  if (!searchData.pickupDate || !searchData.dropoffDate) {
    if (!searchData.pickupDate)
      errors.pickupDate = 'Selecciona una fecha de recogida';
    if (!searchData.dropoffDate)
      errors.dropoffDate = 'Selecciona una fecha de devolución';
  } else {
    const dateValidation = validateReservationDates(
      searchData.pickupDate,
      searchData.dropoffDate,
      'new',
    );

    if (!dateValidation.isValid) {
      dateValidation.errors.forEach((error) => {
        if (error.includes('recogida')) {
          errors.pickupDate = error;
        } else if (error.includes('devolución')) {
          errors.dropoffDate = error;
        } else {
          errors.fechas = error;
        }
      });
    }
  }

  if (!searchData.pickupTime) {
    errors.pickupTime = 'Selecciona una hora de recogida';
  }

  if (!searchData.dropoffTime) {
    errors.dropoffTime = 'Selecciona una hora de devolución';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateReservationData,
  validateVehiculosDisponibles,
  validateSearchFormData,
  isValidEmail,
  isValidPhone,
};
