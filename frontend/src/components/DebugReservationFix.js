// Debug component para verificar las correcciones del flujo de reserva
import { useState } from 'react';
import { Alert, Button, Card, Container } from 'react-bootstrap';
import { DEBUG_MODE } from '../assets/testingData/testingData';
import {
  crearReservaPrueba,
  createReservation,
  editReservation,
} from '../services/reservationServices';

const DebugReservationFix = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (test, result, details = '') => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        result,
        details,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const runTest1_DebugMode = () => {
    console.log('🧪 Test 1: Verificando DEBUG_MODE');
    const isEnabled = DEBUG_MODE === true;
    addTestResult(
      'DEBUG_MODE habilitado',
      isEnabled,
      `DEBUG_MODE = ${DEBUG_MODE}`,
    );
    return isEnabled;
  };

  const runTest2_CreateReservation = async () => {
    console.log('🧪 Test 2: Probando createReservation');

    const testData = {
      car: { id: 1, marca: 'Test', modelo: 'Vehicle' },
      fechas: {
        recogida: { fecha: '2025-06-15', hora: '10:00' },
        devolucion: { fecha: '2025-06-22', hora: '10:00' },
      },
      conductorData: {
        nombre: 'Test',
        apellido: 'User',
        email: 'test@example.com',
        telefono: '123456789',
        documento: '12345678A',
      },
    };

    try {
      const result = await createReservation(testData);
      console.log('📊 Resultado createReservation:', result);

      const success = result && result.id;
      addTestResult(
        'createReservation en DEBUG_MODE',
        success,
        success ? `ID: ${result.id}` : 'No se obtuvo ID',
      );
      return success;
    } catch (error) {
      console.error('❌ Error en createReservation:', error);
      addTestResult('createReservation en DEBUG_MODE', false, error.message);
      return false;
    }
  };

  const runTest3_EditReservation = async () => {
    console.log('🧪 Test 3: Probando editReservation');

    const testData = {
      car: { id: 2, marca: 'Updated', modelo: 'Vehicle' },
      fechas: {
        recogida: { fecha: '2025-06-16', hora: '11:00' },
        devolucion: { fecha: '2025-06-23', hora: '11:00' },
      },
      conductorData: {
        nombre: 'Updated',
        apellido: 'User',
        email: 'updated@example.com',
        telefono: '987654321',
        documento: '87654321B',
      },
    };

    try {
      const result = await editReservation('test-id-123', testData);
      console.log('📊 Resultado editReservation:', result);

      const success = result && result.id;
      addTestResult(
        'editReservation en DEBUG_MODE',
        success,
        success ? `ID: ${result.id}` : 'No se obtuvo ID',
      );
      return success;
    } catch (error) {
      console.error('❌ Error en editReservation:', error);
      addTestResult('editReservation en DEBUG_MODE', false, error.message);
      return false;
    }
  };

  const runTest4_DirectTestFunction = async () => {
    console.log('🧪 Test 4: Probando crearReservaPrueba directamente');

    const testData = {
      car: { id: 3, marca: 'Direct', modelo: 'Test' },
      conductorData: {
        nombre: 'Direct',
        apellido: 'Test',
        email: 'direct@example.com',
      },
    };

    try {
      const result = await crearReservaPrueba(testData);
      console.log('📊 Resultado crearReservaPrueba:', result);

      const success = result && result.id;
      addTestResult(
        'crearReservaPrueba directa',
        success,
        success ? `ID: ${result.id}` : 'No se obtuvo ID',
      );
      return success;
    } catch (error) {
      console.error('❌ Error en crearReservaPrueba:', error);
      addTestResult('crearReservaPrueba directa', false, error.message);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    console.log('🚀 Iniciando batería completa de tests...');

    try {
      // Test 1: DEBUG_MODE
      const test1 = runTest1_DebugMode();

      // Test 2: createReservation
      const test2 = await runTest2_CreateReservation();

      // Test 3: editReservation
      const test3 = await runTest3_EditReservation();

      // Test 4: crearReservaPrueba
      const test4 = await runTest4_DirectTestFunction();

      // Resumen
      const allPassed = test1 && test2 && test3 && test4;
      addTestResult(
        'RESUMEN GENERAL',
        allPassed,
        allPassed ? 'Todos los tests pasaron ✅' : 'Algunos tests fallaron ❌',
      );

      console.log(
        allPassed ? '🎉 Todos los tests pasaron!' : '⚠️ Algunos tests fallaron',
      );
    } catch (error) {
      console.error('❌ Error durante la ejecución de tests:', error);
      addTestResult('RESUMEN GENERAL', false, 'Error durante la ejecución');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <Container className="my-4">
      <Card>
        <Card.Header>
          <h4>🔧 Debug - Verificación de Correcciones</h4>
          <small className="text-muted">
            Verificando que las correcciones del flujo de reserva funcionan
            correctamente
          </small>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <Button
              variant="primary"
              onClick={runAllTests}
              disabled={isLoading}
              className="me-2"
            >
              {isLoading ? '⏳ Ejecutando...' : '🧪 Ejecutar Todos los Tests'}
            </Button>
            <Button
              variant="secondary"
              onClick={clearResults}
              disabled={isLoading}
            >
              🧹 Limpiar Resultados
            </Button>
          </div>

          <div className="mt-4">
            <h5>📊 Resultados de las Pruebas</h5>
            {testResults.length === 0 ? (
              <Alert variant="info">
                No se han ejecutado pruebas aún. Haz clic en "Ejecutar Todos los
                Tests" para comenzar.
              </Alert>
            ) : (
              <div>
                {testResults.map((result, index) => (
                  <Alert
                    key={index}
                    variant={result.result ? 'success' : 'danger'}
                    className="mb-2"
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{result.test}</strong>
                        {result.details && (
                          <div className="small mt-1">{result.details}</div>
                        )}
                      </div>
                      <div className="text-end">
                        <span className="badge bg-secondary">
                          {result.timestamp}
                        </span>
                        <div className="mt-1">
                          {result.result ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <h6>📋 Estado de DEBUG_MODE</h6>
            <Alert variant={DEBUG_MODE ? 'success' : 'warning'}>
              DEBUG_MODE está {DEBUG_MODE ? 'habilitado' : 'deshabilitado'}(
              {DEBUG_MODE ? '✅' : '⚠️'})
            </Alert>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DebugReservationFix;
