// src/components/ReservaPasos/PagoDiferenciaReserva.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCarSide, 
  faCreditCard, 
  faCheckCircle, 
  faChevronLeft, 
  faHome, 
  faLock, 
  faExclamationTriangle,
  faMoneyBillWave,
  faCircleNotch
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { editReservation, findReservation, processPayment, DEBUG_MODE } from '../../services/reservationServices';
import ReservaClientePago from './ReservaClientePago';
import '../../css/PagoDiferenciaReserva.css';

const PagoDiferenciaReserva = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);
  const [success, setSuccess] = useState(false);
  const [diferencia, setDiferencia] = useState(location.state?.difference || 0);
  const [paymentMethod, setPaymentMethod] = useState('tarjeta'); // 'tarjeta' o 'efectivo'
  const [showCardPayment, setShowCardPayment] = useState(false);

  // Cargar datos de reserva
  useEffect(() => {
    const fetchReserva = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (DEBUG_MODE) {
          // Si venimos de edición, usar los datos temporales
          const editData = sessionStorage.getItem('editReservaData');
          if (editData) {
            const parsed = JSON.parse(editData);
            setDiferencia(parsed.priceEstimate.difference);
            data = { ...parsed.formData, id: parsed.id };
          } else {
            data = JSON.parse(sessionStorage.getItem('reservaData'));
          }
        } else {
          data = await findReservation(id, data?.email || '');
        }
        setReservaData(data);
      } catch (err) {
        setError('No se pudo cargar la reserva.');
      } finally {
        setLoading(false);
      }
    };
    fetchReserva();
  }, [id]);

  // Manejar selección de método de pago
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setShowCardPayment(false);
  };
  // Procesa el pago de la diferencia
  const handlePagar = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!reservaData) throw new Error('No hay datos de reserva.');
      
      // Si es pago con tarjeta, usar el procesamiento de pago
      if (paymentMethod === 'tarjeta') {
        // Preparar datos para el pago
        const paymentData = {
          metodo_pago: 'tarjeta',
          importe: diferencia,
          datos_pago: {
            titular: reservaData.conductor?.nombre 
              ? `${reservaData.conductor.nombre} ${reservaData.conductor.apellidos}` 
              : '',
            email: reservaData.conductor?.email || '',
            modoDiferencia: true
          }
        };
        
        // Procesar pago usando el nuevo servicio
        const paymentResult = await processPayment(reservaData.id, paymentData);
        
        // Si el pago no es exitoso, lanzar error
        if (!paymentResult || !paymentResult.success) {
          throw new Error(paymentResult?.error || 'Error al procesar el pago con tarjeta');
        }
      }
      
      // Actualizar campos de pago extra
      const updatedReserva = {
        ...reservaData,
        importe_pagado_extra: (reservaData.importe_pagado_extra || 0) + diferencia,
        importe_pendiente_extra: 0,
        metodo_pago_extra: paymentMethod,
        diferenciaPagada: true,
        metodoPagoDiferencia: paymentMethod
      };
      
      await editReservation(reservaData.id, updatedReserva);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al procesar el pago de la diferencia.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !reservaData) {
    return (
      <Container className="pago-diferencia-container my-5">
        <div className="loader-container">
          <Spinner animation="border" className="loader-spinner" />
          <p className="mt-3">Cargando datos de la reserva...</p>
        </div>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container className="pago-diferencia-container my-5">
        <div className="error-container">
          <Alert variant="danger" className="error-alert">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
          <Button variant="primary" className="btn-details" onClick={() => navigate('/')}>
            <FontAwesomeIcon icon={faHome} className="me-2" />
            Volver al inicio
          </Button>
        </div>
      </Container>
    );
  }
  
  if (success) {
    return (
      <Container className="pago-diferencia-container my-5">
        <Card className="pago-diferencia-card">
          <Card.Body>
            <div className="success-container">
              <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
              <h3 className="success-title">¡Pago realizado con éxito!</h3>
              <p className="success-message">
                La diferencia de {diferencia.toFixed(2)}€ ha sido abonada correctamente.
                {paymentMethod === 'efectivo' && ' Recuerda realizar el pago en efectivo cuando llegues a nuestras oficinas.'}
              </p>
              <Button 
                variant="primary" 
                className="btn-details" 
                onClick={() => navigate(`/reservations/${id}`)}
              >
                Ver Detalles de la Reserva
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }
  
  if (showCardPayment) {
    // Redirigir a componente de pago con tarjeta (Redsys)
    return <ReservaClientePago diferencia={diferencia} reservaId={id} modoDiferencia />;
  }

  return (
    <Container className="pago-diferencia-container my-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="pago-diferencia-card">
            <Card.Header>
              <FontAwesomeIcon icon={faCarSide} />
              <span className="ms-2">Pago de Diferencia de Reserva</span>
            </Card.Header>
            <Card.Body>
              <h5 className="mb-4">Debes abonar la diferencia para completar la modificación de tu reserva</h5>
              
              <div className="importe-container">
                <span className="importe-label">Importe a pagar:</span>
                <span className="importe-value">{diferencia.toFixed(2)}€</span>
              </div>
              
              <div className="secure-payment-info">
                <FontAwesomeIcon icon={faLock} />
                <span className="secure-payment-text">
                  Pago seguro y encriptado {DEBUG_MODE && '(simulado en modo desarrollo)'}
                </span>
              </div>
              
              <div className="payment-methods-container">
                <h6 className="method-title">Selecciona un método de pago</h6>
                
                <div 
                  className={`payment-method-option ${paymentMethod === 'tarjeta' ? 'selected' : ''}`}
                  onClick={() => handleSelectPaymentMethod('tarjeta')}
                >
                  <Form.Check
                    type="radio"
                    id="pago-tarjeta"
                    name="metodoPago"
                    checked={paymentMethod === 'tarjeta'}
                    onChange={() => handleSelectPaymentMethod('tarjeta')}
                    className="payment-method-radio"
                  />
                  <div className="payment-method-content">
                    <span className="payment-method-name">
                      <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                      Tarjeta de crédito/débito
                    </span>
                    <span className="payment-method-description">
                      Pago seguro con Redsys. Se aceptan Visa, Mastercard y American Express
                    </span>
                  </div>
                </div>
                
                <div 
                  className={`payment-method-option ${paymentMethod === 'efectivo' ? 'selected' : ''}`}
                  onClick={() => handleSelectPaymentMethod('efectivo')}
                >
                  <Form.Check
                    type="radio"
                    id="pago-efectivo"
                    name="metodoPago"
                    checked={paymentMethod === 'efectivo'}
                    onChange={() => handleSelectPaymentMethod('efectivo')}
                    className="payment-method-radio"
                  />
                  <div className="payment-method-content">
                    <span className="payment-method-name">
                      <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                      Efectivo en oficina
                    </span>
                    <span className="payment-method-description">
                      Reserva ahora y paga la diferencia cuando recojas el vehículo
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="action-buttons d-flex justify-content-between">
                <Button 
                  variant="success" 
                  className="btn-pagar" 
                  onClick={handlePagar} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faCircleNotch} spin className="me-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon className='me-1' icon={paymentMethod === 'tarjeta' ? faCreditCard : faMoneyBillWave} />
                      {paymentMethod === 'tarjeta' ? 'Pagar con tarjeta' : 'Confirmar pago en oficina'}
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline-secondary" 
                  className="btn-volver" 
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Volver
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PagoDiferenciaReserva;