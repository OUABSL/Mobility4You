// src/components/ReservaPasos/ReservaClienteConfirmar.js
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
  faMoneyBillWave,
  faCreditCard,
  faHome,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../css/ReservaClienteConfirmar.css';
import CardLogo from '../../img/general/logo_visa_mastercard.png';
import paypalLogo from '../../img/general/paypal_logo.png';

const ReservaClienteConfirmar = () => {
  const navigate = useNavigate();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);


  // Estado inicial del formulario
  // Se inicializa con valores vacíos y algunos predeterminados
  const [formData, setFormData] = useState({
    // Conductor principal
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    fechaNacimiento: '',
    nacionalidad: '',
    tipoDocumento: 'dni',
    numeroDocumento: '',
    // Dirección del conductor principal
    calle: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    codigoPostal: '',
    // Conductor adicional (opcional)
    tieneSegundoConductor: false,
    segundoConductor: {
      nombre: '',
      apellidos: '',
      email: '',
      telefono: '',
      fechaNacimiento: ''
    },
    // Método de pago
    metodoPago: 'tarjeta',
    aceptaTerminos: false
  });

  // Cargar datos de reserva del sessionStorage al iniciar
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('reservaData');
      if (!storedData) {
        setError('No se encontraron datos de reserva. Por favor, inicia el proceso desde la selección de vehículo.');
        return;
      }
      
      const parsedData = JSON.parse(storedData);
      
      // Convertir fechas de string a Date si es necesario
      if (parsedData.fechas) {
        if (typeof parsedData.fechas.pickupDate === 'string') {
          parsedData.fechas.pickupDate = new Date(parsedData.fechas.pickupDate);
        }
        if (typeof parsedData.fechas.dropoffDate === 'string') {
          parsedData.fechas.dropoffDate = new Date(parsedData.fechas.dropoffDate);
        }
      }
      
      setReservaData(parsedData);
    } catch (err) {
      console.error('Error al cargar datos de reserva:', err);
      setError('Error al cargar datos de reserva. Por favor, inténtalo de nuevo.');
    }
  }, []);

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejar campos del segundo conductor
    if (name.startsWith('segundoConductor.')) {
      const fieldName = name.replace('segundoConductor.', '');
      setFormData({
        ...formData,
        segundoConductor: {
          ...formData.segundoConductor,
          [fieldName]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleVolver = () => {
    navigate('/reservation-confirmation');
  };

  // Manejar el envío del formulario
  // Validar los datos del formulario antes de enviarlos
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación del conductor principal
    if (!formData.nombre || !formData.apellidos || !formData.email || !formData.telefono || 
        !formData.fechaNacimiento || !formData.nacionalidad || !formData.numeroDocumento || 
        !formData.calle || !formData.ciudad || !formData.provincia || !formData.codigoPostal ||
        !formData.aceptaTerminos) {
        console.log(JSON.stringify(formData));
      setError('Por favor, completa todos los campos obligatorios del conductor principal.');
      return;
    }

    // Validación del segundo conductor si está seleccionado
    if (formData.tieneSegundoConductor) {
      if (!formData.segundoConductor.nombre || !formData.segundoConductor.apellidos || 
          !formData.segundoConductor.email || !formData.segundoConductor.fechaNacimiento) {
        setError('Por favor, completa todos los campos obligatorios del segundo conductor.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Actualizar datos de reserva con información completa
      const datosConductor = {
        ...reservaData,
        conductorPrincipal: {
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          email: formData.email,
          telefono: formData.telefono,
          fechaNacimiento: formData.fechaNacimiento,
          nacionalidad: formData.nacionalidad,
          tipoDocumento: formData.tipoDocumento,
          numeroDocumento: formData.numeroDocumento,
          direccion: {
            calle: formData.calle,
            ciudad: formData.ciudad,
            provincia: formData.provincia,
            pais: formData.pais,
            codigoPostal: formData.codigoPostal
          }
        },
        tieneSegundoConductor: formData.tieneSegundoConductor,
        segundoConductor: formData.tieneSegundoConductor ? formData.segundoConductor : null,
        metodoPago: formData.metodoPago
      };
      
      // Guardar en sessionStorage para mantener los datos
      sessionStorage.setItem('reservaData', JSON.stringify(datosConductor));
      
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redireccionar según método de pago
      if (formData.metodoPago === 'efectivo') {
        // Para efectivo, ir directamente a confirmación
        navigate('/reservation-confirmation/exito');
      } else {
        // Para tarjeta/PayPal, ir a proceso de pago
        navigate('/reservation-confirmation/pago');
      }
    } catch (error) {
      console.error('Error al procesar los datos del conductor:', error);
      setError('Ha ocurrido un error al procesar tus datos. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };


  // Si hay error, mostrar pantalla de error
  if (error) {
    return (
      <Container className="reserva-confirmar my-5">
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
      <Container className="reserva-confirmar my-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Cargando datos de la reserva...</p>
        </div>
      </Container>
    );
  }

  const { car, fechas, paymentOption, extras, detallesReserva } = reservaData;

  return (
    <Container className="reserva-confirmar my-4">
      <div className="reservation-progress mb-4">
        <div className="progress-steps">
          <div className="step completed">1. Selección de Extras</div>
          <div className="step active">2. Datos del Conductor</div>
          <div className="step">3. Pago</div>
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
            <h5 className="mb-0">Datos del Conductor</h5>
            <div style={{ width: '80px' }}></div>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Row>
            {/* Columna izquierda: Formulario de conductor */}
            <Col lg={7}>
              <h5 className="mb-3">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Ingresa tus datos para completar la reserva
              </h5>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                {/* SECCIÓN: DATOS DEL CONDUCTOR PRINCIPAL */}
                <h6 className="mb-3 text-primary">
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  Conductor Principal
                </h6>
                
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
                      <Form.Label>Fecha de Nacimiento *</Form.Label>
                      <Form.Control
                        type="date"
                        name="fechaNacimiento"
                        value={formData.fechaNacimiento}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nacionalidad *</Form.Label>
                      <Form.Control
                        type="text"
                        name="nacionalidad"
                        value={formData.nacionalidad}
                        onChange={handleInputChange}
                        placeholder="Ej: Española"
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

                {/* SECCIÓN: DIRECCIÓN DEL CONDUCTOR */}
                <h6 className="mb-3 mt-4 text-primary">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                  Dirección
                </h6>
                
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Calle y número *</Form.Label>
                      <Form.Control
                        type="text"
                        name="calle"
                        value={formData.calle}
                        onChange={handleInputChange}
                        placeholder="Ej: Calle Mayor, 123"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ciudad *</Form.Label>
                      <Form.Control
                        type="text"
                        name="ciudad"
                        value={formData.ciudad}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Provincia *</Form.Label>
                      <Form.Control
                        type="text"
                        name="provincia"
                        value={formData.provincia}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>País *</Form.Label>
                      <Form.Control
                        type="text"
                        name="pais"
                        value={formData.pais}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Código Postal *</Form.Label>
                      <Form.Control
                        type="text"
                        name="codigoPostal"
                        value={formData.codigoPostal}
                        onChange={handleInputChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* SECCIÓN: SEGUNDO CONDUCTOR (OPCIONAL) */}
                <hr className="my-4" />
                
                <div className="mb-3">
                  <Form.Check
                    type="checkbox"
                    id="tieneSegundoConductor"
                    name="tieneSegundoConductor"
                    checked={formData.tieneSegundoConductor}
                    onChange={handleInputChange}
                    label="Añadir segundo conductor (opcional)"
                  />
                </div>

                {formData.tieneSegundoConductor && (
                  <div className="segundo-conductor-form">
                    <h6 className="mb-3 text-secondary">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Segundo Conductor
                    </h6>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nombre *</Form.Label>
                          <Form.Control
                            type="text"
                            name="segundoConductor.nombre"
                            value={formData.segundoConductor.nombre}
                            onChange={handleInputChange}
                            required={formData.tieneSegundoConductor}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Apellidos *</Form.Label>
                          <Form.Control
                            type="text"
                            name="segundoConductor.apellidos"
                            value={formData.segundoConductor.apellidos}
                            onChange={handleInputChange}
                            required={formData.tieneSegundoConductor}
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
                            name="segundoConductor.email"
                            value={formData.segundoConductor.email}
                            onChange={handleInputChange}
                            required={formData.tieneSegundoConductor}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Teléfono</Form.Label>
                          <Form.Control
                            type="tel"
                            name="segundoConductor.telefono"
                            value={formData.segundoConductor.telefono}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Fecha de Nacimiento *</Form.Label>
                          <Form.Control
                            type="date"
                            name="segundoConductor.fechaNacimiento"
                            value={formData.segundoConductor.fechaNacimiento}
                            onChange={handleInputChange}
                            required={formData.tieneSegundoConductor}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>
                )}
                
                <hr className="my-4" />
                
                {/* SECCIÓN: MÉTODO DE PAGO ACTUALIZADA */}
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
                          src={CardLogo}
                          alt="Tarjeta" 
                          className="me-2"
                          style={{ width: '60px' }}
                        />
                      </div>
                      <div className="payment-details">
                        <span>Pago con tarjeta (Stripe)</span>
                        <small>Procesamiento seguro con Stripe</small>
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
                          src={paypalLogo} 
                          alt="PayPal" 
                          style={{ width: '60px' }}
                          className="me-2"
                        />
                      </div>
                      <div className="payment-details">
                        <span>Pago con PayPal</span>
                        <small>Serás redirigido a PayPal para completar el pago</small>
                      </div>
                    </div>
                    
                    <div 
                      className={`payment-method ${formData.metodoPago === 'efectivo' ? 'selected' : ''}`}
                      onClick={() => setFormData({...formData, metodoPago: 'efectivo'})}
                    >
                      <div className="payment-check">
                        <Form.Check
                          type="radio"
                          name="metodoPago"
                          id="metodo-efectivo"
                          checked={formData.metodoPago === 'efectivo'}
                          onChange={() => {}}
                          label=""
                        />
                      </div>
                      <div className="payment-logo">
                        <FontAwesomeIcon icon={faMoneyBillWave} size="2x" className="text-success me-2" />
                      </div>
                      <div className="payment-details">
                        <span>Pago en efectivo</span>
                        <small>Paga al recoger el vehículo</small>
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
                        He leído y acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer">términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener noreferrer">política de privacidad</a> *
                      </span>
                    }
                  />
                </Form.Group>
                
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
                    className="confirmacion-btn"
                    disabled={loading || !formData.aceptaTerminos}
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
                      formData.metodoPago === 'efectivo' ? 'Confirmar Reserva' : 'Continuar al pago'
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
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
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
    </Container>
  );
};

export default ReservaClienteConfirmar;