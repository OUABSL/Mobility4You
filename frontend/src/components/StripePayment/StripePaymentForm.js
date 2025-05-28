// frontend/src/components/StripePayment/StripePaymentForm.js
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLock, 
  faCreditCard, 
  faExclamationTriangle,
  faCheckCircle,
  faInfoCircle 
} from '@fortawesome/free-solid-svg-icons';
import { 
  createPaymentIntent, 
  confirmPaymentIntent,
  getStripeConfig,
  validateCardData,
  DEBUG_MODE 
} from '../../services/stripePaymentServices';
import '../../css/StripePaymentForm.css';

// Configuración de Stripe Elements
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#9e2146'
    }
  },
  hidePostalCode: true
};

// Componente interno del formulario (dentro de Elements provider)
const PaymentForm = ({ 
  reservaData, 
  tipoPago = 'INICIAL', 
  onPaymentSuccess, 
  onPaymentError,
  loading: externalLoading = false
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Extraer datos del conductor de la reserva
  useEffect(() => {
    if (reservaData?.conductor || reservaData?.conductorPrincipal) {
      const conductor = reservaData.conductor || reservaData.conductorPrincipal;
      setBillingDetails({
        name: `${conductor.nombre || ''} ${conductor.apellidos || ''}`.trim(),
        email: conductor.email || '',
        phone: conductor.telefono || ''
      });
    }
  }, [reservaData]);

  // Crear Payment Intent al montar el componente
  useEffect(() => {
    const initializePayment = async () => {
      if (!reservaData) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const intent = await createPaymentIntent(reservaData, tipoPago);
        
        if (intent.success) {
          setPaymentIntent(intent);
        } else {
          throw new Error(intent.error || 'Error creando el intento de pago');
        }
      } catch (err) {
        setError(err.message);
        if (onPaymentError) {
          onPaymentError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [reservaData, tipoPago, onPaymentError]);

  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !paymentIntent) {
      setError('El sistema de pagos no está listo. Por favor, intenta de nuevo.');
      return;
    }

    if (!cardComplete) {
      setError('Por favor, completa la información de la tarjeta.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validar la tarjeta antes de proceder
      const validation = await validateCardData(stripe, elements);
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Datos de tarjeta inválidos');
      }

      // Confirmar el pago
      const result = await confirmPaymentIntent(
        stripe, 
        elements, 
        paymentIntent.client_secret,
        {
          name: billingDetails.name,
          email: billingDetails.email,
          phone: billingDetails.phone
        }
      );

      if (result.success) {
        if (onPaymentSuccess) {
          onPaymentSuccess({
            ...result,
            numero_pedido: paymentIntent.numero_pedido,
            importe: paymentIntent.importe
          });
        }
      } else {
        throw new Error(result.error || 'Error procesando el pago');
      }
    } catch (err) {
      const errorMessage = err.message || 'Error procesando el pago';
      setError(errorMessage);
      
      if (onPaymentError) {
        onPaymentError(new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormReady = stripe && elements && paymentIntent && !externalLoading;
  const canSubmit = isFormReady && cardComplete && billingDetails.name && billingDetails.email;

  return (
    <Form onSubmit={handleSubmit}>
      {/* Información de seguridad */}
      <div className="payment-security-info mb-4">
        <div className="d-flex align-items-center mb-2">
          <FontAwesomeIcon icon={faLock} className="text-success me-2" />
          <strong>Pago 100% Seguro con Stripe</strong>
        </div>
        <small className="text-muted">
          {DEBUG_MODE && (
            <span className="badge bg-warning text-dark me-2">MODO DESARROLLO</span>
          )}
          Tus datos están protegidos con encriptación de nivel bancario
        </small>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </Alert>
      )}

      {/* Información del pago */}
      {paymentIntent && (
        <Card className="payment-summary-card mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1">Total a pagar</h6>
                <small className="text-muted">
                  Pedido: {paymentIntent.numero_pedido}
                </small>
              </div>
              <div className="text-end">
                <h4 className="mb-0 text-primary">
                  {new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: paymentIntent.currency?.toUpperCase() || 'EUR'
                  }).format(paymentIntent.importe)}
                </h4>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Datos de facturación */}
      <Card className="billing-details-card mb-4">
        <Card.Header>
          <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
          Datos de facturación
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre completo *</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={billingDetails.name}
                  onChange={handleBillingChange}
                  placeholder="Nombre y apellidos"
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={billingDetails.email}
                  onChange={handleBillingChange}
                  placeholder="tu@email.com"
                  required
                />
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control
                  type="tel"
                  name="phone"
                  value={billingDetails.phone}
                  onChange={handleBillingChange}
                  placeholder="+34 600 000 000"
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Datos de tarjeta */}
      <Card className="card-details-card mb-4">
        <Card.Header>
          <FontAwesomeIcon icon={faCreditCard} className="me-2" />
          Información de la tarjeta
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>Datos de la tarjeta *</Form.Label>
            <div className="stripe-card-element">
              {isFormReady ? (
                <CardElement
                  options={CARD_ELEMENT_OPTIONS}
                  onChange={handleCardChange}
                />
              ) : (
                <div className="card-element-loading">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Cargando formulario de pago...
                </div>
              )}
            </div>
          </Form.Group>
          
          {DEBUG_MODE && (
            <Alert variant="info" className="mt-3">
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              <strong>Modo desarrollo:</strong> Usa 4242 4242 4242 4242 con cualquier fecha futura y CVC
            </Alert>
          )}
          
          <div className="accepted-cards mt-3">
            <small className="text-muted">Aceptamos: </small>
            <span className="card-brands">
              <span className="badge bg-light text-dark me-1">Visa</span>
              <span className="badge bg-light text-dark me-1">Mastercard</span>
              <span className="badge bg-light text-dark me-1">American Express</span>
            </span>
          </div>
        </Card.Body>
      </Card>

      {/* Botón de pago */}
      <div className="d-grid">
        <Button
          variant="primary"
          size="lg"
          type="submit"
          disabled={!canSubmit || loading || externalLoading}
          className="payment-submit-btn"
        >
          {loading || externalLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Procesando pago...
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faLock} className="me-2" />
              Pagar {paymentIntent ? 
                new Intl.NumberFormat('es-ES', {
                  style: 'currency',
                  currency: paymentIntent.currency?.toUpperCase() || 'EUR'
                }).format(paymentIntent.importe) 
                : ''
              }
            </>
          )}
        </Button>
      </div>

      {/* Información adicional de seguridad */}
      <div className="payment-footer-info mt-3 text-center">
        <small className="text-muted">
          <FontAwesomeIcon icon={faLock} className="me-1" />
          Procesado de forma segura por Stripe. 
          No guardamos los datos de tu tarjeta.
        </small>
      </div>
    </Form>
  );
};

// Componente principal con provider de Stripe
const StripePaymentForm = ({ 
  reservaData, 
  tipoPago = 'INICIAL',
  onPaymentSuccess, 
  onPaymentError,
  loading = false
}) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        setConfigLoading(true);
        setConfigError(null);
        
        if (DEBUG_MODE) {
          // En modo debug, usar clave de prueba
          setStripePromise(loadStripe('pk_test_51234567890abcdef'));
        } else {
          // Obtener configuración del backend
          const config = await getStripeConfig();
          setStripePromise(loadStripe(config.publishable_key));
        }
      } catch (error) {
        setConfigError(error.message);
        if (onPaymentError) {
          onPaymentError(error);
        }
      } finally {
        setConfigLoading(false);
      }
    };

    initializeStripe();
  }, [onPaymentError]);

  if (configLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Inicializando sistema de pagos...</p>
      </div>
    );
  }

  if (configError) {
    return (
      <Alert variant="danger">
        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
        <strong>Error inicializando pagos:</strong> {configError}
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        reservaData={reservaData}
        tipoPago={tipoPago}
        onPaymentSuccess={onPaymentSuccess}
        onPaymentError={onPaymentError}
        loading={loading}
      />
    </Elements>
  );
};

export default StripePaymentForm;