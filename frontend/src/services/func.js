// No imports are needed for this function as it only uses built-in JavaScript features.
// Just export the function as you have done.

import universalMapper from './universalDataMapper';

export function withTimeout(promise, ms = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          'La consulta está tardando demasiado. Inténtalo de nuevo más tarde.',
        ),
      );
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// utils/formatters.js - MIGRADO AL MAPPER UNIVERSAL

/**
 * Formatea un valor numérico como moneda - MIGRADO AL MAPPER UNIVERSAL
 * @deprecated Usar universalMapper.formatCurrency en su lugar
 * @param {number|string} value - El valor numérico a formatear
 * @param {Object} options - Opciones de formateo
 * @returns {string} - Cadena formateada como moneda
 */
export function formatCurrency(
  value,
  {
    locale = 'es-ES',
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = {},
) {
  console.warn(
    '[DEPRECATED] func.formatCurrency - usar universalMapper.formatCurrency en su lugar',
  );

  // Usar el mapper universal con fallback a la implementación local
  try {
    return universalMapper.formatCurrency(value, currency);
  } catch (error) {
    // Fallback a implementación local si hay error
    let numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(numberValue)) {
      console.warn(`[formatCurrency] Valor inválido: ${value}`);
      return '';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numberValue);
  }
}
