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
import { isValidDate, isValidFutureDate } from '../utils/dateValidators';

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
    // Validar vehículo
    if (!data.car || !data.car.id) {
      errors.vehiculo = 'Se requiere seleccionar un vehículo';
    }

    // Validar fechas
    if (!data.fechas || !data.fechas.pickupDate || !data.fechas.dropoffDate) {
      errors.fechas = 'Se requieren fechas de recogida y devolución';
    } else {
      const now = new Date();
      const pickupDate = new Date(data.fechas.pickupDate);
      const dropoffDate = new Date(data.fechas.dropoffDate);

      // Validar que las fechas sean válidas
      if (!isValidDate(pickupDate)) {
        errors.fechaRecogida = 'La fecha de recogida no es válida';
      } else if (!isValidFutureDate(pickupDate)) {
        errors.fechaRecogida = 'La fecha de recogida debe ser futura';
      }

      if (!isValidDate(dropoffDate)) {
        errors.fechaDevolucion = 'La fecha de devolución no es válida';
      } else if (dropoffDate <= pickupDate) {
        errors.fechaDevolucion =
          'La fecha de devolución debe ser posterior a la de recogida';
      }

      // Validar que no sea más de 30 días
      if (dropoffDate && pickupDate) {
        const diffTime = Math.abs(dropoffDate - pickupDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          errors.fechas = 'El período de alquiler no puede exceder 30 días';
        }
      }
    }

    // Validar ubicaciones - asegurarse de que existan los IDs
    if (
      !data.fechas?.pickupLocation?.id &&
      !data.lugarRecogida?.id &&
      !data.lugar_recogida_id
    ) {
      errors.lugarRecogida = 'Se requiere especificar el lugar de recogida';
    }

    if (
      !data.fechas?.dropoffLocation?.id &&
      !data.lugarDevolucion?.id &&
      !data.lugar_devolucion_id
    ) {
      errors.lugarDevolucion = 'Se requiere especificar el lugar de devolución';
    }

    // Validar horarios
    if (!data.fechas?.pickupTime) {
      errors.horaRecogida = 'Se requiere especificar la hora de recogida';
    }

    if (!data.fechas?.dropoffTime) {
      errors.horaDevolucion = 'Se requiere especificar la hora de devolución';
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

  if (!searchData.pickupDate) {
    errors.pickupDate = 'Selecciona una fecha de recogida';
  } else if (!isValidFutureDate(searchData.pickupDate)) {
    errors.pickupDate = 'La fecha de recogida debe ser futura';
  }

  if (!searchData.dropoffDate) {
    errors.dropoffDate = 'Selecciona una fecha de devolución';
  } else if (
    new Date(searchData.dropoffDate) <= new Date(searchData.pickupDate)
  ) {
    errors.dropoffDate =
      'La fecha de devolución debe ser posterior a la de recogida';
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
