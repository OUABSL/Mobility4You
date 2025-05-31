/**
 * Test para verificar la migración de homeServices.js a database-first approach
 * Este archivo puede ejecutarse en la consola del navegador para probar el flujo
 */

console.log('🧪 INICIANDO PRUEBA DE MIGRACIÓN HOME SERVICES');
console.log('===============================================');

// Test functions for each migrated service
const testHomeServicesMigration = async () => {
  try {
    // Dynamic import of the home services
    const homeServices = await import('../services/homeServices');
    
    console.log('📍 Testing fetchLocations...');
    try {
      const locations = await homeServices.fetchLocations();
      console.log('✅ fetchLocations success:', locations?.length, 'items');
    } catch (error) {
      console.log('⚠️ fetchLocations fallback triggered:', error.message);
    }
    
    console.log('📍 Testing fetchEstadisticas...');
    try {
      const stats = await homeServices.fetchEstadisticas();
      console.log('✅ fetchEstadisticas success:', stats?.length, 'items');
    } catch (error) {
      console.log('⚠️ fetchEstadisticas fallback triggered:', error.message);
    }
    
    console.log('📍 Testing fetchCaracteristicas...');
    try {
      const features = await homeServices.fetchCaracteristicas();
      console.log('✅ fetchCaracteristicas success:', features?.length, 'items');
    } catch (error) {
      console.log('⚠️ fetchCaracteristicas fallback triggered:', error.message);
    }
    
    console.log('📍 Testing fetchTestimonios...');
    try {
      const testimonials = await homeServices.fetchTestimonios();
      console.log('✅ fetchTestimonios success:', testimonials?.length, 'items');
    } catch (error) {
      console.log('⚠️ fetchTestimonios fallback triggered:', error.message);
    }
    
    console.log('📍 Testing fetchDestinos...');
    try {
      const destinations = await homeServices.fetchDestinos();
      console.log('✅ fetchDestinos success:', destinations?.length, 'items');
    } catch (error) {
      console.log('⚠️ fetchDestinos fallback triggered:', error.message);
    }
    
    console.log('🎉 MIGRACIÓN HOME SERVICES - PRUEBA COMPLETADA');
    console.log('===============================================');
    
  } catch (error) {
    console.error('❌ Error during migration test:', error);
  }
};

// Test location resolution in reservation services
const testLocationResolution = async () => {
  console.log('\n🧪 PRUEBA DE RESOLUCIÓN DE UBICACIONES');
  console.log('=====================================');
  
  try {
    // Test that location resolution still works
    const { getCachedLocations, findLocationIdByName } = await import('../services/reservationServices');
    
    console.log('📍 Testing getCachedLocations...');
    const locations = await getCachedLocations();
    console.log('✅ getCachedLocations success:', locations?.length, 'locations cached');
    
    if (locations && locations.length > 0) {
      const testLocationName = locations[0].nombre;
      console.log('📍 Testing findLocationIdByName with:', testLocationName);
      const locationId = await findLocationIdByName(testLocationName);
      console.log('✅ findLocationIdByName success:', locationId);
    }
    
    console.log('🎉 RESOLUCIÓN DE UBICACIONES - PRUEBA COMPLETADA');
    
  } catch (error) {
    console.error('❌ Error during location resolution test:', error);
  }
};

// Export for console usage
window.testHomeServicesMigration = testHomeServicesMigration;
window.testLocationResolution = testLocationResolution;

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('📋 Funciones de prueba disponibles:');
  console.log('• testHomeServicesMigration() - Prueba migración home services');
  console.log('• testLocationResolution() - Prueba resolución de ubicaciones');
  console.log('');
  console.log('🚀 Para ejecutar prueba completa: testHomeServicesMigration()');
}

export { testHomeServicesMigration, testLocationResolution };
