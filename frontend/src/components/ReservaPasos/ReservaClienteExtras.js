// src/components/ReservaPasos/ReservaClienteExtras.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCarSide, 
  faCalendarAlt, 
  faClock, 
  faMapMarkerAlt, 
  faShieldAlt, 
  faTimes, 
  faCheck,
  faInfoCircle,
  faChevronLeft,
  faHome
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../css/ReservaClienteExtras.css';
import { createReservation, editReservation, findReservation, DEBUG_MODE } from '../../services/reservationServices';

import wifiLogo from '../../assets/img/extras/wifi.png';
import gpsLogo from '../../assets/img/extras/gps.png';
import asientoLogo from '../../assets/img/extras/child-seat.png';
import conductorLogo from '../../assets/img/extras/secondary-driver.png';

// Datos de prueba para extras disponibles
const extrasDisponibles = [
  {
    id: 1,
    nombre: 'Asiento infantil',
    descripcion: 'Para niños de 9-18kg (1-4 años)',
    precio: 7.50,
    imagen: asientoLogo
  },
  {
    id: 2,
    nombre: 'GPS',
    descripcion: 'Navegador con mapas updated_ats',
    precio: 8.95,
    imagen: gpsLogo
  },
  {
    id: 3,
    nombre: 'Conductor adicional',
    descripcion: 'Añade un conductor adicional a tu reserva',
    precio: 5.00,
    imagen: conductorLogo
  },
  {
    id: 4,
    nombre: 'Wi-Fi portátil',
    descripcion: 'Conexión 4G en todo el vehículo',
    precio: 6.95,
    imagen: wifiLogo
  }
];

const ReservaClienteExtras = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);
  const [detallesReserva, setDetallesReserva] = useState(null);
  const [totalExtras, setTotalExtras] = useState(0);
  
  // Cargar datos de reserva del sessionStorage al iniciar
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('reservaData');
      if (!storedData) {
        setError('No se encontraron datos de reserva.');
        return;
      }
      setReservaData(JSON.parse(storedData));
    } catch (err) {
      setError('Error al cargar datos de reserva.');
    }
  }, []);
  
  // Calcular fechas y días de alquiler
  const diasAlquiler = reservaData?.fechas ? 
    Math.ceil((new Date(reservaData.fechas.dropoffDate) - new Date(reservaData.fechas.pickupDate)) / (1000 * 60 * 60 * 24)) : 
    3; // Valor por defecto

  // Efecto para calcular y actualizar el total de extras
  useEffect(() => {
    const total = extrasSeleccionados.reduce((sum, extraId) => {
      const extra = extrasDisponibles.find(e => e.id === extraId);
      return sum + (extra ? extra.precio * diasAlquiler : 0);
    }, 0);
    setTotalExtras(total);
  }, [extrasSeleccionados, diasAlquiler]);

  // Efecto para calcular los detalles de la reserva
  useEffect(() => {
    if (!reservaData) return;
    
    const precioCocheBase = reservaData.car.precio_dia * diasAlquiler;
    const iva = precioCocheBase * 0.21;
    const detalles = {
      precioCocheBase,
      iva,
      precioExtras: totalExtras,
      total: precioCocheBase + iva + totalExtras
    };
    setDetallesReserva(detalles);
  }, [reservaData, diasAlquiler, totalExtras]);

  // Manejador para seleccionar/deseleccionar extras
  const toggleExtra = (extraId) => {
    setExtrasSeleccionados(prev => 
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  // Manejador para volver a la selección de coches
  const handleVolver = () => {
    // Redirigir a la página anterior
    navigate(-1);
  };

  // Manejador para continuar con la reserva
  const handleContinuar = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!reservaData) throw new Error('No hay datos de reserva.');
      const updatedReserva = {
        ...reservaData,
        extras: extrasSeleccionados,
        detallesReserva,
        totalExtras
      };
      let result;
      if (DEBUG_MODE) {
        // Simula crear o editar según si ya tiene id
        if (updatedReserva.id) {
          result = await editReservation(updatedReserva.id, updatedReserva);
        } else {
          result = await createReservation(updatedReserva);
        }
      } else {
        // Producción: igual
        if (updatedReserva.id) {
          result = await editReservation(updatedReserva.id, updatedReserva);
        } else {
          result = await createReservation(updatedReserva);
        }
      }
      sessionStorage.setItem('reservaData', JSON.stringify(result));
      navigate('/reservation-confirmation/datos');
    } catch (err) {
      setError(err.message || 'Error al continuar con la reserva.');
    } finally {
      setLoading(false);
    }
  };

  // Si hay error, mostrar pantalla de error
  if (error) {
    return (
      <Container className="reserva-extras my-5">
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
      <Container className="reserva-extras my-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Cargando datos de la reserva...</p>
        </div>
      </Container>
    );
  }

  const { car, paymentOption, fechas } = reservaData;

  return (
    <Container className="reserva-extras my-4">
      <div className="reservation-progress mb-4">
        <div className="progress-steps">
          <div className="step active">1. Selección de Extras</div>
          <div className="step">2. Datos del Conductor</div>
          <div className="step">3. Pago</div>
          <div className="step">4. Confirmación</div>
        </div>
      </div>
      
      <Card className="shadow-sm">
        <Card.Header className="bg-primario text-white">
          <div className="d-flex justify-content-between align-items-center header-extras">
            <Button 
              variant="link" 
              className="text-white p-0 header-volver" 
              onClick={handleVolver}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              Volver
            </Button>
            <h5 className="mb-0 header-titulo">Extras y Detalles de Reserva</h5>
            <div style={{ width: '80px' }}></div> {/* Espacio para equilibrar el header */}
          </div>
        </Card.Header>
        
        <Card.Body>
          <Row>
            {/* Columna izquierda: Detalles de la reserva */}
            <Col md={5}>
              <Card className="mb-4 resumen-reserva">
                <Card.Header>
                  <FontAwesomeIcon icon={faCarSide} className="me-2" />
                  Resumen de tu reserva
                </Card.Header>
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">                    <img 
                      src={car.imagenPrincipal || car.imagen || 'https://via.placeholder.com/150x100?text=Sin+Imagen'} 
                      alt={`${car.marca} ${car.modelo}`}
                      className="reserva-car-img me-3"
                    />
                    <div>
                      <h5>{car.marca} {car.modelo}</h5>
                      <Badge 
                        bg={paymentOption === 'all-inclusive' ? 'success' : 'secondary'}
                      >
                        {paymentOption === 'all-inclusive' ? 'All Inclusive' : 'Economy'}
                      </Badge>
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

                  <hr />

                  {detallesReserva && (
                    <div className="detalles-precio">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base ({diasAlquiler} días):</span>
                        <span>{detallesReserva.precioCocheBase.toFixed(2)}€</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA (21%):</span>
                        <span>{detallesReserva.iva.toFixed(2)}€</span>
                      </div>
                      {totalExtras > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>{totalExtras.toFixed(2)}€</span>
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

            {/* Columna derecha: Selección de extras */}
            <Col md={7} xs={12} className='columna-derecha'>
              <h5 className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Añade extras a tu reserva (opcional)
              </h5>
              
              <Row>
                {extrasDisponibles.map(extra => (
                  <Col md={6} xs={6} className="mb-3" key={extra.id}>
                    <Card 
                      className={`extra-card ${extrasSeleccionados.includes(extra.id) ? 'selected' : ''}`}
                      onClick={() => toggleExtra(extra.id)}
                    >
                      <div className="extra-card-inner">
                        <div className="extra-img-container">
                          <img src={extra.imagen} alt={extra.nombre} className="extra-img" />
                          <div className="extra-check">
                            <FontAwesomeIcon 
                              icon={extrasSeleccionados.includes(extra.id) ? faCheck : faTimes} 
                              className={extrasSeleccionados.includes(extra.id) ? 'text-success' : ''} 
                            />
                          </div>
                        </div>
                        <div className="extra-details">
                          <h6>{extra.nombre}</h6>
                          <p className="extra-description">{extra.descripcion}</p>
                          <p className="extra-price">
                            {extra.precio.toFixed(2)}€/día · 
                            <strong> {(extra.precio * diasAlquiler).toFixed(2)}€</strong> total
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <div className="mt-4 d-flex justify-content-between">
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
                  className="continue-btn"
                  onClick={handleContinuar}
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
                    'Continuar con la reserva'
                  )}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReservaClienteExtras;