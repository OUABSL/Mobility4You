/**
 * 🔢 UTILIDADES DE NÚMEROS DE RESERVA
 *
 * Funciones para validar, formatear y trabajar con números de reserva
 * que siguen el patrón M4Y + 6 dígitos aleatorios.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-08-23
 */

import { createServiceLogger } from '../config/appConfig';

// Crear logger para las utilidades de números de reserva
const logger = createServiceLogger('RESERVATION_NUMBERS');

/**
 * Valida que un número de reserva tenga el formato correcto M4Y + 6 dígitos
 * @param {string} numeroReserva - Número de reserva a validar
 * @returns {boolean} True si el formato es válido
 */
export function isValidReservationNumber(numeroReserva) {
  if (!numeroReserva || typeof numeroReserva !== 'string') {
    return false;
  }

  // Patrón: M4Y seguido de exactamente 6 dígitos
  const pattern = /^M4Y\d{6}$/;
  return pattern.test(numeroReserva);
}

/**
 * Formatea un número de reserva para mostrar en UI
 * @param {string} numeroReserva - Número de reserva
 * @param {boolean} withPrefix - Si incluir el prefijo "Reserva #"
 * @returns {string} Número formateado
 */
export function formatReservationNumber(numeroReserva, withPrefix = true) {
  if (!numeroReserva) {
    return withPrefix ? 'Reserva Sin Número' : 'Sin Número';
  }

  const prefix = withPrefix ? 'Reserva #' : '';
  return `${prefix}${numeroReserva}`;
}

/**
 * Extrae el número de secuencia de un número de reserva
 * @param {string} numeroReserva - Número de reserva completo
 * @returns {string|null} Los 6 dígitos de secuencia o null si es inválido
 */
export function extractSequenceNumber(numeroReserva) {
  if (!isValidReservationNumber(numeroReserva)) {
    return null;
  }

  return numeroReserva.slice(3); // Quitar "M4Y" y devolver los 6 dígitos
}

/**
 * Normaliza un número de reserva (limpia espacios, convierte a mayúsculas)
 * @param {string} numeroReserva - Número de reserva a normalizar
 * @returns {string} Número normalizado
 */
export function normalizeReservationNumber(numeroReserva) {
  if (!numeroReserva || typeof numeroReserva !== 'string') {
    return '';
  }

  return numeroReserva.trim().toUpperCase();
}

/**
 * Valida un input de número de reserva y devuelve información de validación
 * @param {string} input - Input del usuario
 * @returns {object} Resultado de validación con detalles
 */
export function validateReservationNumberInput(input) {
  const normalized = normalizeReservationNumber(input);

  if (!normalized) {
    return {
      isValid: false,
      error: 'El número de reserva es requerido',
      normalized: '',
    };
  }

  if (normalized.length !== 9) {
    return {
      isValid: false,
      error: 'El número de reserva debe tener exactamente 9 caracteres',
      normalized,
    };
  }

  if (!normalized.startsWith('M4Y')) {
    return {
      isValid: false,
      error: 'El número de reserva debe comenzar con "M4Y"',
      normalized,
    };
  }

  const sequence = normalized.slice(3);
  if (!/^\d{6}$/.test(sequence)) {
    return {
      isValid: false,
      error: 'El número de reserva debe terminar con 6 dígitos',
      normalized,
    };
  }

  return {
    isValid: true,
    error: null,
    normalized,
    sequence,
  };
}

/**
 * Genera un número de reserva de ejemplo para mostrar en placeholders
 * @returns {string} Número de reserva de ejemplo
 */
export function getExampleReservationNumber() {
  return 'M4Y123456';
}

/**
 * Verifica si un valor parece ser un número de reserva o un ID numérico
 * @param {string|number} value - Valor a verificar
 * @returns {object} Información sobre el tipo de identificador
 */
export function identifyReservationIdentifier(value) {
  const stringValue = String(value).trim();

  if (isValidReservationNumber(stringValue)) {
    return {
      type: 'reservation_number',
      isValid: true,
      value: stringValue,
      displayValue: formatReservationNumber(stringValue),
    };
  }

  // Verificar si es un ID numérico
  if (/^\d+$/.test(stringValue)) {
    return {
      type: 'numeric_id',
      isValid: true,
      value: parseInt(stringValue, 10),
      displayValue: `ID #${stringValue}`,
    };
  }

  return {
    type: 'unknown',
    isValid: false,
    value: stringValue,
    displayValue: stringValue,
  };
}

/**
 * Helper para mostrar información de reserva de forma consistente
 * @param {object} reserva - Objeto de reserva
 * @returns {string} Cadena formateada para mostrar
 */
export function getReservationDisplayName(reserva) {
  if (!reserva) {
    return 'Reserva Desconocida';
  }

  // Priorizar número de reserva si existe
  if (reserva.numero_reserva) {
    return formatReservationNumber(reserva.numero_reserva);
  }

  // Fallback a ID
  if (reserva.id) {
    return `Reserva #ID-${reserva.id}`;
  }

  return 'Reserva Sin Identificador';
}

/**
 * Busca números de reserva en un texto
 * @param {string} text - Texto donde buscar
 * @returns {string[]} Array de números de reserva encontrados
 */
export function findReservationNumbersInText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const pattern = /M4Y\d{6}/g;
  const matches = text.match(pattern);

  return matches ? [...new Set(matches)] : []; // Eliminar duplicados
}

/**
 * Compara dos números de reserva (útil para ordenamiento)
 * @param {string} a - Primer número de reserva
 * @param {string} b - Segundo número de reserva
 * @returns {number} Resultado de comparación (-1, 0, 1)
 */
export function compareReservationNumbers(a, b) {
  const normalizedA = normalizeReservationNumber(a);
  const normalizedB = normalizeReservationNumber(b);

  if (normalizedA < normalizedB) return -1;
  if (normalizedA > normalizedB) return 1;
  return 0;
}

// Exportaciones agrupadas
export const ReservationNumberUtils = {
  isValid: isValidReservationNumber,
  format: formatReservationNumber,
  extractSequence: extractSequenceNumber,
  normalize: normalizeReservationNumber,
  validate: validateReservationNumberInput,
  getExample: getExampleReservationNumber,
  identify: identifyReservationIdentifier,
  getDisplayName: getReservationDisplayName,
  findInText: findReservationNumbersInText,
  compare: compareReservationNumbers,
};

export default ReservationNumberUtils;
