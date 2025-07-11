// src/config/loggerValidator.js

/**
 * 🔍 VALIDADOR DE CONFIGURACIÓN DE LOGGER
 *
 * Verifica que la configuración del logger esté optimizada y unificada
 * en toda la aplicación.
 */

import { DEBUG_MODE, ENV_CONFIG, createServiceLogger } from './appConfig';

/**
 * Valida la configuración del logger
 * @returns {Object} - Resultado de la validación
 */
export const validateLoggerConfig = () => {
  const results = {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      debugMode: DEBUG_MODE,
      consoleLoggingEnabled: ENV_CONFIG.FEATURES.CONSOLE_LOGGING,
      environment: process.env.NODE_ENV,
    },
  };

  // Validar configuración de DEBUG_MODE
  if (DEBUG_MODE && process.env.NODE_ENV === 'production') {
    results.errors.push(
      'DEBUG_MODE está activo en producción - esto no es recomendado',
    );
    results.isValid = false;
  }

  // Validar configuración de CONSOLE_LOGGING
  if (
    ENV_CONFIG.FEATURES.CONSOLE_LOGGING &&
    process.env.NODE_ENV === 'production'
  ) {
    results.warnings.push(
      'Console logging está habilitado en producción - considere deshabilitarlo',
    );
  }

  // Verificar que createServiceLogger funciona correctamente
  try {
    const testLogger = createServiceLogger('TEST');
    if (
      typeof testLogger.info !== 'function' ||
      typeof testLogger.warn !== 'function' ||
      typeof testLogger.error !== 'function'
    ) {
      results.errors.push('createServiceLogger no genera loggers válidos');
      results.isValid = false;
    }
  } catch (error) {
    results.errors.push(`Error al crear logger de prueba: ${error.message}`);
    results.isValid = false;
  }

  // Validar variables de entorno
  const requiredEnvVars = ['NODE_ENV'];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    results.errors.push(
      `Variables de entorno faltantes: ${missingEnvVars.join(', ')}`,
    );
    results.isValid = false;
  }

  // Verificar coherencia de configuración
  if (DEBUG_MODE && !ENV_CONFIG.FEATURES.CONSOLE_LOGGING) {
    results.warnings.push(
      'DEBUG_MODE está activo pero CONSOLE_LOGGING está deshabilitado',
    );
  }

  return results;
};

/**
 * Ejecuta la validación del logger y muestra resultados
 */
export const runLoggerValidation = () => {
  console.log('🔍 Validando configuración del logger...\n');

  const validation = validateLoggerConfig();

  // Mostrar resumen
  console.log('📊 Configuración actual:');
  console.log(`   • Entorno: ${validation.summary.environment}`);
  console.log(`   • DEBUG_MODE: ${validation.summary.debugMode}`);
  console.log(
    `   • Console Logging: ${validation.summary.consoleLoggingEnabled}`,
  );
  console.log('');

  // Mostrar errores
  if (validation.errors.length > 0) {
    console.log('❌ Errores encontrados:');
    validation.errors.forEach((error) => console.log(`   • ${error}`));
    console.log('');
  }

  // Mostrar advertencias
  if (validation.warnings.length > 0) {
    console.log('⚠️  Advertencias:');
    validation.warnings.forEach((warning) => console.log(`   • ${warning}`));
    console.log('');
  }

  // Resultado final
  if (validation.isValid) {
    console.log('✅ Configuración del logger: VÁLIDA');
  } else {
    console.log('❌ Configuración del logger: INVÁLIDA');
  }

  return validation;
};

export default {
  validateLoggerConfig,
  runLoggerValidation,
};
