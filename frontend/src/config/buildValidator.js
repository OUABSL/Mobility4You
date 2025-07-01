/**
 * 🔍 VALIDADOR DE CONFIGURACIÓN PRE-BUILD
 *
 * Script para validar la configuración antes del build de producción.
 * Verifica variables de entorno, dependencias y configuraciones críticas.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-01
 */

import { validateAppConfig } from './config/appConfig';
import { generateCSPString } from './config/securityConfig';

// ========================================
// VALIDACIONES DE ENTORNO
// ========================================

/**
 * Valida las variables de entorno requeridas
 */
function validateEnvironmentVariables() {
  const errors = [];
  const warnings = [];

  // Variables requeridas
  const requiredVars = [
    'REACT_APP_BACKEND_URL',
    'REACT_APP_API_URL',
    'REACT_APP_FRONTEND_URL',
  ];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      errors.push(`Variable de entorno requerida no encontrada: ${varName}`);
    }
  });

  // Variables recomendadas para producción
  if (process.env.NODE_ENV === 'production') {
    const recommendedVars = [
      'REACT_APP_STRIPE_ENABLED',
      'REACT_APP_ENABLE_ANALYTICS',
      'REACT_APP_ENABLE_ERROR_REPORTING',
    ];

    recommendedVars.forEach((varName) => {
      if (!process.env[varName]) {
        warnings.push(`Variable recomendada para producción: ${varName}`);
      }
    });
  }

  return { errors, warnings };
}

/**
 * Valida la configuración de URLs
 */
function validateURLConfiguration() {
  const errors = [];
  const warnings = [];

  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const apiUrl = process.env.REACT_APP_API_URL;
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL;

  // Validar formato de URLs
  const urlPattern = /^https?:\/\/.+/;

  if (backendUrl && !urlPattern.test(backendUrl)) {
    errors.push(`REACT_APP_BACKEND_URL tiene formato inválido: ${backendUrl}`);
  }

  if (apiUrl && !urlPattern.test(apiUrl)) {
    errors.push(`REACT_APP_API_URL tiene formato inválido: ${apiUrl}`);
  }

  if (frontendUrl && !urlPattern.test(frontendUrl)) {
    errors.push(
      `REACT_APP_FRONTEND_URL tiene formato inválido: ${frontendUrl}`,
    );
  }

  // Validar HTTPS en producción
  if (process.env.NODE_ENV === 'production') {
    if (backendUrl && !backendUrl.startsWith('https://')) {
      warnings.push('REACT_APP_BACKEND_URL debería usar HTTPS en producción');
    }

    if (frontendUrl && !frontendUrl.startsWith('https://')) {
      warnings.push('REACT_APP_FRONTEND_URL debería usar HTTPS en producción');
    }
  }

  return { errors, warnings };
}

/**
 * Valida la configuración de Stripe
 */
function validateStripeConfiguration() {
  const errors = [];
  const warnings = [];

  const stripeEnabled = process.env.REACT_APP_STRIPE_ENABLED === 'true';
  const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

  if (stripeEnabled && !stripeKey) {
    errors.push(
      'Stripe está habilitado pero falta REACT_APP_STRIPE_PUBLISHABLE_KEY',
    );
  }

  if (stripeKey) {
    // Validar formato de clave pública de Stripe
    const stripeKeyPattern = /^pk_(test_|live_)[a-zA-Z0-9]+$/;

    if (!stripeKeyPattern.test(stripeKey)) {
      errors.push('REACT_APP_STRIPE_PUBLISHABLE_KEY tiene formato inválido');
    }

    // Verificar tipo de clave según entorno
    if (
      process.env.NODE_ENV === 'production' &&
      stripeKey.startsWith('pk_test_')
    ) {
      warnings.push('Usando clave de Stripe de test en producción');
    }

    if (
      process.env.NODE_ENV === 'development' &&
      stripeKey.startsWith('pk_live_')
    ) {
      warnings.push('Usando clave de Stripe de producción en desarrollo');
    }
  }

  return { errors, warnings };
}

/**
 * Valida el tamaño del bundle y dependencias
 */
function validateDependencies() {
  const warnings = [];

  try {
    const packageJson = require('../package.json');

    // Verificar dependencias grandes
    const largeDependencies = [
      '@fortawesome/fontawesome-svg-core',
      '@fortawesome/free-solid-svg-icons',
      'bootstrap',
      'react-bootstrap',
    ];

    largeDependencies.forEach((dep) => {
      if (packageJson.dependencies[dep]) {
        // Esta es solo una verificación informativa
        console.log(`ℹ️ Dependencia grande detectada: ${dep}`);
      }
    });

    // Verificar versiones de React
    const reactVersion = packageJson.dependencies.react;
    if (reactVersion && !reactVersion.startsWith('^19')) {
      warnings.push(`Versión de React no óptima: ${reactVersion}`);
    }
  } catch (error) {
    warnings.push('No se pudo leer package.json para validar dependencias');
  }

  return { errors: [], warnings };
}

/**
 * Valida la configuración de seguridad
 */
function validateSecurityConfiguration() {
  const errors = [];
  const warnings = [];

  try {
    // Intentar generar CSP
    const cspString = generateCSPString();

    if (!cspString || cspString.length < 50) {
      warnings.push('Configuración de CSP parece incompleta');
    }

    // Verificar configuración HTTPS en producción
    if (process.env.NODE_ENV === 'production') {
      if (process.env.REACT_APP_SECURE_COOKIES !== 'true') {
        warnings.push(
          'REACT_APP_SECURE_COOKIES debería ser true en producción',
        );
      }

      if (process.env.REACT_APP_HTTPS_ONLY !== 'true') {
        warnings.push('REACT_APP_HTTPS_ONLY debería ser true en producción');
      }
    }
  } catch (error) {
    errors.push(`Error validando configuración de seguridad: ${error.message}`);
  }

  return { errors, warnings };
}

// ========================================
// FUNCIÓN PRINCIPAL DE VALIDACIÓN
// ========================================

/**
 * Ejecuta todas las validaciones
 */
export function validateBuildConfiguration() {
  console.log('🔍 Validando configuración para build...\n');

  const allErrors = [];
  const allWarnings = [];

  // Ejecutar validaciones individuales
  const validations = [
    { name: 'Variables de entorno', fn: validateEnvironmentVariables },
    { name: 'Configuración de URLs', fn: validateURLConfiguration },
    { name: 'Configuración de Stripe', fn: validateStripeConfiguration },
    { name: 'Dependencias', fn: validateDependencies },
    { name: 'Configuración de seguridad', fn: validateSecurityConfiguration },
  ];

  validations.forEach(({ name, fn }) => {
    try {
      const { errors, warnings } = fn();

      if (errors.length > 0) {
        console.log(`❌ ${name}:`);
        errors.forEach((error) => console.log(`   • ${error}`));
        allErrors.push(...errors);
      } else {
        console.log(`✅ ${name}: OK`);
      }

      if (warnings.length > 0) {
        console.log(`⚠️  ${name} - Advertencias:`);
        warnings.forEach((warning) => console.log(`   • ${warning}`));
        allWarnings.push(...warnings);
      }
    } catch (error) {
      console.log(`❌ Error validando ${name}: ${error.message}`);
      allErrors.push(`Error validando ${name}: ${error.message}`);
    }
  });

  // Validar configuración central de la app
  try {
    validateAppConfig();
    console.log('✅ Configuración central: OK');
  } catch (error) {
    console.log(`❌ Configuración central: ${error.message}`);
    allErrors.push(`Configuración central: ${error.message}`);
  }

  // Resumen final
  console.log('\n📊 Resumen de validación:');
  console.log(`   Errores: ${allErrors.length}`);
  console.log(`   Advertencias: ${allWarnings.length}`);

  if (allErrors.length > 0) {
    console.log('\n❌ Build no recomendado debido a errores de configuración');
    console.log('Errores encontrados:');
    allErrors.forEach((error) => console.log(`   • ${error}`));

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Errores críticos de configuración en build de producción',
      );
    }
  } else {
    console.log('\n✅ Configuración válida para build');
  }

  if (allWarnings.length > 0) {
    console.log('\n⚠️  Advertencias (no bloquean el build):');
    allWarnings.forEach((warning) => console.log(`   • ${warning}`));
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

// ========================================
// EJECUCIÓN AUTOMÁTICA
// ========================================

// Si este script se ejecuta directamente
if (require.main === module) {
  try {
    validateBuildConfiguration();
  } catch (error) {
    console.error('💥 Error fatal en validación:', error.message);
    process.exit(1);
  }
}

export default validateBuildConfiguration;
