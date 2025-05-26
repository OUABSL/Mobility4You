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
  faServer
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import '../../css/ReservaClientePago.css';
import { editReservation, findReservation, processPayment, DEBUG_MODE } from '../../services/reservationServices';

const ReservaClientePago = ({ diferencia = null, reservaId = null, modoDiferencia = false }) => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvc: ''
  });

  // ESTADOS para Redsys
  const [redsysLoading, setRedsysLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const formRef = useRef(null);

  const debugMode = true;

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
      setError('Error al cargar datos de reserva.');
    }
  }, [diferencia, reservaId, modoDiferencia]);


  const handleVolver = () => {
    navigate('/reservation-confirmation/datos');
  };

  // FUNCIÓN PARA GENERAR DATOS DE REDSYS
  const generateRedsysData = (reservaData, total) => {
    // Configuración desde variables de entorno
    const merchantCode = process.env.REACT_APP_REDSYS_MERCHANT_CODE || '999008881';
    const terminal = '001';
    const currency = '978'; // EUR
    const transactionType = '0'; // Autorización
    
    // Generar número de pedido único
    const orderNumber = `RSV${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    // URLs para Django backend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const frontendUrl = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
    
    // Datos para Redsys
    const redsysParams = {
      DS_MERCHANT_AMOUNT: Math.round(total * 100).toString(), // Céntimos
      DS_MERCHANT_ORDER: orderNumber,
      DS_MERCHANT_MERCHANTCODE: merchantCode,
      DS_MERCHANT_CURRENCY: currency,
      DS_MERCHANT_TRANSACTIONTYPE: transactionType,
      DS_MERCHANT_TERMINAL: terminal,
      DS_MERCHANT_MERCHANTURL: `${backendUrl}/api/payments/redsys/notify/`,
      DS_MERCHANT_URLOK: `${backendUrl}/api/payments/redsys/success/`,
      DS_MERCHANT_URLKO: `${backendUrl}/api/payments/redsys/error/`,
      DS_MERCHANT_PRODUCTDESCRIPTION: `Reserva vehículo ${reservaData.car.marca} ${reservaData.car.modelo}`,
      DS_MERCHANT_TITULAR: `${reservaData.conductorPrincipal.nombre} ${reservaData.conductorPrincipal.apellidos}`,
      DS_MERCHANT_MERCHANTDATA: JSON.stringify({
        reservaId: orderNumber,
        email: reservaData.conductorPrincipal.email
      })
    };
    
    return { redsysParams, orderNumber };
  };

  // 2. ACTUALIZAR LA FUNCIÓN processRedsysPayment para usar Django API
  const processRedsysPayment = async () => {
    setRedsysLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      const total = diferencia || reservaData?.detallesReserva?.total || reservaData?.total || 0;
      const { redsysParams, orderNumber } = generateRedsysData(reservaData, total);
      const response = await fetch(`${backendUrl}/api/payments/redsys/prepare/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redsysParams, reservaData })
      });
      if (!response.ok) throw new Error('Error preparando pago con Redsys');
      const data = await response.json();
      setPaymentData(data);
      // Redirigir a Redsys
      if (data.redsysUrl && data.merchantParameters && data.signature) {
        // Crear y enviar formulario a Redsys
        const form = document.createElement('form');
        form.action = data.redsysUrl;
        form.method = 'POST';
        form.style.display = 'none';
        form.innerHTML = `
          <input type="hidden" name="Ds_SignatureVersion" value="${data.signatureVersion}" />
          <input type="hidden" name="Ds_MerchantParameters" value="${data.merchantParameters}" />
          <input type="hidden" name="Ds_Signature" value="${data.signature}" />
        `;
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error('Respuesta de Redsys incompleta');
      }
    } catch (error) {
      setError(error.message || 'Error al procesar el pago con Redsys.');
    } finally {
      setRedsysLoading(false);
    }
  };

  // FUNCIÓN PARA VERIFICAR ESTADO DEL PAGO
  const checkPaymentStatus = async (orderNumber) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/payments/redsys/status/${orderNumber}/`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!reservaData) throw new Error('No hay datos de reserva.');
      
      // Calcular importe a pagar
      let importeAPagar = 0;
      if (modoDiferencia && diferencia) {
        importeAPagar = diferencia;
      } else if (reservaData.detallesReserva && reservaData.detallesReserva.total) {
        importeAPagar = reservaData.detallesReserva.total;
      }
      
      // Preparar datos de pago
      const paymentData = {
        metodo_pago: reservaData.metodoPago || 'tarjeta',
        importe: importeAPagar,
        datos_pago: {
          titular: reservaData.conductorPrincipal?.nombre 
            ? `${reservaData.conductorPrincipal.nombre} ${reservaData.conductorPrincipal.apellidos}` 
            : '',
          email: reservaData.conductorPrincipal?.email || '',
          modoDiferencia: modoDiferencia
        }
      };
      
      // Procesar pago usando el nuevo servicio
      const paymentResult = await processPayment(reservaData.id, paymentData);
      
      // Si el pago es exitoso, actualizar datos y redireccionar
      if (paymentResult && paymentResult.success) {
        // Actualizar campos de pago extra
        const updatedReserva = {
          ...reservaData,
          importe_pagado_extra: (reservaData.importe_pagado_extra || 0) + importeAPagar,
          importe_pendiente_extra: 0,
          transaction_id: paymentResult.transaction_id,
          fecha_pago: new Date().toISOString()
        };
        
        const result = await editReservation(reservaData.id, updatedReserva);
        
        sessionStorage.setItem('reservaData', JSON.stringify(result));
        
        if (modoDiferencia) {
          navigate(`/reservations/${reservaData.id}?email=${reservaData.conductor?.email || ''}`, { replace: true });
        } else {
          navigate('/reservation-confirmation/exito');
        }
      } else {
        throw new Error(paymentResult?.error || 'Error al procesar el pago');
      }
    } catch (err) {
      setError(err.message || 'Error al procesar el pago.');
    } finally {
      setLoading(false);
    }
  };


  // 4. EFECTO PARA VERIFICAR ESTADO DEL PAGO AL REGRESAR DE REDSYS
  useEffect(() => {
    // Verificar si venimos de Redsys con parámetros de éxito/error
    const urlParams = new URLSearchParams(window.location.search);
    const paymentResult = urlParams.get('payment');
    const orderNumber = urlParams.get('order');
    
    if (paymentResult && orderNumber) {
      if (paymentResult === 'success') {
        // Verificar estado del pago en el backend
        checkPaymentStatus(orderNumber).then(paymentData => {
          if (paymentData && paymentData.status === 'COMPLETADO') {
            // Actualizar sessionStorage y redirigir a éxito
            const completedData = {
              ...reservaData,
              reservaId: orderNumber,
              fechaPago: paymentData.paid_at,
              estadoPago: 'completado',
              codigoAutorizacion: paymentData.authorization_code
            };
            sessionStorage.setItem('reservaCompletada', JSON.stringify(completedData));
            navigate('/reservation-confirmation/exito', { replace: true });
          }
        });
      } else if (paymentResult === 'failed') {
        // Redirigir a error con información del pago fallido
        navigate('/reservation-confirmation/error', { 
          state: { 
            errorType: 'payment',
            errorMessage: 'El pago con tarjeta no pudo ser procesado. Por favor, inténtalo de nuevo.'
          },
          replace: true 
        });
      }
    }
  }, [navigate, reservaData]);

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
                {reservaData.metodoPago === 'tarjeta' ? (
                  // PAGO CON TARJETA (REDSYS)
                  <div className="redsys-payment-form">
                    <h5 className="mb-3">
                      <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                      Pago Seguro con Tarjeta
                    </h5>
                    
                    <div className="redsys-info-box mb-4 p-3 rounded" style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6'}}>
                      <div className="d-flex align-items-center mb-2">
                        <FontAwesomeIcon icon={faLock} className="me-2 text-success" />
                        <strong>Pago 100% Seguro con Redsys</strong>
                      </div>
                      <p className="mb-2">Tu pago será procesado de forma segura a través de <strong>Redsys</strong>, la plataforma de pagos líder en España utilizada por los principales bancos españoles.</p>
                      <ul className="mb-0 small">
                        <li>Tecnología de encriptación SSL de máximo nivel</li>
                        <li>Cumplimiento estricto PCI DSS</li>
                        <li>Protección avanzada contra fraude</li>
                        <li>Compatible con 3D Secure para mayor seguridad</li>
                        <li>Procesado por tu banco de confianza</li>
                      </ul>
                    </div>
                    
                    <div className="backend-status mb-3">
                      <small className="text-muted">
                        <FontAwesomeIcon icon={faServer} className="me-1" />
                        Conectado con servidor Django: {process.env.REACT_APP_BACKEND_URL || 'localhost:8000'}
                      </small>
                    </div>
                    
                    <div className="accepted-cards mb-4">
                      <h6 className="mb-2">Tarjetas aceptadas:</h6>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <div className="card-brand">
                          <img src="/assets/img/cards/visa.png" alt="Visa" style={{height: '30px'}} onError={(e) => e.target.style.display = 'none'} />
                          <span className="visually-hidden">Visa</span>
                        </div>
                        <div className="card-brand">
                          <img src="/assets/img/cards/mastercard.png" alt="Mastercard" style={{height: '30px'}} onError={(e) => e.target.style.display = 'none'} />
                          <span className="visually-hidden">Mastercard</span>
                        </div>
                        <div className="card-brand">
                          <img src="/assets/img/cards/maestro.png" alt="Maestro" style={{height: '30px'}} onError={(e) => e.target.style.display = 'none'} />
                          <span className="visually-hidden">Maestro</span>
                        </div>
                        <div className="card-brand">
                          <img src="/assets/img/cards/amex.png" alt="American Express" style={{height: '30px'}} onError={(e) => e.target.style.display = 'none'} />
                          <span className="visually-hidden">American Express</span>
                        </div>
                        <span className="text-muted small">+ todas las principales tarjetas bancarias</span>
                      </div>
                    </div>
                    
                    {redsysLoading && (
                      <div className="processing-payment text-center p-4">
                        <Spinner animation="border" variant="primary" className="mb-3" />
                        <h6>Preparando pago seguro...</h6>
                        <p className="text-muted">Estamos configurando tu pago con Redsys. Serás redirigido a la plataforma de pago de tu banco en unos segundos.</p>
                        <div className="mt-3">
                          <small className="text-info">
                            <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
                            No cierres esta ventana durante el proceso
                          </small>
                        </div>
                      </div>
                    )}
                    
                    {error && (
                      <div className="alert alert-danger mt-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                        {error}
                      </div>
                    )}
                  </div>
                ) : (
                  // PAGO CON PAYPAL (mantener igual)
                  <div className="paypal-payment-form">
                    <h5 className="mb-3">
                      <img src="/assets/img/paypal-logo.png" alt="PayPal" style={{height: '24px'}} onError={(e) => e.target.style.display = 'none'} />
                      Pago con PayPal
                    </h5>
                    
                    <div className="paypal-info-box mb-4 p-3 rounded" style={{backgroundColor: '#f8f9fa', border: '1px solid #dee2e6'}}>
                      <div className="d-flex align-items-center mb-2">
                        <FontAwesomeIcon icon={faLock} className="me-2 text-success" />
                        <strong>Pago Seguro con PayPal</strong>
                      </div>
                      <p className="mb-0">Serás redirigido a PayPal para completar tu pago de forma segura. No necesitas crear una cuenta PayPal, también puedes pagar con tarjeta.</p>
                    </div>
                  </div>
                )}
                
                <div className="payment-summary-box my-4 p-3 border rounded">
                  <h6 className="mb-3">Resumen del Pago</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total a pagar:</span>
                    <span className="fw-bold">{reservaData.detallesReserva?.total.toFixed(2) || '0.00'}€</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Método de pago:</span>
                    <span className="text-capitalize">{reservaData.metodoPago === 'tarjeta' ? 'Tarjeta de Crédito' : 'PayPal'}</span>
                  </div>
                  <small className="text-muted">
                    Al hacer clic en "Proceder al Pago", {reservaData.metodoPago === 'tarjeta' ? 'serás redirigido a la plataforma segura de Redsys' : 'serás redirigido a PayPal'} para completar tu pago.
                  </small>
                </div>
                
                <div className="d-flex justify-content-between">
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleVolver}
                    disabled={loading || redsysLoading}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
                    Volver
                  </Button>
                  <Button 
                    variant="primary" 
                    type="submit"
                    className="payment-btn"
                    disabled={loading || redsysLoading}
                  >
                    {loading || redsysLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        {redsysLoading ? 'Preparando pago...' : 'Procesando...'}
                      </>
                    ) : (
                      'Proceder al Pago'
                    )}
                  </Button>
                </div>
              </Form>
            </Col>

            {/* FORMULARIO OCULTO PARA REDSYS */}
            {paymentData && (
              <form
                ref={formRef}
                method="POST"
                action={paymentData.action}
                style={{ display: 'none' }}
              >
                <input
                  type="hidden"
                  name="Ds_SignatureVersion"
                  value={paymentData.signatureVersion}
                />
                <input
                  type="hidden"
                  name="Ds_MerchantParameters"
                  value={paymentData.merchantParameters}
                />
                <input
                  type="hidden"
                  name="Ds_Signature"
                  value={paymentData.signature}
                />
              </form>
            )}

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