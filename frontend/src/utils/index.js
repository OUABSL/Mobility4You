/**
 * 📦 ÍNDICE DE UTILIDADES
 *
 * Exporta todas las funciones de utilidad de forma organizada.
 * Permite importar funciones específicas o grupos completos de utilidades.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-06-30
 */

// ========================================
// IMPORTS PARA EXPORTACIONES AGRUPADAS
// ========================================

import * as DataExtractors from './dataExtractors';
import * as DateValidators from './dateValidators';
import * as FinancialUtils from './financialUtils';
import * as GeneralUtils from './generalUtils';
import * as ImageUtils from './imageUtils';

// ========================================
// EXPORTACIONES POR CATEGORÍA
// ========================================

// Utilidades de extracción de datos
export {
  deepSearch,
  extractByPath,
  extractFromJsonField,
  extractFromMultiplePaths,
  extractProperties,
  flattenObject,
  unflattenObject,
} from './dataExtractors';

// Utilidades de validación de fechas
export {
  calculateDaysDifference,
  calculateHoursDifference,
  formatDateForBackend,
  formatDateForUI,
  isValidDate,
  isValidFutureDate,
  isValidPastDate,
  parseDateFromBackend,
  validateDateRange,
  validateReservationDates,
} from './dateValidators';

// Utilidades financieras
export {
  calculateDiscount,
  calculateDisplayTaxAmount,
  calculatePriceBreakdown,
  calculatePriceWithTax,
  calculateTaxAmount,
  formatCurrency,
  formatPercentage,
  formatTaxRate,
  parseMonetaryValue,
  roundToDecimals,
  sumMonetaryValues,
  validateMonetaryValue,
} from './financialUtils';

// Utilidades de imágenes
export {
  extractImageInfo,
  generateImageSet,
  getDefaultPlaceholder,
  getImageForExtra,
  getImageForVehicle,
  getOptimizedImageUrl,
  getPlaceholder,
  prepareImageData,
  processImageUrl,
  validateImageUrl,
} from './imageUtils';

// Utilidades generales
export {
  capitalize,
  capitalizeWords,
  debounce,
  debugBackendData,
  debugLocalStorage,
  debugSessionStorage,
  deepClone,
  defaultIfNullish,
  defaultIfUndefined,
  formatOrdinal,
  generateUniqueId,
  isValidEmail,
  isValidSpanishPhone,
  logError,
  logInfo,
  logWarning,
  normalizeSpanishPhone,
  shallowEqual,
  sleep,
  slugify,
  throttle,
  toBoolean,
  withTimeout,
} from './generalUtils';

// ========================================
// EXPORTACIONES AGRUPADAS
// ========================================

// Exportar grupos completos para uso conveniente
export {
  DataExtractors,
  DateValidators,
  FinancialUtils,
  GeneralUtils,
  ImageUtils,
};

// ========================================
// UTILIDADES LEGACY (COMPATIBILIDAD)
// ========================================

// Funciones que estaban en services/func.js para compatibilidad hacia atrás
// Nota: Todas estas funciones ya se exportan arriba en sus respectivas secciones
// No se necesitan exportaciones duplicadas aquí

// ========================================
// EXPORTACIÓN POR DEFECTO
// ========================================

// Objeto con todas las utilidades organizadas
const Utils = {
  DataExtractors,
  DateValidators,
  FinancialUtils,
  ImageUtils,
  GeneralUtils,
};

export default Utils;
