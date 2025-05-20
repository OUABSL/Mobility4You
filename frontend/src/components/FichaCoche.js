// src/components/FichaCoche.js
import React, { use, useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Carousel, Button, Card, Modal, Badge,Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSuitcase, faUser, faIdCard, faCircleCheck, faTimesCircle, faCreditCard, faInfoCircle  } from '@fortawesome/free-solid-svg-icons';
// NUEVAS IMÁGENES SVG
import manualGear    from '../assets/img/icons/gear-stick-manual.svg';
import autoGear      from '../assets/img/icons/automatic-gear.svg';
import carDoorLeft   from '../assets/img/icons/car-door-left.svg';

import '../css/FichaCoche.css';
import { fr } from 'date-fns/locale';



  const paymentOptions = [
    {
      id: 'all-inclusive',
      title: 'All Inclusive',
      deductible: 0,
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
      deductible: 1200,
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


const FichaCoche = ({ car, onClose }) => {
    const navigate = useNavigate(); // Inicializar navigate para redirecciones
  // ESTADOS ORIGINALES
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  
  //FUNCIONES para abrir/cerrar modal de precio
  const handlePriceModalShow = () => setShowPriceModal(true);
  const handlePriceModalClose = () => setShowPriceModal(false);


  const handleSelectPayment = (option) => {
    if (option === selectedPayment) {
      setSelectedPayment(null);
    } else {
      setSelectedPayment(option);
    }
  };

  // Mejoras: 
  // - Usa useCallback para handlers.
  // - Permite recibir fechas reales como prop (si existen).
  // - Limpia datos al volver atrás.
  // - Valida que haya opción de pago antes de continuar.


    // Nueva función para manejar la navegación al flujo de reserva
  const handleContinuar = () => {
    if (!selectedPayment) return;
    
    // Preparar datos de reserva iniciales
    const reservaData = {
      car: {
        ...car,
        imagen: car.imagenPrincipal // Asegurar que imagen esté disponible para componentes futuros
      },
      paymentOption: selectedPayment,
      fechas: {
        pickupLocation: 'Aeropuerto de Málaga',
        pickupDate: new Date(),
        pickupTime: '12:00',
        dropoffLocation: 'Aeropuerto de Málaga',
        dropoffDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 días
        dropoffTime: '12:00'
      }
    };
    
    // Guardar los datos en sessionStorage para mantenerlos entre rutas
    sessionStorage.setItem('reservaData', JSON.stringify(reservaData));
    
    // Navegar a la nueva ruta de confirmación de reserva
    navigate('/reservation-confirmation');
  };

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
              {(car.imagenes && car.imagenes.length > 0) 
                ? car.imagenes.map((img, idx) => (
                    <Carousel.Item key={idx}>
                      <img className="d-block w-100 ficha-image" src={img.url} alt={`${car.marca} ${car.modelo}`} />
                    </Carousel.Item>
                  ))
                : <Carousel.Item>
                    <img className="d-block w-100 ficha-image" src={car.imagenPrincipal} alt={`${car.marca} ${car.modelo}`} />
                  </Carousel.Item>
              }
            </Carousel>

            {/* Información del vehículo */}
          <div className="car-info-icons d-flex flex-row justify-content-evenly align-items-center flex-wrap">
            <div><FontAwesomeIcon icon={faUser} /> Asientos: {car.num_pasajeros}</div>
            <div>
              <Image
                src={autoGear} // Aquí podrías añadir lógica para determinar si es manual o automático
                style={{ maxWidth: '14px'}}
                alt="Caja"
                className="icon-svg"
              />
              Caja: {car.caja || 'Automática'}
            </div>
            <div>
              <Image
                src={carDoorLeft}
                style={{ maxWidth: '14px'}}
                alt="Puertas"
                className="icon-svg"
              />
              Puertas: {car.num_puertas}
            </div>
            <div><FontAwesomeIcon icon={faSuitcase} /> Capacidad: {car.capacidad_maletero}L</div>
            <div><FontAwesomeIcon icon={faIdCard} /> Edad mínima: {car.grupo?.edad_minima || 21} años</div>
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
                  <Card.Body className="d-flex justify-content-between align-items-center">
                    <Card.Title className="mb-0">{option.title}</Card.Title>
                    {/* ICONO INFO que abre el modal */}
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="info-icon"
                      onClick={e => {
                        e.stopPropagation();
                        setPaymentInfo(option);
                        setShowPaymentInfo(true);
                      }}
                    />
                  </Card.Body>
                </Card>
              ))}
            </div>
            
            {/* Nuevo bloque: botón de continuar */}
            <Row className="d-flex justify-content-between align-items-center">
              {/* Nuevo bloque: precio por día enlace a detalles */}
              <Col className='text-start'>
                <p className="price-day">
                  Desde <strong>{car.precio_dia}€</strong>/día
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
                  onClick={handleContinuar}
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
          <div className="price-breakdown">
            <div className="d-flex justify-content-between mb-2">
              <span>Precio base por día:</span>
              <span>{car.precio_dia}€</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>IVA (21%):</span>
              <span>{(car.precio_dia * 0.21).toFixed(2)}€</span>
            </div>
            <hr/>
            <div className="d-flex justify-content-between fw-bold">
              <span>Total por día:</span>
              <span>{(car.precio_dia * 1.21).toFixed(2)}€</span>
            </div>
            
            <div className="mt-4 pt-2 border-top">
              <h6 className="mb-3">Información adicional:</h6>
              <ul className="price-info-list">
                <li>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary" />
                  El precio puede variar según la temporada y la disponibilidad.
                </li>
                <li>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary" />
                  {car.fianza > 0 ? 
                    `Se requiere un depósito de seguridad de ${car.fianza}€.` : 
                    'No se requiere depósito de seguridad con la protección All Inclusive.'}
                </li>
              </ul>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handlePriceModalClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal con los detalles de la opción de pago */}
      <Modal
        show={showPaymentInfo}
        onHide={() => setShowPaymentInfo(false)}
        centered
      >
        <Modal.Header closeButton className='opcion-pago-header'>
          <Container className='d-flex flex-column align-items-center'>
            <Modal.Title className='opcion-pago-titulo mb-1'>{paymentInfo?.title}</Modal.Title>
            <Badge
              pill
              className='opcion-pago-badge'
              bg={paymentInfo?.deductible === 0 ? 'success' : 'secondary'}
            >
              {paymentInfo?.deductible === 0 ? 'Sin franquicia' : `Franquicia Hasta: ${paymentInfo?.deductible}€`}
            </Badge>
          </Container>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-2 fw-bold" style={{color: 'var(--color-activo)'}}>Incluye:</h5>
          <ul className='no-bullets'>
            {paymentInfo?.incluye.map((item, idx) => (
              <li key={idx}>
                <FontAwesomeIcon icon="fa-regular fa-circle-check" className='me-2'  style={{color: 'var(--color-activo)'}}/>
                {item}
              </li>
            ))}
          </ul>
          <hr/>
          <h5 className="mb-2 fw-bold" style={{color: 'var(--color-terciario)'}}>No incluye:</h5>
          <ul className='no-bullets'>
            {paymentInfo?.noIncluye.map((item, idx) => (
              <li key={idx}>
                <FontAwesomeIcon className='text-danger me-2' icon="fa-regular fa-circle-xmark" />
                {item}
              </li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentInfo(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};

export default FichaCoche;
