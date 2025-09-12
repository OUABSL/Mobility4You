// src/components/DetallesReserva.js
import {
  faCalendarAlt,
  faCarSide,
  faChevronDown,
  faChevronUp,
  faClock,
  faCreditCard,
  faDownload,
  faEdit,
  faEnvelope,
  faExclamationTriangle,
  faIdCard,
  faInfoCircle,
  faMapMarkerAlt,
  faPhone,
  faPlusCircle,
  faShieldAlt,
  faTimesCircle,
  faUser,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Image,
  ListGroup,
  Modal,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import '../css/DetallesReserva.css';
import '../css/PrintStyles.css';

import carDoorLeft from '../assets/img/icons/car-door-left.svg';

import '../css/ReservationModals.css';

import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';
import { useAlertContext } from '../context/AlertContext';
import {
  deleteReservation,
  editReservation,
  findReservation,
  findReservationByNumber,
} from '../services/reservationServices';
import { formatIvaRate } from '../utils/financialUtils';
import {
  isValidReservationNumber,
  normalizeReservationNumber,
} from '../utils/reservationNumberUtils';

import DeleteReservationModal from './Modals/DeleteReservationModal';
import EditReservationModal from './Modals/EditReservationModal';
import ImageManager from './common/ImageManager';

/**
 * Componente DetallesReserva - Muestra los detalles completos de una reserva
 *
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isMobile - Indica si el dispositivo es móvil
 * @returns {JSX.Element} Componente DetallesReserva
 */

// Contenidos para los acordeones
const contenidosPrueba = {
  important: [
    'Llevar licencia de conducir válida para cada conductor',
    'Presentar pasaporte o DNI en buen estado',
    'Disponer de tarjeta de crédito a nombre del conductor principal',
    'Respetar las directrices generales de uso del vehículo',
    'Presentar documentos originales (no se aceptan fotocopias)',
  ],
  deposit: [
    'Depósito reembolsable de 300,00€ para opciones Economy',
    'Para reservas prepagadas: cargo total + bloqueo del depósito',
    'Para pago en recogida: solo se bloquea el importe total + depósito',
    'Con All Inclusive: sin depósito ni franquicia',
  ],
  cancel: [
    'Cancelación gratuita para reservas con pago en destino hasta 24h antes',
    'Cancelación con menos de 24h: cargo del 50% del valor total',
    'Sin presentación (no-show): cargo del importe total',
    'Reservas corporativas: aplican acuerdos individuales',
  ],
  changes: [
    'No es posible cambiar la forma de pago online',
    'Para actualizar datos del conductor, contactar con atención al cliente',
    'Los extras adicionales se pueden pagar en el momento de la recogida',
    'Modificaciones de fecha/hora sujetas a disponibilidad',
  ],
  station: [
    'Mostrador de recogida ubicado en Terminal 3, planta baja',
    'Servicio de shuttle gratuito al aparcamiento de vehículos',
    'Horario de atención: 08:00 - 22:00 todos los días',
    'Para llegadas fuera de horario, contactar con antelación',
  ],
};

// Crear logger para el componente
const logger = createServiceLogger('DETALLES_RESERVA');

const DetallesReserva = ({ isMobile = false }) => {
  // Hooks para obtener parámetros y navegación
  const { reservaId } = useParams();
  const location = useLocation();
  // Obtener email desde location.state si existe
  const email = location.state?.email || '';
  const navigate = useNavigate();

  // Estados del componente
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contenidos, setContenidos] = useState(contenidosPrueba);

  // Funciones para manejar la edición y eliminación de reservas
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Contexto de alertas
  const { showError } = useAlertContext();

  // referencia para el timer
  const retryTimerRef = React.useRef(null);
  // referencia para evitar fetches duplicados
  const fetchInProgressRef = React.useRef(false);
  // referencia para último fetch realizado
  const lastFetchRef = React.useRef(null);

  // Función para manejar la edición de la reserva
  const handleEditReservation = (reservaData) => {
    logger.info('Datos de reserva para editar:', reservaData);

    // Guardar el email en sessionStorage para uso posterior
    if (email) {
      sessionStorage.setItem('reservaEmail', email);
    }
    setShowEditModal(true);
  };

  // Función para manejar la eliminación de la reserva
  const handleDeleteReservation = (reservaId) => {
    setShowDeleteModal(true);
  };

  // Estados para controlar los acordeones
  const [openAccordions, setOpenAccordions] = useState({
    important: false,
    deposit: false,
    cancel: false,
    changes: false,
    station: false,
  });

  // Estados para modals
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Función mejorada para imprimir/descargar PDF
  const handlePrint = () => {
    // Debug: verificar datos antes de imprimir
    if (DEBUG_MODE) {
      console.log('🖨️ [DEBUG] Preparando impresión con datos:', datos);
      console.log('🖨️ [DEBUG] Vehículo:', datos?.vehiculo);
      console.log('🖨️ [DEBUG] Conductores:', datos?.conductores);
    }

    // Agregar clase de impresión al body
    document.body.classList.add('printing');

    // Abrir todos los acordeones antes de imprimir
    setOpenAccordions({
      important: true,
      deposit: true,
      cancel: true,
      changes: true,
      station: true,
    });

    // Ocultar elementos innecesarios para impresión
    const elementsToHide = document.querySelectorAll(
      '.btn, .navbar, .back-button, .edit-button, .delete-button',
    );
    elementsToHide.forEach((el) => (el.style.display = 'none'));

    // Dar tiempo para que se actualice el DOM antes de imprimir
    setTimeout(() => {
      // Configurar título de impresión
      const originalTitle = document.title;
      document.title = `Reserva ${
        datos?.numero_reserva || datos?.id
      } - Mobility for You`;

      // Ejecutar impresión
      window.print();

      // Restaurar estado después de imprimir
      setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('printing');
        elementsToHide.forEach((el) => (el.style.display = ''));
      }, 500);
    }, 100);
  };

  // Cálculo de días de la reserva (solo si tenemos datos)
  const calcularDiasReserva = () => {
    if (!datos) return 0;

    const fechaRecogida = new Date(datos.fechaRecogida);
    const fechaDevolucion = new Date(datos.fechaDevolucion);

    // Cálculo de diferencia en días
    return Math.ceil((fechaDevolucion - fechaRecogida) / (1000 * 60 * 60 * 24));
  };

  // Formatear fecha y hora
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '', time: '' };

    const date = new Date(dateTimeStr);

    return {
      date: date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  // Formatear precio como moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Toggle para los paneles acordeón
  const toggleAccordion = (section) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Función para mostrar modal de conductor
  const handleShowDriverDetails = (driver) => {
    // Debug temporal para ver qué datos tiene el conductor
    console.log('🔍 [DEBUG] Datos del conductor para modal:', driver);

    // Verificar si hay datos de conductor_detail dentro del objeto
    if (driver.conductor_detail) {
      console.log(
        '🔍 [DEBUG] Usando conductor_detail:',
        driver.conductor_detail,
      );
      const enrichedDriver = {
        ...driver.conductor_detail,
        ...driver, // Mantener propiedades del nivel superior como rol y email
        esSegundoConductor: driver.esSegundoConductor || false,
      };
      setSelectedDriver(enrichedDriver);
    } else {
      setSelectedDriver(driver);
    }

    setShowDriverModal(true);
  };

  // Función para preparar los datos del conductor para mostrar en la UI
  const prepareDriverData = (driver) => {
    if (!driver) return null;

    // Formatear la dirección completa con verificaciones seguras
    const direccionCompleta = driver.direccion
      ? `${driver.direccion.calle || ''}, ${
          driver.direccion.codigo_postal || ''
        } ${driver.direccion.ciudad || ''}, ${
          driver.direccion.provincia || ''
        }, ${driver.direccion.pais || ''}`
          .replace(/,\s*,/g, ',')
          .replace(/^\s*,\s*|\s*,\s*$/g, '')
      : 'Dirección no disponible';

    // Capitalizar la primera letra de nacionalidad y tipo de documento de forma segura
    const nacionalidadFormatted = driver.nacionalidad
      ? driver.nacionalidad.charAt(0).toUpperCase() +
        driver.nacionalidad.slice(1)
      : 'No especificada';

    const tipoDocumentoFormatted =
      driver.tipo_documento === 'dni'
        ? 'DNI'
        : driver.tipo_documento === 'nif'
        ? 'NIF'
        : driver.tipo_documento === 'pasaporte'
        ? 'Pasaporte'
        : 'Documento';

    return {
      ...driver,
      direccionCompleta,
      nacionalidadFormatted,
      tipoDocumentoFormatted,
    };
  };

  // ========================================
  // EFECTO PRINCIPAL CONSOLIDADO
  // ========================================
  useEffect(() => {
    // Función principal para obtener datos de reserva
    const fetchReserva = async () => {
      // Prevenir múltiples fetches simultáneos
      if (fetchInProgressRef.current) {
        logger.info('⚠️ Fetch ya en progreso, evitando duplicado');
        return;
      }

      // Generar clave única para este fetch
      const currentFetchKey = `${reservaId}_${email}_${Date.now()}`;

      // Si es el mismo fetch que ya se realizó recientemente, evitarlo
      if (lastFetchRef.current === `${reservaId}_${email}`) {
        logger.info('⚠️ Fetch duplicado evitado - datos ya cargados');
        return;
      }

      // Verificar si ya tenemos datos válidos para esta reserva y email
      if (
        datos &&
        datos.id === parseInt(reservaId) &&
        datos.conductores?.some((c) => c.conductor?.email === email)
      ) {
        logger.info(
          '✅ Datos de reserva ya cargados y válidos, evitando fetch duplicado',
        );
        setLoading(false);
        return;
      }

      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // Cancelación de timer anterior si existe
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }

        logger.info(`🔍 Consultando reserva ${reservaId} para email ${email}`);

        // Detectar si es un número de reserva (formato M4Y) o un ID numérico
        const normalizedInput = normalizeReservationNumber(reservaId);
        const isReservationNumber = isValidReservationNumber(normalizedInput);

        let responseData;
        if (isReservationNumber) {
          // Buscar por número de reserva personalizado
          logger.info(`🔍 Buscando por número de reserva: ${normalizedInput}`);
          responseData = await findReservationByNumber(normalizedInput, email);
        } else {
          // Buscar por ID numérico interno
          logger.info(`🔍 Buscando por ID interno: ${reservaId}`);
          responseData = await findReservation(reservaId, email);
        }

        // Obtener datos de la reserva (usa cache automáticamente)
        // const responseData = await findReservation(reservaId, email);

        // Verificar si el fetch fue cancelado o reemplazado
        if (!fetchInProgressRef.current) {
          logger.info('🚫 Fetch cancelado - nuevo fetch en progreso');
          return;
        }

        // Verificar si hay datos de reserva en la respuesta
        const reservaData = responseData.reserva || responseData;

        if (!reservaData) {
          throw new Error('No se encontraron datos de la reserva');
        }

        // Los datos ya vienen mapeados desde reservationServices.js
        // No necesitamos mapear nuevamente
        const mappedData = reservaData;

        // Verificar nuevamente si el fetch sigue siendo válido
        if (!fetchInProgressRef.current) {
          logger.info(
            '🚫 Fetch cancelado durante mapeo - nuevo fetch en progreso',
          );
          return;
        }

        // Debug del mapeo
        if (DEBUG_MODE) {
          logger.debug('Universal mapper output:', {
            mappedData,
            originalData: reservaData,
            context: 'detalles-reserva',
          });
        }

        // Debug temporal: ver datos mapeados
        console.log('🔍 Datos mapeados completos:', mappedData);
        console.log('🔍 Lugar recogida:', mappedData?.lugarRecogida);
        console.log('🔍 Lugar devolución:', mappedData?.lugarDevolucion);
        console.log('🔍 Política pago:', mappedData?.politicaPago);

        // LOGGING FINAL ANTES DE SETEAR ESTADO
        logger.info(
          '🔄 [DETALLES_RESERVA] FINAL - Datos que se van a setear en estado:',
          {
            precioTotal: mappedData.precioTotal,
            precioBase: mappedData.precioBase,
            precioExtras: mappedData.precioExtras,
            extras: mappedData.extras,
            diasAlquiler: mappedData.diasAlquiler,
            iva: mappedData.iva,
          },
        );

        // Actualizar estado solo si el fetch sigue siendo el actual
        setDatos(mappedData);
        lastFetchRef.current = `${reservaId}_${email}`;
        logger.info('✅ Datos de reserva cargados exitosamente');
      } catch (err) {
        // Solo mostrar error si el fetch sigue siendo válido
        if (fetchInProgressRef.current) {
          logger.error('❌ Error al cargar reserva:', err);
          setError(
            err.message ||
              'No se pudo cargar la información de la reserva. Por favor, inténtalo de nuevo.',
          );
        }
      } finally {
        // Limpiar el flag de fetch en progreso
        fetchInProgressRef.current = false;
        setLoading(false);
      }
    };

    // Condiciones para ejecutar el fetch
    const shouldFetch =
      reservaId && email && email.includes('@') && !fetchInProgressRef.current;

    if (shouldFetch) {
      // Pequeño delay para evitar fetches muy rápidos en navegación
      const timeoutId = setTimeout(fetchReserva, 50);

      return () => {
        clearTimeout(timeoutId);
        // Cancelar fetch en progreso si el componente se desmonta o cambian las dependencias
        fetchInProgressRef.current = false;
      };
    } else if (reservaId && !email) {
      logger.warn('⚠️ Email no disponible, esperando datos de navegación');
      setError('Email requerido para consultar la reserva');
      setLoading(false);
    } else if (!reservaId) {
      logger.warn('⚠️ ID de reserva no disponible');
      setError('ID de reserva requerido');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      // Cancelar cualquier fetch en progreso
      fetchInProgressRef.current = false;
    };
  }, [reservaId, email, datos]); // Dependencias optimizadas incluyendo datos

  // ========================================
  // EFECTOS ADICIONALES ESPECÍFICOS
  // ========================================

  // Función para manejar la edición de la reserva
  const handleEditReservationCentral = async (updatedData) => {
    setIsProcessing(true);
    setError(null);
    try {
      const updated = await editReservation(datos.id, updatedData);
      setDatos(updated);
      setShowEditModal(false);
    } catch (err) {
      setError(err.message || 'Error al editar la reserva.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Función para manejar la eliminación de la reserva (centralizada)
  const handleDeleteReservationCentral = async (reservaId) => {
    setIsProcessing(true);
    setError(null);
    try {
      await deleteReservation(reservaId);
      setShowDeleteModal(false);
      navigate('/reservations', {
        state: {
          message: 'Reserva cancelada correctamente',
          alertType: 'success',
        },
      });
    } catch (err) {
      setError(err.message || 'Error al cancelar la reserva.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderizado de estados de carga y error
  if (loading) {
    return (
      <Container className="detalles-reserva my-5 text-center">
        <Spinner animation="border" variant="primary" className="me-2" />
        <span>Cargando detalles de la reserva...</span>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="detalles-reserva my-5">
        <Card bg="danger" text="white" className="p-3 shadow-sm">
          <Card.Body className="text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="me-2"
              size="lg"
            />
            <span>{error}</span>
            <div className="mt-3">
              <Button
                variant="outline-light"
                onClick={() => navigate('/reservations')}
              >
                Volver a Gestión de Reservas
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Verificar que tenemos datos válidos antes de renderizar
  if (!datos || !datos.id) {
    return (
      <Container className="detalles-reserva my-5 text-center">
        <Card className="p-3 shadow-sm">
          <Card.Body>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="me-2 text-warning"
              size="lg"
            />
            <span>No se pudieron cargar los datos de la reserva.</span>
            <div className="mt-3">
              <Button
                variant="outline-primary"
                onClick={() => window.location.reload()}
              >
                Intentar de nuevo
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Formatear fechas/horas para mostrar
  const recogida = formatDateTime(datos.fechaRecogida);
  const devolucion = formatDateTime(datos.fechaDevolucion);
  const diasReserva = calcularDiasReserva();

  // NUEVO: Resumen de pagos
  const resumenPagos = (
    <div className="mb-4">
      <h5 className="mb-3">
        <FontAwesomeIcon icon={faCreditCard} /> Resumen de Pagos
      </h5>
      <table className="table table-bordered table-sm w-auto">
        <tbody>
          <tr>
            <th>Método de pago inicial</th>
            <td>{datos.metodo_pago || '-'}</td>
          </tr>
          <tr>
            <th>Importe pagado inicial</th>
            <td>
              {datos.importe_pagado_inicial !== undefined
                ? formatCurrency(datos.importe_pagado_inicial)
                : '-'}
            </td>
          </tr>
          <tr>
            <th>Importe pendiente inicial</th>
            <td>
              {datos.importe_pendiente_inicial !== undefined
                ? formatCurrency(datos.importe_pendiente_inicial)
                : '-'}
            </td>
          </tr>
          <tr>
            <th>Importe pagado extra</th>
            <td>
              {datos.importe_pagado_extra !== undefined
                ? formatCurrency(datos.importe_pagado_extra)
                : '-'}
            </td>
          </tr>
          <tr>
            <th>Importe pendiente extra</th>
            <td>
              {datos.importe_pendiente_extra !== undefined
                ? formatCurrency(datos.importe_pendiente_extra)
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // --- Estado de pago de diferencia ---
  const mostrarPagoDiferencia =
    typeof datos.diferenciaPendiente === 'number' &&
    datos.diferenciaPendiente > 0;
  const diferenciaPagada =
    datos.diferenciaPagada === true || datos.diferenciaPagada === 1;
  const metodoPagoDiferencia = datos.metodoPagoDiferencia;

  return (
    <Container className="detalles-reserva my-5">
      {/* Botón Volver y botones de acción */}
      <div className="botonera-superior d-flex align-items-center mb-3">
        <Button
          variant="link"
          onClick={() => navigate(-1)}
          className="d-flex align-items-center"
        >
          <FontAwesomeIcon icon={faChevronUp} rotation={270} className="me-2" />
          Volver
        </Button>

        {isMobile && (
          <Button
            variant="link"
            onClick={handlePrint}
            title="Imprimir/Guardar como PDF"
          >
            <FontAwesomeIcon icon={faDownload} className="me-1" /> Descargar
          </Button>
        )}

        <div className="ms-auto d-flex gap-2">
          <Button
            variant="outline-warning"
            onClick={() => handleEditReservation(datos)}
            disabled={datos.estado === 'cancelada'}
            title={
              datos.estado === 'cancelada'
                ? 'No se puede editar una reserva cancelada'
                : 'Editar reserva'
            }
          >
            <FontAwesomeIcon icon={faEdit} className="me-1" /> Editar Reserva
          </Button>

          <Button
            variant="outline-danger"
            onClick={() => handleDeleteReservation(datos.id)}
            disabled={datos.estado === 'cancelada'}
            title={
              datos.estado === 'cancelada'
                ? 'La reserva ya está cancelada'
                : 'Cancelar reserva'
            }
          >
            <FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Cancelar
            Reserva
          </Button>

          {!isMobile && (
            <Button
              variant="link"
              onClick={handlePrint}
              title="Imprimir/Guardar como PDF"
            >
              <FontAwesomeIcon icon={faDownload} className="me-1" /> Descargar
            </Button>
          )}
        </div>
      </div>

      {/* Tarjeta Principal */}
      <Card className="shadow reservation-details-card">
        <Card.Header className="bg-primario py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              <FontAwesomeIcon icon={faCarSide} className="me-2" />
              Reserva #{datos.numero_reserva}
            </h4>
            <Badge
              bg={
                datos.estado === 'confirmada'
                  ? 'success'
                  : datos.estado === 'pendiente'
                  ? 'warning'
                  : 'danger'
              }
              className="py-2 px-3"
            >
              {datos.estado === 'confirmada'
                ? 'Confirmada'
                : datos.estado === 'pendiente'
                ? 'Pendiente'
                : 'Cancelada'}
            </Badge>
          </div>
        </Card.Header>

        <Card.Body>
          <Row>
            {/* Columna principal (izquierda) */}
            <Col lg={8} className="pe-lg-4">
              {/* Sección Vehículo */}
              <Card className="mb-4 vehicle-card">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={4} className="text-center">
                      <ImageManager
                        src={
                          datos.vehiculo?.imagen_principal ||
                          datos.vehiculo?.imagenPrincipal?.original ||
                          datos.vehiculo?.imagenPrincipal?.placeholder
                        }
                        alt={`${datos.vehiculo?.marca || ''} ${
                          datos.vehiculo?.modelo || ''
                        }`}
                        className="img-fluid car-img rounded"
                        placeholder="vehicle"
                      />
                    </Col>
                    <Col md={8}>
                      <h3 className="vehicle-title">
                        {datos.vehiculo?.marca || ''}{' '}
                        {datos.vehiculo?.modelo || ''}
                      </h3>
                      <div className="d-flex flex-wrap align-items-center vehicle-tags mb-2">
                        {datos.vehiculo?.categoria?.nombre && (
                          <Badge bg="secondary" className="me-2 mb-1">
                            {datos.vehiculo.categoria.nombre}
                          </Badge>
                        )}
                        {datos.vehiculo?.grupo?.nombre && (
                          <Badge bg="info" className="me-2 mb-1">
                            {datos.vehiculo.grupo.nombre}
                          </Badge>
                        )}
                        {datos.vehiculo?.combustible && (
                          <Badge bg="light" text="dark" className="mb-1">
                            {datos.vehiculo.combustible}
                          </Badge>
                        )}
                      </div>
                      <div className="vehicle-features">
                        {datos.vehiculo?.numPasajeros && (
                          <span className="me-3">
                            <FontAwesomeIcon
                              icon={faUser}
                              className="me-1 text-muted"
                            />
                            {datos.vehiculo.numPasajeros} asientos
                          </span>
                        )}
                        {datos.vehiculo?.numPuertas && (
                          <span className="me-3">
                            <Image
                              src={carDoorLeft}
                              style={{ maxWidth: '18px' }}
                              alt="Puertas"
                              className="icon-svg text-secondary mb-1 me-1"
                            />
                            {datos.vehiculo.numPuertas} puertas
                          </span>
                        )}
                        {datos.politicaPago?.titulo && (
                          <span>
                            <FontAwesomeIcon
                              icon={faShieldAlt}
                              className="me-1 text-success"
                            />
                            {datos.politicaPago?.titulo || 'No especificada'}
                          </span>
                        )}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Fechas y Lugares */}
              <Card className="mb-4 locations-card">
                <Card.Body>
                  <Row>
                    <Col md={6} className="border-end pickup-section">
                      <h5 className="location-title">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="me-2 text-primary"
                        />
                        Recogida
                      </h5>
                      <p className="location-name">
                        {datos.lugarRecogida.nombre}
                      </p>
                      <p className="location-address">
                        {datos.lugarRecogida.direccion?.calle ||
                          'Dirección no disponible'}
                        , {datos.lugarRecogida.direccion?.codigo_postal || ''},
                        {datos.lugarRecogida.direccion?.ciudad || ''},{' '}
                        {datos.lugarRecogida.direccion?.provincia || ''}
                      </p>
                      <div className="date-time mt-3">
                        <div className="d-flex mb-1">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon
                              icon={faCalendarAlt}
                              className="text-muted"
                            />
                          </div>
                          <span>{recogida.date}</span>
                        </div>
                        <div className="d-flex">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon
                              icon={faClock}
                              className="text-muted"
                            />
                          </div>
                          <span>{recogida.time}</span>
                        </div>
                      </div>
                    </Col>

                    <Col md={6} className="dropoff-section">
                      <h5 className="location-title">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="me-2 text-danger"
                        />
                        Devolución
                      </h5>
                      <p className="location-name">
                        {datos.lugarDevolucion.nombre}
                      </p>
                      <p className="location-address">
                        {datos.lugarDevolucion.direccion?.calle ||
                          'Dirección no disponible'}
                        , {datos.lugarDevolucion.direccion?.codigo_postal || ''}
                        ,{datos.lugarDevolucion.direccion?.ciudad || ''},{' '}
                        {datos.lugarDevolucion.direccion?.provincia || ''}
                      </p>
                      <div className="date-time mt-3">
                        <div className="d-flex mb-1">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon
                              icon={faCalendarAlt}
                              className="text-muted"
                            />
                          </div>
                          <span>{devolucion.date}</span>
                        </div>
                        <div className="d-flex">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon
                              icon={faClock}
                              className="text-muted"
                            />
                          </div>
                          <span>{devolucion.time}</span>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Protección */}
              <Card className="mb-4 protection-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FontAwesomeIcon
                      icon={faShieldAlt}
                      className="me-2 text-success"
                    />
                    Protección:{' '}
                    {datos.politicaPago?.titulo || 'No especificada'}
                  </h5>
                  {datos.politicaPago?.deductible === 0 ? (
                    <Badge bg="success">Sin franquicia</Badge>
                  ) : (
                    <Badge bg="warning" text="dark">
                      Franquicia:{' '}
                      {datos.politicaPago?.deductible !== undefined &&
                      datos.politicaPago?.deductible !== null
                        ? formatCurrency(datos.politicaPago.deductible)
                        : 'No disponible'}
                    </Badge>
                  )}
                </Card.Header>
                <ListGroup variant="flush">
                  {(datos.politicaPago?.items || [])
                    .filter(
                      (item) => item.incluye === true || item.incluye === 1,
                    )
                    .map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faPlusCircle}
                          className="me-2 text-success"
                        />
                        {item.item}
                      </ListGroup.Item>
                    ))}
                </ListGroup>
              </Card>

              {/* Sección opcional: Lo que NO incluye */}
              {(datos.politicaPago?.items || []).some(
                (item) => item.incluye === false || item.incluye === 0,
              ) && (
                <Card className="mb-4 not-included-card">
                  <Card.Header>
                    <h5 className="mb-0 text-start">
                      <FontAwesomeIcon
                        icon={faTimesCircle}
                        className="me-2 text-danger"
                      />
                      No incluido en la protección
                    </h5>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {(datos.politicaPago?.items || [])
                      .filter(
                        (item) => item.incluye === false || item.incluye === 0,
                      )
                      .map((item, i) => (
                        <ListGroup.Item key={i} className="py-3">
                          <FontAwesomeIcon
                            icon={faTimesCircle}
                            className="me-2 text-danger"
                          />
                          {item.item}
                        </ListGroup.Item>
                      ))}
                  </ListGroup>
                </Card>
              )}

              {/* Extras */}
              {datos.extras && datos.extras.length > 0 && (
                <Card className="mb-4 extras-card">
                  <Card.Header>
                    <h5 className="mb-0 text-start">
                      <FontAwesomeIcon
                        icon={faPlusCircle}
                        className="me-2 text-primary"
                      />
                      Extras Contratados
                    </h5>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {datos.extras
                      .filter(
                        (extra) =>
                          extra &&
                          typeof extra === 'object' &&
                          extra.nombre &&
                          typeof extra.precio === 'number',
                      )
                      .map((extra, i) => (
                        <ListGroup.Item
                          key={i}
                          className="py-3 d-flex justify-content-between align-items-center"
                        >
                          <span>
                            <FontAwesomeIcon
                              icon={faPlusCircle}
                              className="me-2 text-primary"
                            />
                            {extra.nombre}
                          </span>
                          <div className="text-end">
                            <Badge
                              bg="light"
                              text="dark"
                              className="price-badge"
                            >
                              {extra.precio !== undefined &&
                              extra.precio !== null ? (
                                // Mostrar precio por día y total
                                datos.diasAlquiler ? (
                                  <div>
                                    <div>
                                      {formatCurrency(extra.precio)}/día
                                    </div>
                                    <small className="text-muted">
                                      Total:{' '}
                                      {formatCurrency(
                                        extra.precio * datos.diasAlquiler,
                                      )}
                                    </small>
                                  </div>
                                ) : (
                                  formatCurrency(extra.precio)
                                )
                              ) : (
                                'No disponible'
                              )}
                            </Badge>
                          </div>
                        </ListGroup.Item>
                      ))}
                    {/* Si no hay extras válidos, mostrar mensaje */}
                    {datos.extras.filter(
                      (extra) =>
                        extra &&
                        typeof extra === 'object' &&
                        extra.nombre &&
                        typeof extra.precio === 'number',
                    ).length === 0 && (
                      <ListGroup.Item className="py-3 text-muted text-center">
                        No hay extras contratados.
                      </ListGroup.Item>
                    )}
                  </ListGroup>
                </Card>
              )}

              {/* Datos de Conductores - Solo mostrar si datos está completamente cargado */}
              {datos && datos.conductores !== undefined && (
                <Card className="drivers-card">
                  <Card.Header>
                    <h5 className="text-start mb-0">
                      <FontAwesomeIcon icon={faUser} className="me-2" />
                      Conductor
                      {datos.conductores && datos.conductores.length > 1
                        ? 'es'
                        : ''}
                    </h5>
                  </Card.Header>
                  <Card.Body>
                    {/* Iterar sobre los conductores usando el array de la relación */}
                    {datos.conductores && datos.conductores.length > 0 ? (
                      datos.conductores
                        .map((conductorRelacion, index) => {
                          if (!conductorRelacion) return null;

                          const conductor =
                            conductorRelacion.conductor ||
                            conductorRelacion.conductor_detail ||
                            {};
                          const esPrincipal =
                            conductorRelacion.rol === 'principal';

                          return (
                            <div
                              key={conductorRelacion.id || index}
                              className={index > 0 ? 'mt-4' : ''}
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <h6 className="driver-name">
                                  <FontAwesomeIcon
                                    icon={esPrincipal ? faUser : faUserPlus}
                                    className="me-2 text-primary"
                                  />
                                  {esPrincipal
                                    ? 'Conductor Principal'
                                    : 'Conductor Adicional'}
                                </h6>

                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => {
                                    const driverData = {
                                      ...conductor,
                                      ...conductorRelacion, // Incluir datos de la relación (rol, etc.)
                                      email:
                                        conductorRelacion.email ||
                                        conductor.email ||
                                        '',
                                      esSegundoConductor: !esPrincipal,
                                    };
                                    console.log(
                                      '🔍 [DEBUG] Enviando datos del conductor:',
                                      driverData,
                                    );
                                    handleShowDriverDetails(driverData);
                                  }}
                                >
                                  Ver detalles
                                </Button>
                              </div>

                              <Row className="mt-2">
                                <Col md={6} className="mb-2">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faUser}
                                      className="me-2 text-muted"
                                    />
                                    <span>
                                      {conductor.nombre || 'Conductor'}{' '}
                                      {conductor.apellidos ||
                                        conductor.apellido ||
                                        ''}
                                    </span>
                                  </div>
                                </Col>
                                <Col md={6} className="mb-2">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faIdCard}
                                      className="me-2 text-muted"
                                    />
                                    <span>
                                      {conductor.tipo_documento &&
                                      conductor.documento
                                        ? `${conductor.tipo_documento.toUpperCase()}: ${
                                            conductor.documento
                                          }`
                                        : conductor.documento ||
                                          conductor.numero_documento ||
                                          'No disponible'}
                                    </span>
                                  </div>
                                </Col>
                                <Col md={6} className="mb-2">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faEnvelope}
                                      className="me-2 text-muted"
                                    />
                                    <span>
                                      {conductor.email ||
                                        conductorRelacion.email ||
                                        'No disponible'}
                                    </span>
                                  </div>
                                </Col>
                                <Col md={6} className="mb-2">
                                  <div className="d-flex align-items-center">
                                    <FontAwesomeIcon
                                      icon={faPhone}
                                      className="me-2 text-muted"
                                    />
                                    <span>
                                      {conductor.telefono || 'No disponible'}
                                    </span>
                                  </div>
                                </Col>
                                {conductor.nacionalidad && (
                                  <Col md={6} className="mb-2">
                                    <div className="d-flex align-items-center">
                                      <FontAwesomeIcon
                                        icon={faInfoCircle}
                                        className="me-2 text-muted"
                                      />
                                      <span>
                                        <strong>Nacionalidad:</strong>{' '}
                                        {conductor.nacionalidad}
                                      </span>
                                    </div>
                                  </Col>
                                )}
                              </Row>

                              {datos.conductores &&
                                datos.conductores.length > 0 &&
                                index < datos.conductores.length - 1 && (
                                  <hr className="my-3" />
                                )}
                            </div>
                          );
                        })
                        .filter(Boolean) // Filtrar elementos null/undefined
                    ) : (
                      <div className="text-center text-muted py-3">
                        <FontAwesomeIcon icon={faUser} className="me-2" />
                        {datos.conductores !== undefined
                          ? 'No hay información de conductores disponible'
                          : 'Cargando información de conductores...'}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}
            </Col>

            {/* Columna secundaria (derecha) */}
            <Col lg={4} className="mt-4 mt-lg-0">
              {/* Resumen de Precio */}
              <Card className="mb-4 price-summary-card">
                <Card.Header className="bg-light">
                  <h5 className="mb-0 d-flex justify-content-between align-items-center">
                    <span>Resumen de Precio</span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowPriceModal(true)}
                      title="Ver desglose completo"
                    >
                      <FontAwesomeIcon icon={faInfoCircle} />
                    </Button>
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Duración del alquiler:</span>
                    <span className="fw-bold">{diasReserva} días</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Precio total:</span>
                    <span>
                      {datos.precioBase !== undefined &&
                      datos.precioBase !== null
                        ? formatCurrency(datos.precioBase)
                        : 'No disponible'}
                    </span>
                  </div>

                  {datos.extras && datos.extras.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Extras:</span>
                      <span>
                        {datos.precioExtras !== undefined &&
                        datos.precioExtras !== null
                          ? formatCurrency(datos.precioExtras)
                          : 'No disponible'}
                      </span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>
                      IVA incluida{formatIvaRate(datos.tasaIva || 10)}:
                    </span>
                    <span>
                      {(() => {
                        // Calcular IVA simbólicamente como 10% del total
                        const ivaCalculado = datos.precioTotal
                          ? datos.precioTotal * 0.1
                          : 0;
                        return formatCurrency(ivaCalculado);
                      })()}
                    </span>
                  </div>

                  {datos.promocion &&
                    datos.descuentoPromocion !== undefined &&
                    datos.descuentoPromocion !== null && (
                      <div className="d-flex justify-content-between align-items-center mb-2 text-success">
                        <span>Descuento promoción:</span>
                        <span>-{formatCurrency(datos.descuentoPromocion)}</span>
                      </div>
                    )}

                  <hr />

                  <div className="d-flex justify-content-between align-items-center">
                    <h5>Total:</h5>
                    <h4 className="text-primary">
                      {datos.precioTotal !== undefined &&
                      datos.precioTotal !== null
                        ? formatCurrency(datos.precioTotal)
                        : 'No disponible'}
                    </h4>
                  </div>

                  <div className="text-end">
                    <small className="text-muted">
                      {(datos.politicaPago?.deductible || 0) > 0
                        ? `Requiere depósito: ${formatCurrency(
                            datos.politicaPago.deductible,
                          )}`
                        : 'Sin depósito requerido'}
                    </small>
                  </div>
                </Card.Body>
              </Card>

              {/* Estado de pago de diferencia si aplica */}
              {mostrarPagoDiferencia && (
                <Card className="mb-4 diferencia-pago-card">
                  <Card.Header className="bg-warning text-dark">
                    <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                    Pago de diferencia pendiente
                  </Card.Header>
                  <Card.Body>
                    <div className="mb-2">
                      <strong>Importe pendiente:</strong>{' '}
                      {datos.diferenciaPendiente !== undefined &&
                      datos.diferenciaPendiente !== null
                        ? formatCurrency(datos.diferenciaPendiente)
                        : 'No disponible'}
                    </div>
                    <div className="mb-2">
                      <strong>Método elegido:</strong>{' '}
                      {metodoPagoDiferencia === 'tarjeta'
                        ? 'Tarjeta (Redsys)'
                        : metodoPagoDiferencia === 'efectivo'
                        ? 'Efectivo en oficina'
                        : 'No especificado'}
                    </div>
                    <div className="mb-2">
                      <strong>Estado:</strong>{' '}
                      {diferenciaPagada ? (
                        <span className="text-success">Pagado</span>
                      ) : (
                        <span className="text-danger">Pendiente de pago</span>
                      )}
                    </div>
                    {!diferenciaPagada && (
                      <div className="mt-3">
                        <Button
                          variant="success"
                          onClick={() =>
                            navigate(`/pago-diferencia/${datos.id}`)
                          }
                        >
                          <FontAwesomeIcon
                            icon={faCreditCard}
                            className="me-2"
                          />
                          Pagar diferencia ahora
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              )}

              {/* Paneles acordeón con información importante */}
              {/* Información Importante */}
              <Card className="mb-3 accordion-card card-info-adicionales">
                <Card.Header
                  onClick={() => toggleAccordion('important')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="me-2 text-primary"
                    />
                    Información importante
                  </span>
                  <FontAwesomeIcon
                    icon={
                      openAccordions.important ? faChevronUp : faChevronDown
                    }
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.important && (
                  <ListGroup variant="flush">
                    {contenidos.important.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faPlusCircle}
                          className="me-2 text-primary"
                        />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Depósito de Seguridad */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('deposit')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon
                      icon={faShieldAlt}
                      className="me-2 text-secondary"
                    />
                    Depósito de seguridad
                  </span>
                  <FontAwesomeIcon
                    icon={openAccordions.deposit ? faChevronUp : faChevronDown}
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.deposit && (
                  <ListGroup variant="flush">
                    {contenidos.deposit.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faShieldAlt}
                          className="me-2 text-secondary"
                        />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Política de Cancelación */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('cancel')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon
                      icon={faTimesCircle}
                      className="me-2 text-danger"
                    />
                    Política de cancelación
                  </span>
                  <FontAwesomeIcon
                    icon={openAccordions.cancel ? faChevronUp : faChevronDown}
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.cancel && (
                  <ListGroup variant="flush">
                    {contenidos.cancel.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faTimesCircle}
                          className="me-2 text-danger"
                        />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Modificaciones de Reserva */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('changes')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="me-2 text-warning"
                    />
                    Modificaciones de reserva
                  </span>
                  <FontAwesomeIcon
                    icon={openAccordions.changes ? faChevronUp : faChevronDown}
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.changes && (
                  <ListGroup variant="flush">
                    {contenidos.changes.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faEdit}
                          className="me-2 text-warning"
                        />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Información de la Estación */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('station')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon
                      icon={faMapMarkerAlt}
                      className="me-2 text-info"
                    />
                    Información de la estación
                  </span>
                  <FontAwesomeIcon
                    icon={openAccordions.station ? faChevronUp : faChevronDown}
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.station && (
                  <ListGroup variant="flush">
                    {contenidos.station.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon
                          icon={faMapMarkerAlt}
                          className="me-2 text-info"
                        />
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

      {/* Modal de Desglose de Precio */}
      <Modal
        show={showPriceModal}
        onHide={() => setShowPriceModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-primario text-white">
          <Modal.Title>Desglose del Precio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-4">Resumen del alquiler de {diasReserva} días</h5>

          <Row className="mb-3 pb-2 border-bottom">
            <Col xs={8}>
              <strong>Concepto</strong>
            </Col>
            <Col xs={4} className="text-end">
              {datos.precioBase !== undefined && datos.precioBase !== null
                ? formatCurrency(datos.precioBase)
                : 'No disponible'}
            </Col>
          </Row>

          {/* Desglose de extras si existen */}
          {datos.extras && datos.extras.length > 0 && (
            <>
              <Row className="mb-2">
                <Col xs={8} className="text-primary">
                  <strong>Extras contratados</strong>
                </Col>
                <Col xs={4}></Col>
              </Row>

              {datos.extras.map((extra, idx) => (
                <Row key={idx} className="mb-2">
                  <Col xs={8}>
                    · {extra.nombre}
                    {datos.diasAlquiler && extra.precio && (
                      <small className="text-muted">
                        {' '}
                        ({formatCurrency(extra.precio)}/día ×{' '}
                        {datos.diasAlquiler} días)
                      </small>
                    )}
                  </Col>
                  <Col xs={4} className="text-end">
                    {extra.precio !== undefined &&
                    extra.precio !== null &&
                    datos.diasAlquiler
                      ? formatCurrency(extra.precio * datos.diasAlquiler)
                      : extra.precio !== undefined && extra.precio !== null
                      ? formatCurrency(extra.precio)
                      : 'No disponible'}
                  </Col>
                </Row>
              ))}

              <Row className="mb-2">
                <Col xs={8}>
                  <strong>Subtotal extras</strong>
                </Col>
                <Col xs={4} className="text-end">
                  {datos.precioExtras !== undefined &&
                  datos.precioExtras !== null
                    ? formatCurrency(datos.precioExtras)
                    : 'No disponible'}
                </Col>
              </Row>
            </>
          )}

          <Row className="mb-2">
            <Col xs={8}>Subtotal sin IVA (extraído)</Col>
            <Col xs={4} className="text-end">
              {(() => {
                // Calcular subtotal sin IVA (90% del total ya que IVA está incluido)
                const subtotalSinIva = datos.precioTotal
                  ? datos.precioTotal * 0.9
                  : 0;
                return formatCurrency(subtotalSinIva);
              })()}
            </Col>
          </Row>

          <Row className="mb-2">
            <Col xs={8}>IVA incluida{formatIvaRate(datos.tasaIva || 10)}</Col>
            <Col xs={4} className="text-end">
              {(() => {
                // Calcular IVA simbólicamente como 10% del total
                const ivaCalculado = datos.precioTotal
                  ? datos.precioTotal * 0.1
                  : 0;
                return formatCurrency(ivaCalculado);
              })()}
            </Col>
          </Row>

          {datos.promocion &&
            datos.descuentoPromocion !== undefined &&
            datos.descuentoPromocion !== null && (
              <Row className="mb-2 text-success">
                <Col xs={8}>
                  Descuento promoción "{datos.promocion.nombre}" (
                  {datos.promocion.descuentoPct}%)
                </Col>
                <Col xs={4} className="text-end">
                  {datos.descuentoPromocion !== undefined &&
                  datos.descuentoPromocion !== null
                    ? `-${formatCurrency(datos.descuentoPromocion)}`
                    : 'No disponible'}
                </Col>
              </Row>
            )}

          <Row className="mt-3 pt-2 border-top">
            <Col xs={8}>
              <h5>TOTAL</h5>
            </Col>
            <Col xs={4} className="text-end">
              <h5 className="text-primary">
                {datos.precioTotal !== undefined && datos.precioTotal !== null
                  ? formatCurrency(datos.precioTotal)
                  : 'No disponible'}
              </h5>
            </Col>
          </Row>

          <div className="mt-3 p-3 bg-light rounded">
            <h6>Información sobre el pago:</h6>
            <p className="mb-2">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="me-2 text-primary"
              />
              {(datos.politicaPago?.deductible || 0) === 0
                ? 'Tu reserva incluye protección All Inclusive sin franquicia ni depósitos.'
                : `Se requiere un depósito de seguridad de ${formatCurrency(
                    datos.politicaPago?.deductible || 0,
                  )} que será bloqueado en tu tarjeta.`}
            </p>
            <p className="mb-0">
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="me-2 text-primary"
              />
              El pago se realizará en el momento de la recogida del vehículo.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Guardar como PDF
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Detalles del Conductor */}
      <Modal
        show={showDriverModal}
        onHide={() => setShowDriverModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-primario text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faUser} className="me-2" />
            Detalles del Conductor
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDriver ? (
            <>
              <Row className="mb-4">
                <Col xs={12} className="text-center mb-3">
                  <div className="driver-avatar">
                    <FontAwesomeIcon
                      icon={faUser}
                      size="4x"
                      className="text-primary"
                    />
                  </div>
                  <h4 className="mt-2">
                    {selectedDriver.nombre || 'Nombre no disponible'}{' '}
                    {selectedDriver.apellidos || selectedDriver.apellido || ''}
                  </h4>
                  <Badge
                    bg={selectedDriver.esSegundoConductor ? 'info' : 'primary'}
                    className="py-1 px-2"
                  >
                    {selectedDriver.esSegundoConductor
                      ? 'Conductor Adicional'
                      : 'Conductor Principal'}
                  </Badge>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={4} className="text-muted">
                  Documento:
                </Col>
                <Col xs={8}>
                  {selectedDriver.tipo_documento
                    ? selectedDriver.tipo_documento.toUpperCase()
                    : 'N/A'}
                  :{' '}
                  {selectedDriver.documento ||
                    selectedDriver.numero_documento ||
                    'No disponible'}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xs={4} className="text-muted">
                  Email:
                </Col>
                <Col xs={8}>{selectedDriver.email || 'No disponible'}</Col>
              </Row>

              <Row className="mb-3">
                <Col xs={4} className="text-muted">
                  Teléfono:
                </Col>
                <Col xs={8}>{selectedDriver.telefono || 'No disponible'}</Col>
              </Row>

              {selectedDriver.direccion && (
                <Row className="mb-3">
                  <Col xs={4} className="text-muted">
                    Dirección:
                  </Col>
                  <Col xs={8}>
                    {selectedDriver.direccion?.calle || 'No disponible'}
                    <br />
                    {selectedDriver.direccion?.codigo_postal || ''}{' '}
                    {selectedDriver.direccion?.ciudad || ''}
                    <br />
                    {selectedDriver.direccion?.provincia || ''},{' '}
                    {selectedDriver.direccion?.pais || ''}
                  </Col>
                </Row>
              )}

              {selectedDriver.fecha_nacimiento && (
                <Row className="mb-3">
                  <Col xs={4} className="text-muted">
                    Fecha Nacimiento:
                  </Col>
                  <Col xs={8}>
                    {new Date(
                      selectedDriver.fecha_nacimiento,
                    ).toLocaleDateString('es-ES')}
                  </Col>
                </Row>
              )}

              <Row className="mb-3">
                <Col xs={4} className="text-muted">
                  Nacionalidad:
                </Col>
                <Col xs={8}>
                  {selectedDriver.nacionalidad || 'No especificada'}
                </Col>
              </Row>

              <div className="driver-license p-3 bg-light rounded mt-3">
                <h6 className="mb-3">
                  <FontAwesomeIcon
                    icon={faIdCard}
                    className="me-2 text-primary"
                  />
                  Información del carnet de conducir
                </h6>
                <p className="mb-0">
                  Se verificará el carnet de conducir en el momento de la
                  recogida del vehículo. Asegúrate de llevar contigo el
                  documento original.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-muted py-4">
              <FontAwesomeIcon icon={faUser} className="me-2" />
              No hay datos del conductor disponibles
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDriverModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para editar reserva */}
      {showEditModal && (
        <EditReservationModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          reservationData={datos}
          onSave={handleEditReservationCentral}
          isMobile={isMobile}
        />
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && (
        <DeleteReservationModal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          reservationId={datos.id}
          reservationNumber={datos.numero_reserva}
          onConfirm={handleDeleteReservationCentral}
          loading={isProcessing}
          error={error}
        />
      )}
    </Container>
  );
};

export default DetallesReserva;
