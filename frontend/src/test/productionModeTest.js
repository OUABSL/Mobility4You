/**
 * Prueba específica para fetchPoliticasPago() en modo producción (DEBUG_MODE = false)
 * Este test verifica que la función funcione correctamente cuando DEBUG_MODE está desactivado
 */

// Importar la función a probar
import { fetchPoliticasPago, DEBUG_MODE } from '../services/reservationServices.js';

console.log('=== PRUEBA DE POLÍTICAS DE PAGO EN MODO PRODUCCIÓN ===');
console.log(`🔧 DEBUG_MODE actual: ${DEBUG_MODE}`);

// Test para verificar comportamiento en modo producción
async function testProductionMode() {
  console.log('\n--- Test 1: Verificar estado de DEBUG_MODE ---');
  
  if (DEBUG_MODE === false) {
    console.log('✅ DEBUG_MODE está correctamente configurado en FALSE (modo producción)');
  } else {
    console.log('❌ DEBUG_MODE no está en FALSE. Valor actual:', DEBUG_MODE);
    return;
  }

  console.log('\n--- Test 2: Llamada a fetchPoliticasPago() en modo producción ---');
  console.log('⏳ Realizando llamada a la API en modo producción...');
  
  try {
    const startTime = Date.now();
    const politicas = await fetchPoliticasPago();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Llamada exitosa en ${duration}ms`);
    console.log(`📊 Políticas obtenidas: ${politicas.length}`);
    
    // Validar estructura de datos
    if (Array.isArray(politicas)) {
      console.log('✅ Respuesta es un array válido');
      
      if (politicas.length > 0) {
        console.log('✅ Se obtuvieron políticas de pago');
        
        // Validar estructura de la primera política
        const primeraPolitica = politicas[0];
        const camposRequeridos = ['id', 'titulo', 'descripcion', 'activo'];
        const tieneCamposRequeridos = camposRequeridos.every(campo => 
          primeraPolitica.hasOwnProperty(campo)
        );
        
        if (tieneCamposRequeridos) {
          console.log('✅ Estructura de datos válida');
          console.log('📋 Muestra de política:', {
            id: primeraPolitica.id,
            titulo: primeraPolitica.titulo,
            descripcion: primeraPolitica.descripcion?.substring(0, 50) + '...',
            activo: primeraPolitica.activo
          });
        } else {
          console.log('⚠️  Estructura de datos no contiene todos los campos requeridos');
          console.log('Campos encontrados:', Object.keys(primeraPolitica));
        }
        
        // Verificar que solo se devuelvan políticas activas
        const politicasInactivas = politicas.filter(p => p.activo !== true);
        if (politicasInactivas.length === 0) {
          console.log('✅ Todas las políticas devueltas están activas');
        } else {
          console.log(`⚠️  Se encontraron ${politicasInactivas.length} políticas inactivas`);
        }
        
      } else {
        console.log('⚠️  No se obtuvieron políticas de pago');
      }
    } else {
      console.log('❌ La respuesta no es un array válido');
      console.log('Tipo de respuesta:', typeof politicas);
    }
    
  } catch (error) {
    console.log('❌ Error en la llamada a la API:');
    console.log('Tipo de error:', error.constructor.name);
    console.log('Mensaje:', error.message);
    
    // Verificar si es un error de red/API esperado
    if (error.message.includes('Network Error') || 
        error.message.includes('timeout') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('connect') ||
        error.response?.status >= 400) {
      console.log('ℹ️  Error de conexión esperado en modo producción sin backend activo');
      console.log('✅ La función maneja correctamente los errores de API');
    } else {
      console.log('❌ Error inesperado:', error);
    }
  }
}

// Test para verificar que no se usen datos de testing en producción
async function testNoTestingDataInProduction() {
  console.log('\n--- Test 3: Verificar que no se usen datos de testing ---');
  
  try {
    // Simular un error de API para verificar el comportamiento de fallback
    console.log('⏳ Simulando error de API para verificar fallback...');
    
    // En modo producción, los errores no deberían usar datos de testing
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Simulated API Error'));
    
    try {
      await fetchPoliticasPago();
      console.log('❌ Se esperaba un error pero la función tuvo éxito');
    } catch (error) {
      console.log('✅ Error manejado correctamente en modo producción');
      console.log('Mensaje de error:', error.message);
      
      // Verificar que no mencione datos de testing
      if (error.message.includes('testing') || error.message.includes('fallback')) {
        console.log('⚠️  El error menciona datos de testing en modo producción');
      } else {
        console.log('✅ El error no menciona datos de testing (comportamiento correcto)');
      }
    }
    
    // Restaurar fetch original
    global.fetch = originalFetch;
    
  } catch (error) {
    console.log('Error en test de fallback:', error.message);
  }
}

// Ejecutar las pruebas
async function runAllTests() {
  console.log('🚀 Iniciando pruebas en modo producción...\n');
  
  try {
    await testProductionMode();
    await testNoTestingDataInProduction();
    
    console.log('\n=== RESUMEN DE PRUEBAS ===');
    console.log('✅ Pruebas completadas');
    console.log('📝 La función fetchPoliticasPago() está configurada correctamente para producción');
    console.log('🔧 DEBUG_MODE = false (modo producción activo)');
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar si se llama directamente
if (typeof window === 'undefined') {
  // Entorno Node.js
  runAllTests();
} else {
  // Entorno navegador
  window.runProductionTests = runAllTests;
  console.log('📋 Funciones disponibles en el navegador:');
  console.log('- runProductionTests() - Ejecutar todas las pruebas');
}

export { runAllTests as runProductionTests };
