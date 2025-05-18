// src/components/ReservaClienteConfirmar.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Table } from 'react-bootstrap';
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
  faUser,
  faCreditCard
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../css/ReservaClienteConfirmar.css';

const ReservaClienteConfirmar = ({ reservaData, onGoBack }) => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [reservaId, setReservaId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    tipoDocumento: 'dni',
    numeroDocumento: '',
    metodoPago: 'tarjeta',
    aceptaTerminos: false
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica del formulario
    if (!formData.nombre || !formData.apellidos || !formData.email || !formData.telefono || 
        !formData.numeroDocumento || !formData.aceptaTerminos) {
      setError('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // En producción, aquí iría la llamada real a la API
      // const response = await axios.post('/api/reservations', {
      //   ...reservaData,
      //   conductor: {
      //     nombre: formData.nombre,
      //     apellidos: formData.apellidos,
      //     email: formData.email,
      //     telefono: formData.telefono,
      //     tipoDocumento: formData.tipoDocumento,
      //     numeroDocumento: formData.numeroDocumento
      //   },
      //   metodoPago: formData.metodoPago
      // });
      
      // Simulamos una espera de red
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generamos un ID de reserva aleatorio para testing
      const randomId = 'R' + Math.floor(Math.random() * 1000000).toString().padStart(8, '0');
      setReservaId(randomId);
      setSuccess(true);
      
      // En una implementación real, se obtendría el ID de la reserva de la respuesta de la API
      // setReservaId(response.data.reservaId);
    } catch (error) {
      console.error('Error al procesar la reserva:', error);
      setError('Ha ocurrido un error al procesar tu reserva. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const { car, fechas, paymentOption, extras, detallesReserva } = reservaData || {};

  return (
    <Container className="reserva-confirmar my-4">
      {success ? (
        <Card className="shadow-sm">
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">¡Reserva Confirmada!</h5>
          </Card.Header>
          <Card.Body className="text-center">
            <div className="confirmation-icon mb-4">
              <FontAwesomeIcon icon={faCheck} size="4x" className="text-success" />
            </div>
            <h4>Tu reserva se ha completado con éxito</h4>
            <p className="lead mb-4">Identificador de reserva: <strong>{reservaId}</strong></p>
            <p>Hemos enviado un correo electrónico a <strong>{formData.email}</strong> con todos los detalles de tu reserva.</p>
            <hr className="my-4" />
            <p>Puedes consultar o modificar tu reserva en cualquier momento desde la sección "Gestión de Reservas".</p>
            <div className="mt-4">
              <Button 
                variant="primary" 
                onClick={() => navigate('/reservations')}
                className="me-3"
              >
                Ir a Gestión de Reservas
              </Button>
              <Button 
                variant="outline-primary" 
                onClick={() => navigate('/')}
              >
                Volver a inicio
              </Button>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <Card.Header className="bg-primario text-white">
            <div className="d-flex justify-content-between align-items-center">
              <Button 
                variant="link" 
                className="text-white p-0" 
                onClick={onGoBack}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
                Volver
              </Button>
              <h5 className="mb-0">Confirmar y finalizar reserva</h5>
              <div style={{ width: '80px' }}></div>
            </div>
          </Card.Header>
          
          <Card.Body>
            <Row>
              {/* Columna izquierda: Formulario de conductor */}
              <Col lg={7}>
                <h5 className="mb-3">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Datos del conductor
                </h5>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nombre *</Form.Label>
                        <Form.Control
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Apellidos *</Form.Label>
                        <Form.Control
                          type="text"
                          name="apellidos"
                          value={formData.apellidos}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email *</Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Teléfono *</Form.Label>
                        <Form.Control
                          type="tel"
                          name="telefono"
                          value={formData.telefono}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Tipo de documento *</Form.Label>
                        <Form.Select
                          name="tipoDocumento"
                          value={formData.tipoDocumento}
                          onChange={handleInputChange}
                        >
                          <option value="dni">DNI</option>
                          <option value="nie">NIE</option>
                          <option value="pasaporte">Pasaporte</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Número de documento *</Form.Label>
                        <Form.Control
                          type="text"
                          name="numeroDocumento"
                          value={formData.numeroDocumento}
                          onChange={handleInputChange}
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <hr className="my-4" />
                  
                  <h5 className="mb-3">
                    <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                    Método de pago
                  </h5>
                  
                  <Form.Group className="mb-4">
                    <div className="payment-methods">
                      <div 
                        className={`payment-method ${formData.metodoPago === 'tarjeta' ? 'selected' : ''}`}
                        onClick={() => setFormData({...formData, metodoPago: 'tarjeta'})}
                      >
                        <div className="payment-check">
                          <Form.Check
                            type="radio"
                            name="metodoPago"
                            id="metodo-tarjeta"
                            checked={formData.metodoPago === 'tarjeta'}
                            onChange={() => {}}
                            label=""
                          />
                        </div>
                        <div className="payment-logo">
                          <img 
                            src="https://via.placeholder.com/60x30?text=VISA" 
                            alt="Tarjeta" 
                            className="me-2" 
                          />
                          <img 
                            src="https://via.placeholder.com/60x30?text=MASTERCARD" 
                            alt="Tarjeta" 
                          />
                        </div>
                        <div className="payment-details">
                          <span>Pago con tarjeta</span>
                          <small>El cargo se realizará al finalizar la reserva</small>
                        </div>
                      </div>
                      
                      <div 
                        className={`payment-method ${formData.metodoPago === 'paypal' ? 'selected' : ''}`}
                        onClick={() => setFormData({...formData, metodoPago: 'paypal'})}
                      >
                        <div className="payment-check">
                          <Form.Check
                            type="radio"
                            name="metodoPago"
                            id="metodo-paypal"
                            checked={formData.metodoPago === 'paypal'}
                            onChange={() => {}}
                            label=""
                          />
                        </div>
                        <div className="payment-logo">
                          <img 
                            src="https://via.placeholder.com/60x30?text=PAYPAL" 
                            alt="PayPal" 
                          />
                        </div>
                        <div className="payment-details">
                          <span>Pago con PayPal</span>
                          <small>Serás redirigido a PayPal para completar el pago</small>
                        </div>
                      </div>
                    </div>
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      id="aceptaTerminos"
                      name="aceptaTerminos"
                      checked={formData.aceptaTerminos}
                      onChange={handleInputChange}
                      label={
                        <span>
                          He leído y acepto los <a href="/terminos" target="_blank">términos y condiciones</a> y la <a href="/privacidad" target="_blank">política de privacidad</a> *
                        </span>
                      }
                    />
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between">
                    <Button 
                      variant="outline-secondary" 
                      onClick={onGoBack}
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
                      Volver
                    </Button>
                    <Button 
                      variant="primary" 
                      type="submit"
                      className="confirmacion-btn"
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
                        'Confirmar reserva'
                      )}
                    </Button>
                  </div>
                </Form>
              </Col>

              {/* Columna derecha: Resumen de la reserva */}
              <Col lg={5}>
                <Card className="mb-4 resumen-reserva">
                  <Card.Header>
                    <FontAwesomeIcon icon={faCarSide} className="me-2" />
                    Resumen de tu reserva
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex align-items-center mb-3">
                      <img 
                        src={car?.imagen || 'https://via.placeholder.com/150x100?text=Coche'} 
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

                    <div className="proteccion mb-3">
                      <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                      <strong>Protección:</strong> {paymentOption === 'all-inclusive' ? 'Todo incluido sin franquicia' : 'Básica con franquicia'}
                    </div>

                    {/* Lista de extras seleccionados */}
                    {extras && extras.length > 0 && (
                      <div className="extras mb-3">
                        <strong>Extras seleccionados:</strong>
                        <ul className="extras-list">
                          {extras.map((extra, index) => (
                            <li key={index}>
                              <FontAwesomeIcon icon={faPlus} />
                              {extra.nombre} ({extra.precio.toFixed(2)}€/día)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
      )}
    </Container>
  );
};

export default ReservaClienteConfirmar;