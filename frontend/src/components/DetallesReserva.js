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
  faPlusCircle
} from '@fortawesome/free-solid-svg-icons';
import '../css/DetallesReserva.css';

const DatosPrueba = {
  id: 'R12345678',
  car: {
    marca: 'Peugeot',
    modelo: '308',
    img: 'https://via.placeholder.com/300x150?text=Peugeot+308'
  },
  category: 'Sedán (CDMR)',
  pickup: {
    location: 'Aeropuerto Málaga T1',
    date: '14-05-2025',
    time: '12:30'
  },
  retorno: {
    location: 'Aeropuerto Málaga T1',
    date: '18-05-2025',
    time: '08:30'
  },
  protection: {
    title: 'All Inclusive',
    deductible: 0,
    includes: [
      'Cobertura a todo riesgo sin franquicia',
      'Kilometraje ilimitado',
      'Asistencia 24/7'
    ]
  },
  addOns: [
    'Asiento infantil',
    'Conductor adicional'
  ],
  driver: {
    name: 'Juan Pérez',
    email: 'juan.perez@example.com',
    phone: '+34 600 123 456'
  }
};

const DetallesReserva = ({isMobile=false}) => {
  const { reservaId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReserva = async () => {
      try {
        // Descomenta en producción
        // const resp = await axios.get(`/api/reservations/${reservaId}`, { params: { email } });
        // setDatos(resp.data);

        // Datos de prueba mientras la API no esté lista
        setDatos(DatosPrueba);
      } catch (err) {
        setError('No se pudo recuperar los detalles de la reserva.');
      } finally {
        setLoading(false);
      }
    };
    fetchReserva();
  }, [reservaId, email]);

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="my-5">
        <Card bg="danger" text="white" className="p-3">
          {error}
        </Card>
      </Container>
    );
  }

  return (
    <Container className="detalles-reserva my-5">
      <Button variant="link" onClick={() => navigate(-1)} className="mb-3">
        ← Volver
      </Button>

      <Card className="shadow-sm">
        <Card.Header className="bg-primario text-white">
          <FontAwesomeIcon icon={faCarSide} className="me-2" />
          Reserva Nº {datos.id}
        </Card.Header>
        <Card.Body>
          {/* Sección Coche */}
          <Row className="mb-4 align-items-center">
            <Col md={4} className="text-center">
              <img
                src={datos.car.img}
                alt={`${datos.car.marca} ${datos.car.modelo}`}
                className="img-fluid car-img"
              />
            </Col>
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
              <h6>
                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                Recogida
              </h6>
              <p className="mb-1">{datos.pickup.location}</p>
              <p>
                <FontAwesomeIcon icon={faCalendarAlt} /> {datos.pickup.date}{' '}
                <FontAwesomeIcon icon={faClock} className="ms-3" />{' '}
                {datos.pickup.time}
              </p>
            </Col>
            <Col md={6}>
              <h6>
                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" />
                Devolución
              </h6>
              <p className="mb-1">{datos.retorno.location}</p>
              <p>
                <FontAwesomeIcon icon={faCalendarAlt} /> {datos.retorno.date}{' '}
                <FontAwesomeIcon icon={faClock} className="ms-3" />{' '}
                {datos.retorno.time}
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
        </Card.Body>
      </Card>
    </Container>
  );
};

export default DetallesReserva;
