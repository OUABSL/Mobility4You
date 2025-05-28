// src/components/ReservaPasos/ReservaClienteExtras.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCarSide, 
  faCalendarAlt, 
  faClock, 
  faMapMarkerAlt, 
  faShieldAlt, 
  faTimes, 
  faCheck,
  faInfoCircle,
  faChevronLeft,
  faHome
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../css/ReservaClienteExtras.css';
import { createReservation, editReservation, findReservation, DEBUG_MODE, getExtrasDisponibles } from '../../services/reservationServices';
import { getReservationStorageService } from '../../services/reservationStorageService';
import useReservationTimer from '../../hooks/useReservationTimer';
import ReservationTimerModal from './ReservationTimerModal';
import ReservationTimerIndicator from './ReservationTimerIndicator';

import wifiLogo from '../../assets/img/extras/wifi.png';
import gpsLogo from '../../assets/img/extras/gps.png';
import asientoLogo from '../../assets/img/extras/child-seat.png';
import conductorLogo from '../../assets/img/extras/secondary-driver.png';

// URL base de la API para imágenes
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Mapeo de imágenes locales por categoría o nombre para fallback
const imageMap = {
  'asiento': asientoLogo,
  'infantil': asientoLogo,
  'child': asientoLogo,
  'seat': asientoLogo,
  'gps': gpsLogo,
  'navegador': gpsLogo,
  'navigation': gpsLogo,
  'conductor': conductorLogo,
  'adicional': conductorLogo,
  'driver': conductorLogo,
  'wifi': wifiLogo,
  'conectividad': wifiLogo,
  'internet': wifiLogo
}

// Función helper para obtener imagen: prioriza Django admin, luego fallback local
const getImageForExtra = (extra) => {
  // 1. Si el extra tiene imagen del Django admin, usarla
  if (extra.imagen && extra.imagen.trim() !== '') {
    // Si la imagen ya es una URL completa, usarla directamente
    if (extra.imagen.startsWith('http')) {
      return extra.imagen;
    }
    // Si es una ruta relativa, construir la URL completa
    return `${API_BASE_URL}${extra.imagen.startsWith('/') ? '' : '/'}${extra.imagen}`;
  }
  
  // 2. Si no hay imagen en Django admin, usar imagen local basada en palabras clave
  const nombre = extra.nombre?.toLowerCase() || '';
  const categoria = extra.categoria?.toLowerCase() || '';
  
  // Buscar por palabras clave en el nombre o categoría
  for (const [key, image] of Object.entries(imageMap)) {
    if (nombre.includes(key) || categoria.includes(key)) {
      return image;
    }
  }
  
  // 3. Imagen por defecto si no se encuentra ninguna coincidencia
  return wifiLogo;
}
  
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
    onCloseModals
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
  }, []); 

  // Cargar datos de reserva del sessionStorage al iniciar
  useEffect(() => {
    try {
      console.log('[ReservaClienteExtras] Cargando datos de reserva');
      
      // Intentar obtener datos del storage service primero
      let storedData = storageService.getCompleteReservationData();      // Si no hay datos en el storage service, verificar sessionStorage legacy
      if (!storedData) {
        const legacyData = sessionStorage.getItem('reservaData');
        if (legacyData) {
          console.log('[ReservaClienteExtras] Migrando datos legacy a nuevo storage');
          try {
            const parsedData = JSON.parse(legacyData);
            
            // Guardar datos usando el servicio de storage para inicializar correctamente
            storageService.saveReservationData(parsedData);
            storedData = storageService.getCompleteReservationData();
            
            // Inicializar timer si no está activo
            if (!timerActive) {
              const timerStarted = startTimer(parsedData);
              console.log('[ReservaClienteExtras] Timer iniciado para datos legacy:', timerStarted);
            }
            
            console.log('[ReservaClienteExtras] Migración legacy completada exitosamente');
          } catch (migrationError) {
            console.error('[ReservaClienteExtras] Error en migración legacy:', migrationError);
            // Limpiar datos legacy corruptos
            sessionStorage.removeItem('reservaData');
          }
        }
      }
      
      if (!storedData) {
        setError('No se encontraron datos de reserva. Por favor, comience el proceso desde la búsqueda de vehículos.');
        return;
      }
      
      setReservaData(storedData);
      
      // Restaurar extras si existen
      const existingExtras = storedData.extras || [];
      setExtrasSeleccionados(existingExtras);
      
      console.log('[ReservaClienteExtras] Datos de reserva cargados correctamente', {
        hasTimer: timerActive,
        extrasCount: existingExtras.length,
        step: storedData.currentStep
      });
      
    } catch (err) {
      console.error('[ReservaClienteExtras] Error al cargar datos de reserva:', err);
      setError('Error al cargar datos de reserva. Por favor, inicie una nueva búsqueda.');
    }
  }, [storageService, startTimer, timerActive]);

  // Cargar extras disponibles desde la API
  useEffect(() => {
    const cargarExtras = async () => {
      try {
        setLoadingExtras(true);
        const extras = await getExtrasDisponibles();
        
        // Agregar imagen a cada extra usando la función helper
        const extrasConImagen = extras.map(extra => ({
          ...extra,
          imagen: getImageForExtra(extra)
        }));
        
        setExtrasDisponibles(extrasConImagen);
      } catch (err) {
        console.error('Error al cargar extras:', err);
        setError(`Error al cargar extras: ${err.message}`);
      } finally {
        setLoadingExtras(false);
      }
    };

    cargarExtras();
  }, []);

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
  const diasAlquiler = reservaData?.fechas ? 
    Math.ceil((new Date(reservaData.fechas.dropoffDate) - new Date(reservaData.fechas.pickupDate)) / (1000 * 60 * 60 * 24)) : 
    3; // Valor por defecto
  // Efecto para calcular y actualizar el total de extras
  useEffect(() => {
    const total = extrasSeleccionados.reduce((sum, extraId) => {
      const extra = extrasDisponibles.find(e => e.id === extraId);
      return sum + (extra ? Number(extra.precio) * diasAlquiler : 0);
    }, 0);
    setTotalExtras(total);
  }, [extrasSeleccionados, diasAlquiler]);
  // Efecto para calcular los detalles de la reserva
  useEffect(() => {
    if (!reservaData) return;
    
    const precioCocheBase = Number(reservaData.car.precio_dia) * diasAlquiler;
    const iva = precioCocheBase * 0.21;
    const detalles = {
      precioCocheBase,
      iva,
      precioExtras: totalExtras,
      total: precioCocheBase + iva + totalExtras
    };
    setDetallesReserva(detalles);
  }, [reservaData, diasAlquiler, totalExtras]);

  // Manejador para seleccionar/deseleccionar extras
  const toggleExtra = (extraId) => {
    setExtrasSeleccionados(prev => 
      prev.includes(extraId)
        ? prev.filter(id => id !== extraId)
        : [...prev, extraId]
    );
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
      console.error('Error al cancelar reserva:', error);
      // Incluso si hay error al limpiar, navegar de vuelta
      navigate('/coches', { replace: true });
    }
  };
  // Manejador para continuar con la reserva  
  const handleContinuar = async () => {
    console.log('[ReservaClienteExtras] Continuando con la reserva');
    setLoading(true);    setError(null);
    
    try {
      if (!reservaData) {
        throw new Error('No hay datos de reserva.');
      }
      
      // Validar que tenemos datos básicos
      if (!reservaData.fechas || !reservaData.car) {
        throw new Error('Datos de reserva incompletos.');
      }
      
      // Intentar actualizar extras con manejo mejorado de errores
      try {
        await storageService.updateExtras(extrasSeleccionados);
      } catch (updateError) {
        console.error('[ReservaClienteExtras] Error al actualizar extras:', updateError);
        
        // Si falla por no tener reserva activa, intentar re-inicializar
        if (updateError.message.includes('No hay reserva activa')) {
          console.log('[ReservaClienteExtras] Intentando reinicializar reserva para extras');
          
          try {
            // Re-guardar datos de reserva para reinicializar timer
            storageService.saveReservationData(reservaData);
            // Reintentar actualización de extras
            await storageService.updateExtras(extrasSeleccionados);
            console.log('[ReservaClienteExtras] Reserva reinicializada y extras actualizados exitosamente');
          } catch (retryError) {
            console.error('[ReservaClienteExtras] Error en reintento:', retryError);
            throw new Error('Error al guardar extras. Por favor, inténtelo de nuevo.');
          }
        } else {
          throw updateError;
        }
      }
      
      // Store current scroll position before navigation
      sessionStorage.setItem('confirmationScrollPosition', window.pageYOffset.toString());
      
      console.log('[ReservaClienteExtras] Navegando a datos del conductor', {
        extrasCount: extrasSeleccionados.length,
        totalExtras
      });
      
      // Navegar al siguiente paso
      navigate('/reservation-confirmation/datos');
      
    } catch (err) {
      console.error('[ReservaClienteExtras] Error al continuar:', err);
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
              <FontAwesomeIcon icon={faTimes} size="4x" className="text-danger" />
            </div>
            <h4 className="mb-4">{error}</h4>
            <Button 
              variant="primary" 
              onClick={() => navigate('/coches')}
            >
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
            {!reservaData ? 'Cargando datos de la reserva...' : 'Cargando extras disponibles...'}
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
            <div style={{ width: '80px' }}></div> {/* Espacio para equilibrar el header */}
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
                  <div className="d-flex align-items-center mb-3">                    <img 
                      src={car.imagenPrincipal || car.imagen || 'https://via.placeholder.com/150x100?text=Sin+Imagen'} 
                      alt={`${car.marca} ${car.modelo}`}
                      className="reserva-car-img me-3"
                    />
                    <div>
                      <h5>{car.marca} {car.modelo}</h5>
                      <Badge 
                        bg={paymentOption === 'all-inclusive' ? 'success' : 'secondary'}
                      >
                        {paymentOption === 'all-inclusive' ? 'All Inclusive' : 'Economy'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Recogida:</strong> {fechas?.pickupLocation || "Aeropuerto de Málaga"}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.pickupDate ? new Date(fechas.pickupDate).toLocaleDateString() : "14/05/2025"}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.pickupTime || "12:00"}
                    </div>
                  </div>

                  <div className="fecha-reserva mb-2">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                    <strong>Devolución:</strong> {fechas?.dropoffLocation || "Aeropuerto de Málaga"}
                  </div>
                  <div className="d-flex mb-3">
                    <div className="me-3">
                      <FontAwesomeIcon icon={faCalendarAlt} className="me-1" />
                      {fechas?.dropoffDate ? new Date(fechas.dropoffDate).toLocaleDateString() : "17/05/2025"}
                    </div>
                    <div>
                      <FontAwesomeIcon icon={faClock} className="me-1" />
                      {fechas?.dropoffTime || "12:00"}
                    </div>
                  </div>

                  <div className="proteccion mb-3">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                    <strong>Protección:</strong> {paymentOption === 'all-inclusive' ? 'Todo incluido sin franquicia' : 'Básica con franquicia'}
                  </div>

                  <hr />

                  {detallesReserva && (
                    <div className="detalles-precio">                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base ({diasAlquiler} días):</span>
                        <span>{Number(detallesReserva.precioCocheBase).toFixed(2)}€</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA (21%):</span>
                        <span>{Number(detallesReserva.iva).toFixed(2)}€</span>
                      </div>
                      {totalExtras > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>{Number(totalExtras).toFixed(2)}€</span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between fw-bold">
                        <span>Total:</span>
                        <span>{Number(detallesReserva.total).toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Columna derecha: Selección de extras */}
            <Col md={7} xs={12} className='columna-derecha'>
              <h5 className="mb-3">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Añade extras a tu reserva (opcional)
              </h5>
              
              <Row>
                {extrasDisponibles.map(extra => (
                  <Col md={6} xs={6} className="mb-3" key={extra.id}>
                    <Card 
                      className={`extra-card ${extrasSeleccionados.includes(extra.id) ? 'selected' : ''}`}
                      onClick={() => toggleExtra(extra.id)}
                    >
                      <div className="extra-card-inner">
                        <div className="extra-img-container">
                          <img src={extra.imagen} alt={extra.nombre} className="extra-img" />
                          <div className="extra-check">
                            <FontAwesomeIcon 
                              icon={extrasSeleccionados.includes(extra.id) ? faCheck : faTimes} 
                              className={extrasSeleccionados.includes(extra.id) ? 'text-success' : ''} 
                            />
                          </div>
                        </div>
                        <div className="extra-details">
                          <h6>{extra.nombre}</h6>
                          <p className="extra-description">{extra.descripcion}</p>                          
                          <p className="extra-price">
                            {Number(extra.precio).toFixed(2)}€/día · 
                            <strong> {(Number(extra.precio) * diasAlquiler).toFixed(2)}€</strong> total
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>              
              <div className="mt-4 d-flex justify-content-between">
                <div className="d-flex gap-2">
                  {/* Botón para cancelar reserva y volver a la búsqueda */}
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
