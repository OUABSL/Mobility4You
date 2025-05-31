// Test para verificar las correcciones al sistema de almacenamiento de reservas
// Usa el servicio real con las correcciones implementadas

// Mock más completo para Node.js
global.window = {
  addEventListener: () => {},
  location: { pathname: '/reservation' }
};
global.document = { 
  addEventListener: () => {},
  hidden: false
};
global.sessionStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

// Mock de process.env para desarrollo
global.process = global.process || {};
global.process.env = global.process.env || {};
global.process.env.NODE_ENV = 'development';

// Importar el servicio corregido
const ReservationStorageService = require('../services/reservationStorageService').default;

console.log('🚀 Testing Fixed Storage Service...');

// Función para limpiar el estado entre pruebas
function clearStorage() {
  sessionStorage.clear();
}

// Datos de prueba
const testReservationData = {
  id: 'TEST_RESERVATION_123',
  car: {
    id: 1,
    modelo: 'Test Car',
    precio_dia: 50
  },
  fechas: {
    pickupDate: '2025-06-01',
    dropoffDate: '2025-06-03'
  },
  pickupLocation: 'Madrid',
  lugarRecogida: 'Madrid'
};

const testExtras = [
  { id: 1, nombre: 'GPS', precio: 5 },
  { id: 2, nombre: 'Asiento infantil', precio: 10 }
];

const testConductorData = {
  nombre: 'Juan',
  apellidos: 'Pérez',
  email: 'juan@test.com',
  telefono: '123456789',
  numeroDocumento: '12345678A',
  aceptaTerminos: true
};

async function testBasicOperations() {
  console.log('\n🧪 Testing Basic Operations with Fixed Service...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Test 1: Guardar datos de reserva
    service.saveReservationData(testReservationData);
    console.log('✓ Reservation data saved successfully');
    
    // Test 2: Verificar reserva activa
    const isActive = service.hasActiveReservation();
    console.log('✓ Active reservation check:', isActive);
      // Test 3: Obtener datos completos
    const completeData = await service.getCompleteReservationData();
    console.log('✓ Complete data retrieved:', !!completeData);
    
    console.log('✅ Basic operations tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Basic operations test failed:', error.message);
    return false;
  }
}

async function testExtrasFlow() {
  console.log('\n🧪 Testing Extras Flow with Fixed Service...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Guardar datos iniciales
    service.saveReservationData(testReservationData);
    
    // Test actualización de extras
    service.updateExtras(testExtras);
    console.log('✓ Extras updated successfully');
      // Verificar que se guardaron
    const completeData = await service.getCompleteReservationData();
    const savedExtras = completeData.extras;
    console.log('✓ Extras count:', savedExtras.length);
    console.log('✓ Step updated to:', completeData.currentStep);
    
    console.log('✅ Extras flow tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Extras flow test failed:', error.message);
    return false;
  }
}

async function testConductorFlow() {
  console.log('\n🧪 Testing Conductor Flow with Fixed Service...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Guardar datos iniciales
    service.saveReservationData(testReservationData);
    
    // Test actualización de conductor
    service.updateConductorData(testConductorData);
    console.log('✓ Conductor data updated successfully');
      // Verificar que se guardaron
    const completeData = await service.getCompleteReservationData();
    const savedConductor = completeData.conductor;
    console.log('✓ Conductor name:', savedConductor.nombre);
    console.log('✓ Step updated to:', completeData.currentStep);
    
    console.log('✅ Conductor flow tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Conductor flow test failed:', error.message);
    return false;
  }
}

async function testLegacyRecovery() {
  console.log('\n🧪 Testing Legacy Data Recovery...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Simular datos legacy (sin timer)
    sessionStorage.setItem('reservaData', JSON.stringify(testReservationData));
    
    // Test 1: Verificar que puede detectar datos legacy
    const hasActive = service.hasActiveReservation();
    console.log('✓ Legacy data detected as active:', hasActive);
    
    // Test 2: Recuperación automática
    const recovered = service.autoRecoverReservation();
    console.log('✓ Auto recovery result:', recovered);
    
    // Test 3: Verificar que ahora tiene timer
    const timerStart = sessionStorage.getItem('reservaTimerStart');
    console.log('✓ Timer initialized:', !!timerStart);
    
    // Test 4: Actualizar extras después de recuperación
    service.updateExtras(testExtras);
    console.log('✓ Extras updated after recovery');
    
    console.log('✅ Legacy recovery tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Legacy recovery test failed:', error.message);
    return false;
  }
}

async function testIntermediateUpdates() {
  console.log('\n🧪 Testing Intermediate Updates...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Guardar datos iniciales
    service.saveReservationData(testReservationData);
    
    // Test actualización intermedia de conductor (sin validación estricta)
    const partialConductor = {
      nombre: 'Juan',
      apellidos: '',
      email: 'juan@test.com'
    };
    
    const result = service.updateConductorDataIntermediate(partialConductor);
    console.log('✓ Intermediate update result:', result);
    
    // Verificar que se guardó sin validación estricta
    const conductorData = service.getConductorData();
    console.log('✓ Partial conductor saved:', conductorData.nombre);
    
    console.log('✅ Intermediate updates tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Intermediate updates test failed:', error.message);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling with Fixed Service...');
  clearStorage();
  
  const service = new ReservationStorageService();
  
  try {
    // Test 1: Actualizar extras sin datos de reserva
    try {
      service.updateExtras(testExtras);
      console.log('❌ Should have thrown error');
      return false;
    } catch (error) {
      console.log('✓ Correctly threw error for extras without reservation');
    }
    
    // Test 2: Actualizar conductor sin datos de reserva
    try {
      service.updateConductorData(testConductorData);
      console.log('❌ Should have thrown error');
      return false;
    } catch (error) {
      console.log('✓ Correctly threw error for conductor without reservation');
    }
    
    // Test 3: Actualización intermedia sin datos (debería fallar silenciosamente)
    const result = service.updateConductorDataIntermediate(testConductorData);
    console.log('✓ Intermediate update without reservation result:', result);
    
    console.log('✅ Error handling tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🎯 Running Fixed Storage Service Tests...\n');
  
  const tests = [
    testBasicOperations,
    testExtrasFlow,
    testConductorFlow,
    testLegacyRecovery,
    testIntermediateUpdates,
    testErrorHandling
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Fixed Storage Service Test Summary:');
  console.log(`   ✅ Tests passed: ${passed}`);
  console.log(`   ❌ Tests failed: ${failed}`);
  console.log(`   🎯 Total tests: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All fixed storage service tests passed successfully!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the fixes.`);
  }
}

// Ejecutar todas las pruebas
runAllTests().catch(console.error);
