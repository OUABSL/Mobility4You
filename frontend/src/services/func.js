// No imports are needed for this function as it only uses built-in JavaScript features.
// Just export the function as you have done.

export function withTimeout(promise, ms = 10000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('La consulta está tardando demasiado. Inténtalo de nuevo más tarde.'));
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

// utils/formatters.js

/**
 * Formatea un valor numérico como moneda según la configuración regional y de moneda especificada.
 *
 * @param {number|string} value - El valor numérico a formatear. Si es string, intentará convertirlo a número.
 * @param {Object} [options] - Opciones de formateo.
 * @param {string} [options.locale='es-ES'] - Código de configuración regional para formateo.
 * @param {string} [options.currency='EUR'] - Código de moneda (por ejemplo, 'EUR', 'USD').
 * @param {number} [options.minimumFractionDigits=2] - Dígitos fraccionarios mínimos.
 * @param {number} [options.maximumFractionDigits=2] - Dígitos fraccionarios máximos.
 * @returns {string} - Cadena formateada como moneda.
 */
export function formatCurrency(
  value,
  {
    locale = 'es-ES',
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = {}
) {
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

