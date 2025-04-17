// src/components/FichaCoche.js
import React, { useState } from 'react';
import { Container, Row, Col, Carousel, Button, Card, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSuitcase, faChair, faCogs, faDoorOpen, faUserClock, faCheck, faTimesCircle, faCreditCard } from '@fortawesome/free-solid-svg-icons';
import '../css/FichaCoche.css';

const FichaCoche = ({ car, onClose }) => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  // NUEVOS ESTADOS para el modal de detalles de precio
  const [showPriceModal, setShowPriceModal] = useState(false);

  // NUEVO manejador para abrir y cerrar el modal de detalles de precio
  const handleSelectPayment = (option) => {
    if(option === selectedPayment){
      setSelectedPayment(null);
    } else {
      setSelectedPayment(option);
    }
  }


  // NUEVAS FUNCIONES para abrir/cerrar modal de precio
  const handlePriceModalShow = () => setShowPriceModal(true);
  const handlePriceModalClose = () => setShowPriceModal(false);

  const paymentOptions = [
    {
      id: 'all-inclusive',
      title: 'All Inclusive',
      incluye: [
        'Política de combustible Full-Full',
        'Cobertura a todo riesgo sin franquicia ni depósitos',
        'Kilometraje ilimitado',
        'Entrega a domicilio (GRATIS)',
        'Asistencia en carretera completa 24/7',
        'Pago por adelantado o a la llegada',
        'Cancelación gratuita hasta 24h antes',
        'Recogida y devolución en el parking express',
        'Conductor adicional gratuito'
      ],
      noIncluye: [
        'Daños bajo efectos del alcohol o drogas',
        'Cargo por no devolver lleno'
      ]
    },
    {
      id: 'economy',
      title: 'Economy',
      incluye: [
        'No Reembolsable (sin cancelaciones ni modificaciones)',
        'Kilometraje ampliado (500km/día, máx 3.500km)',
        'Cobertura básica con franquicia (depósito 1200€)'
      ],
      noIncluye: [
        'Daños bajo efectos del alcohol o drogas',
        'Cargo por no devolver lleno'
      ]
    }
  ];

  return (
    <div className="ficha-coche-modal">
      <Container fluid>
        <Row className="align-items-center">
          <Col xs={10}><h4>{car.marca} {car.modelo}</h4></Col>
          <Col xs={2} className="text-end">
            <FontAwesomeIcon icon={faTimes} className="close-icon" onClick={onClose} />
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Carousel className="mb-3">
              {(car.imagenes || [car.imagen]).map((img, idx) => (
                <Carousel.Item key={idx}>
                  <img className="d-block w-100 ficha-image" src={img} alt={`Coche ${idx + 1}`} />
                </Carousel.Item>
              ))}
            </Carousel>

            <div className="car-info-icons d-flex flex-row justify-content-between align-items-center flex-wrap">
              <div><FontAwesomeIcon icon={faChair} /> Asientos: {car.asientos || 5}</div>
              <div><FontAwesomeIcon icon={faCogs} /> Caja: {car.caja || 'Automática'}</div>
              <div><FontAwesomeIcon icon={faDoorOpen} /> Puertas: {car.puertas || 5}</div>
              <div><FontAwesomeIcon icon={faSuitcase} /> Maletas: {car.maletas || 2}</div>
              <div><FontAwesomeIcon icon={faUserClock} /> Edad mínima: {car.edadMinima || 18}</div>
            </div>
          </Col>

          <Col md={6} className="d-flex flex-column justify-content-between">
            <div className="payment-options">
              <h5><FontAwesomeIcon icon={faCreditCard} className="me-2" />Opciones de pago</h5>
              {paymentOptions.map(option => (
                <Card
                  key={option.id}
                  className={`payment-card mb-3 ${selectedPayment === option.id ? 'active' : ''}`}
                  onClick={() => handleSelectPayment(option.id)}
                >
                  <Card.Body>
                    <Card.Title>{option.title}</Card.Title>
                    {selectedPayment === option.id && (
                      <div className="payment-details mt-3">
                        <p className="mb-2 fw-bold">Incluye:</p>
                        <ul>
                          {option.incluye.map((item, idx) => (
                            <li key={idx}><FontAwesomeIcon icon={faCheck} className="text-success me-2" />{item}</li>
                          ))}
                        </ul>
                        <p className="mb-2 fw-bold">No incluye:</p>
                        <ul>
                          {option.noIncluye.map((item, idx) => (
                            <li key={idx}><FontAwesomeIcon icon={faTimesCircle} className="text-danger me-2" />{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              ))}
            </div>
            
            {/* Nuevo bloque: botón de continuar */}
            <Row className="d-flex justify-content-between align-items-center">
              {/* Nuevo bloque: precio por día  enlace a detalles */}
              <Col className='text-start'>
                <p className="price-day">
                  Desde <strong>{car.precio}€</strong>/día
                  <small className="price-details" onClick={handlePriceModalShow}>
                    detalles del precio
                  </small>
                </p>
              </Col>
              <Col className='text-end'>
                <Button
                  variant="primary"
                  className="continue-btn"
                  disabled={!selectedPayment}
                  onClick={() => {
                    // TODO: navegar a confirmación de reserva
                  }}
                >
                  Continuar
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
      {/* Nuevo bloque: modal de detalles de precio */}
      <Modal show={showPriceModal} onHide={handlePriceModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalles del precio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Precio base: {car.precio}€</p>
          <p>IVA (21%): {(car.precio * 0.21).toFixed(2)}€</p>
          <hr/>
          <p><strong>Total: {(car.precio * 1.21).toFixed(2)}€</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handlePriceModalClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FichaCoche;
