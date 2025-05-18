// src/components/ReservaClienteExtras.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
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
  faChevronLeft
} 
from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import '../../css/ReservaClienteExtras.css';

// Datos de prueba para extras disponibles
const extrasDisponibles = [
  {
    id: 1,
    nombre: 'Asiento infantil',
    descripcion: 'Para niños de 9-18kg (1-4 años)',
    precio: 7.50,
    imagen: 'https://via.placeholder.com/150x100?text=Asiento+Infantil'
  },
  {
    id: 2,
    nombre: 'GPS',
    descripcion: 'Navegador con mapas actualizados',
    precio: 8.95,
    imagen: 'https://via.placeholder.com/150x100?text=GPS'
  },
  {
    id: 3,
    nombre: 'Conductor adicional',
    descripcion: 'Añade un conductor adicional a tu reserva',
    precio: 5.00,
    imagen: 'https://via.placeholder.com/150x100?text=Conductor+adicional'
  },
  {
    id: 4,
    nombre: 'Wi-Fi portátil',
    descripcion: 'Conexión 4G en todo el vehículo',
    precio: 6.95,
    imagen: 'https://via.placeholder.com/150x100?text=Wi-Fi'
  }
];

const ReservaClienteExtras = ({ car, fechas, selectedPayment, onGoBack, onContinue }) => {
  // Estados
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detallesReserva, setDetallesReserva] = useState(null);
  const [totalExtras, setTotalExtras] = useState(0);
  
  // Calcular fechas y días de alquiler
  const diasAlquiler = fechas ? 
    Math.ceil((new Date(fechas.dropoffDate) - new Date(fechas.pickupDate)) / (1000 * 60 * 60 * 24)) : 
    3; // Valor por defecto para testing

  // Efecto para calcular y actualizar el total de extras
  useEffect(() => {
    const total = extrasSeleccionados.reduce((sum, extraId) => {
      const extra = extrasDisponibles.find(e => e.id === extraId);
      return sum + (extra ? extra.precio * diasAlquiler : 0);
    }, 0);
    setTotalExtras(total);
  }, [extrasSeleccionados, diasAlquiler]);

  // Efecto para cargar los detalles de la reserva (simulación)
  useEffect(() => {
    // En una implementación real, aquí se haría una llamada a la API
    const calcularDetalles = () => {
      const precioCocheBase = car.precio * diasAlquiler;
      const iva = precioCocheBase * 0.21;
      const detalles = {
        precioCocheBase,
        iva,
        precioExtras: totalExtras,
        total: precioCocheBase + iva + totalExtras
      };
      setDetallesReserva(detalles);
    };
    
    calcularDetalles();
  }, [car, diasAlquiler, totalExtras]);

  // Manejador para seleccionar/deseleccionar extras
  const toggleExtra = (extraId) => {
    setExtrasSeleccionados(prev => 
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
  };

  // Manejador para continuar con la reserva
  const handleContinuar = async () => {
    setLoading(true);
    try {
      // En producción, aquí iría la llamada real a la API
      // const response = await axios.post('/api/reservations/extras', {
      //   carId: car.id,
      //   fechas,
      //   paymentOption: selectedPayment,
      //   extras: extrasSeleccionados
      // });
      
      // Simulamos una espera de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Pasamos al componente de confirmación
      if (onContinue) {
        onContinue({
          car,
          fechas,
          paymentOption: selectedPayment,
          extras: extrasSeleccionados.map(id => extrasDisponibles.find(e => e.id === id)),
          detallesReserva
        });
      }
    } catch (error) {
      console.error('Error al procesar los extras:', error);
      // Aquí se manejaría el error, mostrando un mensaje al usuario
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="reserva-extras my-4">
      <Card className="shadow-sm">
        <Card.Header className="bg-primario text-white">
          <div className="d-flex justify-content-between align-items-center">
            <Button 
              variant="link" 
              className="text-white p-0" 
              onClick={onGoBack}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              Volver
            </Button>
            <h5 className="mb-0">Extras y Detalles de Reserva</h5>
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
                  <div className="d-flex align-items-center mb-3">
                    <img 
                      src={car.imagen || 'https://via.placeholder.com/150x100?text=Coche'} 
                      alt={`${car.marca} ${car.modelo}`}
                      className="reserva-car-img me-3"
                    />
                    <div>
                      <h5>{car.marca} {car.modelo}</h5>
                      <Badge 
                        bg={selectedPayment === 'all-inclusive' ? 'success' : 'secondary'}
                      >
                        {selectedPayment === 'all-inclusive' ? 'All Inclusive' : 'Economy'}
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
                    <strong>Protección:</strong> {selectedPayment === 'all-inclusive' ? 'Todo incluido sin franquicia' : 'Básica con franquicia'}
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
            <Col md={7}>
              <h5 className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Añade extras a tu reserva (opcional)
              </h5>
              
              <Row>
                {extrasDisponibles.map(extra => (
                  <Col md={6} className="mb-3" key={extra.id}>
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
                  onClick={onGoBack}
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