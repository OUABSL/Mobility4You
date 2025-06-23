// src/components/FichaCoche.js
import {
  faArrowRight,
  faCarSide,
  faCheckCircle,
  faCircleCheck,
  faCreditCard,
  faGasPump,
  faIdCard,
  faInfoCircle,
  faRoad,
  faShieldAlt,
  faSuitcase,
  faTimes,
  faTimesCircle,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Carousel,
  Col,
  Image,
  Modal,
  Row,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

// NUEVAS IMÁGENES SVG
import autoGear from '../assets/img/icons/automatic-gear.svg';
import carDoorLeft from '../assets/img/icons/car-door-left.svg';

import '../css/FichaCoche.css';
import { getStoredSearchParams } from '../services/searchServices';
import {
  calculateTaxAmount,
  roundToDecimals,
} from '../services/universalDataMapper';

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
      'Conductor adicional gratuito',
    ],
    noIncluye: [
      'Daños bajo efectos del alcohol o drogas',
      'Cargo por no devolver lleno',
    ],
  },
  {
    id: 'economy',
    title: 'Economy',
    deductible: 1200,
    incluye: [
      'No Reembolsable (sin cancelaciones ni modificaciones)',
      'Kilometraje ampliado (500km/día, máx 3.500km)',
      'Cobertura básica con franquicia (depósito 1200€)',
    ],
    noIncluye: [
      'Daños bajo efectos del alcohol o drogas',
      'Cargo por no devolver lleno',
    ],
  },
];

const FichaCoche = ({ car, onClose }) => {
  const navigate = useNavigate();

  // Estados
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);

  // Manejadores
  const handlePriceModalShow = () => setShowPriceModal(true);
  const handlePriceModalClose = () => setShowPriceModal(false);

  const handleSelectPayment = (option) => {
    if (option === selectedPayment) {
      setSelectedPayment(null);
    } else {
      setSelectedPayment(option);
    }
  }; // Función para continuar a reserva
  const handleContinuar = () => {
    if (!selectedPayment) return;

    // Obtener fechas y ubicaciones originales de la búsqueda
    const storedSearchParams = getStoredSearchParams();
    const storedReservaData = sessionStorage.getItem('reservaData');
    let storedData = null;

    if (storedReservaData) {
      try {
        storedData = JSON.parse(storedReservaData);
      } catch (error) {
        console.error('Error parsing stored reservation data:', error);
      }
    }

    // Preparar ubicación por defecto (fallback)
    const aeropuertoMalaga = {
      id: 1,
      nombre: 'Aeropuerto de Málaga',
      direccion: {
        calle: 'Avenida del Comandante García Morato',
        ciudad: 'Málaga',
        codigoPostal: '29004',
        pais: 'España',
      },
      coordenadas: {
        latitud: 36.6749,
        longitud: -4.4991,
      },
    }; // Usar ubicaciones originales si están disponibles
    // Los IDs están en fechas, los objetos completos están en lugares
    const pickupLocation = storedData?.lugares?.recogida || aeropuertoMalaga;
    const dropoffLocation =
      storedData?.lugares?.devolucion ||
      storedData?.lugares?.recogida ||
      aeropuertoMalaga;

    // Debug: Verificar que se están usando las fechas correctas
    console.log('🔍 [FichaCoche] Fechas de búsqueda originales:', {
      pickupDate: storedSearchParams?.pickupDate,
      dropoffDate: storedSearchParams?.dropoffDate,
      pickupTime: storedSearchParams?.pickupTime,
      dropoffTime: storedSearchParams?.dropoffTime,
    });

    const reservaData = {
      car: {
        ...car,
        imagen: car.imagenPrincipal,
      },
      paymentOption: selectedPayment,
      fechas: {
        pickupLocation,
        // CORREGIDO: Usar fechas originales de la búsqueda en lugar de valores hardcodeados
        pickupDate: storedSearchParams?.pickupDate || new Date(),
        pickupTime: storedSearchParams?.pickupTime || '12:00',
        dropoffLocation,
        dropoffDate:
          storedSearchParams?.dropoffDate ||
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        dropoffTime: storedSearchParams?.dropoffTime || '12:00',
      },
    };

    // Guardar los datos en sessionStorage
    sessionStorage.setItem('reservaData', JSON.stringify(reservaData));

    // Navegar a confirmación de reserva
    navigate('/reservation-confirmation');
  };

  return (
    <div className="ficha-coche-modal">
      <div className="ficha-header">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="ficha-title">
            <FontAwesomeIcon icon={faCarSide} className="me-2 text-primary" />
            {car.marca} {car.modelo}
          </h4>
          <Button
            variant="link"
            className="ficha-close-btn"
            onClick={onClose}
            aria-label="Cerrar ficha"
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button>
        </div>
      </div>

      <div className="ficha-body">
        <Row>
          <Col lg={6}>
            <Carousel className="ficha-carousel mb-4">
              {car.imagenes && car.imagenes.length > 0 ? (
                car.imagenes.map((img, idx) => (
                  <Carousel.Item key={idx} className="ficha-carousel-item">
                    <div className="ficha-image-container">
                      <span className="ficha-fuel-tag">
                        <FontAwesomeIcon icon={faGasPump} className="me-1" />
                        {car.combustible}
                      </span>
                      <img
                        className="d-block w-100 ficha-image"
                        src={
                          img.imagen_url ||
                          img.url ||
                          img.imagen ||
                          car.imagenPrincipal ||
                          'https://via.placeholder.com/600x400?text=Sin+Imagen'
                        }
                        alt={`${car.marca} ${car.modelo}`}
                      />
                    </div>
                  </Carousel.Item>
                ))
              ) : (
                <Carousel.Item className="ficha-carousel-item">
                  <div className="ficha-image-container">
                    <span className="ficha-fuel-tag">
                      <FontAwesomeIcon icon={faGasPump} className="me-1" />
                      {car.combustible}
                    </span>
                    <img
                      className="d-block w-100 ficha-image"
                      src={
                        car.imagenPrincipal ||
                        'https://via.placeholder.com/600x400?text=Sin+Imagen'
                      }
                      alt={`${car.marca} ${car.modelo}`}
                    />
                  </div>
                </Carousel.Item>
              )}
            </Carousel>

            {/* Características del vehículo */}
            <Card className="car-specs-card mb-4">
              <Card.Body>
                <div className="specs-grid">
                  <div className="spec-item">
                    <FontAwesomeIcon icon={faUser} className="spec-icon" />
                    <span className="spec-value">{car.num_pasajeros}</span>
                  </div>

                  <div className="spec-item">
                    <div className="spec-icon">
                      <Image src={autoGear} className="icon-svg" alt="Caja" />
                    </div>
                    <span className="spec-value">
                      {car.caja || 'Automática'}
                    </span>
                  </div>

                  <div className="spec-item">
                    <div className="spec-icon">
                      <Image
                        src={carDoorLeft}
                        className="icon-svg"
                        alt="Puertas"
                      />
                    </div>
                    <span className="spec-value">{car.num_puertas}</span>
                  </div>

                  <div className="spec-item">
                    <FontAwesomeIcon icon={faSuitcase} className="spec-icon" />
                    <span className="spec-value">
                      {car.capacidad_maletero}L
                    </span>
                  </div>

                  <div className="spec-item">
                    <FontAwesomeIcon icon={faIdCard} className="spec-icon" />
                    <span className="spec-value">
                      {car.grupo?.edad_minima || 21} años
                    </span>
                  </div>

                  <div className="spec-item">
                    <FontAwesomeIcon icon={faRoad} className="spec-icon" />
                    <span className="spec-value">Ilimitado</span>
                  </div>
                </div>

                <div className="car-description">
                  <p>{car.descripcion}</p>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <div className="payment-section">
              <h5 className="payment-title mb-3">
                <FontAwesomeIcon
                  icon={faShieldAlt}
                  className="me-2 text-primary"
                />
                Elige tu opción de protección
              </h5>

              {paymentOptions.map((option) => (
                <Card
                  key={option.id}
                  className={`payment-card mb-3 ${
                    selectedPayment === option.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelectPayment(option.id)}
                >
                  <Card.Body>
                    <div className="payment-card-header">
                      <div className="d-flex align-items-center">
                        <div
                          className={`payment-check me-3 ${
                            selectedPayment === option.id ? 'active' : ''
                          }`}
                        >
                          <FontAwesomeIcon
                            icon={
                              selectedPayment === option.id
                                ? faCheckCircle
                                : faCircleCheck
                            }
                            size="lg"
                            className={
                              selectedPayment === option.id
                                ? 'text-primary'
                                : 'text-muted'
                            }
                          />
                        </div>
                        <div>
                          <Card.Title className="mb-1">
                            {option.title}
                          </Card.Title>
                          <div className="payment-card-badge">
                            {option.deductible === 0 ? (
                              <Badge bg="success" className="protection-badge">
                                Sin franquicia
                              </Badge>
                            ) : (
                              <Badge
                                bg="warning"
                                text="dark"
                                className="protection-badge"
                              >
                                Franquicia {option.deductible}€
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <FontAwesomeIcon
                        icon={faInfoCircle}
                        className="info-icon ms-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentInfo(option);
                          setShowPaymentInfo(true);
                        }}
                      />
                    </div>

                    <div className="payment-card-features mt-3">
                      <ul className="features-list">
                        {option.incluye.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="feature-item">
                            <FontAwesomeIcon
                              icon={faCheckCircle}
                              className="text-success me-2"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                      {option.incluye.length > 3 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="show-more-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaymentInfo(option);
                            setShowPaymentInfo(true);
                          }}
                        >
                          Ver todas las coberturas
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}

              <div className="price-section mt-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="price-info">
                    <h5 className="price-value mb-0">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(car.precio_dia)}
                      <small className="price-period">/día</small>
                    </h5>
                    <Button
                      variant="link"
                      className="price-details-btn p-0"
                      onClick={handlePriceModalShow}
                    >
                      Ver detalles del precio
                    </Button>
                  </div>

                  <Button
                    variant="primary"
                    className="continue-btn"
                    disabled={!selectedPayment}
                    onClick={handleContinuar}
                  >
                    Continuar
                    <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                  </Button>
                </div>

                {!selectedPayment && (
                  <div className="select-option-alert mt-3">
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="me-2 text-primary"
                    />
                    Selecciona una opción de protección para continuar
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Modal detalles de precio */}
      <Modal show={showPriceModal} onHide={handlePriceModalClose} centered>
        <Modal.Header closeButton>
          <Modal.Title className="modal-title">
            <FontAwesomeIcon
              icon={faCreditCard}
              className="me-2 text-primary"
            />
            Detalles del Precio
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="price-breakdown">
            <div className="price-breakdown-header mb-3">
              <h5 className="mb-2">
                {car.marca} {car.modelo}
              </h5>
              <Badge bg="light" text="dark" className="category-badge">
                {car.categoria.nombre} | {car.grupo.nombre}
              </Badge>
            </div>

            <div className="price-breakdown-content">
              <div className="d-flex justify-content-between mb-2 price-item">
                <span>Precio base por día:</span>
                <span>{car.precio_dia}€</span>
              </div>{' '}
              <div className="d-flex justify-content-between mb-2 price-item">
                <span>IVA (21%):</span>
                <span>
                  {calculateTaxAmount(Number(car.precio_dia) || 0).toFixed(2)}€
                </span>
              </div>
              <hr />
              <div className="d-flex justify-content-between price-total">
                <span>Total por día:</span>
                <span>
                  {roundToDecimals(
                    (Number(car.precio_dia) || 0) +
                      calculateTaxAmount(Number(car.precio_dia) || 0),
                  ).toFixed(2)}
                  €
                </span>
              </div>
            </div>

            <div className="price-info-box mt-4">
              <h6 className="mb-3">
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="me-2 text-primary"
                />
                Información adicional:
              </h6>
              <ul className="price-info-list">
                <li>
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="me-2 text-primary"
                  />
                  El precio puede variar según la temporada y la disponibilidad.
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="me-2 text-primary"
                  />
                  {car.fianza > 0
                    ? `Se requiere un depósito de seguridad de ${car.fianza}€ con la protección Economy.`
                    : 'No se requiere depósito de seguridad con la protección All Inclusive.'}
                </li>
                <li>
                  <FontAwesomeIcon
                    icon={faInfoCircle}
                    className="me-2 text-primary"
                  />
                  El precio final dependerá de las fechas de recogida y
                  devolución seleccionadas.
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

      {/* Modal con detalles de protección */}
      <Modal
        show={showPaymentInfo}
        onHide={() => setShowPaymentInfo(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="modal-protection-header">
          <div className="d-flex flex-column align-items-start w-100">
            <Modal.Title className="modal-protection-title">
              <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
              {paymentInfo?.title}
            </Modal.Title>
            <Badge
              pill
              className="modal-protection-badge mt-2"
              bg={paymentInfo?.deductible === 0 ? 'success' : 'warning'}
              text={paymentInfo?.deductible === 0 ? 'white' : 'dark'}
            >
              {paymentInfo?.deductible === 0
                ? 'Sin franquicia'
                : `Franquicia Hasta: ${paymentInfo?.deductible}€`}
            </Badge>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="protection-details">
            <h5 className="mb-3 includes-title">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="me-2 text-success"
              />
              Incluye:
            </h5>
            <ul className="includes-list">
              {paymentInfo?.incluye.map((item, idx) => (
                <li key={idx} className="include-item">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="me-2 text-success"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <hr className="divider" />

            <h5 className="mb-3 excludes-title">
              <FontAwesomeIcon
                icon={faTimesCircle}
                className="me-2 text-danger"
              />
              No incluye:
            </h5>
            <ul className="excludes-list">
              {paymentInfo?.noIncluye.map((item, idx) => (
                <li key={idx} className="exclude-item">
                  <FontAwesomeIcon
                    icon={faTimesCircle}
                    className="me-2 text-danger"
                  />
                  {item}
                </li>
              ))}
            </ul>

            <div className="protection-info-box mt-4">
              <p className="mb-0">
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="me-2 text-primary"
                />
                Recuerda que todas nuestras opciones incluyen asistencia en
                carretera 24/7 y están sujetas a nuestros términos y condiciones
                generales de alquiler.
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentInfo(false)}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowPaymentInfo(false);
              setSelectedPayment(paymentInfo?.id);
            }}
          >
            Seleccionar esta opción
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FichaCoche;
