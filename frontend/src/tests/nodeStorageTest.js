// Node.js compatible storage service test
// Mock localStorage for Node.js environment
global.localStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

// Mock console methods for testing
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let testResults = [];

function mockConsole() {
    console.log = (...args) => {
        testResults.push({ type: 'log', message: args.join(' ') });
        originalLog(...args);
    };
    console.warn = (...args) => {
        testResults.push({ type: 'warn', message: args.join(' ') });
        originalWarn(...args);
    };
    console.error = (...args) => {
        testResults.push({ type: 'error', message: args.join(' ') });
        originalError(...args);
    };
}

function restoreConsole() {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
}

// Simple test function
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✓ ${message}`);
}

// Import the storage service (simplified version)
const reservationStorageService = {
    STORAGE_KEYS: {
        ACTIVE_RESERVATION: 'activeReservation',
        TIMER_DATA: 'reservationTimer',
        CONDUCTOR_DATA: 'conductorData',
        EXTRAS_DATA: 'extrasData'
    },

    initializeReservation(data) {
        try {
            console.log('🔄 Inicializando nueva reserva...');
            const reservationData = {
                ...data,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                step: 'vehiculo',
                status: 'active'
            };
            
            localStorage.setItem(this.STORAGE_KEYS.ACTIVE_RESERVATION, JSON.stringify(reservationData));
            
            // Initialize timer
            const timerData = {
                startTime: Date.now(),
                duration: 15 * 60 * 1000, // 15 minutes
                isActive: true
            };
            localStorage.setItem(this.STORAGE_KEYS.TIMER_DATA, JSON.stringify(timerData));
            
            console.log('✅ Reserva inicializada correctamente');
            return reservationData;
        } catch (error) {
            console.error('❌ Error al inicializar reserva:', error);
            throw error;
        }
    },

    hasActiveReservation() {
        try {
            const reservation = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_RESERVATION);
            return !!reservation;
        } catch (error) {
            console.error('❌ Error checking active reservation:', error);
            return false;
        }
    },

    getActiveReservation() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.ACTIVE_RESERVATION);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('❌ Error getting active reservation:', error);
            return null;
        }
    },

    updateExtras(extrasData) {
        try {
            console.log('🔄 Actualizando extras...');
            
            if (!this.hasActiveReservation()) {
                throw new Error('No hay reserva activa para actualizar extras');
            }

            const reservation = this.getActiveReservation();
            reservation.extras = extrasData;
            reservation.step = 'extras';
            
            localStorage.setItem(this.STORAGE_KEYS.ACTIVE_RESERVATION, JSON.stringify(reservation));
            localStorage.setItem(this.STORAGE_KEYS.EXTRAS_DATA, JSON.stringify(extrasData));
            
            console.log('✅ Extras actualizados correctamente');
            return reservation;
        } catch (error) {
            console.error('❌ Error al actualizar extras:', error);
            throw error;
        }
    },

    updateConductorData(conductorData) {
        try {
            console.log('🔄 Actualizando datos del conductor...');
            
            if (!this.hasActiveReservation()) {
                throw new Error('No hay reserva activa para actualizar conductor');
            }

            const reservation = this.getActiveReservation();
            reservation.conductor = conductorData;
            reservation.step = 'conductor';
            
            localStorage.setItem(this.STORAGE_KEYS.ACTIVE_RESERVATION, JSON.stringify(reservation));
            localStorage.setItem(this.STORAGE_KEYS.CONDUCTOR_DATA, JSON.stringify(conductorData));
            
            console.log('✅ Datos del conductor actualizados correctamente');
            return reservation;
        } catch (error) {
            console.error('❌ Error al actualizar conductor:', error);
            throw error;
        }
    },

    clearReservation() {
        try {
            console.log('🔄 Limpiando reserva...');
            localStorage.removeItem(this.STORAGE_KEYS.ACTIVE_RESERVATION);
            localStorage.removeItem(this.STORAGE_KEYS.TIMER_DATA);
            localStorage.removeItem(this.STORAGE_KEYS.CONDUCTOR_DATA);
            localStorage.removeItem(this.STORAGE_KEYS.EXTRAS_DATA);
            console.log('✅ Reserva limpiada correctamente');
        } catch (error) {
            console.error('❌ Error al limpiar reserva:', error);
            throw error;
        }
    }
};

// Test functions
function testBasicOperations() {
    console.log('\n🧪 Testing Basic Operations...');
    
    // Clear storage first
    localStorage.clear();
    
    // Test 1: Initialize reservation
    const vehicleData = {
        vehiculo_id: 1,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-02',
        precio_total: 100
    };
    
    const reservation = reservationStorageService.initializeReservation(vehicleData);
    assert(reservation.id, 'Reservation should have an ID');
    assert(reservation.vehiculo_id === 1, 'Vehicle ID should be preserved');
    
    // Test 2: Check active reservation
    assert(reservationStorageService.hasActiveReservation(), 'Should have active reservation');
    
    // Test 3: Get active reservation
    const retrieved = reservationStorageService.getActiveReservation();
    assert(retrieved.id === reservation.id, 'Retrieved reservation should match');
    
    console.log('✅ Basic operations tests passed!');
}

function testExtrasFlow() {
    console.log('\n🧪 Testing Extras Flow...');
    
    // Initialize a reservation first
    const vehicleData = {
        vehiculo_id: 1,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-02'
    };
    
    reservationStorageService.initializeReservation(vehicleData);
    
    // Test extras update
    const extrasData = [
        { id: 1, nombre: 'GPS', precio: 10, cantidad: 1 },
        { id: 2, nombre: 'Seguro', precio: 20, cantidad: 1 }
    ];
    
    const updatedReservation = reservationStorageService.updateExtras(extrasData);
    assert(updatedReservation.extras.length === 2, 'Should have 2 extras');
    assert(updatedReservation.step === 'extras', 'Step should be updated to extras');
    
    console.log('✅ Extras flow tests passed!');
}

function testConductorFlow() {
    console.log('\n🧪 Testing Conductor Flow...');
    
    // Initialize a reservation first
    const vehicleData = {
        vehiculo_id: 1,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-02'
    };
    
    reservationStorageService.initializeReservation(vehicleData);
    
    // Test conductor update
    const conductorData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '123456789'
    };
    
    const updatedReservation = reservationStorageService.updateConductorData(conductorData);
    assert(updatedReservation.conductor.nombre === 'Juan Pérez', 'Conductor name should be preserved');
    assert(updatedReservation.step === 'conductor', 'Step should be updated to conductor');
    
    console.log('✅ Conductor flow tests passed!');
}

function testErrorHandling() {
    console.log('\n🧪 Testing Error Handling...');
    
    // Clear storage
    reservationStorageService.clearReservation();
    
    // Test updating extras without active reservation
    try {
        reservationStorageService.updateExtras([]);
        assert(false, 'Should throw error when no active reservation');
    } catch (error) {
        assert(error.message.includes('No hay reserva activa'), 'Should throw appropriate error message');
    }
    
    // Test updating conductor without active reservation
    try {
        reservationStorageService.updateConductorData({});
        assert(false, 'Should throw error when no active reservation');
    } catch (error) {
        assert(error.message.includes('No hay reserva activa'), 'Should throw appropriate error message');
    }
    
    console.log('✅ Error handling tests passed!');
}

function testCompleteFlow() {
    console.log('\n🧪 Testing Complete Reservation Flow...');
    
    // Clear storage
    localStorage.clear();
    
    // Step 1: Initialize reservation
    const vehicleData = {
        vehiculo_id: 1,
        fecha_inicio: '2024-01-01',
        fecha_fin: '2024-01-02',
        precio_total: 100
    };
    
    const reservation = reservationStorageService.initializeReservation(vehicleData);
    console.log('Step 1: Vehicle selected');
    
    // Step 2: Add extras
    const extrasData = [
        { id: 1, nombre: 'GPS', precio: 10, cantidad: 1 }
    ];
    
    reservationStorageService.updateExtras(extrasData);
    console.log('Step 2: Extras added');
    
    // Step 3: Add conductor
    const conductorData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '123456789'
    };
    
    const finalReservation = reservationStorageService.updateConductorData(conductorData);
    
    // Verify complete data
    assert(finalReservation.vehiculo_id === 1, 'Vehicle data preserved');
    assert(finalReservation.extras.length === 1, 'Extras data preserved');
    assert(finalReservation.conductor.nombre === 'Juan Pérez', 'Conductor data preserved');
    
    console.log('✅ Complete flow test passed!');
    
    // Clean up
    reservationStorageService.clearReservation();
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting Storage Service Tests...\n');
    
    mockConsole();
    
    try {
        testBasicOperations();
        testExtrasFlow();
        testConductorFlow();
        testErrorHandling();
        testCompleteFlow();
        
        console.log('\n🎉 All tests passed successfully!');
        
        // Show summary
        const logs = testResults.filter(r => r.type === 'log').length;
        const warnings = testResults.filter(r => r.type === 'warn').length;
        const errors = testResults.filter(r => r.type === 'error').length;
        
        console.log(`\n📊 Test Summary:`);
        console.log(`   - Log messages: ${logs}`);
        console.log(`   - Warnings: ${warnings}`);
        console.log(`   - Errors: ${errors}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        restoreConsole();
    }
}

// Run the tests
runAllTests();
