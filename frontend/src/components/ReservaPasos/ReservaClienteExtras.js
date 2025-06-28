// src/components/ReservaPasos/ReservaClienteExtras.js
import {
  faCalendarAlt,
  faCarSide,
  faCheck,
  faChevronLeft,
  faClock,
  faHome,
  faInfoCircle,
  faMapMarkerAlt,
  faShieldAlt,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { createServiceLogger } from '../../config/appConfig';
import '../../css/ReservaClienteExtras.css';
import useReservationTimer from '../../hooks/useReservationTimer';
import {
  calculateDisplayTaxAmount,
  formatTaxRate,
  getImageForExtra,
} from '../../services/func';
import { getExtrasDisponibles } from '../../services/reservationServices';
import {
  autoRecoverReservation,
  getReservationStorageService,
} from '../../services/reservationStorageService';
import { roundToDecimals } from '../../services/universalDataMapper';
import ReservationTimerIndicator from './ReservationTimerIndicator';
import ReservationTimerModal from './ReservationTimerModal';

import asientoLogo from '../../assets/img/extras/child-seat.png';
import gpsLogo from '../../assets/img/extras/gps.png';
import conductorLogo from '../../assets/img/extras/secondary-driver.png';
import wifiLogo from '../../assets/img/extras/wifi.png';

// Crear logger para el componente
const logger = createServiceLogger('RESERVA_CLIENTE_EXTRAS');

// Mapeo de imágenes locales por categoría o nombre para fallback
const imageMap = {
  asiento: asientoLogo,
  infantil: asientoLogo,
  child: asientoLogo,
  seat: asientoLogo,
  gps: gpsLogo,
  navegador: gpsLogo,
  navigation: gpsLogo,
  conductor: conductorLogo,
  adicional: conductorLogo,
  driver: conductorLogo,
  wifi: wifiLogo,
  conectividad: wifiLogo,
  internet: wifiLogo,
};

const ReservaClienteExtras = ({ isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const storageService = getReservationStorageService();

  // Hook del timer de reserva
  const {
    isActive: timerActive,
    remainingTime,
    formattedTime,
    showWarningModal,
    showExpiredModal,
    startTimer,
    onExtendTimer,
    onCancelReservation,
    onStartNewReservation,
    onCloseModals,
  } = useReservationTimer();

  // Estados
  const [extrasSeleccionados, setExtrasSeleccionados] = useState([]);
  const [extrasDisponibles, setExtrasDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);
  const [detallesReserva, setDetallesReserva] = useState(null);
  const [totalExtras, setTotalExtras] = useState(0);
  const reservaExtrasRef = useRef(null);

  // Realizar un scroll hacia el componente
  useEffect(() => {
    if (reservaExtrasRef.current) {
      reservaExtrasRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []); // Cargar datos de reserva del storage al iniciar
  useEffect(() => {
    const loadReservationData = async () => {
      try {
        logger.info('[ReservaClienteExtras] Cargando datos de reserva');

        // Intentar obtener datos del storage service primero
        let storedData = await storageService.getCompleteReservationData(); // Si no hay datos en el storage service, verificar sessionStorage legacy
        if (!storedData) {
          const legacyData = sessionStorage.getItem('reservaData');
          if (legacyData) {
            logger.info(
              '[ReservaClienteExtras] Migrando datos legacy a nuevo storage',
            );
            try {
              const parsedData = JSON.parse(legacyData);

              // Debug: mostrar estructura de datos legacy
              logger.info('[ReservaClienteExtras] Datos legacy a migrar:', {
                hasCar: !!(parsedData.car || parsedData.vehiculo),
                hasFechas: !!parsedData.fechas,
                hasPickupLocation: !!(
                  parsedData.fechas && parsedData.fechas.pickupLocation
                ),
                hasTopLevelLocation: !!(
                  parsedData.pickupLocation || parsedData.lugarRecogida
                ),
                estructura: Object.keys(parsedData),
              });
              // Guardar datos usando el servicio de storage para inicializar correctamente
              storageService.saveReservationData(parsedData);
              storedData = await storageService.getCompleteReservationData();

              // Inicializar timer si no está activo
              if (!timerActive) {
                const timerStarted = startTimer(parsedData);
                logger.info(
                  '[ReservaClienteExtras] Timer iniciado para datos legacy:',
                  timerStarted,
                );
              }

              logger.info(
                '[ReservaClienteExtras] Migración legacy completada exitosamente',
              );
            } catch (migrationError) {
              logger.error(
                '[ReservaClienteExtras] Error en migración legacy:',
                migrationError,
              );

              // Intentar recuperación automática si es un error de validación
              if (migrationError.message.includes('ubicación')) {
                logger.info(
                  '[ReservaClienteExtras] Intentando recuperación con datos de ubicación mínimos',
                );
                try {
                  const parsedData = JSON.parse(legacyData);

                  // Agregar ubicación básica si no existe
                  if (
                    !parsedData.pickupLocation &&
                    !parsedData.lugarRecogida &&
                    parsedData.fechas
                  ) {
                    if (parsedData.fechas.pickupLocation) {
                      parsedData.pickupLocation =
                        parsedData.fechas.pickupLocation;
                    } else {
                      parsedData.pickupLocation = 'Ubicación no especificada';
                    }
                  }
                  // Intentar migrar nuevamente
                  storageService.saveReservationData(parsedData);
                  storedData =
                    await storageService.getCompleteReservationData();

                  logger.info(
                    '[ReservaClienteExtras] Recuperación automática exitosa',
                  );
                } catch (recoveryError) {
                  logger.error(
                    '[ReservaClienteExtras] Error en recuperación automática:',
                    recoveryError,
                  );
                  // Limpiar datos legacy corruptos
                  sessionStorage.removeItem('reservaData');
                }
              } else {
                // Limpiar datos legacy corruptos para otros tipos de error
                sessionStorage.removeItem('reservaData');
              }
            }
          }
        }

        if (!storedData) {
          setError(
            'No se encontraron datos de reserva. Por favor, comience el proceso desde la búsqueda de vehículos.',
          );
          return;
        }

        setReservaData(storedData);

        // Restaurar extras si existen
        const existingExtras = storedData.extras || [];
        setExtrasSeleccionados(existingExtras);

        logger.info(
          '[ReservaClienteExtras] Datos de reserva cargados correctamente',
          {
            hasTimer: timerActive,
            extrasCount: existingExtras.length,
            step: storedData.currentStep,
          },
        );
      } catch (err) {
        logger.error(
          '[ReservaClienteExtras] Error al cargar datos de reserva:',
          err,
        );
        setError(
          'Error al cargar datos de reserva. Por favor, inicie una nueva búsqueda.',
        );
      }
    };

    loadReservationData();
  }, [storageService, startTimer, timerActive]);
  // Cargar extras disponibles desde la API
  useEffect(() => {
    const cargarExtras = async () => {
      try {
        setLoadingExtras(true);
        const extras = await getExtrasDisponibles();

        // Agregar imagen a cada extra usando la función helper
        const extrasConImagen = extras.map((extra) => ({
          ...extra,
          imagen: getImageForExtra(extra, imageMap, wifiLogo),
        }));
        setExtrasDisponibles(extrasConImagen);
      } catch (err) {
        logger.error('Error al cargar extras:', err);
        setError(`Error al cargar extras: ${err.message}`);
      } finally {
        setLoadingExtras(false);
      }
    };
    cargarExtras();
  }, []); // Solo cargar una vez al montar el componente

  // Convertir extras seleccionados de IDs a objetos completos cuando se cargan los extras disponibles
  useEffect(() => {
    if (extrasDisponibles.length > 0 && extrasSeleccionados.length > 0) {
      const needsConversion = extrasSeleccionados.some(
        (extra) => typeof extra !== 'object' || !extra.nombre || !extra.precio,
      );

      if (needsConversion) {
        const extrasConvertidos = extrasSeleccionados
          .map((extra) => {
            // Si ya es un objeto completo, mantenerlo
            if (
              typeof extra === 'object' &&
              extra.id &&
              extra.nombre &&
              extra.precio
            ) {
              return extra;
            }
            // Si es un ID o un objeto incompleto, convertirlo
            const extraId = typeof extra === 'object' ? extra.id : extra;
            const extraCompleto = extrasDisponibles.find(
              (e) => e.id === extraId,
            );
            return extraCompleto || extra; // Mantener el original si no se encuentra
          })
          .filter((extra) => extra); // Filtrar valores nulos/undefined

        logger.info(
          '[ReservaClienteExtras] Convirtiendo extras de IDs a objetos:',
          {
            before: extrasSeleccionados.map((e) =>
              typeof e === 'object' ? `${e.id}(obj)` : e,
            ),
            after: extrasConvertidos.map((e) =>
              typeof e === 'object' ? `${e.id}(obj)` : e,
            ),
            converted: needsConversion,
          },
        );

        if (
          JSON.stringify(extrasSeleccionados) !==
          JSON.stringify(extrasConvertidos)
        ) {
          setExtrasSeleccionados(extrasConvertidos);
        }
      }
    }
  }, [extrasDisponibles]); // Solo ejecutar cuando cambien los extras disponibles

  // Preserve scroll position when navigating from car selection
  useEffect(() => {
    const scrollPosition = sessionStorage.getItem('extrasScrollPosition');
    if (scrollPosition && location.state?.fromCarSelection) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(scrollPosition));
        sessionStorage.removeItem('extrasScrollPosition');
      }, 100);
    }
  }, [location]);

  // Calcular fechas y días de alquiler
  const diasAlquiler = reservaData?.fechas
    ? Math.ceil(
        (new Date(reservaData.fechas.dropoffDate) -
          new Date(reservaData.fechas.pickupDate)) /
          (1000 * 60 * 60 * 24),
      )
    : 3; // Valor por defecto  // Efecto para calcular y actualizar el total de extras
  useEffect(() => {
    const total = extrasSeleccionados.reduce((sum, extra) => {
      // Manejar tanto objetos completos como IDs legacy
      if (typeof extra === 'object' && extra.precio) {
        return sum + Number(extra.precio) * diasAlquiler;
      } else if (typeof extra === 'number' || typeof extra === 'string') {
        // Buscar el extra en la lista disponible (compatibilidad con datos legacy)
        const extraCompleto = extrasDisponibles.find((e) => e.id === extra);
        return (
          sum +
          (extraCompleto ? Number(extraCompleto.precio) * diasAlquiler : 0)
        );
      }
      return sum;
    }, 0);
    setTotalExtras(total);
  }, [extrasSeleccionados, extrasDisponibles, diasAlquiler]); // Efecto para calcular los detalles de la reserva
  useEffect(() => {
    if (!reservaData) return;

    const precioCocheBase = roundToDecimals(
      Number(reservaData.car.precio_dia) * diasAlquiler,
    );
    const iva = calculateDisplayTaxAmount(
      precioCocheBase,
      reservaData.car?.tasaImpuesto,
    );
    const detalles = {
      precioCocheBase,
      iva,
      precioExtras: roundToDecimals(totalExtras),
      total: roundToDecimals(precioCocheBase + iva + totalExtras),
    };
    setDetallesReserva(detalles);
  }, [reservaData, diasAlquiler, totalExtras]);
  // Manejador para seleccionar/deseleccionar extras
  const toggleExtra = (extraId) => {
    setExtrasSeleccionados((prev) => {
      const isSelected = prev.some((extra) =>
        typeof extra === 'object' ? extra.id === extraId : extra === extraId,
      );

      if (isSelected) {
        // Remover el extra (maneja tanto IDs como objetos)
        return prev.filter((extra) =>
          typeof extra === 'object' ? extra.id !== extraId : extra !== extraId,
        );
      } else {
        // Agregar el extra completo
        const extraCompleto = extrasDisponibles.find((e) => e.id === extraId);
        if (extraCompleto) {
          return [...prev, extraCompleto];
        }
        return prev;
      }
    });
  };

  // Manejador para volver a la selección de coches
  const handleVolver = () => {
    // Redirigir a la página anterior
    navigate(-1);
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
  // Manejador para continuar con la reserva
  const handleContinuar = async () => {
    logger.info('[ReservaClienteExtras] Continuando con la reserva');
    setLoading(true);
    setError(null);

    try {
      if (!reservaData) {
        throw new Error('No hay datos de reserva.');
      }

      // Validar que tenemos datos básicos
      if (!reservaData.fechas || !reservaData.car) {
        throw new Error('Datos de reserva incompletos.');
      } // Intentar actualizar extras con manejo mejorado de errores
      logger.info('[ReservaClienteExtras] Guardando extras en storage:', {
        extrasCount: extrasSeleccionados.length,
        extrasTypes: extrasSeleccionados.map((e) =>
          typeof e === 'object' ? `${e.id}(obj:${e.nombre})` : `${e}(id)`,
        ),
        hasCompleteObjects: extrasSeleccionados.every(
          (e) => typeof e === 'object' && e.nombre && e.precio,
        ),
      });
      try {
        await storageService.updateExtras(extrasSeleccionados, detallesReserva);
      } catch (updateError) {
        logger.error(
          '[ReservaClienteExtras] Error al actualizar extras:',
          updateError,
        );

        // Si falla por no tener reserva activa, intentar re-inicializar
        if (
          updateError.message.includes('No hay reserva activa') ||
          updateError.message.includes('No hay datos de reserva')
        ) {
          logger.info(
            '[ReservaClienteExtras] Intentando reinicializar reserva para extras',
          );

          try {
            // Re-guardar datos de reserva para reinicializar timer
            storageService.saveReservationData(reservaData); // Reintentar actualización de extras
            await storageService.updateExtras(
              extrasSeleccionados,
              detallesReserva,
            );
            logger.info(
              '[ReservaClienteExtras] Reserva reinicializada y extras actualizados exitosamente',
            );
          } catch (retryError) {
            logger.error(
              '[ReservaClienteExtras] Error en reintento:',
              retryError,
            );

            // Último intento con recuperación automática
            try {
              const recovered = autoRecoverReservation();
              if (recovered) {
                await storageService.updateExtras(
                  extrasSeleccionados,
                  detallesReserva,
                );
                logger.info(
                  '[ReservaClienteExtras] Extras actualizados tras recuperación automática',
                );
              } else {
                throw new Error(
                  'Error al guardar extras. Por favor, inténtelo de nuevo.',
                );
              }
            } catch (finalError) {
              logger.error('[ReservaClienteExtras] Error final:', finalError);
              throw new Error(
                'Error al guardar extras. Por favor, inténtelo de nuevo.',
              );
            }
          }
        } else {
          throw updateError;
        }
      }

      // Store current scroll position before navigation
      sessionStorage.setItem(
        'confirmationScrollPosition',
        window.pageYOffset.toString(),
      );

      logger.info('[ReservaClienteExtras] Navegando a datos del conductor', {
        extrasCount: extrasSeleccionados.length,
        totalExtras,
      });

      // Navegar al siguiente paso
      navigate('/reservation-confirmation/datos');
    } catch (err) {
      logger.error('[ReservaClienteExtras] Error al continuar:', err);
      setError(err.message || 'Error al continuar con la reserva.');
    } finally {
      setLoading(false);
    }
  };
  // Si hay error, mostrar pantalla de error
  if (error) {
    return (
      <Container ref={reservaExtrasRef} className="reserva-extras my-5">
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

  // Si no hay datos de reserva o están cargando extras, mostrar cargando
  if (!reservaData || loadingExtras) {
    return (
      <Container ref={reservaExtrasRef} className="reserva-extras my-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">
            {!reservaData
              ? 'Cargando datos de la reserva...'
              : 'Cargando extras disponibles...'}
          </p>
        </div>
      </Container>
    );
  }

  const { car, paymentOption, fechas } = reservaData;

  return (
    <Container ref={reservaExtrasRef} className="reserva-extras my-4">
      <div className="reservation-progress mb-4">
        <div className="progress-steps">
          <div className="step active">1. Selección de Extras</div>
          <div className="step">2. Datos del Conductor</div>
          <div className="step">3. Pago</div>
          <div className="step">4. Confirmación</div>
        </div>
      </div>

      <Card className="shadow-sm">
        <Card.Header className="bg-primario text-white">
          <div className="d-flex justify-content-between align-items-center header-extras">
            <Button
              variant="link"
              className="text-white p-0 header-volver"
              onClick={handleVolver}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="me-2" />
              Volver
            </Button>
            <h5 className="mb-0 header-titulo">Extras y Detalles de Reserva</h5>
            {isMobile && <div style={{ width: '80px' }}></div>}
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
                    {' '}
                    <img
                      src={
                        car.imagen_principal ||
                        car.imagenPrincipal?.original ||
                        car.imagenPrincipal?.placeholder ||
                        car.imagen ||
                        'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
                      }
                      alt={`${car.marca} ${car.modelo}`}
                      className="reserva-car-img me-3"
                      onError={(e) => {
                        e.target.src =
                          car.imagenPrincipal?.placeholder ||
                          'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo';
                      }}
                    />
                    <div>
                      <h5>
                        {car.marca} {car.modelo}
                      </h5>
                      <Badge
                        bg={
                          paymentOption === 'all-inclusive'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {paymentOption === 'all-inclusive'
                          ? 'All Inclusive'
                          : 'Economy'}
                      </Badge>
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
                  <hr />
                  {detallesReserva && (
                    <div className="detalles-precio">
                      {' '}
                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base ({diasAlquiler} días):</span>
                        <span>
                          {(
                            Number(detallesReserva.precioCocheBase) || 0
                          ).toFixed(2)}
                          €
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>
                          IVA{formatTaxRate(detallesReserva.tasaImpuesto)}:
                        </span>
                        <span>
                          {(Number(detallesReserva.iva) || 0).toFixed(2)}€
                        </span>
                      </div>
                      {totalExtras > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>{(Number(totalExtras) || 0).toFixed(2)}€</span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>
                          {(Number(detallesReserva.total) || 0).toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Columna derecha: Selección de extras */}
            <Col
              md={7}
              xs={12}
              className="columna-derecha d-flex flex-column justify-content-between"
            >
              <h5 className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Añade extras a tu reserva (opcional)
              </h5>

              <Row>
                {' '}
                {extrasDisponibles.map((extra) => {
                  // Verificar si el extra está seleccionado (maneja tanto objetos como IDs)
                  const isSelected = extrasSeleccionados.some((selectedExtra) =>
                    typeof selectedExtra === 'object'
                      ? selectedExtra.id === extra.id
                      : selectedExtra === extra.id,
                  );

                  return (
                    <Col md={6} xs={6} className="mb-3" key={extra.id}>
                      <Card
                        className={`extra-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleExtra(extra.id)}
                      >
                        <div className="extra-card-inner">
                          <div className="extra-img-container">
                            <img
                              src={getImageForExtra(extra, imageMap, wifiLogo)}
                              alt={extra.nombre}
                              className="extra-img"
                              onError={(e) => {
                                e.target.src =
                                  'https://via.placeholder.com/80x80/f3e5f5/7b1fa2.png?text=Extra';
                              }}
                            />
                            <div className="extra-check">
                              <FontAwesomeIcon
                                icon={isSelected ? faCheck : faTimes}
                                className={isSelected ? 'text-success' : ''}
                              />
                            </div>
                          </div>
                          <div className="extra-details">
                            <h6>{extra.nombre}</h6>
                            <p className="extra-description">
                              {extra.descripcion}
                            </p>{' '}
                            <p className="extra-price">
                              {(Number(extra.precio) || 0).toFixed(2)}€/día ·
                              <strong>
                                {' '}
                                {(
                                  (Number(extra.precio) || 0) * diasAlquiler
                                ).toFixed(2)}
                                €
                              </strong>{' '}
                              total
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
              <div className="mt-4 d-flex justify-content-between">
                <div className="d-flex">
                  {/* Botón para cancelar reserva y volver a la búsqueda */}
                  <Button
                    variant="outline-danger"
                    onClick={handleCancelarReserva}
                    disabled={loading}
                    className="cancelar-btn"
                    title="Cancelar reserva y volver a la búsqueda"
                  >
                    <FontAwesomeIcon icon={faTimes} className="me-2" />
                    Cancelar Reserva
                  </Button>
                </div>
                <div d-flex>
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
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Indicador del timer */}
      {timerActive && (
        <div className="mt-3">
          <ReservationTimerIndicator
            isActive={timerActive}
            remainingTime={remainingTime}
            formattedTime={formattedTime}
            size="normal"
            position="inline"
            onExtendRequest={onExtendTimer}
          />
        </div>
      )}

      {/* Modales del timer */}
      <ReservationTimerModal
        show={showWarningModal}
        type="warning"
        remainingTime={remainingTime}
        onExtend={onExtendTimer}
        onCancel={onCancelReservation}
        onClose={onCloseModals}
      />

      <ReservationTimerModal
        show={showExpiredModal}
        type="expired"
        remainingTime={0}
        onContinue={onStartNewReservation}
        onCancel={onCancelReservation}
        onClose={onCloseModals}
      />
    </Container>
  );
};

export default ReservaClienteExtras;
