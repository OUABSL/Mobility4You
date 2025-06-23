// Test file to verify ReservaClienteExito component fixes
// This simulates the actual data structure that comes from the reservation flow

import { testingReservationData } from '../assets/testingData/testingData.js';

// Function to test data extraction
function testDataExtraction() {
  console.log('=== TESTING RESERVATION SUCCESS PAGE DATA EXTRACTION ===');

  // Test dates
  const pickupDate = new Date(testingReservationData.fechas.pickupDate);
  const dropoffDate = new Date(testingReservationData.fechas.dropoffDate);

  console.log(
    'Pickup Date:',
    pickupDate.toLocaleDateString('es-ES') +
      ` a las ${testingReservationData.fechas.pickupTime}`,
  );
  console.log(
    'Dropoff Date:',
    dropoffDate.toLocaleDateString('es-ES') +
      ` a las ${testingReservationData.fechas.dropoffTime}`,
  );

  // Test locations
  console.log(
    'Pickup Location:',
    testingReservationData.fechas.pickupLocation.nombre,
  );
  console.log(
    'Dropoff Location:',
    testingReservationData.fechas.dropoffLocation.nombre,
  );

  // Test conductor info
  const conductor = testingReservationData.conductor;
  console.log(
    'Conductor:',
    `${conductor.nombre} ${conductor.apellido} (${conductor.email})`,
  );

  // Test extras
  console.log('Extras:');
  testingReservationData.extras.forEach((extra, idx) => {
    console.log(
      `  - ${extra.nombre} (${extra.precio.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })})`,
    );
  });

  // Test total price
  console.log(
    'Total:',
    testingReservationData.detallesReserva.precioTotal.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }),
  );

  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
}

// Store test data in sessionStorage to simulate the reservation flow
function setupTestData() {
  sessionStorage.setItem(
    'reservaCompletada',
    JSON.stringify(testingReservationData),
  );
  console.log('Test data stored in sessionStorage');
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testingReservationData = testingReservationData;
  window.testDataExtraction = testDataExtraction;
  window.setupTestData = setupTestData;
  console.log('Reservation test data loaded from centralized testingData.js');
}

export { setupTestData, testDataExtraction, testReservationData };
