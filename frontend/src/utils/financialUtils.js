/**
 * 💰 UTILIDADES DE FORMATEO Y CÁLCULOS FINANCIEROS
 *
 * Funciones para formatear monedas, calcular IVA,
 * redondear valores monetarios y manejar cálculos financieros.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-30
 */

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';

// Crear logger para las utilidades financieras
const logger = createServiceLogger('FINANCIAL_UTILS');

/**
 * Redondea un número a los decimales especificados
 * @param {number} value - Valor a redondear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {number} Valor redondeado
 */
export function roundToDecimals(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    if (DEBUG_MODE) {
      logger.warn('Valor inválido para redondeo:', value);
    }
    return 0;
  }

  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Calcula el monto de IVA
 * @param {number} baseAmount - Monto base sin IVA
 * @param {number} ivaRate - Tasa de IVA (como decimal, ej: 0.10 para 10%)
 * @returns {number} Monto de IVA calculado
 */
export function calculateIvaAmount(baseAmount, ivaRate) {
  if (typeof baseAmount !== 'number' || isNaN(baseAmount)) {
    if (DEBUG_MODE) {
      logger.warn('Monto base inválido para cálculo de IVA:', baseAmount);
    }
    return 0;
  }

  if (typeof ivaRate !== 'number' || isNaN(ivaRate) || ivaRate < 0) {
    if (DEBUG_MODE) {
      logger.warn('Tasa de IVA inválida:', ivaRate);
    }
    return 0;
  }

  return roundToDecimals(baseAmount * ivaRate, 2);
}

/**
 * Calcula el precio con IVA incluido
 * @param {number} baseAmount - Monto base sin IVA
 * @param {number} ivaRate - Tasa de IVA (como decimal)
 * @returns {number} Precio total con IVA
 */
export function calculatePriceWithIva(baseAmount, ivaRate) {
  const ivaAmount = calculateIvaAmount(baseAmount, ivaRate);
  return roundToDecimals(baseAmount + ivaAmount, 2);
}

/**
 * Formatea un valor numérico como moneda
 * @param {number|string} value - El valor numérico a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} Cadena formateada como moneda
 */
export function formatCurrency(value, options = {}) {
  const {
    locale = 'es-ES',
    currency = 'EUR',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  try {
    let numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(numberValue)) {
      if (DEBUG_MODE) {
        logger.warn(`Valor inválido para formatear como moneda: ${value}`);
      }
      return '0,00 €';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numberValue);
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando moneda:', error);
    }
    // Fallback manual
    const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    return `${numValue.toFixed(2)} €`;
  }
}

/**
 * Formatea un porcentaje
 * @param {number} value - Valor decimal (ej: 0.10 para 10%)
 * @param {object} options - Opciones de formateo
 * @returns {string} Porcentaje formateado
 */
export function formatPercentage(value, options = {}) {
  const {
    locale = 'es-ES',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
  } = options;

  try {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0%';
    }

    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch (error) {
    if (DEBUG_MODE) {
      logger.error('Error formateando porcentaje:', error);
    }
    // Fallback manual
    return `${(value * 100).toFixed(maximumFractionDigits)}%`;
  }
}

/**
 * Calcula el descuento aplicado
 * @param {number} originalPrice - Precio original
 * @param {number} discountedPrice - Precio con descuento
 * @returns {object} Información del descuento
 */
export function calculateDiscount(originalPrice, discountedPrice) {
  if (
    typeof originalPrice !== 'number' ||
    typeof discountedPrice !== 'number'
  ) {
    return {
      amount: 0,
      percentage: 0,
      hasDiscount: false,
    };
  }

  if (
    originalPrice <= 0 ||
    discountedPrice < 0 ||
    discountedPrice > originalPrice
  ) {
    return {
      amount: 0,
      percentage: 0,
      hasDiscount: false,
    };
  }

  const discountAmount = originalPrice - discountedPrice;
  const discountPercentage = discountAmount / originalPrice;

  return {
    amount: roundToDecimals(discountAmount, 2),
    percentage: roundToDecimals(discountPercentage, 4),
    hasDiscount: discountAmount > 0,
  };
}

/**
 * Valida un valor monetario
 * @param {any} value - Valor a validar
 * @param {object} options - Opciones de validación
 * @returns {object} Resultado de la validación
 */
export function validateMonetaryValue(value, options = {}) {
  const {
    allowZero = true,
    allowNegative = false,
    maxValue = null,
    minValue = null,
  } = options;

  const result = {
    isValid: false,
    errors: [],
    numericValue: null,
  };

  // Convertir a número
  let numValue;
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  } else {
    result.errors.push('El valor debe ser un número');
    return result;
  }

  // Validar que sea un número válido
  if (isNaN(numValue)) {
    result.errors.push('El valor no es un número válido');
    return result;
  }

  result.numericValue = numValue;

  // Validar cero
  if (!allowZero && numValue === 0) {
    result.errors.push('El valor no puede ser cero');
  }

  // Validar negativos
  if (!allowNegative && numValue < 0) {
    result.errors.push('El valor no puede ser negativo');
  }

  // Validar valor mínimo
  if (minValue !== null && numValue < minValue) {
    result.errors.push(
      `El valor debe ser mayor o igual a ${formatCurrency(minValue)}`,
    );
  }

  // Validar valor máximo
  if (maxValue !== null && numValue > maxValue) {
    result.errors.push(
      `El valor debe ser menor o igual a ${formatCurrency(maxValue)}`,
    );
  }

  result.isValid = result.errors.length === 0;

  if (DEBUG_MODE && !result.isValid) {
    logger.warn('Validación de valor monetario falló:', result);
  }

  return result;
}

/**
 * Suma múltiples valores monetarios de forma segura
 * @param {number[]} values - Array de valores a sumar
 * @returns {number} Suma total redondeada
 */
export function sumMonetaryValues(values) {
  if (!Array.isArray(values)) {
    return 0;
  }

  const validValues = values.filter((value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return !isNaN(num);
  });

  const total = validValues.reduce((sum, value) => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return sum + num;
  }, 0);

  return roundToDecimals(total, 2);
}

/**
 * Convierte diferentes formatos de moneda a número
 * @param {string|number} value - Valor a convertir
 * @returns {number} Valor numérico
 */
export function parseMonetaryValue(value) {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  if (typeof value === 'string') {
    // Remover símbolos de moneda y espacios
    const cleaned = value
      .replace(/[€$£¥₹]/g, '')
      .replace(/\s/g, '')
      .replace(/,/g, '.');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Helper para calcular impuestos para mostrar en UI (sin valores hardcodeados)
 * @param {number} baseAmount - Monto base
 * @param {number|null} ivaRate - Tasa de IVA del backend
 * @returns {number} - Monto de impuestos calculado
 */
export function calculateDisplayIvaAmount(baseAmount, ivaRate = null) {
  if (!baseAmount || isNaN(baseAmount)) {
    return 0;
  }

  // Si tenemos la tasa del backend, usarla
  if (ivaRate !== null && ivaRate !== undefined && !isNaN(ivaRate)) {
    return calculateIvaAmount(baseAmount, ivaRate);
  }

  // Sin fallback hardcodeado - debe venir del backend
  return 0;
}

/**
 * Helper para formatear el porcentaje de IVA
 * @param {number|null} rate - Tasa de IVA (como decimal, ej: 0.10)
 * @returns {string} - Porcentaje formateado o cadena vacía
 */
export function formatIvaRate(rate = null) {
  if (rate !== null && rate !== undefined && !isNaN(rate)) {
    return ` (${(rate * 100).toFixed(0)}%)`;
  }
  // Sin fallback hardcodeado - debe venir del backend
  return '';
}

/**
 * Calcula el desglose de un precio con IVA
 * @param {number} totalPrice - Precio total con IVA
 * @param {number} ivaRate - Tasa de IVA
 * @returns {object} Desglose del precio
 */
export function calculatePriceBreakdown(totalPrice, ivaRate) {
  if (typeof totalPrice !== 'number' || typeof ivaRate !== 'number') {
    return {
      basePrice: 0,
      ivaAmount: 0,
      totalPrice: 0,
      ivaRate: 0,
    };
  }

  const basePrice = totalPrice / (1 + ivaRate);
  const ivaAmount = totalPrice - basePrice;

  return {
    basePrice: roundToDecimals(basePrice, 2),
    ivaAmount: roundToDecimals(ivaAmount, 2),
    totalPrice: roundToDecimals(totalPrice, 2),
    ivaRate: ivaRate,
  };
}

/**
 * Extrae el IVA de un precio que ya lo incluye (NUEVA LÓGICA SIMBÓLICA)
 * @param {number} priceWithIva - Precio con IVA incluido
 * @param {number} ivaRate - Tasa de IVA del sistema (por defecto desde env: 10%)
 * @returns {object} - Objeto con precio sin IVA e IVA extraído
 */
export function extractIvaFromPrice(priceWithIva, ivaRate = null) {
  if (typeof priceWithIva !== 'number' || priceWithIva <= 0) {
    return {
      priceWithoutIva: 0,
      ivaAmount: 0,
      priceWithIva: 0,
    };
  }

  // Usar tasa de IVA del sistema (10% por defecto) o la proporcionada
  const systemIvaRate = ivaRate || 0.1; // 10% configurado en .env

  // Fórmula: iva_amount = precio_con_iva * iva_rate / (1 + iva_rate)
  const ivaAmount = (priceWithIva * systemIvaRate) / (1 + systemIvaRate);
  const priceWithoutIva = priceWithIva - ivaAmount;

  return {
    priceWithoutIva: roundToDecimals(priceWithoutIva, 2),
    ivaAmount: roundToDecimals(ivaAmount, 2),
    priceWithIva: roundToDecimals(priceWithIva, 2),
  };
}

/**
 * Calcula precio total con tarifa de política incluida
 * @param {number} basePrice - Precio base por día
 * @param {number} policyFee - Tarifa de política por día
 * @param {number} days - Número de días
 * @returns {number} - Precio total (IVA ya incluido)
 */
export function calculateTotalWithPolicy(basePrice, policyFee = 0, days = 1) {
  const pricePerDay = basePrice + policyFee;
  const totalPrice = pricePerDay * days;
  return roundToDecimals(totalPrice, 2);
}

// === Fin de las funciones de IVA ===
