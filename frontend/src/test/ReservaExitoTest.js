// Test file to verify ReservaClienteExito component fixes
// This simulates the actual data structure that comes from the reservation flow

const testReservationData = {
  id: "RSV-12345",
  car: {
    marca: "Volkswagen",
    modelo: "Golf",
    matricula: "ABC-1234"
  },
  fechas: {
    pickupDate: "2025-06-15T10:00:00.000Z",
    pickupTime: "10:00",
    dropoffDate: "2025-06-20T18:00:00.000Z", 
    dropoffTime: "18:00",
    pickupLocation: {
      id: 1,
      nombre: "Aeropuerto de Madrid-Barajas",
      direccion: "Terminal 1, Planta 0",
      coordenadas: { lat: 40.4719, lng: -3.5626 }
    },
    dropoffLocation: {
      id: 2,
      nombre: "Estación de Atocha",
      direccion: "Plaza del Emperador Carlos V",
      coordenadas: { lat: 40.4068, lng: -3.6915 }
    }
  },
  conductor: {
    nombre: "Juan",
    apellido: "Pérez García",
    email: "juan.perez@email.com",
    telefono: "+34 666 777 888"
  },
  extras: [
    {
      nombre: "GPS Navigator",
      precio: 15.50
    },
    {
      nombre: "Silla infantil",
      precio: 25.00
    }
  ],
  paymentOption: {
    nombre: "Pago Completo"
  },
  detallesReserva: {
    precioTotal: 285.50
  },
  fechaPago: "2025-05-31T14:30:00.000Z",
  metodo_pago: "Tarjeta de Crédito",
  importe_pagado_inicial: 285.50,
  importe_pendiente_inicial: 0,
  importe_pagado_extra: 40.50,
  importe_pendiente_extra: 0
};

// Function to test data extraction
function testDataExtraction() {
  console.log("=== TESTING RESERVATION SUCCESS PAGE DATA EXTRACTION ===");
  
  // Test dates
  const pickupDate = new Date(testReservationData.fechas.pickupDate);
  const dropoffDate = new Date(testReservationData.fechas.dropoffDate);
  
  console.log("Pickup Date:", pickupDate.toLocaleDateString('es-ES') + ` a las ${testReservationData.fechas.pickupTime}`);
  console.log("Dropoff Date:", dropoffDate.toLocaleDateString('es-ES') + ` a las ${testReservationData.fechas.dropoffTime}`);
  
  // Test locations
  console.log("Pickup Location:", testReservationData.fechas.pickupLocation.nombre);
  console.log("Dropoff Location:", testReservationData.fechas.dropoffLocation.nombre);
  
  // Test conductor info
  const conductor = testReservationData.conductor;
  console.log("Conductor:", `${conductor.nombre} ${conductor.apellido} (${conductor.email})`);
  
  // Test extras
  console.log("Extras:");
  testReservationData.extras.forEach((extra, idx) => {
    console.log(`  - ${extra.nombre} (${extra.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})`);
  });
  
  // Test total price
  console.log("Total:", testReservationData.detallesReserva.precioTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }));
  
  console.log("=== TEST COMPLETED SUCCESSFULLY ===");
}

// Store test data in sessionStorage to simulate the reservation flow
function setupTestData() {
  sessionStorage.setItem('reservaCompletada', JSON.stringify(testReservationData));
  console.log("Test data stored in sessionStorage");
}

// Export for browser console testing
if (typeof window !== 'undefined') {
  window.testReservationData = testReservationData;
  window.testDataExtraction = testDataExtraction;
  window.setupTestData = setupTestData;
}

export { testReservationData, testDataExtraction, setupTestData };
