/**
 * 🔧 CONFIGURACIÓN DE SERVICIOS OPTIMIZADA
 *
 * Configuración centralizada para optimización de rendimiento,
 * lazy loading y gestión de memoria en producción.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-01
 */

import { ENV_CONFIG, FEATURES } from './appConfig';

// ========================================
// CONFIGURACIÓN DE LAZY LOADING
// ========================================

/**
 * Configuración para carga diferida de componentes
 */
export const LAZY_LOADING_CONFIG = {
  ENABLED: ENV_CONFIG.IS_PRODUCTION,
  SUSPENSE_FALLBACK_TIMEOUT: 300,
  PREFETCH_ON_HOVER: true,
  PRELOAD_CRITICAL_ROUTES: ['/'],
};

// ========================================
// CONFIGURACIÓN DE PERFORMANCE
// ========================================

/**
 * Configuración para optimización de rendimiento
 */
export const PERFORMANCE_CONFIG = {
  // React optimizations
  STRICT_MODE: ENV_CONFIG.IS_DEVELOPMENT,
  PROFILER_ENABLED: ENV_CONFIG.IS_DEVELOPMENT,

  // Bundle optimizations
  CODE_SPLITTING: true,
  TREE_SHAKING: ENV_CONFIG.IS_PRODUCTION,
  MINIFICATION: ENV_CONFIG.IS_PRODUCTION,

  // Memory management
  GARBAGE_COLLECTION_HINTS: ENV_CONFIG.IS_PRODUCTION,
  MAX_CACHE_SIZE: ENV_CONFIG.IS_PRODUCTION ? 50 : 100, // MB

  // Image optimizations
  LAZY_IMAGES: true,
  PROGRESSIVE_IMAGES: ENV_CONFIG.IS_PRODUCTION,
  WEBP_SUPPORT: true,
};

// ========================================
// CONFIGURACIÓN DE MONITOREO
// ========================================

/**
 * Configuración para monitoreo y analytics
 */
export const MONITORING_CONFIG = {
  ERROR_TRACKING: FEATURES.ERROR_REPORTING_ENABLED,
  PERFORMANCE_TRACKING: FEATURES.ANALYTICS_ENABLED,
  USER_ANALYTICS: FEATURES.ANALYTICS_ENABLED,

  // Error boundaries
  CAPTURE_COMPONENT_STACK: ENV_CONFIG.IS_DEVELOPMENT,
  CAPTURE_ERROR_CONTEXT: true,

  // Performance metrics
  MEASURE_LOAD_TIMES: FEATURES.ANALYTICS_ENABLED,
  MEASURE_INTERACTION_TIMES: FEATURES.ANALYTICS_ENABLED,
  CORE_WEB_VITALS: ENV_CONFIG.IS_PRODUCTION,
};

// ========================================
// CONFIGURACIÓN DE ACCESIBILIDAD
// ========================================

/**
 * Configuración para accesibilidad
 */
export const ACCESSIBILITY_CONFIG = {
  FOCUS_MANAGEMENT: true,
  ARIA_LABELS: true,
  KEYBOARD_NAVIGATION: true,
  SCREEN_READER_SUPPORT: true,
  HIGH_CONTRAST_MODE: false,
  REDUCED_MOTION_SUPPORT: true,
};

// ========================================
// CONFIGURACIÓN DE SEO
// ========================================

/**
 * Configuración para SEO
 */
export const SEO_CONFIG = {
  META_TAGS: true,
  STRUCTURED_DATA: ENV_CONFIG.IS_PRODUCTION,
  OPEN_GRAPH: ENV_CONFIG.IS_PRODUCTION,
  TWITTER_CARDS: ENV_CONFIG.IS_PRODUCTION,
  CANONICAL_URLS: ENV_CONFIG.IS_PRODUCTION,
  SITEMAP_GENERATION: ENV_CONFIG.IS_PRODUCTION,
};

// ========================================
// EXPORTACIÓN CONSOLIDADA
// ========================================

export default {
  LAZY_LOADING_CONFIG,
  PERFORMANCE_CONFIG,
  MONITORING_CONFIG,
  ACCESSIBILITY_CONFIG,
  SEO_CONFIG,
};
