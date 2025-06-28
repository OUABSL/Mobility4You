import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container } from 'react-bootstrap';
import { createServiceLogger } from '../config/appConfig';
import { getReservationStorageService } from '../services/reservationStorageService';

// Crear logger para el componente
const logger = createServiceLogger('RESERVATION_DEBUG_PAGE');

const ReservationDebugPage = () => {
  const [storageState, setStorageState] = useState(null);
  const [testResults, setTestResults] = useState({});
  const storageService = getReservationStorageService();

  // Cargar scripts de prueba
  useEffect(() => {
    const loadTestScript = async () => {
      try {
        // Cargar el script de prueba del flujo
        const script = document.createElement('script');
        script.src = '/src/tests/reservationFlowTest.js';
        script.type = 'module';
        document.head.appendChild(script);

        // Hacer el servicio disponible globalmente para las pruebas
        window.getReservationStorageService = getReservationStorageService;

        logger.info('✅ Scripts de prueba cargados');
      } catch (error) {
        logger.error('❌ Error cargando scripts de prueba:', error);
      }
    };

    loadTestScript();
  }, []);

  // Actualizar estado del storage
  const updateStorageState = async () => {
    try {
      const completeData = await storageService.getCompleteReservationData();
      const state = {
        hasActiveReservation: storageService.hasActiveReservation(),
        reservationData: storageService.getReservationData(),
        extras: storageService.getExtras(),
        conductorData: storageService.getConductorData(),
        currentStep: storageService.getCurrentStep(),
        completeData: completeData,
        remainingTime: storageService.getRemainingTime(),
        sessionStorageKeys: Object.keys(sessionStorage).filter((key) =>
          key.startsWith('reserva'),
        ),
      };
      setStorageState(state);
    } catch (error) {
      logger.error('Error updating storage state:', error);
      setStorageState({ error: error.message });
    }
  };

  // Cargar estado inicial
  useEffect(() => {
    updateStorageState().catch(logger.error);

    // Actualizar cada 5 segundos
    const interval = setInterval(
      () => updateStorageState().catch(logger.error),
      5000,
    );
    return () => clearInterval(interval);
  }, []);

  // Ejecutar prueba paso 1
  const runStep1 = () => {
    try {
      if (window.testReservationFlow) {
        const result = window.testReservationFlow.step1_SimulateCarSelection();
        setTestResults((prev) => ({ ...prev, step1: result }));
        setTimeout(() => updateStorageState().catch(logger.error), 1000);
      } else {
        alert('Scripts de prueba no cargados aún');
      }
    } catch (error) {
      logger.error('Error en step1:', error);
    }
  };

  // Ejecutar prueba paso 2
  const runStep2 = async () => {
    try {
      if (window.testReservationFlow) {
        const result =
          await window.testReservationFlow.step2_VerifyExtrasPage();
        setTestResults((prev) => ({ ...prev, step2: result }));
        setTimeout(() => updateStorageState().catch(logger.error), 1000);
      }
    } catch (error) {
      logger.error('Error en step2:', error);
    }
  };

  // Ejecutar prueba paso 3
  const runStep3 = () => {
    try {
      if (window.testReservationFlow) {
        const result =
          window.testReservationFlow.step3_SimulateExtrasSelection();
        setTestResults((prev) => ({ ...prev, step3: result }));
        setTimeout(() => updateStorageState().catch(logger.error), 1000);
      }
    } catch (error) {
      logger.error('Error en step3:', error);
    }
  };

  // Ejecutar prueba paso 4
  const runStep4 = async () => {
    try {
      if (window.testReservationFlow) {
        const result =
          await window.testReservationFlow.step4_VerifyConductorPage();
        setTestResults((prev) => ({ ...prev, step4: result }));
        setTimeout(() => updateStorageState().catch(logger.error), 1000);
      }
    } catch (error) {
      logger.error('Error en step4:', error);
    }
  };

  // Ejecutar prueba paso 5
  const runStep5 = async () => {
    try {
      if (window.testReservationFlow) {
        const result =
          await window.testReservationFlow.step5_SimulateConductorData();
        setTestResults((prev) => ({ ...prev, step5: result }));
        setTimeout(() => updateStorageState().catch(logger.error), 1000);
      }
    } catch (error) {
      logger.error('Error en step5:', error);
    }
  };

  // Limpiar datos
  const cleanup = () => {
    try {
      if (window.testReservationFlow) {
        window.testReservationFlow.cleanup();
      }
      storageService.clearAllReservationData();
      setTestResults({});
      setTimeout(() => updateStorageState().catch(logger.error), 1000);
    } catch (error) {
      logger.error('Error en cleanup:', error);
    }
  };

  return (
    <Container className="my-4">
      <h2>🔧 Página de Depuración - Storage de Reservas</h2>

      {/* Controles de prueba */}
      <Card className="mb-4">
        <Card.Header>
          <h5>🚀 Controles de Prueba</h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="primary" onClick={runStep1}>
              Step 1: Simular Coche
            </Button>
            <Button variant="secondary" onClick={runStep2}>
              Step 2: Verificar Extras
            </Button>
            <Button variant="secondary" onClick={runStep3}>
              Step 3: Simular Extras
            </Button>
            <Button variant="secondary" onClick={runStep4}>
              Step 4: Verificar Conductor
            </Button>
            <Button variant="secondary" onClick={runStep5}>
              Step 5: Simular Conductor
            </Button>
            <Button variant="warning" onClick={cleanup}>
              🧹 Limpiar
            </Button>
            <Button
              variant="info"
              onClick={() => updateStorageState().catch(logger.error)}
            >
              🔄 Actualizar
            </Button>
          </div>

          {/* Resultados de pruebas */}
          {Object.keys(testResults).length > 0 && (
            <div className="mt-3">
              <h6>Resultados de Pruebas:</h6>
              {Object.entries(testResults).map(([step, result]) => (
                <Badge
                  key={step}
                  bg={result ? 'success' : 'danger'}
                  className="me-2"
                >
                  {step}: {result ? '✅' : '❌'}
                </Badge>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Estado del storage */}
      <Card className="mb-4">
        <Card.Header>
          <h5>📊 Estado del Storage</h5>
        </Card.Header>
        <Card.Body>
          {storageState ? (
            storageState.error ? (
              <Alert variant="danger">Error: {storageState.error}</Alert>
            ) : (
              <div>
                <div className="mb-3">
                  <Badge
                    bg={
                      storageState.hasActiveReservation
                        ? 'success'
                        : 'secondary'
                    }
                  >
                    Reserva Activa:{' '}
                    {storageState.hasActiveReservation ? 'Sí' : 'No'}
                  </Badge>
                  <Badge bg="info" className="ms-2">
                    Paso: {storageState.currentStep || 'N/A'}
                  </Badge>
                  {storageState.remainingTime > 0 && (
                    <Badge bg="warning" className="ms-2">
                      Tiempo: {Math.round(storageState.remainingTime / 1000)}s
                    </Badge>
                  )}
                </div>

                <details className="mb-3">
                  <summary>
                    <strong>Datos de Reserva Base</strong>
                  </summary>
                  <pre
                    className="mt-2"
                    style={{
                      fontSize: '12px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(storageState.reservationData, null, 2)}
                  </pre>
                </details>

                <details className="mb-3">
                  <summary>
                    <strong>Extras ({storageState.extras?.length || 0})</strong>
                  </summary>
                  <pre className="mt-2" style={{ fontSize: '12px' }}>
                    {JSON.stringify(storageState.extras, null, 2)}
                  </pre>
                </details>

                <details className="mb-3">
                  <summary>
                    <strong>Datos del Conductor</strong>
                  </summary>
                  <pre
                    className="mt-2"
                    style={{
                      fontSize: '12px',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(storageState.conductorData, null, 2)}
                  </pre>
                </details>

                <details className="mb-3">
                  <summary>
                    <strong>
                      SessionStorage Keys (
                      {storageState.sessionStorageKeys?.length || 0})
                    </strong>
                  </summary>
                  <div className="mt-2">
                    {storageState.sessionStorageKeys?.map((key) => (
                      <Badge
                        key={key}
                        bg="light"
                        text="dark"
                        className="me-1 mb-1"
                      >
                        {key}
                      </Badge>
                    ))}
                  </div>
                </details>
              </div>
            )
          ) : (
            <p>Cargando estado del storage...</p>
          )}
        </Card.Body>
      </Card>

      {/* Enlaces de navegación */}
      <Card>
        <Card.Header>
          <h5>🔗 Enlaces de Navegación</h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap">
            <Button variant="outline-primary" href="/coches" size="sm">
              Selección de Coches
            </Button>
            <Button
              variant="outline-secondary"
              href="/reservation-confirmation"
              size="sm"
            >
              Extras
            </Button>
            <Button
              variant="outline-secondary"
              href="/reservation-confirmation/datos"
              size="sm"
            >
              Datos Conductor
            </Button>
            <Button
              variant="outline-secondary"
              href="/reservation-confirmation/pago"
              size="sm"
            >
              Pago
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReservationDebugPage;
