// src/components/ReservaPasos/ReservaClientePago.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCarSide, 
  faCalendarAlt, 
  faClock, 
  faMapMarkerAlt, 
  faShieldAlt, 
  faPlus, 
  faCheck, 
  faChevronLeft,
  faCreditCard,
  faTimes,
  faHome,
  faLock,
  faExclamationTriangle,
  faInfoCircle,
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import '../../css/ReservaClientePago.css';
import { editReservation, findReservation, processPayment, createReservation, DEBUG_MODE } from '../../services/reservationServices';

// Configuraciones de pago
const STRIPE_ENABLED = false; // Variable para habilitar/deshabilitar Stripe
const PAYMENT_METHODS = {
  CARD: 'tarjeta',
  CASH: 'efectivo'
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


const ReservaClientePago = ({ diferencia = null, reservaId = null, modoDiferencia = false }) => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);

  // Cargar datos de reserva del sessionStorage al iniciar
  useEffect(() => {
    try {
      let storedData;
      if (modoDiferencia && reservaId) {
        // Buscar la reserva por ID (DEBUG_MODE o API)
        if (DEBUG_MODE) {
          storedData = sessionStorage.getItem('reservaData');
        } else {
          // Aquí podrías hacer un fetch real si es necesario
        }
        if (storedData) {
          const parsed = JSON.parse(storedData);
          setReservaData({ ...parsed, diferenciaPendiente: diferencia });
        } else {
          setError('No se encontraron datos de reserva para pago de diferencia.');
        }
      } else {
        storedData = sessionStorage.getItem('reservaData');
        if (!storedData) {
          setError('No se encontraron datos de reserva.');
          return;
        }
        setReservaData(JSON.parse(storedData));
      }
    } catch (err) {
      logError('Error al cargar datos de reserva', err);
      setError('Error al cargar datos de reserva.');
    }
  }, [diferencia, reservaId, modoDiferencia]);

  const handleVolver = () => {
    navigate('/reservation-confirmation/datos');
  };

  // Función para simular pago con tarjeta (sin Stripe real)
  const simulateCardPayment = async (amount, paymentData) => {
    logInfo('Simulando pago con tarjeta', { amount, paymentData });
    
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simular respuesta exitosa (en producción esto vendría de Stripe)
    return {
      success: true,
      transaction_id: `sim_tx_${Date.now()}`,
      message: 'Pago simulado exitosamente',
      payment_method: 'card_simulation'
    };
  };

  // Función para crear reserva en base de datos
  const createReservationInDB = async (reservaData) => {
    try {
      logInfo('Creando reserva en base de datos', { id: reservaData.id });
      
      if (DEBUG_MODE) {
        // En modo debug, simular creación
        await new Promise(resolve => setTimeout(resolve, 1000));
        return {
          ...reservaData,
          id: reservaData.id || `RSV_${Date.now()}`,
          estado: 'confirmada',
          fecha_creacion: new Date().toISOString()
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
        diferencia 
      });
      
      // Calcular importe a pagar
      let importeAPagar = 0;
      if (modoDiferencia && diferencia) {
        importeAPagar = diferencia;
      } else if (reservaData.detallesReserva && reservaData.detallesReserva.total) {
        importeAPagar = reservaData.detallesReserva.total;
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
    } finally {
      setLoading(false);
    }
  };

  // Procesar pago con tarjeta
  const processCardPayment = async (importeAPagar) => {
    try {
      logInfo('Procesando pago con tarjeta', { importeAPagar, stripeEnabled: STRIPE_ENABLED });
      
      let paymentResult;
      
      if (STRIPE_ENABLED) {
        // Integración real con Stripe (cuando esté habilitada)
        logInfo('Usando Stripe real (no implementado aún)');
        throw new Error('Stripe no está disponible actualmente. Use pago en efectivo.');
      } else {
        // Simular pago con tarjeta
        logInfo('Simulando pago con tarjeta');
        paymentResult = await simulateCardPayment(importeAPagar, {
          titular: reservaData.conductorPrincipal?.nombre 
            ? `${reservaData.conductorPrincipal.nombre} ${reservaData.conductorPrincipal.apellidos}` 
            : '',
          email: reservaData.conductorPrincipal?.email || '',
          modoDiferencia: modoDiferencia
        });
      }
      
      if (paymentResult && paymentResult.success) {
        await updateReservationAfterPayment(importeAPagar, paymentResult);
      } else {
        throw new Error(paymentResult?.error || 'Error al procesar el pago con tarjeta');
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
        payment_method: 'cash'
      };
      
      await updateReservationAfterPayment(importeAPagar, paymentResult);
      
    } catch (error) {
      logError('Error en processCashPayment', error);
      throw error;
    }
  };

  // Actualizar reserva después del pago
  const updateReservationAfterPayment = async (importeAPagar, paymentResult) => {
    try {
      logInfo('Actualizando reserva después del pago', { importeAPagar, paymentResult });
      
      if (modoDiferencia) {
        // Modo diferencia: actualizar reserva existente
        const updatedReserva = {
          ...reservaData,
          importe_pagado_extra: (reservaData.importe_pagado_extra || 0) + importeAPagar,
          importe_pendiente_extra: 0,
          transaction_id: paymentResult.transaction_id,
          fecha_pago: new Date().toISOString()
        };
        
        const result = await editReservation(reservaData.id, updatedReserva);
        sessionStorage.setItem('reservaData', JSON.stringify(result));
        
        navigate(`/reservations/${reservaData.id}?email=${reservaData.conductorPrincipal?.email || ''}`, { replace: true });
      } else {
        // Reserva nueva: crear en base de datos
        const reservaToCreate = {
          ...reservaData,
          transaction_id: paymentResult.transaction_id,
          fecha_pago: new Date().toISOString(),
          estado: reservaData.metodoPago === PAYMENT_METHODS.CASH ? 'pendiente_pago' : 'confirmada'
        };
        
        const createdReserva = await createReservationInDB(reservaToCreate);
        sessionStorage.setItem('reservaCompletada', JSON.stringify(createdReserva));
        
        navigate('/reservation-confirmation/exito', { replace: true });
      }
      
    } catch (error) {
      logError('Error al actualizar reserva', error);
      throw new Error('Error al actualizar la reserva después del pago');
    }
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
              <FontAwesomeIcon icon={faTimes} size="4x" className="text-danger" />
            </div>
            <h4 className="mb-4">{error}</h4>
            <Button 
              variant="primary" 
              onClick={() => navigate('/coches')}
            >
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
  const { car, fechas, paymentOption, extras, detallesReserva, conductor } = reservaData;

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
      
      <Card className="shadow-sm">
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
            <h5 className="mb-0">Procesamiento de Pago</h5>
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
                <Form onSubmit={handleSubmit}>
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
                        <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                        Pago en Efectivo
                      </>
                    )}
                  </h5>
                  
                  {reservaData.metodoPago === PAYMENT_METHODS.CARD ? (
                    <div className="card-payment-info">
                      <div className="info-box mb-4 p-3 rounded" style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6'}}>
                        <div className="d-flex align-items-center mb-2">
                          <FontAwesomeIcon icon={faLock} className="me-2 text-success" />
                          <strong>
                            {STRIPE_ENABLED ? 'Pago Seguro con Stripe' : 'Pago Simulado (Modo Desarrollo)'}
                          </strong>
                        </div>
                        {STRIPE_ENABLED ? (
                          <p className="mb-0">
                            Tu pago será procesado de forma segura a través de Stripe, 
                            una plataforma de pagos reconocida mundialmente.
                          </p>
                        ) : (
                          <div>
                            <p className="mb-2 text-warning">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                              <strong>Modo Desarrollo:</strong> Los pagos con tarjeta están simulados.
                            </p>
                            <p className="mb-0 small">
                              En producción, los pagos se procesarían con Stripe de forma segura.
                              Por ahora, puedes usar el pago en efectivo para reservas reales.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {!STRIPE_ENABLED && (
                        <div className="simulation-notice alert alert-info">
                          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                          <strong>Simulación de Pago:</strong> Al proceder, se simulará un pago exitoso 
                          sin cargo real a ninguna tarjeta.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="cash-payment-info">
                      <div className="info-box mb-4 p-3 rounded" style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6'}}>
                        <div className="d-flex align-items-center mb-2">
                          <FontAwesomeIcon icon={faMoneyBillWave} className="me-2 text-success" />
                          <strong>Pago en Efectivo</strong>
                        </div>
                        <p className="mb-0">
                          Reserva ahora y paga cuando recojas el vehículo en nuestras oficinas.
                          Tu reserva quedará confirmada sin cargo inmediato.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                  {/* RESUMEN DEL PAGO */}
                <div className="payment-summary-box my-4 p-3 border rounded">
                  <h6 className="mb-3">Resumen del Pago</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total a pagar:</span>
                    <span className="fw-bold">
                      {(diferencia || reservaData.detallesReserva?.total || 0).toFixed(2)}€
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Método de pago:</span>
                    <span className="text-capitalize">
                      {reservaData.metodoPago === PAYMENT_METHODS.CARD ? 'Tarjeta de Crédito' : 'Efectivo'}
                    </span>
                  </div>
                  <small className="text-muted">
                    {reservaData.metodoPago === PAYMENT_METHODS.CARD 
                      ? (STRIPE_ENABLED 
                          ? 'Serás redirigido a Stripe para completar el pago de forma segura.'
                          : 'El pago será simulado en modo desarrollo.')
                      : 'Tu reserva se confirmará y podrás pagar al recoger el vehículo.'
                    }
                  </small>
                </div>
                
                {/* BOTONES DE ACCIÓN */}
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleVolver}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
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
                        {reservaData.metodoPago === PAYMENT_METHODS.CARD ? (
                          <>
                            <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                            {STRIPE_ENABLED ? 'Pagar con Tarjeta' : 'Simular Pago'}
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                            Confirmar Reserva
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </div>              </Form>
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
                      src={car?.imagen || car?.imagenPrincipal || 'https://via.placeholder.com/150x100?text=Coche'} 
                      alt={`${car?.marca} ${car?.modelo}`}
                      className="reserva-car-img me-3"
                    />
                    <div>
                      <h5>{car?.marca} {car?.modelo}</h5>
                      <p className="mb-0">{paymentOption === 'all-inclusive' ? 'All Inclusive' : 'Economy'}</p>
                    </div>
                  </div>
                  
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Recogida:</strong> {fechas?.pickupLocation || "Aeropuerto de Málaga"}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.pickupDate ? new Date(fechas.pickupDate).toLocaleDateString() : "14/05/2025"}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.pickupTime || "12:00"}
                    </div>
                  </div>

                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Devolución:</strong> {fechas?.dropoffLocation || "Aeropuerto de Málaga"}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.dropoffDate ? new Date(fechas.dropoffDate).toLocaleDateString() : "17/05/2025"}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.dropoffTime || "12:00"}
                    </div>
                  </div>

                  <div className="conductor-resumen mb-3">
                    <div>
                      <strong>Conductor:</strong> 
                      {reservaData.conductorPrincipal?.nombre} {reservaData.conductorPrincipal?.apellidos}
                    </div>
                    <div>
                      <p>Segundo Conductor:</p>
                      {reservaData.conductorSecundario?.nombre} {reservaData.conductorSecundario?.apellidos}  
                    </div>
                    
                  </div>
                  <hr />

                  {/* Detalles del precio */}
                  {detallesReserva && (
                    <div className="detalles-precio">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base:</span>
                        <span>{detallesReserva.precioCocheBase.toFixed(2)}€</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA (21%):</span>
                        <span>{detallesReserva.iva.toFixed(2)}€</span>
                      </div>
                      {detallesReserva.precioExtras > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>{detallesReserva.precioExtras.toFixed(2)}€</span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>{detallesReserva.total.toFixed(2)}€</span>
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