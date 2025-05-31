/**
 * Script de prueba integral para verificar el flujo de reserva
 * Este script debe ejecutarse en la consola del navegador paso a paso
 */

// === CONFIGURACIÓN DE PRUEBA ===
const testConfig = {
  // Simular que venimos desde selección de coche
  mockCarData: {
    car: {
      id: 1,
      marca: 'Toyota',
      modelo: 'Corolla',
      matricula: 'ABC1234',
      imagenPrincipal: 'https://via.placeholder.com/300x200?text=Toyota+Corolla',
      precio_base: 100
    },
    paymentOption: {
      id: 'all-inclusive',
      nombre: 'All Inclusive',
      descripcion: 'Incluye todo lo necesario'
    },
    fechas: {
      pickupLocation: 'Aeropuerto de Málaga',
      pickupDate: new Date(),
      pickupTime: '12:00',
      dropoffLocation: 'Aeropuerto de Málaga', 
      dropoffDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      dropoffTime: '12:00'
    },
    detallesReserva: {
      precioBase: 100,
      iva: 21,
      total: 121
    }
  },
  
  mockExtras: [1, 2], // IDs de extras seleccionados
  
  mockConductorData: {
    nombre: 'Juan',
    apellidos: 'Pérez García',
    email: 'juan.perez@test.com',
    telefono: '123456789',
    fechaNacimiento: '1990-01-01',
    nacionalidad: 'Española',
    tipoDocumento: 'dni',
    numeroDocumento: '12345678A',
    calle: 'Calle Principal 123',
    ciudad: 'Madrid',
    provincia: 'Madrid',
    pais: 'España',
    codigoPostal: '28001',
    tieneSegundoConductor: false,
    metodoPago: 'tarjeta',
    aceptaTerminos: true
  }
};

// === FUNCIONES DE UTILIDAD ===
const log = (step, message, data = null) => {
  console.log(`🔄 [STEP ${step}] ${message}`);
  if (data) console.log('   📋 Data:', data);
};

const logSuccess = (step, message) => {
  console.log(`✅ [STEP ${step}] ${message}`);
};

const logError = (step, message, error = null) => {
  console.error(`❌ [STEP ${step}] ${message}`);
  if (error) console.error('   🚨 Error:', error);
};

// === FUNCIONES DE PRUEBA ===

/**
 * Paso 1: Simular navegación desde selección de coche
 */
const step1_SimulateCarSelection = () => {
  log(1, 'Simulando selección de coche...');
  
  try {
    // Limpiar storage previo
    sessionStorage.clear();
    
    // Simular datos que vienen desde FichaCoche
    sessionStorage.setItem('reservaData', JSON.stringify(testConfig.mockCarData));
    
    logSuccess(1, 'Datos de coche simulados correctamente');
    
    // Simular navegación a extras
    if (window.location.pathname !== '/reservation-confirmation') {
      console.log('💡 Para continuar, navega a: /reservation-confirmation');
    }
    
    return true;
  } catch (error) {
    logError(1, 'Error simulando selección de coche', error);
    return false;
  }
};

/**
 * Paso 2: Verificar carga de datos en página de extras
 */
const step2_VerifyExtrasPage = async () => {
  log(2, 'Verificando carga de datos en página de extras...');
  
  try {
    // Verificar que ReservationStorageService esté disponible
    if (typeof window.getReservationStorageService === 'function') {
      const storageService = window.getReservationStorageService();
        // Verificar datos cargados
      const completeData = await storageService.getCompleteReservationData();
      log(2, 'Datos completos cargados:', completeData);
      
      // Verificar reserva activa
      const isActive = storageService.hasActiveReservation();
      log(2, 'Reserva activa:', isActive);
      
      if (completeData && isActive) {
        logSuccess(2, 'Página de extras cargó correctamente');
        return true;
      } else {
        logError(2, 'Datos incompletos o reserva no activa');
        return false;
      }
    } else {
      logError(2, 'ReservationStorageService no disponible');
      return false;
    }
  } catch (error) {
    logError(2, 'Error verificando página de extras', error);
    return false;
  }
};

/**
 * Paso 3: Simular selección de extras
 */
const step3_SimulateExtrasSelection = () => {
  log(3, 'Simulando selección de extras...');
  
  try {
    if (typeof window.getReservationStorageService === 'function') {
      const storageService = window.getReservationStorageService();
      
      // Actualizar extras
      const result = storageService.updateExtras(testConfig.mockExtras);
      log(3, 'Resultado actualización extras:', result);
      
      // Verificar que se guardaron
      const extras = storageService.getExtras();
      log(3, 'Extras guardados:', extras);
      
      logSuccess(3, 'Extras seleccionados correctamente');
      
      // Simular navegación a datos conductor
      console.log('💡 Para continuar, navega a: /reservation-confirmation/datos');
      
      return true;
    } else {
      logError(3, 'ReservationStorageService no disponible');
      return false;
    }
  } catch (error) {
    logError(3, 'Error simulando selección de extras', error);
    return false;
  }
};

/**
 * Paso 4: Verificar carga de datos en página de conductor
 */
const step4_VerifyConductorPage = async () => {
  log(4, 'Verificando carga de datos en página de conductor...');
  
  try {
    if (typeof window.getReservationStorageService === 'function') {
      const storageService = window.getReservationStorageService();
        // Verificar datos completos
      const completeData = await storageService.getCompleteReservationData();
      log(4, 'Datos completos en página conductor:', completeData);
      
      // Verificar reserva activa
      const isActive = storageService.hasActiveReservation();
      log(4, 'Reserva activa en conductor:', isActive);
      
      // Verificar paso actual
      const currentStep = storageService.getCurrentStep();
      log(4, 'Paso actual:', currentStep);
      
      if (completeData && isActive) {
        logSuccess(4, 'Página de conductor cargó correctamente');
        return true;
      } else {
        logError(4, 'Datos perdidos al navegar a conductor');
        return false;
      }
    } else {
      logError(4, 'ReservationStorageService no disponible');
      return false;
    }
  } catch (error) {
    logError(4, 'Error verificando página de conductor', error);
    return false;
  }
};

/**
 * Paso 5: Simular entrada de datos del conductor
 */
const step5_SimulateConductorData = async () => {
  log(5, 'Simulando entrada de datos del conductor...');
  
  try {
    if (typeof window.getReservationStorageService === 'function') {
      const storageService = window.getReservationStorageService();
      
      // Actualizar datos del conductor
      const result = storageService.updateConductorData(testConfig.mockConductorData);
      log(5, 'Resultado actualización conductor:', result);
      
      // Verificar que se guardaron
      const conductor = storageService.getConductorData();
      log(5, 'Datos conductor guardados:', conductor);
        // Verificar datos completos finales
      const completeData = await storageService.getCompleteReservationData();
      log(5, 'Datos completos finales:', completeData);
      
      logSuccess(5, 'Datos del conductor guardados correctamente');
      
      return true;
    } else {
      logError(5, 'ReservationStorageService no disponible');
      return false;
    }
  } catch (error) {
    logError(5, 'Error simulando datos del conductor', error);
    return false;
  }
};

/**
 * Ejecutar toda la prueba automáticamente
 */
const runFullTest = () => {
  console.log('🚀 INICIANDO PRUEBA COMPLETA DEL FLUJO DE RESERVA');
  console.log('================================================');
  
  const results = {
    step1: step1_SimulateCarSelection(),
    step2: false, // Se ejecutará manualmente en cada página
    step3: false, // Se ejecutará manualmente en cada página  
    step4: false, // Se ejecutará manualmente en cada página
    step5: false  // Se ejecutará manualmente en cada página
  };
  
  console.log('📊 RESULTADO INICIAL:');
  console.log(results);
  
  console.log('\n📋 INSTRUCCIONES:');
  console.log('1. Navega a /reservation-confirmation');
  console.log('2. Ejecuta: step2_VerifyExtrasPage()');
  console.log('3. Ejecuta: step3_SimulateExtrasSelection()');
  console.log('4. Navega a /reservation-confirmation/datos');
  console.log('5. Ejecuta: step4_VerifyConductorPage()');
  console.log('6. Ejecuta: step5_SimulateConductorData()');
  
  return results;
};

/**
 * Función de limpieza
 */
const cleanup = () => {
  console.log('🧹 Limpiando datos de prueba...');
  try {
    if (typeof window.getReservationStorageService === 'function') {
      const storageService = window.getReservationStorageService();
      storageService.clearAllReservationData();
    }
    sessionStorage.clear();
    console.log('✅ Limpieza completada');
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
  }
};

// === EXPORTAR FUNCIONES GLOBALMENTE ===
window.testReservationFlow = {
  runFullTest,
  step1_SimulateCarSelection,
  step2_VerifyExtrasPage,
  step3_SimulateExtrasSelection,
  step4_VerifyConductorPage,
  step5_SimulateConductorData,
  cleanup,
  testConfig
};

// === MENSAJE INICIAL ===
console.log('🔧 Script de prueba cargado!');
console.log('📋 Funciones disponibles en window.testReservationFlow:');
console.log('   - runFullTest(): Ejecuta prueba inicial');
console.log('   - step2_VerifyExtrasPage(): Verifica página extras');
console.log('   - step3_SimulateExtrasSelection(): Simula selección extras');
console.log('   - step4_VerifyConductorPage(): Verifica página conductor');
console.log('   - step5_SimulateConductorData(): Simula datos conductor');
console.log('   - cleanup(): Limpia datos de prueba');
console.log('');
console.log('🚀 Para empezar, ejecuta: testReservationFlow.runFullTest()');
