// src/components/ConsultarReservaCliente.js
import {
  faEnvelope,
  faExclamationTriangle,
  faIdCard,
  faInfoCircle,
  faRedo,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { DEBUG_MODE } from '../assets/testingData/testingData';
import { createServiceLogger } from '../config/appConfig';
import '../css/ConsultarReservaCliente.css';
import { findReservation } from '../services/reservationServices';

// Crear logger para el componente
const logger = createServiceLogger('CONSULTAR_RESERVA_CLIENTE');

/**
 * Componente para consultar una reserva existente mediante ID y email
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isMobile - Flag para indicar si se muestra en móvil
 * @returns {JSX.Element} - Componente ConsultarReservaCliente
 */
const ConsultarReservaCliente = ({ isMobile = false }) => {
  // Estados
  const [reservaId, setReservaId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({ reservaId: false, email: false });
  const [success, setSuccess] = useState(null);

  // Navegación
  const navigate = useNavigate();
  const location = useLocation();

  // Efecto para detectar mensajes en el state de location
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message);

      // Limpiar el mensaje después de 5 segundos
      const timer = setTimeout(() => {
        setSuccess(null);
        // También limpiamos el historial para evitar que el mensaje reaparezca al navegar atrás
        window.history.replaceState({}, document.title);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Validadores
  const reservaIdValid = reservaId.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Marcar campos como tocados al perder foco
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Marcar ambos campos como tocados para mostrar validación
    setTouched({ reservaId: true, email: true });

    // Validar campos
    if (!reservaIdValid || !emailValid) {
      setError('Por favor, completa correctamente ambos campos.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Intentar buscar la reserva
      await findReservation(reservaId, email);

      // Si llegamos aquí, la reserva existe
      setLoading(false);
      setSuccess('Reserva encontrada. Redirigiendo...');

      // Redirigir a la página de detalles
      setTimeout(() => {
        navigate(`/reservations/${reservaId}`, {
          state: {
            email,
            // Pasamos a la página de detalles que venimos de la consulta
            source: 'consulta',
          },
        });
      }, 1200);
    } catch (err) {
      logger.error('Error al buscar reserva:', err);
      setError(
        err.message ||
          'No se encontró ninguna reserva con esos datos. Por favor, verifique y vuelva a intentar.',
      );
      setLoading(false);
    }
  };

  // Limpiar formulario
  const handleReset = () => {
    setReservaId('');
    setEmail('');
    setError(null);
    setTouched({ reservaId: false, email: false });
  };

  // Clases para los mensajes de error de validación
  const getInputClass = (field, isValid) => {
    if (!touched[field]) return '';
    return isValid ? 'is-valid' : 'is-invalid';
  };

  return (
    <Container className="reserva-cliente my-5">
      <Row className="justify-content-center">
        <Col lg={7} md={8} sm={10}>
          {/* Mensaje de éxito */}
          {success && (
            <Alert variant="success" className="mb-4 text-center shadow-sm">
              <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
              {success}
            </Alert>
          )}

          <Card className="reserva-cliente-card shadow-sm border-0">
            <Card.Header className="text-center bg-primario text-white py-4">
              <h3 className="mb-0">Gestión de Reservas</h3>
              <p className="mb-0 mt-2 small text-white-50">
                Consulta los detalles de tu reserva
              </p>
            </Card.Header>

            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="mb-4">
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    className="me-2"
                  />
                  {error}
                </Alert>
              )}

              <p className="mb-4 text-muted text-center">
                Introduce tu ID de reserva y el correo electrónico utilizado
                para completar los detalles de tu reserva.
              </p>

              <Form onSubmit={handleSubmit}>
                <Row className="g-4">
                  <Col xs={12}>
                    <Form.Group controlId="reservaId">
                      <Form.Label className="fw-semibold">
                        <FontAwesomeIcon
                          icon={faIdCard}
                          className="me-2 text-primary"
                        />
                        ID de Reserva
                      </Form.Label>
                      <InputGroup hasValidation>
                        <Form.Control
                          type="text"
                          placeholder="Ej. R12345"
                          value={reservaId}
                          onChange={(e) => setReservaId(e.target.value)}
                          onBlur={() => handleBlur('reservaId')}
                          className={getInputClass('reservaId', reservaIdValid)}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Introduce un ID de reserva válido
                        </Form.Control.Feedback>
                      </InputGroup>
                      {DEBUG_MODE && (
                        <p className="text-muted small mt-1">
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="me-1"
                          />
                          En modo debug, use cualquier ID que empiece por "R"
                          (ej: R12345)
                        </p>
                      )}
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group controlId="emailUsuario">
                      <Form.Label className="fw-semibold">
                        <FontAwesomeIcon
                          icon={faEnvelope}
                          className="me-2 text-primary"
                        />
                        Correo Electrónico
                      </Form.Label>
                      <InputGroup hasValidation>
                        <Form.Control
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => handleBlur('email')}
                          className={getInputClass('email', emailValid)}
                          disabled={loading}
                        />
                        <Form.Control.Feedback type="invalid">
                          Introduce un correo electrónico válido
                        </Form.Control.Feedback>
                      </InputGroup>
                      {DEBUG_MODE && (
                        <p className="text-muted small mt-1">
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="me-1"
                          />
                          En modo debug, use cualquier email que contenga @ (ej:
                          test@example.com)
                        </p>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-center mt-4 gap-3">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={faRedo} className="me-2" />
                    Limpiar
                  </Button>

                  <Button
                    type="submit"
                    className="btn-primario px-4 py-2"
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSearch} className="me-2" />
                        Buscar Reserva
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="mt-4 pt-3 border-top text-center">
                <p className="text-muted mb-0">
                  <small>
                    ¿No encuentras tu reserva?{' '}
                    <a href="/contactus">
                      Contacta con nuestro equipo de soporte
                    </a>
                  </small>
                </p>
              </div>
            </Card.Body>
          </Card>

          <div className="text-center mt-3">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted"
            >
              Volver a la página principal
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ConsultarReservaCliente;
