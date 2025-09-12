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
 * @param {boolean} isNewReservation - Si es nueva reserva (aplica margen de 30 min)
 * @returns {boolean} True si la fecha es válida y futura
 */
export function isValidFutureDate(dateValue, isNewReservation = true) {
  try {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return false;

    const now = new Date();

    if (isNewReservation) {
      const marginTime = new Date(now.getTime() - 30 * 60 * 1000);
      return date > marginTime;
    } else {
      return date > now;
    }
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
 * Valida fechas de reserva con criterios unificados frontend/backend
 * @param {string|Date} pickupDate - Fecha de recogida
 * @param {string|Date} dropoffDate - Fecha de devolución
 * @param {string} context - 'new'|'edit'|'cancel' - Contexto de validación
 * @returns {object} Resultado de validación detallado
 */
export function validateReservationDates(
  pickupDate,
  dropoffDate,
  context = 'new',
) {
  const result = {
    isValid: false,
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const now = new Date();

    // 1. Validar que las fechas sean válidas
    if (!isValidDate(pickup)) {
      result.errors.push('Fecha de recogida inválida');
      return result;
    }

    if (!isValidDate(dropoff)) {
      result.errors.push('Fecha de devolución inválida');
      return result;
    }

    // 2. Validar orden de fechas
    if (pickup >= dropoff) {
      result.errors.push(
        'La fecha de devolución debe ser posterior a la de recogida',
      );
      return result;
    }

    // 3. Calcular duración
    const duration = (dropoff - pickup) / (1000 * 60 * 60 * 24);
    result.duration = Math.ceil(duration);

    // 4. Validar duración mínima y máxima
    if (result.duration < 1) {
      result.errors.push('El período de alquiler debe ser de al menos 1 día');
    }

    // 5. Validar fechas futuras según contexto (UNIFICADO CON BACKEND)
    if (context === 'new') {
      // Nueva reserva: margen de 30 minutos
      const marginTime = new Date(now.getTime() - 30 * 60 * 1000);
      if (pickup <= marginTime) {
        result.errors.push(
          'La fecha de recogida debe ser al menos 30 minutos en el futuro',
        );
      }
    } else if (context === 'edit') {
      // Edición: margen de 2 horas
      const editLimit = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (pickup <= editLimit) {
        result.errors.push(
          'No se puede editar una reserva que comienza en menos de 2 horas',
        );
      }
    } else if (context === 'cancel') {
      // Cancelación: SIEMPRE PERMITIDA sin advertencias ni penalizaciones
      // No agregamos ninguna advertencia porque se puede cancelar libremente
    }

    result.isValid = result.errors.length === 0;
    return result;
  } catch (error) {
    logger.error('Error validando fechas de reserva:', error);
    result.errors.push('Error interno al validar fechas');
    return result;
  }
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
