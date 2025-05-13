// src/components/DetallesReserva.js
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  ListGroup,
  Spinner,
  Badge
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarSide,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faShieldAlt,
  faPlusCircle,
  faChevronDown,
  faChevronUp,
  faEuroSign,
  faTimesCircle,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import '../css/DetallesReserva.css';
import bmwImage from '../img/coches/BMW-320i-M-Sport.jpg';

const DatosPrueba = {
  id: 'R12345678',
  car: {
    marca: 'Peugeot',
    modelo: '308',
    img: bmwImage
  },
  category: 'Sedán (CDMR)',
  pickup: { location: 'Aeropuerto Málaga T1', date: '14-05-2025', time: '12:30' },
  retorno: { location: 'Aeropuerto Málaga T1', date: '18-05-2025', time: '08:30' },
  protection: {
    title: 'All Inclusive',
    deductible: 0,
    includes: ['Cobertura a todo riesgo sin franquicia', 'Kilometraje ilimitado', 'Asistencia 24/7']
  },
  addOns: ['Asiento infantil', 'Conductor adicional'],
  driver: { name: 'Juan Pérez', email: 'juan.perez@example.com', phone: '+34 600 123 456' },
  // ===> Datos de precio
  priceInfo: {
    days: 4,
    subtotal: 369.79,
    taxIncluded: true
  }
};

// ===> Datos de prueba para contenidos (Important Information)
const ContenidosPrueba = [
  { id: 1, titulo: 'What to bring', items: [
    "Driver's license for each driver",
    'Passport or national ID card',
    'Accepted payment methods',
    'General guidelines',
    'Please bring the original documents'
  ]},
  { id: 2, titulo: 'Security deposit', items: [
    'Refundable security deposit: 300.00€',
    'For prepaid bookings, total rental charged + deposit blocked',
    'For pay-at-arrival bookings, only blocked',
    'PayPal bookings: rental charged, deposit via card'
  ]},
  { id: 3, titulo: 'Cancellation', items: [
    'Free cancellation for pay-later bookings',
    'Prepaid: before pickup 99€, after pickup full charge',
    'Corporate: individual agreements apply'
  ]}
];

// Arrays de testing (luego vendrán de la tabla "Contenido")
const contenidoImportant = [
  "1. Licencia de conducir válida",
  "2. Pasaporte o DNI",
  "3. Método de pago aceptado",
  "4. Directrices generales",
  "5. Presentar documentos originales"
];
const contenidoDeposit = [
  "Depósito reembolsable: 300,00€",
  "Para prepago: bloqueo de depósito en tarjeta",
  "Para pagar en recogida: bloqueo de importe total + depósito",
];
const contenidoCancel = [
  "Cancelación gratuita antes de la hora de recogida",
  "Antes de la hora: 99€ de penalización",
  "Después de la hora: importe completo"
];
const contenidoChanges = [
  "No se puede cambiar forma de pago online",
  "Actualizar datos del conductor",
  "Pagar costes adicionales en el checkout"
];
const contenidoStation = [
  "Ver información de la sucursal con el icono de info",
];

const DetallesReserva = ({ isMobile = false }) => {
  const { reservaId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openImportant, setOpenImportant] = useState(false);
  const [openDeposit, setOpenDeposit]     = useState(false);
  const [openCancel, setOpenCancel]       = useState(false);
  const [openChanges, setOpenChanges]     = useState(false);
  const [openStation, setOpenStation]     = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        // const resp = await axios.get(`/api/reservations/${reservaId}`, { params: { email } });
        // setDatos(resp.data);
        setDatos(DatosPrueba); // prueba
      } catch (err) {
        setError('No se pudo recuperar los detalles de la reserva.');
      } finally {
        setLoading(false);
      }
    };
    fetchReserva();
  }, [reservaId, email]);

  if (loading) return <Container className="my-5 text-center"><Spinner animation="border" /></Container>;
  if (error) return <Container className="my-5"><Card bg="danger" text="white" className="p-3">{error}</Card></Container>;

  return (
    <Container className="detalles-reserva my-5">
      <Button variant="link" onClick={() => navigate(-1)} className="mb-3">← Volver</Button>

      <Card className="shadow-sm">
        <Card.Header className="bg-primario text-white">
          <FontAwesomeIcon icon={faCarSide} className="me-2" />
          Reserva Nº {datos.id}
        </Card.Header>
        <Card.Body>
          <Row>
            {/* ===> Columna principal (izquierda) ===> */}
            <Col md={8}>
              {/* Sección Coche */}
              <Row className="mb-4 align-items-center">
                <Col md={4}><img src={datos.car.img} alt="" className="img-fluid car-img" /></Col>
                <Col md={8}>
                  <h5>
                    {datos.car.marca} {datos.car.modelo}{' '}
                    <Badge bg="secondary">{datos.category}</Badge>
                  </h5>
                </Col>
              </Row>

              {/* Fechas y lugares */}
              <Row className="mb-4">
                <Col md={6}>
                  <h6><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />Recogida</h6>
                  <p className="mb-1">{datos.pickup.location}</p>
                  <p>
                    <FontAwesomeIcon icon={faCalendarAlt} /> {datos.pickup.date}{' '}
                    <FontAwesomeIcon icon={faClock} className="ms-3" /> {datos.pickup.time}
                  </p>
                </Col>
                <Col md={6}>
                  <h6><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />Devolución</h6>
                  <p className="mb-1">{datos.retorno.location}</p>
                  <p>
                    <FontAwesomeIcon icon={faCalendarAlt} /> {datos.retorno.date}{' '}
                    <FontAwesomeIcon icon={faClock} className="ms-3" /> {datos.retorno.time}
                  </p>
                </Col>
              </Row>

              {/* Protección */}
              <Card className="mb-4">
                <Card.Header>
                  <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                  Protección: {datos.protection.title}{' '}
                  {datos.protection.deductible === 0
                    ? <Badge bg="success">Sin franquicia</Badge>
                    : <Badge bg="warning">Franquicia {datos.protection.deductible}€</Badge>
                  }
                </Card.Header>
                <ListGroup variant="flush">
                  {datos.protection.includes.map((item, i) => (
                    <ListGroup.Item key={i}>
                      <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-success" />
                      {item}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>

              {/* Add-Ons */}
              <Card className="mb-4">
                <Card.Header>Extras</Card.Header>
                <ListGroup variant="flush">
                  {datos.addOns.map((item, i) => (
                    <ListGroup.Item key={i}>
                      <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" />
                      {item}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>

              {/* Datos del conductor */}
              <Card>
                <Card.Header>Conductor</Card.Header>
                <Card.Body>
                  <p><strong>Nombre:</strong> {datos.driver.name}</p>
                  <p><strong>Email:</strong> {datos.driver.email}</p>
                  <p><strong>Teléfono:</strong> {datos.driver.phone}</p>
                </Card.Body>
              </Card>
            </Col>

            {/* Columna derecha: Precio e información importante */}
            <Col md={4}>
              {/* Price Information */}
              <Card className="mb-4">
                <Card.Header className="bg-light">
                  <h6 className="mb-0 text-dark">Price Information</h6>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <strong>Total</strong><br/>
                      <small>({Math.ceil(
                        (new Date(datos.retorno.date.split('-').reverse().join('-')) - 
                        new Date(datos.pickup.date.split('-').reverse().join('-'))
                        )/(1000*60*60*24)
                      )} días de alquiler)</small>
                    </div>
                    <Button
                      variant="link"
                      onClick={() => setShowPriceBreakdown(true)}
                      className="p-0"
                    >
                      <FontAwesomeIcon icon={faEuroSign} size="2x" />
                    </Button>
                  </div>
                  <h3 className="mb-1">
                    €{(Math.ceil(
                      (new Date(datos.retorno.date.split('-').reverse().join('-')) -
                      new Date(datos.pickup.date.split('-').reverse().join('-'))
                      )/(1000*60*60*24)
                    ) * datos.precioDia + datos.precioImpuestos).toFixed(2)}
                  </h3>
                  <small className="text-muted">Impuestos incluidos</small>
                </Card.Body>
              </Card>

              {/* Important Information */}
              <Card className="mb-4">
                <Card.Header
                  onClick={() => setOpenImportant(!openImportant)}
                  style={{ cursor: 'pointer' }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Información importante</span>
                  <FontAwesomeIcon icon={openImportant ? faChevronUp : faChevronDown} />
                </Card.Header>
                {openImportant && (
                  <ListGroup variant="flush">
                    {contenidoImportant.map((item, i) => (
                      <ListGroup.Item key={i}>
                        <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Security Deposit */}
              <Card className="mb-4">
                <Card.Header
                  onClick={() => setOpenDeposit(!openDeposit)}
                  style={{ cursor: 'pointer' }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Depósito de seguridad</span>
                  <FontAwesomeIcon icon={openDeposit ? faChevronUp : faChevronDown} />
                </Card.Header>
                {openDeposit && (
                  <ListGroup variant="flush">
                    {contenidoDeposit.map((item, i) => (
                      <ListGroup.Item key={i}>
                        <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-secondary" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Cancellation Policy */}
              <Card className="mb-4">
                <Card.Header
                  onClick={() => setOpenCancel(!openCancel)}
                  style={{ cursor: 'pointer' }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Política de cancelación</span>
                  <FontAwesomeIcon icon={openCancel ? faChevronUp : faChevronDown} />
                </Card.Header>
                {openCancel && (
                  <ListGroup variant="flush">
                    {contenidoCancel.map((item, i) => (
                      <ListGroup.Item key={i}>
                        <FontAwesomeIcon icon={faTimesCircle} className="me-2 text-danger" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Booking Changes */}
              <Card className="mb-4">
                <Card.Header
                  onClick={() => setOpenChanges(!openChanges)}
                  style={{ cursor: 'pointer' }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Modificaciones de reserva</span>
                  <FontAwesomeIcon icon={openChanges ? faChevronUp : faChevronDown} />
                </Card.Header>
                {openChanges && (
                  <ListGroup variant="flush">
                    {contenidoChanges.map((item, i) => (
                      <ListGroup.Item key={i}>
                        <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Station Information */}
              <Card>
                <Card.Header
                  onClick={() => setOpenStation(!openStation)}
                  style={{ cursor: 'pointer' }}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>Información de la estación</span>
                  <FontAwesomeIcon icon={openStation ? faChevronUp : faChevronDown} />
                </Card.Header>
                {openStation && (
                  <ListGroup variant="flush">
                    {contenidoStation.map((item, i) => (
                      <ListGroup.Item key={i}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-info" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>
            </Col>

          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DetallesReserva;
