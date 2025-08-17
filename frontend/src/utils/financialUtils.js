/**
 * 💰 UTILIDADES DE FORMATEO Y CÁLCULOS FINANCIEROS
 *
 * Funciones para formatear monedas, calcular impuestos,
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
 * Calcula el monto de impuestos
 * @param {number} baseAmount - Monto base sin impuestos
 * @param {number} taxRate - Tasa de impuesto (como decimal, ej: 0.21 para 21%)
 * @returns {number} Monto de impuestos calculado
 */
export function calculateTaxAmount(baseAmount, taxRate) {
  if (typeof baseAmount !== 'number' || isNaN(baseAmount)) {
    if (DEBUG_MODE) {
      logger.warn('Monto base inválido para cálculo de impuestos:', baseAmount);
    }
    return 0;
  }

  if (typeof taxRate !== 'number' || isNaN(taxRate) || taxRate < 0) {
    if (DEBUG_MODE) {
      logger.warn('Tasa de impuesto inválida:', taxRate);
    }
    return 0;
  }

  return roundToDecimals(baseAmount * taxRate, 2);
}

/**
 * Calcula el precio con impuestos incluidos
 * @param {number} baseAmount - Monto base sin impuestos
 * @param {number} taxRate - Tasa de impuesto (como decimal)
 * @returns {number} Precio total con impuestos
 */
export function calculatePriceWithTax(baseAmount, taxRate) {
  const taxAmount = calculateTaxAmount(baseAmount, taxRate);
  return roundToDecimals(baseAmount + taxAmount, 2);
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
 * @param {number} value - Valor decimal (ej: 0.21 para 21%)
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
 * @param {number|null} taxRate - Tasa de impuesto del backend
 * @returns {number} - Monto de impuestos calculado
 */
export function calculateDisplayTaxAmount(baseAmount, taxRate = null) {
  if (!baseAmount || isNaN(baseAmount)) {
    return 0;
  }

  // Si tenemos la tasa del backend, usarla
  if (taxRate !== null && taxRate !== undefined && !isNaN(taxRate)) {
    return calculateTaxAmount(baseAmount, taxRate);
  }

  // Sin fallback hardcodeado - debe venir del backend
  return 0;
}

/**
 * Helper para formatear el porcentaje de impuesto
 * @param {number|null} rate - Tasa de impuesto (como decimal, ej: 0.21)
 * @returns {string} - Porcentaje formateado o cadena vacía
 */
export function formatTaxRate(rate = null) {
  if (rate !== null && rate !== undefined && !isNaN(rate)) {
    return ` (${(rate * 100).toFixed(0)}%)`;
  }
  // Sin fallback hardcodeado - debe venir del backend
  return '';
}

/**
 * Calcula el desglose de un precio con impuestos
 * @param {number} totalPrice - Precio total con impuestos
 * @param {number} taxRate - Tasa de impuesto
 * @returns {object} Desglose del precio
 */
export function calculatePriceBreakdown(totalPrice, taxRate) {
  if (typeof totalPrice !== 'number' || typeof taxRate !== 'number') {
    return {
      basePrice: 0,
      taxAmount: 0,
      totalPrice: 0,
      taxRate: 0,
    };
  }

  const basePrice = totalPrice / (1 + taxRate);
  const taxAmount = totalPrice - basePrice;

  return {
    basePrice: roundToDecimals(basePrice, 2),
    taxAmount: roundToDecimals(taxAmount, 2),
    totalPrice: roundToDecimals(totalPrice, 2),
    taxRate: taxRate,
  };
}

/**
 * Extrae el IVA de un precio que ya lo incluye
 * @param {number} priceWithTax - Precio con IVA incluido
 * @param {number} taxRate - Tasa de IVA (por defecto 21% = 0.21)
 * @returns {object} - Objeto con precio sin IVA e IVA extraído
 */
export function extractTaxFromPrice(priceWithTax, taxRate = 0.21) {
  if (typeof priceWithTax !== 'number' || priceWithTax <= 0) {
    return {
      priceWithoutTax: 0,
      taxAmount: 0,
      priceWithTax: 0,
    };
  }

  // Fórmula: precio_sin_iva = precio_con_iva / (1 + tasa_iva)
  const priceWithoutTax = priceWithTax / (1 + taxRate);
  const taxAmount = priceWithTax - priceWithoutTax;

  return {
    priceWithoutTax: roundToDecimals(priceWithoutTax, 2),
    taxAmount: roundToDecimals(taxAmount, 2),
    priceWithTax: roundToDecimals(priceWithTax, 2),
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
  const pricePerDay = (basePrice + policyFee);
  const totalPrice = pricePerDay * days;
  return roundToDecimals(totalPrice, 2);
}