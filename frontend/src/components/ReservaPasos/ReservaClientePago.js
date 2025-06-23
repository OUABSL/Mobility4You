// src/components/ReservaPasos/ReservaClientePago.js
import {
  faCalendarAlt,
  faCarSide,
  faChevronLeft,
  faClock,
  faCreditCard,
  faExclamationTriangle,
  faHome,
  faInfoCircle,
  faLock,
  faMapMarkerAlt,
  faMoneyBillWave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { DEBUG_MODE } from '../../assets/testingData/testingData';
import '../../css/ReservaClientePago.css';
import useReservationTimer from '../../hooks/useReservationTimer';
import {
  createReservation,
  editReservation,
} from '../../services/reservationServices';
import { getReservationStorageService } from '../../services/reservationStorageService';
import StripePaymentForm from '../StripePayment/StripePaymentForm';
import { ReservationTimerBadge } from './ReservationTimerIndicator';
import ReservationTimerModal from './ReservationTimerModal';

// Configuraciones de pago
const STRIPE_ENABLED = true; // Variable para habilitar/deshabilitar Stripe
const PAYMENT_METHODS = {
  CARD: 'tarjeta',
  CASH: 'efectivo',
};

// Funciones de logging condicional
const logInfo = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`[PAYMENT] ${message}`, data);
  }
};

const logError = (message, error = null) => {
  if (DEBUG_MODE) {
    console.error(`[PAYMENT ERROR] ${message}`, error);
  }
};

const ReservaClientePago = ({
  diferencia = null,
  reservaId = null,
  modoDiferencia = false,
}) => {
  const navigate = useNavigate();
  const storageService = getReservationStorageService();

  // Hook del timer de reserva
  const {
    isActive: timerActive,
    remainingTime,
    formattedTime,
    showWarningModal,
    showExpiredModal,
    onExtendTimer,
    onCancelReservation,
    onStartNewReservation,
    onCloseModals,
    pauseTimer,
    resumeTimer,
  } = useReservationTimer();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null); // Cargar datos de reserva del storage service al iniciar
  useEffect(() => {
    const loadReservationData = async () => {
      try {
        let storedData;
        if (modoDiferencia && reservaId) {
          // Para modo diferencia, intentar cargar datos existentes
          const completeData =
            await storageService.getCompleteReservationData();
          if (completeData && completeData.id === reservaId) {
            setReservaData({
              ...completeData,
              diferenciaPendiente: diferencia,
            });
          } else if (DEBUG_MODE) {
            // Fallback a sessionStorage en modo debug
            storedData = sessionStorage.getItem('reservaData');
            if (storedData) {
              const parsed = JSON.parse(storedData);
              setReservaData({ ...parsed, diferenciaPendiente: diferencia });
            } else {
              setError(
                'No se encontraron datos de reserva para pago de diferencia.',
              );
            }
          } else {
            setError(
              'No se encontraron datos de reserva para pago de diferencia.',
            );
          }
        } else {
          // Modo normal - cargar datos completos del storage service
          const completeData =
            await storageService.getCompleteReservationData();
          if (!completeData) {
            setError('No se encontraron datos de reserva.');
            return;
          }
          setReservaData(completeData);
        }
      } catch (err) {
        logError('Error al cargar datos de reserva', err);
        setError('Error al cargar datos de reserva.');
      }
    };

    loadReservationData();
  }, [diferencia, reservaId, modoDiferencia, storageService]);

  const handleVolver = () => {
    navigate('/reservation-confirmation/datos');
  };

  // Función para simular pago con tarjeta (sin Stripe real)
  const simulateCardPayment = async (amount, paymentData) => {
    logInfo('Simulando pago con tarjeta', { amount, paymentData });

    // Simular delay de procesamiento
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simular respuesta exitosa (en producción esto vendría de Stripe)
    return {
      success: true,
      transaction_id: `sim_tx_${Date.now()}`,
      message: 'Pago simulado exitosamente',
      payment_method: 'card_simulation',
    };
  };

  // Función para crear reserva en base de datos
  const createReservationInDB = async (reservaData) => {
    try {
      logInfo('Creando reserva en base de datos', { id: reservaData.id });

      if (DEBUG_MODE) {
        // En modo debug, simular creación
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          ...reservaData,
          id: reservaData.id || `RSV_${Date.now()}`,
          estado: 'confirmada',
          fecha_creacion: new Date().toISOString(),
        };
      } else {
        // En producción, llamar al servicio real
        return await createReservation(reservaData);
      }
    } catch (error) {
      logError('Error al crear reserva en DB', error);
      throw new Error('Error al crear la reserva en la base de datos');
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!reservaData) {
        throw new Error('No hay datos de reserva.');
      }

      logInfo('Iniciando proceso de pago', {
        metodoPago: reservaData.metodoPago,
        modoDiferencia,
        diferencia,
      });

      // Pausar el timer durante el proceso de pago
      if (timerActive && typeof pauseTimer === 'function') {
        pauseTimer();
      }
      // Calcular importe a pagar con múltiples fallbacks para evitar pérdida de datos
      let importeAPagar = 0;
      if (modoDiferencia && diferencia) {
        importeAPagar = diferencia;
      } else {
        // Múltiples fuentes para el importe total
        importeAPagar =
          reservaData.detallesReserva?.total ||
          reservaData.precioTotal ||
          reservaData.precio_total ||
          reservaData.importe_pendiente_inicial ||
          0;

        logInfo('Importe calculado desde múltiples fuentes', {
          detallesReservaTotal: reservaData.detallesReserva?.total,
          precioTotal: reservaData.precioTotal,
          precio_total: reservaData.precio_total,
          importe_pendiente_inicial: reservaData.importe_pendiente_inicial,
          importeFinal: importeAPagar,
        });
      }

      logInfo('Importe calculado', { importeAPagar });

      // Procesar según método de pago
      if (reservaData.metodoPago === PAYMENT_METHODS.CARD) {
        await processCardPayment(importeAPagar);
      } else if (reservaData.metodoPago === PAYMENT_METHODS.CASH) {
        await processCashPayment(importeAPagar);
      } else {
        throw new Error('Método de pago no válido');
      }
    } catch (err) {
      logError('Error en handleSubmit', err);
      setError(err.message || 'Error al procesar el pago.');

      // Reanudar el timer si hubo error
      if (timerActive && typeof resumeTimer === 'function') {
        resumeTimer();
      }
    } finally {
      setLoading(false);
    }
  };
  // Procesar pago con tarjeta
  const processCardPayment = async (importeAPagar) => {
    try {
      logInfo('Procesando pago con tarjeta', {
        importeAPagar,
        stripeEnabled: STRIPE_ENABLED,
      });

      let paymentResult;

      if (STRIPE_ENABLED) {
        // La integración real con Stripe se maneja a través del componente StripePaymentForm
        // Este método se llama desde el callback de éxito de Stripe
        logInfo('Pago con Stripe completado exitosamente');
        paymentResult = {
          success: true,
          transaction_id: `stripe_${Date.now()}`,
          message: 'Pago procesado con Stripe',
          payment_method: 'stripe',
        };
      } else {
        // Simular pago con tarjeta
        logInfo('Simulando pago con tarjeta');
        paymentResult = await simulateCardPayment(importeAPagar, {
          titular: reservaData.conductorPrincipal?.nombre
            ? `${reservaData.conductorPrincipal.nombre} ${reservaData.conductorPrincipal.apellidos}`
            : '',
          email: reservaData.conductorPrincipal?.email || '',
          modoDiferencia: modoDiferencia,
        });
      }

      if (paymentResult && paymentResult.success) {
        await updateReservationAfterPayment(importeAPagar, paymentResult);
      } else {
        throw new Error(
          paymentResult?.error || 'Error al procesar el pago con tarjeta',
        );
      }
    } catch (error) {
      logError('Error en processCardPayment', error);
      throw error;
    }
  };

  // Procesar pago en efectivo
  const processCashPayment = async (importeAPagar) => {
    try {
      logInfo('Procesando pago en efectivo', { importeAPagar });

      // Para pago en efectivo, simplemente actualizar la reserva sin procesar pago
      const paymentResult = {
        success: true,
        transaction_id: `cash_${Date.now()}`,
        message: 'Pago en efectivo programado',
        payment_method: 'cash',
      };

      await updateReservationAfterPayment(importeAPagar, paymentResult);
    } catch (error) {
      logError('Error en processCashPayment', error);
      throw error;
    }
  };
  // Actualizar reserva después del pago
  const updateReservationAfterPayment = async (
    importeAPagar,
    paymentResult,
  ) => {
    try {
      logInfo('Actualizando reserva después del pago', {
        importeAPagar,
        paymentResult,
      });

      if (modoDiferencia) {
        // Modo diferencia: actualizar reserva existente
        const updatedReserva = {
          ...reservaData,
          importe_pagado_extra:
            (reservaData.importe_pagado_extra || 0) + importeAPagar,
          importe_pendiente_extra: 0,
          transaction_id: paymentResult.transaction_id,
          fecha_pago: new Date().toISOString(),
        };

        const result = await editReservation(reservaData.id, updatedReserva);
        sessionStorage.setItem('reservaData', JSON.stringify(result));

        navigate(
          `/reservations/${reservaData.id}?email=${
            reservaData.conductorPrincipal?.email || ''
          }`,
          { replace: true },
        );
      } else {
        // Reserva nueva: crear en base de datos
        const reservaToCreate = {
          ...reservaData,
          transaction_id: paymentResult.transaction_id,
          fecha_pago: new Date().toISOString(),
          estado:
            reservaData.metodoPago === PAYMENT_METHODS.CASH
              ? 'pendiente_pago'
              : 'confirmada',
        };
        const createdReserva = await createReservationInDB(reservaToCreate);

        // Limpiar storage después del pago exitoso
        storageService.clearAllReservationData();

        // Guardar datos de reserva completada para la página de éxito
        sessionStorage.setItem(
          'reservaCompletada',
          JSON.stringify(createdReserva),
        );

        navigate('/reservation-confirmation/exito', {
          replace: true,
          state: {
            reservationData: createdReserva,
            paymentMethod: reservaData.metodoPago,
          },
        });
      }
    } catch (error) {
      logError('Error al actualizar reserva', error);
      throw new Error('Error al actualizar la reserva después del pago');
    }
  };

  // Manejadores para Stripe
  const handleStripePaymentSuccess = async (paymentResult) => {
    try {
      logInfo('Pago con Stripe exitoso', paymentResult);

      const importeAPagar = modoDiferencia
        ? diferencia
        : reservaData.detallesReserva?.total || 0;

      // Procesar el pago como exitoso
      await updateReservationAfterPayment(importeAPagar, {
        success: true,
        transaction_id:
          paymentResult.payment_intent?.id || `stripe_${Date.now()}`,
        message: 'Pago procesado con Stripe exitosamente',
        payment_method: 'stripe',
        payment_intent: paymentResult.payment_intent,
      });
    } catch (error) {
      logError('Error al procesar pago exitoso de Stripe', error);
      setError('Error al confirmar el pago. Contacte con soporte.');
    }
  };

  const handleStripePaymentError = (error) => {
    logError('Error en pago con Stripe', error);
    setError(error.message || 'Error al procesar el pago con tarjeta');
    setLoading(false);
  };

  // Si hay error, mostrar pantalla de error
  if (error) {
    return (
      <Container className="reserva-pago my-5">
        <Card className="shadow-sm">
          <Card.Header className="bg-danger text-white">
            <h5 className="mb-0">Error</h5>
          </Card.Header>
          <Card.Body className="text-center py-5">
            <div className="mb-4">
              <FontAwesomeIcon
                icon={faTimes}
                size="4x"
                className="text-danger"
              />
            </div>
            <h4 className="mb-4">{error}</h4>
            <Button variant="primary" onClick={() => navigate('/coches')}>
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Volver al listado de coches
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Si no hay datos de reserva, mostrar cargando
  if (!reservaData) {
    return (
      <Container className="reserva-pago my-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Cargando datos de la reserva...</p>
        </div>
      </Container>
    );
  }

  // Extraer datos relevantes
  const { car, fechas, paymentOption, extras, detallesReserva, conductor } =
    reservaData;
  return (
    <Container className="reserva-pago my-4">
      <div className="reservation-progress mb-4">
        <div className="progress-steps">
          <div className="step completed">1. Selección de Extras</div>
          <div className="step completed">2. Datos del Conductor</div>
          <div className="step active">3. Pago</div>
          <div className="step">4. Confirmación</div>
        </div>
      </div>

      {/* Timer Badge */}
      {timerActive && !modoDiferencia && (
        <div className="d-flex justify-content-center mb-3">
          <ReservationTimerBadge
            remainingTime={remainingTime}
            formattedTime={formattedTime}
            size="small"
          />
        </div>
      )}

      {/* Timer Modals */}
      <ReservationTimerModal
        type="warning"
        show={showWarningModal}
        onExtend={onExtendTimer}
        onCancel={onCancelReservation}
        onClose={onCloseModals}
      />

      <ReservationTimerModal
        type="expired"
        show={showExpiredModal}
        onStartNew={onStartNewReservation}
        onClose={onCloseModals}
      />

      <Card className="shadow-sm">
        {' '}
        <Card.Header className="bg-primario text-white">
          <div className="d-flex justify-content-between align-items-center">
            <Button
              variant="link"
              className="text-white p-0"
              onClick={handleVolver}
              disabled={loading}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              Volver
            </Button>
            <div className="d-flex align-items-center">
              <h5 className="mb-0 me-3">Procesamiento de Pago</h5>
              {timerActive && !modoDiferencia && (
                <ReservationTimerBadge
                  remainingTime={remainingTime}
                  formattedTime={formattedTime}
                  size="small"
                  variant="light"
                />
              )}
            </div>
            <div style={{ width: '80px' }}></div>
          </div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col lg={7}>
              <div className="secure-payment-notice mb-4">
                <FontAwesomeIcon icon={faLock} className="me-2 text-success" />
                Todos los pagos se procesan de forma segura
              </div>
              {error && <Alert variant="danger">{error}</Alert>}

              {/* INFORMACIÓN DE PAGO SEGURO */}
              <div className="payment-info-section mb-4">
                <h5 className="mb-3">
                  {reservaData.metodoPago === PAYMENT_METHODS.CARD ? (
                    <>
                      <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                      Pago con Tarjeta
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon
                        icon={faMoneyBillWave}
                        className="me-2"
                      />
                      Pago en Efectivo
                    </>
                  )}
                </h5>

                {reservaData.metodoPago === PAYMENT_METHODS.CARD ? (
                  STRIPE_ENABLED ? (
                    // Integración real con Stripe
                    <StripePaymentForm
                      reservaData={reservaData}
                      tipoPago={modoDiferencia ? 'DIFERENCIA' : 'INICIAL'}
                      onPaymentSuccess={handleStripePaymentSuccess}
                      onPaymentError={handleStripePaymentError}
                      loading={loading}
                      setLoading={setLoading}
                    />
                  ) : (
                    // Modo simulación para desarrollo
                    <div className="card-payment-info">
                      <div
                        className="info-box mb-4 p-3 rounded"
                        style={{
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                        }}
                      >
                        <div className="d-flex align-items-center mb-2">
                          <FontAwesomeIcon
                            icon={faLock}
                            className="me-2 text-warning"
                          />
                          <strong>Pago Simulado (Modo Desarrollo)</strong>
                        </div>
                        <div>
                          <p className="mb-2 text-warning">
                            <FontAwesomeIcon
                              icon={faExclamationTriangle}
                              className="me-2"
                            />
                            <strong>Modo Desarrollo:</strong> Los pagos con
                            tarjeta están simulados.
                          </p>
                          <p className="mb-0 small">
                            En producción, los pagos se procesarían con Stripe
                            de forma segura. Por ahora, puedes usar el pago en
                            efectivo para reservas reales.
                          </p>
                        </div>
                      </div>

                      <div className="simulation-notice alert alert-info">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                        <strong>Simulación de Pago:</strong> Al proceder, se
                        simulará un pago exitoso sin cargo real a ninguna
                        tarjeta.
                      </div>

                      <Form onSubmit={handleSubmit}>
                        <div className="d-flex justify-content-between">
                          <Button
                            variant="outline-secondary"
                            onClick={handleVolver}
                            disabled={loading}
                          >
                            <FontAwesomeIcon
                              icon={faChevronLeft}
                              className="me-2"
                            />
                            Volver
                          </Button>
                          <Button
                            variant="primary"
                            type="submit"
                            className="payment-btn"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2"
                                />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon
                                  icon={faCreditCard}
                                  className="me-2"
                                />
                                Simular Pago
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )
                ) : (
                  // Pago en efectivo
                  <div className="cash-payment-info">
                    <div
                      className="info-box mb-4 p-3 rounded"
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #dee2e6',
                      }}
                    >
                      <div className="d-flex align-items-center mb-2">
                        <FontAwesomeIcon
                          icon={faMoneyBillWave}
                          className="me-2 text-success"
                        />
                        <strong>Pago en Efectivo</strong>
                      </div>
                      <p className="mb-0">
                        Reserva ahora y paga cuando recojas el vehículo en
                        nuestras oficinas. Tu reserva quedará confirmada sin
                        cargo inmediato.
                      </p>
                    </div>

                    {/* RESUMEN DEL PAGO */}
                    <div className="payment-summary-box my-4 p-3 border rounded">
                      <h6 className="mb-3">Resumen del Pago</h6>{' '}
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total a pagar:</span>
                        <span className="fw-bold">
                          {(
                            Number(diferencia) ||
                            Number(reservaData.detallesReserva?.total) ||
                            0
                          ).toFixed(2)}
                          €
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Método de pago:</span>
                        <span className="text-capitalize">Efectivo</span>
                      </div>
                      <small className="text-muted">
                        Tu reserva se confirmará y podrás pagar al recoger el
                        vehículo.
                      </small>
                    </div>

                    <Form onSubmit={handleSubmit}>
                      <div className="d-flex justify-content-between">
                        <Button
                          variant="outline-secondary"
                          onClick={handleVolver}
                          disabled={loading}
                        >
                          <FontAwesomeIcon
                            icon={faChevronLeft}
                            className="me-2"
                          />
                          Volver
                        </Button>
                        <Button
                          variant="primary"
                          type="submit"
                          className="payment-btn"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon
                                icon={faMoneyBillWave}
                                className="me-2"
                              />
                              Confirmar Reserva
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}
              </div>
            </Col>

            {/* Segunda Columna: RESUMEN DE LA RESERVA */}
            <Col lg={5}>
              <Card className="mb-4 order-summary">
                <Card.Header>
                  <FontAwesomeIcon icon={faCarSide} className="me-2" />
                  Resumen de la Reserva
                </Card.Header>
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={
                        car?.imagen ||
                        car?.imagenPrincipal ||
                        'https://via.placeholder.com/150x100?text=Coche'
                      }
                      alt={`${car?.marca} ${car?.modelo}`}
                      className="reserva-car-img me-3"
                    />
                    <div>
                      <h5>
                        {car?.marca} {car?.modelo}
                      </h5>
                      <p className="mb-0">
                        {paymentOption === 'all-inclusive'
                          ? 'All Inclusive'
                          : 'Economy'}
                      </p>
                    </div>
                  </div>
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Recogida:</strong>{' '}
                    {fechas?.pickupLocation
                      ? typeof fechas.pickupLocation === 'object'
                        ? fechas.pickupLocation.nombre
                        : fechas.pickupLocation
                      : 'Aeropuerto de Málaga'}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.pickupDate
                        ? new Date(fechas.pickupDate).toLocaleDateString()
                        : '14/05/2025'}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.pickupTime || '12:00'}
                    </div>
                  </div>{' '}
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Devolución:</strong>{' '}
                    {fechas?.dropoffLocation
                      ? typeof fechas.dropoffLocation === 'object'
                        ? fechas.dropoffLocation.nombre
                        : fechas.dropoffLocation
                      : 'Aeropuerto de Málaga'}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.dropoffDate
                        ? new Date(fechas.dropoffDate).toLocaleDateString()
                        : '17/05/2025'}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.dropoffTime || '12:00'}
                    </div>
                  </div>
                  <div className="conductor-resumen mb-3">
                    <div>
                      <strong>Conductor:</strong>
                      {reservaData.conductorPrincipal?.nombre}{' '}
                      {reservaData.conductorPrincipal?.apellidos}
                    </div>
                    <div>
                      <p>Segundo Conductor:</p>
                      {reservaData.conductorSecundario?.nombre}{' '}
                      {reservaData.conductorSecundario?.apellidos}
                    </div>
                  </div>
                  <hr /> {/* Detalles del precio */}
                  {detallesReserva && (
                    <div className="detalles-precio">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base:</span>
                        <span>
                          {(detallesReserva.precioCocheBase || 0).toFixed(2)}€
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA (21%):</span>
                        <span>{(detallesReserva.iva || 0).toFixed(2)}€</span>
                      </div>
                      {(detallesReserva.precioExtras || 0) > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>
                            {(detallesReserva.precioExtras || 0).toFixed(2)}€
                          </span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>{(detallesReserva.total || 0).toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReservaClientePago;
