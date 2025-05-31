/**
 * Manual test script for fetchPoliticasPago function
 * This script can be run in the browser console to test the function
 */

// Test script that can be copy-pasted into browser console
const testFetchPoliticasPago = async () => {
  console.log('🧪 Testing fetchPoliticasPago function...');
  
  try {
    // Import the function (adjust path as needed)
    const { fetchPoliticasPago } = await import('../services/reservationServices.js');
    
    console.log('✅ Function imported successfully');
    
    // Test the function
    console.log('📞 Calling fetchPoliticasPago...');
    const result = await fetchPoliticasPago();
    
    console.log('✅ Function executed successfully!');
    console.log('📋 Result:', result);
    console.log('📊 Number of policies returned:', result.length);
    
    // Validate the structure
    if (Array.isArray(result)) {
      console.log('✅ Returned an array as expected');
      
      if (result.length > 0) {
        console.log('✅ Contains policies');
        console.log('🔍 First policy structure:', result[0]);
        
        // Check if policies have required fields
        const firstPolicy = result[0];
        const requiredFields = ['id', 'titulo', 'activo'];
        const hasRequiredFields = requiredFields.every(field => field in firstPolicy);
        
        if (hasRequiredFields) {
          console.log('✅ Policies have required fields');
        } else {
          console.warn('⚠️ Some required fields missing in policies');
        }
        
        // Check if only active policies are returned
        const onlyActive = result.every(policy => policy.activo === true);
        if (onlyActive) {
          console.log('✅ All returned policies are active');
        } else {
          console.warn('⚠️ Some inactive policies found');
        }
        
      } else {
        console.warn('⚠️ No policies returned');
      }
    } else {
      console.error('❌ Result is not an array');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

// Export for use
window.testFetchPoliticasPago = testFetchPoliticasPago;

console.log('📝 Manual test script loaded. Run testFetchPoliticasPago() in the console to test.');
