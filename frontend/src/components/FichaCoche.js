// src/components/FichaCoche.js
import React, { useState } from 'react';
import { Container, Row, Col, Carousel, Button, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import '../css/FichaCoche.css';

const FichaCoche = ({ car, onClose }) => {
  // Estado para seleccionar la opción de pago y desplegar sus detalles
  const [selectedPayment, setSelectedPayment] = useState(null);

  const paymentOptions = [
    {
      id: 1,
      title: 'Reserva con seguro con todo riesgo sin franquicia',
      details: 'Incluye seguro completo sin franquicia, cubriendo cualquier eventualidad.',
    },
    {
      id: 2,
      title: 'Reserva con seguro con franquicia',
      details: 'Seguro con franquicia, opción más económica con menor cobertura.',
    },
  ];

  return (
    <div className="ficha-coche-modal p-3 my-3">
      <Container fluid>
        {/* Encabezado de la ficha con título y botón de cierre */}
        <Row className="align-items-center">
          <Col xs={10}>
            <h4>{car.marca} {car.modelo}</h4>
          </Col>
          <Col xs={2} className="text-end">
            <FontAwesomeIcon icon={faTimes} className="close-icon" onClick={onClose} />
          </Col>
        </Row>
        <Row>
          {/* Galería de imágenes del coche */}
          <Col md={6}>
            <Carousel>
              {car.imagenes && car.imagenes.length > 0 ? (
                car.imagenes.map((img, idx) => (
                  <Carousel.Item key={idx}>
                    <img className="d-block w-100 ficha-image" src={img} alt={`Slide ${idx + 1}`} />
                  </Carousel.Item>
                ))
              ) : (
                <Carousel.Item>
                  <img
                    className="d-block w-100 ficha-image"
                    src={car.imagen || 'https://via.placeholder.com/800x400'}
                    alt="Imagen por defecto"
                  />
                </Carousel.Item>
              )}
            </Carousel>
          </Col>
          {/* Detalles del coche y opciones de pago */}
          <Col md={6}>
            <div className="ficha-details">
              <p><strong>Caja:</strong> {car.caja || 'Automática'}</p>
              <p><strong>Asientos:</strong> {car.asientos || '5'}</p>
              <p><strong>Puertas:</strong> {car.puertas || '5'}</p>
              <p><strong>Edad mínima del conductor:</strong> {car.edadMinima || '18'}</p>
              {car.kmsIlimitados && <span className="badge bg-success">Kms ilimitados</span>}
            </div>
            <div className="payment-options mt-3">
              <p><strong>Opciones de pago</strong></p>
              {paymentOptions.map(option => (
                <div key={option.id} className="payment-option" onClick={() => setSelectedPayment(option.id)}>
                  <Card className={`mb-2 ${selectedPayment === option.id ? 'active' : ''}`}>
                    <Card.Body>
                      <Card.Title>{option.title}</Card.Title>
                    </Card.Body>
                  </Card>
                  {selectedPayment === option.id && (
                    <div className="payment-details p-2 mb-2 border">
                      <p>{option.details}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default FichaCoche;
