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

  result.isValid =
    result.startDateValid && result.endDateValid && result.rangeValid;

  if (DEBUG_MODE && !result.isValid) {
    logger.warn('Validación de rango de fechas falló:', result);
  }

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
  };

  // Validar que ambas fechas sean válidas
  const rangeValidation = validateDateRange(pickupDate, dropoffDate);
  if (!rangeValidation.isValid) {
    result.errors.push(...rangeValidation.errors);
    return result;
  }

  const pickup = new Date(pickupDate);
  const dropoff = new Date(dropoffDate);
  const now = new Date();

  // Validar que la fecha de recogida sea futura
  if (pickup <= now) {
    result.errors.push('La fecha de recogida debe ser futura');
  }

  // Validar duración mínima
  const durationMs = dropoff.getTime() - pickup.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if (durationHours < minHours) {
    result.errors.push(
      `La reserva debe tener una duración mínima de ${minHours} horas`,
    );
  }

  // Advertencias para reservas muy largas (más de 30 días)
  const maxDays = 30;
  const durationDays = durationHours / 24;

  if (durationDays > maxDays) {
    result.warnings.push(
      `La reserva es muy larga (${Math.ceil(
        durationDays,
      )} días). Considera dividirla en reservas más cortas.`,
    );
  }

  // Advertencia para reservas muy próximas (menos de 2 horas)
  const advanceHours = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (advanceHours < 2) {
    result.warnings.push(
      'La reserva es con muy poca antelación. Verifica la disponibilidad.',
    );
  }

  result.isValid = result.errors.length === 0;

  if (DEBUG_MODE) {
    logger.info('Validación de fechas de reserva:', {
      pickupDate,
      dropoffDate,
      durationHours: Math.round(durationHours * 100) / 100,
      advanceHours: Math.round(advanceHours * 100) / 100,
      result,
    });
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
 * Formatea una fecha para mostrar en la UI
 * @param {string|Date} dateValue - Fecha a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} Fecha formateada
 */
export function formatDateForUI(dateValue, options = {}) {
  const {
    includeTime = false,
    locale = 'es-ES',
    dateStyle = 'medium',
    timeStyle = 'short',
  } = options;

  try {
    const date = new Date(dateValue);

    if (!isValidDate(date)) {
      return 'Fecha inválida';
    }

    if (includeTime) {
      return date.toLocaleString(locale, {
        dateStyle,
        timeStyle,
      });
    } else {
      return date.toLocaleDateString(locale, {
        dateStyle,
      });
    }
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando fecha para UI:', error);
    }
    return 'Error de formato';
  }
}

/**
 * Convierte una fecha a formato ISO para envío al backend
 * @param {string|Date} dateValue - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
export function formatDateForBackend(dateValue) {
  try {
    const date = new Date(dateValue);

    if (!isValidDate(date)) {
      throw new Error('Fecha inválida');
    }

    return date.toISOString();
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando fecha para backend:', error);
    }
    throw error;
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
