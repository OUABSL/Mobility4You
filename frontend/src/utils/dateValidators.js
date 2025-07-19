/**
 * 📅 UTILIDADES DE VALIDACIÓN DE FECHAS
 *
 * Funciones para validar fechas, rangos de fechas y formateo
 * de fechas para diferentes contextos de la aplicación.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-30
 */

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';

// Crear logger para las utilidades de validación de fechas
const logger = createServiceLogger('DATE_VALIDATORS');

/**
 * Valida que una fecha sea válida
 * @param {string|Date} dateValue - Valor de fecha
 * @returns {boolean} True si la fecha es válida
 */
export function isValidDate(dateValue) {
  try {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Valida que una fecha sea futura
 * @param {string|Date} dateValue - Valor de fecha
 * @returns {boolean} True si la fecha es válida y futura
 */
export function isValidFutureDate(dateValue) {
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) && date > new Date();
  } catch {
    return false;
  }
}

/**
 * Valida que una fecha sea pasada
 * @param {string|Date} dateValue - Valor de fecha
 * @returns {boolean} True si la fecha es válida y pasada
 */
export function isValidPastDate(dateValue) {
  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime()) && date < new Date();
  } catch {
    return false;
  }
}

/**
 * Valida que dos fechas formen un rango válido
 * @param {string|Date} startDate - Fecha de inicio
 * @param {string|Date} endDate - Fecha de fin
 * @returns {object} Resultado de validación con detalles
 */
export function validateDateRange(startDate, endDate) {
  const result = {
    isValid: false,
    errors: [],
    startDateValid: false,
    endDateValid: false,
    rangeValid: false,
  };

  // Validar fecha de inicio
  if (!isValidDate(startDate)) {
    result.errors.push('Fecha de inicio inválida');
  } else {
    result.startDateValid = true;
  }

  // Validar fecha de fin
  if (!isValidDate(endDate)) {
    result.errors.push('Fecha de fin inválida');
  } else {
    result.endDateValid = true;
  }

  // Validar rango si ambas fechas son válidas
  if (result.startDateValid && result.endDateValid) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      result.errors.push(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    } else {
      result.rangeValid = true;
    }
  }

  result.isValid = result.errors.length === 0;
  return result;
}

/**
 * Valida que las fechas de reserva cumplan con las reglas de negocio
 * @param {string|Date} pickupDate - Fecha de recogida
 * @param {string|Date} dropoffDate - Fecha de devolución
 * @param {number} minHours - Mínimo de horas de reserva (por defecto 24)
 * @returns {object} Resultado de validación con detalles
 */
export function validateReservationDates(
  pickupDate,
  dropoffDate,
  minHours = 24,
) {
  const result = {
    isValid: false,
    errors: [],
    warnings: [],
    pickupDateValid: false,
    dropoffDateValid: false,
    rangeValid: false,
    durationValid: false,
    hoursDifference: 0,
  };

  try {
    // Validar fecha de recogida
    if (!isValidDate(pickupDate)) {
      result.errors.push('Fecha de recogida inválida');
    } else {
      const pickup = new Date(pickupDate);
      const now = new Date();

      if (pickup <= now) {
        result.errors.push('La fecha de recogida debe ser futura');
      } else {
        result.pickupDateValid = true;

        // Advertencia si la fecha es muy próxima (menos de 2 horas)
        const hoursUntilPickup =
          (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilPickup < 2) {
          result.warnings.push(
            'La fecha de recogida es muy próxima. Contacta con nosotros para confirmar disponibilidad.',
          );
        }
      }
    }

    // Validar fecha de devolución
    if (!isValidDate(dropoffDate)) {
      result.errors.push('Fecha de devolución inválida');
    } else {
      result.dropoffDateValid = true;
    }

    // Validar rango y duración si ambas fechas son válidas
    if (result.pickupDateValid && result.dropoffDateValid) {
      const pickup = new Date(pickupDate);
      const dropoff = new Date(dropoffDate);

      if (pickup >= dropoff) {
        result.errors.push(
          'La fecha de devolución debe ser posterior a la fecha de recogida',
        );
      } else {
        result.rangeValid = true;

        // Calcular diferencia en horas
        const timeDiff = dropoff.getTime() - pickup.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        result.hoursDifference = hoursDiff;

        if (hoursDiff < minHours) {
          result.errors.push(
            `La duración mínima del alquiler es de ${minHours} horas`,
          );
        } else {
          result.durationValid = true;
        }

        // Advertencias para duraciones muy largas
        if (hoursDiff > 24 * 30) {
          // Más de 30 días
          result.warnings.push(
            'Reservas de más de 30 días pueden requerir condiciones especiales',
          );
        }
      }
    }

    // La validación es exitosa si no hay errores
    result.isValid = result.errors.length === 0;

    if (result.isValid) {
      logger.info(
        `✅ Fechas de reserva válidas: ${pickupDate} - ${dropoffDate} (${result.hoursDifference.toFixed(
          1,
        )}h)`,
      );
    } else {
      logger.warn(`❌ Fechas de reserva inválidas:`, result.errors);
    }
  } catch (error) {
    logger.error('Error validando fechas de reserva:', error);
    result.errors.push('Error interno validando las fechas');
  }

  return result;
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {string|Date} startDate - Fecha de inicio
 * @param {string|Date} endDate - Fecha de fin
 * @returns {number} Número de días (puede ser decimal)
 */
export function calculateDaysDifference(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isValidDate(start) || !isValidDate(end)) {
      return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error calculando diferencia de días:', error);
    }
    return 0;
  }
}

/**
 * Calcula la diferencia en horas entre dos fechas
 * @param {string|Date} startDate - Fecha de inicio
 * @param {string|Date} endDate - Fecha de fin
 * @returns {number} Número de horas (puede ser decimal)
 */
export function calculateHoursDifference(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (!isValidDate(start) || !isValidDate(end)) {
      return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60);
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error calculando diferencia de horas:', error);
    }
    return 0;
  }
}

/**
 * Formatea una fecha para envío al backend
 * @param {string|Date} dateValue - Fecha a formatear
 * @returns {string|null} Fecha en formato ISO o null si es inválida
 */
export function formatDateForBackend(dateValue) {
  try {
    if (!isValidDate(dateValue)) {
      return null;
    }

    const date = new Date(dateValue);
    return date.toISOString();
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando fecha para backend:', error);
    }
    return null;
  }
}

/**
 * Formatea una fecha para mostrar en UI
 * @param {string|Date} dateValue - Fecha a formatear
 * @param {string} locale - Locale a usar (por defecto 'es-ES')
 * @returns {string|null} Fecha formateada o null si es inválida
 */
export function formatDateForUI(dateValue, locale = 'es-ES') {
  try {
    if (!isValidDate(dateValue)) {
      return null;
    }

    const date = new Date(dateValue);
    return date.toLocaleDateString(locale);
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando fecha para UI:', error);
    }
    return null;
  }
}

/**
 * Parsea una fecha del backend de forma segura
 * @param {string} dateString - String de fecha del backend
 * @returns {Date|null} Fecha parseada o null si es inválida
 */
export function parseDateFromBackend(dateString) {
  try {
    if (!dateString || typeof dateString !== 'string') {
      return null;
    }

    const date = new Date(dateString);
    return isValidDate(date) ? date : null;
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error parseando fecha del backend:', error);
    }
    return null;
  }
}
