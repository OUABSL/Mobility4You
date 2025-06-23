# Payment Policy String-to-ID Mapping Fix

## Problem Description
The application was experiencing critical validation errors where `politica_pago_id: null` was being sent to the backend. This occurred because:

1. **FichaCoche Component** sends payment policy strings like `'all-inclusive'` and `'economy'`
2. **Backend Validation** expects numeric IDs (1, 2, 3, etc.)
3. **Data Mapping** was missing the conversion logic between string identifiers and numeric IDs

## Root Cause Analysis
- **Frontend (FichaCoche)**: Uses string identifiers for payment options
  - `'all-inclusive'` → All Inclusive policy
  - `'economy'` → Economy policy
  
- **Testing Data**: Defines numeric IDs with policy details
  - ID `1`: 'All Inclusive' 
  - ID `2`: 'Economy'
  - ID `3`: 'Premium'
  
- **Backend**: Requires `politica_pago_id` as a required numeric field
- **Mapping Function**: Was only handling object.id format, not string conversion

## Solution Implemented

### 1. Created Payment Option Mapping Function
```javascript
const mapPaymentOptionToId = (paymentOption) => {
  // Handle numeric IDs
  if (typeof paymentOption === 'number') {
    return paymentOption;
  }
  
  // Map string identifiers to numeric IDs
  if (typeof paymentOption === 'string') {
    const mappings = {
      'all-inclusive': 1,    // All Inclusive
      'economy': 2,          // Economy  
      'premium': 3           // Premium
    };
    
    const lowercaseOption = paymentOption.toLowerCase().trim();
    const mappedId = mappings[lowercaseOption];
    
    if (DEBUG_MODE && !mappedId) {
      console.warn(`[mapPaymentOptionToId] Unknown payment option: "${paymentOption}"`);
    }
    
    return mappedId || null;
  }
  
  return null;
};
```

### 2. Enhanced Payment Policy Resolution Logic
```javascript
// Map payment option to numeric ID with enhanced fallback logic
let politicaPagoId = null;

// Try different sources for payment policy data
if (data.politicaPago?.id) {
  // Object with id property
  politicaPagoId = data.politicaPago.id;
} else if (data.politica_pago_id) {
  // Direct ID field
  politicaPagoId = data.politica_pago_id;
} else if (data.politica_pago) {
  // Could be string or number
  politicaPagoId = mapPaymentOptionToId(data.politica_pago);
} else if (data.paymentOption) {
  // From FichaCoche component
  politicaPagoId = mapPaymentOptionToId(data.paymentOption);
}
```

### 3. Updated mapReservationDataToBackend Function
- **Enhanced fallback logic** to handle multiple data source formats
- **String-to-ID conversion** for payment options from FichaCoche
- **Improved debug logging** to track payment policy resolution
- **Backwards compatibility** with existing object-based payment policy data

## Files Modified
1. `frontend/src/services/reservationServices.js`
   - Added `mapPaymentOptionToId()` helper function
   - Enhanced payment policy resolution in `mapReservationDataToBackend()`
   - Improved debug logging for payment policy mapping
   - Added error handling for unknown payment options

## Data Flow Fix
**Before (Broken):**
```
FichaCoche → 'all-inclusive' → mapReservationDataToBackend → politica_pago_id: null → Backend Error
```

**After (Fixed):**
```
FichaCoche → 'all-inclusive' → mapPaymentOptionToId → 1 → mapReservationDataToBackend → politica_pago_id: 1 → Backend Success
```

## Testing Strategy
1. **String Mapping Test**: `'all-inclusive'` → `1`
2. **Alternative String Test**: `'economy'` → `2`
3. **Future Extensibility Test**: `'premium'` → `3`
4. **Multiple Data Sources**: Test various input formats
5. **Edge Case Handling**: Unknown strings, null values, etc.

## Benefits
- ✅ **Fixes Critical Bug**: Resolves `politica_pago_id: null` validation errors
- ✅ **Maintains Compatibility**: Works with existing object-based data formats
- ✅ **Future-Proof**: Handles premium option and extensible to new payment types
- ✅ **Enhanced Debugging**: Better logging for payment policy resolution
- ✅ **Error Handling**: Graceful handling of unknown payment options
- ✅ **Clean Code**: Centralized mapping logic with clear documentation

## Validation Required
1. Test reservation creation with FichaCoche payment options
2. Verify backend receives correct numeric `politica_pago_id` values
3. Ensure existing reservation flows remain unaffected
4. Test debug logging provides clear information about payment policy resolution

## Related Work
This fix complements previous payment data flow improvements documented in `PAYMENT_DATA_FLOW_FIXES_SUMMARY.md`, completing the end-to-end payment data mapping pipeline.
