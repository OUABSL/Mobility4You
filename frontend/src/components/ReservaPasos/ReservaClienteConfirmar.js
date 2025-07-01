// src/components/ReservaPasos/ReservaClienteConfirmar.js
import {
  faCalendarAlt,
  faCarSide,
  faChevronLeft,
  faClock,
  faCreditCard,
  faHome,
  faMapMarkerAlt,
  faMoneyBillWave,
  faPlus,
  faShieldAlt,
  faTimes,
  faUser,
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
  Row,
  Spinner,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import CardLogo from '../../assets/img/general/logo_visa_mastercard.png';
import { createServiceLogger } from '../../config/appConfig';
import '../../css/ReservaClienteConfirmar.css';
import useReservationTimer from '../../hooks/useReservationTimer';
import {
  createReservation,
  editReservation,
} from '../../services/reservationServices';
import {
  autoRecoverReservation,
  getReservationStorageService,
  updateConductorData,
  updateConductorDataIntermediate,
} from '../../services/reservationStorageService';
import { formatTaxRate } from '../../utils/financialUtils';
import { ReservationTimerBadge } from './ReservationTimerIndicator';
import ReservationTimerModal from './ReservationTimerModal';

// Crear logger para el componente
const logger = createServiceLogger('RESERVA_CLIENTE_CONFIRMAR');

const ReservaClienteConfirmar = () => {
  const navigate = useNavigate();
  const storageService = getReservationStorageService();

  // Hook del timer de reserva
  const {
    isActive: timerActive,
    remainingTime,
    formattedTime,
    showWarningModal,
    showExpiredModal,
    onExtendTimer,
    onCancelReservation,
    onStartNewReservation,
    onCloseModals,
  } = useReservationTimer();

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
      fechaNacimiento: '',
    },
    // Método de pago
    metodoPago: 'tarjeta',
    aceptaTerminos: false,
  }); // Cargar datos de reserva del storage service al iniciar
  useEffect(() => {
    const loadReservationData = async () => {
      try {
        const completeData = await storageService.getCompleteReservationData();
        if (!completeData) {
          setError(
            'No se encontraron datos de reserva. Por favor, inicia el proceso desde la selección de vehículo.',
          );
          return;
        }
        setReservaData(completeData);
        // Cargar datos del conductor si existen
        const conductorData = storageService.getConductorData();
        if (conductorData) {
          setFormData((prev) => ({
            ...prev,
            ...conductorData,
          }));
        }
      } catch (err) {
        logger.error('Error al cargar datos de reserva:', err);
        setError(
          'Error al cargar datos de reserva. Por favor, inténtalo de nuevo.',
        );
      }
    };

    loadReservationData();
  }, [storageService]);

  // Restore scroll position from extras page
  useEffect(() => {
    const scrollPosition = sessionStorage.getItem('confirmationScrollPosition');
    if (scrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPosition));
        sessionStorage.removeItem('confirmationScrollPosition');
      }, 100);
    }
  }, []); // Manejar cambios en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    let updatedFormData;

    // Manejar campos del segundo conductor
    if (name.startsWith('segundoConductor.')) {
      const fieldName = name.replace('segundoConductor.', '');
      updatedFormData = {
        ...formData,
        segundoConductor: {
          ...formData.segundoConductor,
          [fieldName]: value,
        },
      };
    } else {
      updatedFormData = {
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      };
    }

    setFormData(updatedFormData);
    // Guardar en storage service con manejo de errores mejorado
    try {
      // Solo intentar guardar si hay una reserva activa o si podemos reinicializarla
      if (storageService.hasActiveReservation()) {
        updateConductorDataIntermediate(updatedFormData);
      } else if (reservaData) {
        // Intentar reinicializar la reserva con los datos actuales
        logger.info(
          '[ReservaClienteConfirmar] Reinicializando reserva para guardar datos del conductor',
        );
        storageService.saveReservationData(reservaData);
        updateConductorDataIntermediate(updatedFormData);
      } else {
        // Intentar recuperación automática como última opción
        const recovered = autoRecoverReservation();
        if (recovered) {
          updateConductorDataIntermediate(updatedFormData);
        } else {
          logger.warn(
            '[ReservaClienteConfirmar] No se puede guardar datos del conductor: sin reserva activa',
          );
        }
      }
    } catch (err) {
      logger.error('Error al guardar datos del conductor:', err);
      // No mostrar error al usuario para evitar interrumpir la experiencia de escritura
    }
  };
  const handleVolver = () => {
    // Guardar posición de scroll
    sessionStorage.setItem(
      'confirmationScrollPosition',
      window.scrollY.toString(),
    );
    navigate('/reservation-confirmation');
  };

  // Manejador para cancelar reserva y volver a la búsqueda
  const handleCancelarReserva = () => {
    try {
      // Limpiar datos de reserva del storage
      storageService.clearAllReservationData();

      // Navegar de vuelta a la búsqueda de coches
      navigate('/coches', { replace: true });
    } catch (error) {
      logger.error('Error al cancelar reserva:', error);
      // Incluso si hay error al limpiar, navegar de vuelta
      navigate('/coches', { replace: true });
    }
  };

  // Manejar el envío del formulario
  // Validar los datos del formulario antes de enviarlos
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validación básica
      if (
        !formData.nombre ||
        !formData.apellidos ||
        !formData.email ||
        !formData.telefono ||
        !formData.fechaNacimiento ||
        !formData.nacionalidad ||
        !formData.numeroDocumento ||
        !formData.calle ||
        !formData.ciudad ||
        !formData.provincia ||
        !formData.codigoPostal ||
        !formData.aceptaTerminos
      ) {
        setError(
          'Por favor, completa todos los campos obligatorios y acepta los términos.',
        );
        setLoading(false);
        return;
      }

      // Validar segundo conductor si está marcado
      if (formData.tieneSegundoConductor) {
        const { segundoConductor } = formData;
        if (
          !segundoConductor.nombre ||
          !segundoConductor.apellidos ||
          !segundoConductor.email ||
          !segundoConductor.fechaNacimiento
        ) {
          setError(
            'Por favor, completa todos los campos obligatorios del segundo conductor.',
          );
          setLoading(false);
          return;
        }
      }

      if (!reservaData) throw new Error('No hay datos de reserva.'); // Asegurar que tenemos una reserva activa antes de proceder
      try {
        // Intentar actualizar datos del conductor en el storage service
        if (!storageService.hasActiveReservation() && reservaData) {
          logger.info(
            '[ReservaClienteConfirmar] Reinicializando reserva antes de guardar conductor',
          );
          storageService.saveReservationData(reservaData);
        }

        // Usar validación completa para el envío final
        updateConductorData(formData);
        logger.info(
          '[ReservaClienteConfirmar] Datos del conductor guardados exitosamente',
        );
      } catch (storageError) {
        logger.error(
          '[ReservaClienteConfirmar] Error al guardar conductor:',
          storageError,
        );
        throw new Error(
          'Error al guardar los datos del conductor. Por favor, inténtelo de nuevo.',
        );
      }

      // Calcular importes pagados/pendientes según método de pago
      let metodo_pago = formData.metodoPago;
      let importe_pagado_inicial = 0;
      let importe_pendiente_inicial = 0;
      const total =
        reservaData.detallesReserva?.total || reservaData.precioTotal || 0;

      if (metodo_pago === 'tarjeta') {
        importe_pagado_inicial = total;
        importe_pendiente_inicial = 0;
      } else {
        // Para efectivo, todo el importe se considera pendiente
        importe_pagado_inicial = 0;
        importe_pendiente_inicial = total;
      }

      // Si es pago en efectivo, completar la reserva directamente
      if (metodo_pago === 'efectivo') {
        // Actualizar datos de reserva con información de pago
        const updatedReserva = {
          ...reservaData,
          conductor: formData,
          conductorPrincipal: formData,
          metodo_pago,
          importe_pagado_inicial,
          importe_pendiente_inicial,
          importe_pagado_extra: 0,
          importe_pendiente_extra: 0,
          estado_pago: 'pendiente',
        };
        let result;
        if (updatedReserva.id) {
          result = await editReservation(updatedReserva.id, updatedReserva);
        } else {
          result = await createReservation(updatedReserva);
        }

        // Limpiar storage y navegar al éxito
        storageService.clearAllReservationData();
        navigate('/reservation-confirmation/exito', {
          state: {
            reservationData: result,
            paymentMethod: 'efectivo',
          },
        });
      } else {
        // Para pagos con tarjeta, actualizar método de pago en la reserva antes de navegar
        const updatedReservaForPayment = {
          ...reservaData,
          conductor: formData,
          conductorPrincipal: formData,
          metodoPago: metodo_pago,
          metodo_pago,
          importe_pagado_inicial,
          importe_pendiente_inicial,
          importe_pagado_extra: 0,
          importe_pendiente_extra: 0,
          estado_pago: 'pendiente',

          // Ensure detallesReserva is preserved for payment calculation
          detallesReserva: reservaData.detallesReserva || {
            base: reservaData.precioBase || reservaData.precio_base || 0,
            extras: reservaData.precioExtras || reservaData.precio_extras || 0,
            impuestos:
              reservaData.precioImpuestos || reservaData.precio_impuestos || 0,
            descuento:
              reservaData.descuentoPromocion ||
              reservaData.descuento_promocion ||
              0,
            total: reservaData.precioTotal || reservaData.precio_total || 0,
          },

          // Preserve all pricing fields for compatibility
          precioTotal: reservaData.precioTotal || reservaData.precio_total || 0,
          precio_total:
            reservaData.precioTotal || reservaData.precio_total || 0,
        };

        // Actualizar datos en el storage service con el método de pago
        try {
          storageService.saveReservationData(updatedReservaForPayment);
          storageService.updateConductorData(formData);
        } catch (storageError) {
          logger.error(
            '[ReservaClienteConfirmar] Error al actualizar storage antes del pago:',
            storageError,
          );
        }

        // Navegar al paso de pago
        navigate('/reservation-confirmation/pago');
      }
    } catch (err) {
      logger.error('Error al confirmar la reserva:', err);
      setError(err.message || 'Error al confirmar la reserva.');
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
              <FontAwesomeIcon
                icon={faTimes}
                size="4x"
                className="text-danger"
              />
            </div>
            <h4 className="mb-4">{error}</h4>
            <Button variant="primary" onClick={() => navigate('/coches')}>
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

  logger.info(`[ReservaClienteConfirmar] EXTRAS: ${JSON.stringify(extras)}`);

  logger.info(
    `[ReservaClienteConfirmar] Datos de reserva cargados: ${JSON.stringify(
      reservaData,
    )}`,
  );

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

      {/* Timer Badge */}
      {timerActive && (
        <div className="d-flex justify-content-center mb-3">
          <ReservationTimerBadge
            remainingTime={remainingTime}
            formattedTime={formattedTime}
            size="small"
          />
        </div>
      )}

      {/* Timer Modals */}
      <ReservationTimerModal
        type="warning"
        show={showWarningModal}
        onExtend={onExtendTimer}
        onCancel={onCancelReservation}
        onClose={onCloseModals}
      />

      <ReservationTimerModal
        type="expired"
        show={showExpiredModal}
        onStartNew={onStartNewReservation}
        onClose={onCloseModals}
      />
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
            <div className="d-flex align-items-center">
              <h5 className="mb-0 me-3">Datos del Conductor</h5>
              {timerActive && (
                <ReservationTimerBadge
                  remainingTime={remainingTime}
                  formattedTime={formattedTime}
                  size="small"
                  variant="light"
                />
              )}
            </div>
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
                      className={`payment-method ${
                        formData.metodoPago === 'tarjeta' ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, metodoPago: 'tarjeta' })
                      }
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
                      </div>{' '}
                    </div>

                    <div
                      className={`payment-method ${
                        formData.metodoPago === 'efectivo' ? 'selected' : ''
                      }`}
                      onClick={() =>
                        setFormData({ ...formData, metodoPago: 'efectivo' })
                      }
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
                        <FontAwesomeIcon
                          icon={faMoneyBillWave}
                          size="2x"
                          className="text-success me-2"
                        />
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
                        He leído y acepto los{' '}
                        <a
                          href="/terminos"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          términos y condiciones
                        </a>{' '}
                        y la{' '}
                        <a
                          href="/privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          política de privacidad
                        </a>{' '}
                        *
                      </span>
                    }
                  />
                </Form.Group>
                <div className="d-flex justify-content-between">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      onClick={handleVolver}
                      disabled={loading}
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
                      Volver
                    </Button>
                    <Button
                      variant="outline-danger"
                      onClick={handleCancelarReserva}
                      disabled={loading}
                      title="Cancelar reserva y volver a la búsqueda"
                    >
                      <FontAwesomeIcon icon={faTimes} className="me-2" />
                      Cancelar Reserva
                    </Button>
                  </div>
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
                    ) : formData.metodoPago === 'efectivo' ? (
                      'Confirmar Reserva'
                    ) : (
                      'Continuar al pago'
                    )}
                  </Button>
                </div>
              </Form>
            </Col>

            {/* Columna derecha: Resumen de la reserva */}
            <Col lg={5}>
              <Card className="mb-4 mt-1 resumen-reserva">
                <Card.Header>
                  <FontAwesomeIcon icon={faCarSide} className="me-2" />
                  Resumen de tu reserva
                </Card.Header>
                <Card.Body>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={
                        car?.imagen_principal ||
                        car?.imagen ||
                        car?.imagenPrincipal?.original ||
                        car?.imagenPrincipal?.placeholder ||
                        'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
                      }
                      alt={`${car?.marca} ${car?.modelo}`}
                      className="reserva-car-img me-3"
                      onError={(e) => {
                        e.target.src =
                          car?.imagenPrincipal?.placeholder ||
                          'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo';
                      }}
                    />
                    <div>
                      <h5>
                        {car?.marca} {car?.modelo}
                      </h5>
                      <p className="mb-0">
                        {paymentOption === 'all-inclusive'
                          ? 'All Inclusive'
                          : 'Economy'}
                      </p>
                    </div>
                  </div>
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Recogida:</strong>{' '}
                    {fechas?.pickupLocation
                      ? typeof fechas.pickupLocation === 'object'
                        ? fechas.pickupLocation.nombre
                        : fechas.pickupLocation
                      : 'Aeropuerto de Málaga'}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.pickupDate
                        ? new Date(fechas.pickupDate).toLocaleDateString()
                        : '14/05/2025'}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.pickupTime || '12:00'}
                    </div>
                  </div>{' '}
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Devolución:</strong>{' '}
                    {fechas?.dropoffLocation
                      ? typeof fechas.dropoffLocation === 'object'
                        ? fechas.dropoffLocation.nombre
                        : fechas.dropoffLocation
                      : 'Aeropuerto de Málaga'}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.dropoffDate
                        ? new Date(fechas.dropoffDate).toLocaleDateString()
                        : '17/05/2025'}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.dropoffTime || '12:00'}
                    </div>
                  </div>
                  <div className="proteccion mb-3">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                    <strong>Protección:</strong>{' '}
                    {paymentOption === 'all-inclusive'
                      ? 'Todo incluido sin franquicia'
                      : 'Básica con franquicia'}
                  </div>
                  {/* Lista de extras seleccionados */}
                  {extras && extras.length > 0 && (
                    <div className="extras mb-3">
                      <strong>Extras seleccionados:</strong>
                      <ul className="extras-list">
                        {extras
                          .filter(
                            (extra) =>
                              extra &&
                              typeof extra === 'object' &&
                              extra.nombre,
                          )
                          .map((extra, index) => (
                            <li key={index}>
                              <FontAwesomeIcon icon={faPlus} className="me-2" />
                              {extra.nombre} (
                              {typeof Number(extra.precio) == 'number'
                                ? Number(extra.precio).toFixed(2)
                                : '0.00'}
                              €/día )
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  <hr />
                  {/* Detalles del precio */}
                  {detallesReserva &&
                    typeof detallesReserva.precioCocheBase === 'number' && (
                      <div className="detalles-precio">
                        <div className="d-flex justify-content-between mb-2">
                          <span>Precio base:</span>
                          <span>
                            {typeof detallesReserva.precioCocheBase === 'number'
                              ? detallesReserva.precioCocheBase.toFixed(2)
                              : '0.00'}
                            €
                          </span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span>
                            IVA{formatTaxRate(detallesReserva.tasaImpuesto)}:
                          </span>
                          <span>
                            {typeof detallesReserva.iva === 'number'
                              ? detallesReserva.iva.toFixed(2)
                              : '0.00'}
                            €
                          </span>
                        </div>
                        {detallesReserva.precioExtras > 0 && (
                          <div className="d-flex justify-content-between mb-2">
                            <span>Extras:</span>
                            <span>
                              {typeof detallesReserva.precioExtras === 'number'
                                ? detallesReserva.precioExtras.toFixed(2)
                                : '0.00'}
                              €
                            </span>
                          </div>
                        )}
                        <hr />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Total:</span>
                          <span>
                            {typeof detallesReserva.total === 'number'
                              ? detallesReserva.total.toFixed(2)
                              : '0.00'}
                            €
                          </span>
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
