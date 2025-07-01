/**
 * 🔒 CONFIGURACIÓN DE SEGURIDAD
 *
 * Configuración centralizada para medidas de seguridad del frontend,
 * incluyendo Content Security Policy, validaciones y protecciones.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-01
 */

import { ENV_CONFIG, SECURITY_CONFIG } from './appConfig';

// ========================================
// CONTENT SECURITY POLICY
// ========================================

/**
 * Configuración de Content Security Policy para producción
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'js.stripe.com',
    '*.stripe.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'fonts.googleapis.com',
    'cdn.jsdelivr.net',
  ],
  'font-src': ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
  'img-src': ["'self'", 'data:', 'https:', '*.stripe.com'],
  'connect-src': [
    "'self'",
    'api.stripe.com',
    '*.stripe.com',
    ENV_CONFIG.IS_DEVELOPMENT ? 'localhost:*' : '',
  ].filter(Boolean),
  'frame-src': ["'self'", 'js.stripe.com'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

// ========================================
// HEADERS DE SEGURIDAD
// ========================================

/**
 * Headers de seguridad recomendados
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  ...(SECURITY_CONFIG.HTTPS_ONLY && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  }),
};

// ========================================
// VALIDACIONES DE ENTRADA
// ========================================

/**
 * Configuración para validación de datos de entrada
 */
export const INPUT_VALIDATION = {
  // Límites de texto
  MAX_TEXT_LENGTH: 1000,
  MAX_TEXTAREA_LENGTH: 5000,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,

  // Patrones de validación
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^[+]?[\d\s\-\(\)]{7,20}$/,
  NAME_PATTERN: /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'.-]{1,100}$/,

  // Caracteres prohibidos en texto libre
  FORBIDDEN_CHARS: /<script|javascript:|data:|vbscript:|onload=|onerror=/i,

  // Sanitización
  SANITIZE_HTML: true,
  ESCAPE_SQL: true,
  TRIM_WHITESPACE: true,
};

// ========================================
// CONFIGURACIÓN DE COOKIES
// ========================================

/**
 * Configuración segura para cookies
 */
export const COOKIE_CONFIG = {
  SECURE: SECURITY_CONFIG.SECURE_COOKIES,
  SAME_SITE: 'strict',
  HTTP_ONLY: false, // Para cookies accesibles desde JS
  MAX_AGE: 24 * 60 * 60, // 24 horas
  DOMAIN: ENV_CONFIG.IS_PRODUCTION ? '.movilityforyou.com' : 'localhost',
  PATH: '/',
};

// ========================================
// CONFIGURACIÓN DE RATE LIMITING
// ========================================

/**
 * Configuración para rate limiting en el frontend
 */
export const RATE_LIMITING = {
  // Límites por acción
  API_REQUESTS_PER_MINUTE: 60,
  FORM_SUBMISSIONS_PER_MINUTE: 5,
  SEARCH_REQUESTS_PER_MINUTE: 30,

  // Timeouts entre acciones
  FORM_SUBMISSION_COOLDOWN: 1000, // 1 segundo
  SEARCH_DEBOUNCE_TIME: 300, // 300ms
  API_REQUEST_DEBOUNCE: 100, // 100ms
};

// ========================================
// CONFIGURACIÓN DE LOGS DE SEGURIDAD
// ========================================

/**
 * Configuración para logging de eventos de seguridad
 */
export const SECURITY_LOGGING = {
  LOG_FAILED_VALIDATIONS: ENV_CONFIG.IS_PRODUCTION,
  LOG_SUSPICIOUS_ACTIVITY: true,
  LOG_RATE_LIMIT_VIOLATIONS: true,
  LOG_CSP_VIOLATIONS: ENV_CONFIG.IS_PRODUCTION,

  // Eventos a loggear
  EVENTS_TO_LOG: [
    'invalid_input',
    'rate_limit_exceeded',
    'suspicious_request',
    'csp_violation',
    'failed_authentication',
  ],
};

// ========================================
// FUNCIONES DE UTILIDAD DE SEGURIDAD
// ========================================

/**
 * Sanitiza texto de entrada
 * @param {string} input - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  let sanitized = input.trim();

  // Remover caracteres peligrosos
  sanitized = sanitized.replace(INPUT_VALIDATION.FORBIDDEN_CHARS, '');

  // Escapar HTML básico
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Valida email
 * @param {string} email - Email a validar
 * @returns {boolean} - Si el email es válido
 */
export function validateEmail(email) {
  return (
    INPUT_VALIDATION.EMAIL_PATTERN.test(email) &&
    email.length <= INPUT_VALIDATION.MAX_EMAIL_LENGTH
  );
}

/**
 * Valida teléfono
 * @param {string} phone - Teléfono a validar
 * @returns {boolean} - Si el teléfono es válido
 */
export function validatePhone(phone) {
  return (
    INPUT_VALIDATION.PHONE_PATTERN.test(phone) &&
    phone.length <= INPUT_VALIDATION.MAX_PHONE_LENGTH
  );
}

/**
 * Genera un CSP string a partir de las directivas
 * @returns {string} - CSP string
 */
export function generateCSPString() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

// ========================================
// EXPORTACIÓN
// ========================================

export default {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  INPUT_VALIDATION,
  COOKIE_CONFIG,
  RATE_LIMITING,
  SECURITY_LOGGING,
  sanitizeInput,
  validateEmail,
  validatePhone,
  generateCSPString,
};
