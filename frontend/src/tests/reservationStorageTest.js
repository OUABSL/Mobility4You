// Test para verificar el flujo de datos del storage service
// Este archivo se puede ejecutar en la consola del navegador para probar el flujo

import { testingSimpleReservationData } from '../assets/testingData/testingData.js';

const testReservationStorageFlow = async () => {
  console.log('=== INICIANDO PRUEBA DE RESERVA STORAGE ===');

  // 1. Simular datos de reserva inicial
  const mockReservaData = testingSimpleReservationData;

  // 2. Simular datos de extras
  const mockExtras = [
    { id: 1, nombre: 'GPS', precio: 5 },
    { id: 2, nombre: 'Asiento bebé', precio: 8 },
  ];

  // 3. Simular datos del conductor
  const mockConductorData = {
    nombre: 'Juan',
    apellidos: 'Pérez García',
    email: 'juan.perez@example.com',
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
    aceptaTerminos: true,
  };

  try {
    // Importar el servicio (esto funcionará solo si estamos en el contexto de la app)
    const { getReservationStorageService } =
      window.ReservationStorageService || {};

    if (!getReservationStorageService) {
      console.error('❌ Servicio de storage no disponible');
      return false;
    }

    const storageService = getReservationStorageService();

    console.log('📝 Paso 1: Guardando datos iniciales de reserva...');
    const saveResult = storageService.saveReservationData(mockReservaData);
    console.log('✅ Datos iniciales guardados:', saveResult);

    console.log('📝 Paso 2: Verificando reserva activa...');
    const isActive = storageService.hasActiveReservation();
    console.log('✅ Reserva activa:', isActive);

    console.log('📝 Paso 3: Actualizando extras...');
    const extrasResult = storageService.updateExtras(mockExtras);
    console.log('✅ Extras actualizados:', extrasResult);

    console.log('📝 Paso 4: Actualizando datos del conductor...');
    const conductorResult =
      storageService.updateConductorData(mockConductorData);
    console.log('✅ Conductor actualizado:', conductorResult);

    console.log('📝 Paso 5: Obteniendo datos completos...');
    const completeData = await storageService.getCompleteReservationData();
    console.log('✅ Datos completos:', completeData);

    console.log('🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
    return true;
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
    return false;
  }
};

// Función para limpiar datos de prueba
const cleanupTestData = () => {
  console.log('🧹 Limpiando datos de prueba...');
  try {
    const { getReservationStorageService } =
      window.ReservationStorageService || {};
    if (getReservationStorageService) {
      const storageService = getReservationStorageService();
      storageService.clearAllReservationData();
      console.log('✅ Datos limpiados');
    }
  } catch (error) {
    console.error('❌ Error al limpiar:', error);
  }
};

// Export para uso directo
if (typeof window !== 'undefined') {
  window.testReservationStorageFlow = testReservationStorageFlow;
  window.cleanupTestData = cleanupTestData;
  console.log(
    'Storage test loaded - usando datos centralizados de testingData.js',
  );
  console.log('📋 Funciones de prueba disponibles:');
  console.log('- testReservationStorageFlow(): Ejecuta la prueba completa');
  console.log('- cleanupTestData(): Limpia los datos de prueba');
}
