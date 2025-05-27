// src/components/ReservaPasos/ReservaClienteError.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle,
  faHome,
  faArrowLeft,
  faEnvelope,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { getReservationStorageService } from '../../services/reservationStorageService';
import '../../css/ReservaClienteError.css';

/**
 * Componente para mostrar errores en el proceso de reserva
 * 
 * Este componente se muestra cuando ocurre un error durante cualquier paso del proceso
 * de reserva, proporcionando información sobre el error y opciones para continuar.
 */
const ReservaClienteError = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storageService = getReservationStorageService();
  const [errorData, setErrorData] = useState(null);

  useEffect(() => {
    try {
      // Obtener datos del error desde el state de navegación o sessionStorage
      const errorFromState = location.state;
      const errorFromStorage = sessionStorage.getItem('reservaError');
      
      if (errorFromState) {
        setErrorData(errorFromState);
      } else if (errorFromStorage) {
        setErrorData(JSON.parse(errorFromStorage));
        // Limpiar el error del storage después de mostrarlo
        sessionStorage.removeItem('reservaError');
      } else {
        // Error genérico si no hay información específica
        setErrorData({
          errorType: 'general',
          errorMessage: 'Ha ocurrido un error inesperado durante el proceso de reserva.'
        });
      }
      
      // Limpiar storage de reserva si es necesario
      if (storageService && errorFromState?.clearStorage !== false) {
        setTimeout(() => {
          try {
            storageService.clearReservationData();
          } catch (err) {
            console.warn('Error al limpiar storage en página de error:', err);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error al procesar datos de error:', err);
      setErrorData({
        errorType: 'general',
        errorMessage: 'Ha ocurrido un error inesperado durante el proceso de reserva.'
      });
    }
  }, [location.state, storageService]);

  // Obtener el mensaje y tipo de error apropiado
  const getErrorInfo = () => {
    if (!errorData) return { title: 'Error', message: 'Error desconocido', variant: 'danger' };

    switch (errorData.errorType) {
      case 'payment':
        return {
          title: 'Error en el Pago',
          message: errorData.errorMessage || 'No se pudo procesar el pago. Por favor, verifica los datos de tu tarjeta e inténtalo de nuevo.',
          variant: 'warning'
        };
      case 'validation':
        return {
          title: 'Error de Validación',
          message: errorData.errorMessage || 'Los datos proporcionados no son válidos. Por favor, revisa la información e inténtalo de nuevo.',
          variant: 'warning'
        };
      case 'connection':
        return {
          title: 'Error de Conexión',
          message: errorData.errorMessage || 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet e inténtalo de nuevo.',
          variant: 'info'
        };
      case 'availability':
        return {
          title: 'Vehículo No Disponible',
          message: errorData.errorMessage || 'El vehículo seleccionado ya no está disponible para las fechas elegidas. Por favor, selecciona otro vehículo.',
          variant: 'warning'
        };
      default:
        return {
          title: 'Error',
          message: errorData.errorMessage || 'Ha ocurrido un error inesperado durante el proceso de reserva.',
          variant: 'danger'
        };
    }
  };

  const errorInfo = getErrorInfo();

  // Volver al paso anterior
  const handleVolver = () => {
    // Intentar volver al paso anterior según el tipo de error
    switch (errorData?.errorType) {
      case 'payment':
        navigate('/reservation-confirmation/pago');
        break;
      case 'validation':
        navigate('/reservation-confirmation/datos');
        break;
      case 'availability':
        navigate('/coches');
        break;
      default:
        navigate('/reservation-confirmation');
        break;
    }
  };

  // Volver al inicio
  const handleVolverInicio = () => {
    // Limpiar datos de reserva en caso de error grave
    sessionStorage.removeItem('reservaData');
    sessionStorage.removeItem('reservaError');
    navigate('/');
  };

  // Reintentar el proceso
  const handleReintentar = () => {
    // Según el tipo de error, redirigir al paso apropiado
    switch (errorData?.errorType) {
      case 'payment':
        navigate('/reservation-confirmation/pago');
        break;
      default:
        navigate('/reservation-confirmation');
        break;
    }
  };

  return (
    <Container className="reserva-error my-4">
      <Row className="justify-content-center">
        <Col lg={8} md={10}>
          <Card className="shadow-sm">
            <Card.Header className={`bg-${errorInfo.variant} text-white text-center py-4`}>
              <div className="d-flex justify-content-center align-items-center">
                <FontAwesomeIcon icon={faExclamationTriangle} size="2x" className="me-3" />
                <h3 className="mb-0">{errorInfo.title}</h3>
              </div>
            </Card.Header>
            
            <Card.Body className="text-center py-5">
              <Alert variant={errorInfo.variant} className="mx-auto" style={{ maxWidth: '500px' }}>
                <p className="mb-0 fs-6">{errorInfo.message}</p>
              </Alert>

              {/* Información de contacto para errores graves */}
              {errorData?.errorType === 'connection' || errorData?.errorType === 'general' ? (
                <div className="mt-4 p-3 bg-light rounded">
                  <h6 className="mb-3">¿Necesitas ayuda?</h6>
                  <p className="small text-muted mb-2">
                    Si el problema persiste, no dudes en contactarnos:
                  </p>
                  <div className="d-flex justify-content-center gap-4">
                    <span className="small">
                      <FontAwesomeIcon icon={faPhone} className="me-1" />
                      +34 900 123 456
                    </span>
                    <span className="small">
                      <FontAwesomeIcon icon={faEnvelope} className="me-1" />
                      soporte@mobility4you.com
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Botones de acción */}
              <div className="d-flex justify-content-center gap-3 mt-4">
                {errorData?.errorType !== 'general' && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleVolver}
                    className="px-4"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Volver
                  </Button>
                )}
                
                {(errorData?.errorType === 'payment' || errorData?.errorType === 'validation') && (
                  <Button 
                    variant="primary" 
                    onClick={handleReintentar}
                    className="px-4"
                  >
                    Reintentar
                  </Button>
                )}
                
                <Button 
                  variant="outline-primary" 
                  onClick={handleVolverInicio}
                  className="px-4"
                >
                  <FontAwesomeIcon icon={faHome} className="me-2" />
                  Volver al Inicio
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ReservaClienteError;
