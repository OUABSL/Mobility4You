// Componente modal para manejar advertencias y expiración del timer de reserva

import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faClock, 
  faRefresh,
  faSignOutAlt,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import '../../css/ReservationTimerModal.css';

/**
 * Modal para manejar advertencias de expiración y acciones del timer
 */
const ReservationTimerModal = ({
  show = false,
  type = 'warning', // 'warning' | 'expired' | 'extend'
  remainingTime = 0,
  onExtend = null,
  onContinue = null,
  onCancel = null,
  onClose = null
}) => {
  const [timeLeft, setTimeLeft] = useState(remainingTime);
  const [isProcessing, setIsProcessing] = useState(false);

  // Actualizar tiempo restante cada segundo
  useEffect(() => {
    if (!show || type === 'expired') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1000);
        if (newTime <= 0 && type === 'warning') {
          // Cambiar a modo expirado automáticamente
          clearInterval(interval);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [show, type]);

  // Sincronizar tiempo inicial con prop
  useEffect(() => {
    setTimeLeft(remainingTime);
  }, [remainingTime]);

  /**
   * Formatea el tiempo en formato mm:ss
   */
  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Calcula el porcentaje de tiempo restante para la barra de progreso
   */
  const getTimePercentage = () => {
    const totalTime = 5 * 60 * 1000; // 5 minutos en ms (tiempo de advertencia)
    return Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  };

  /**
   * Maneja la extensión del timer
   */
  const handleExtend = async () => {
    setIsProcessing(true);
    try {
      if (onExtend) {
        await onExtend();
      }
    } catch (error) {
      console.error('Error al extender timer:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Maneja continuar con la reserva
   */
  const handleContinue = async () => {
    setIsProcessing(true);
    try {
      if (onContinue) {
        await onContinue();
      }
    } catch (error) {
      console.error('Error al continuar:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Maneja cancelar la reserva
   */
  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      if (onCancel) {
        await onCancel();
      }
    } catch (error) {
      console.error('Error al cancelar:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Obtiene la configuración del modal según el tipo
   */
  const getModalConfig = () => {
    switch (type) {
      case 'warning':
        return {
          title: 'Tu reserva expirará pronto',
          variant: 'warning',
          icon: faExclamationTriangle,
          message: 'Tu sesión de reserva expirará en unos minutos. ¿Deseas continuar?',
          showProgress: true,
          actions: [
            {
              label: 'Continuar reserva',
              variant: 'primary',
              onClick: handleExtend,
              icon: faRefresh
            },
            {
              label: 'Salir',
              variant: 'outline-secondary',
              onClick: handleCancel,
              icon: faSignOutAlt
            }
          ]
        };

      case 'expired':
        return {
          title: 'Reserva expirada',
          variant: 'danger',
          icon: faClock,
          message: 'Tu sesión de reserva ha expirado. Los datos han sido eliminados por seguridad.',
          showProgress: false,
          actions: [
            {
              label: 'Crear nueva reserva',
              variant: 'primary',
              onClick: handleContinue,
              icon: faRefresh
            },
            {
              label: 'Volver al inicio',
              variant: 'outline-secondary',
              onClick: handleCancel,
              icon: faSignOutAlt
            }
          ]
        };

      case 'extend':
        return {
          title: 'Extender tiempo de reserva',
          variant: 'info',
          icon: faInfoCircle,
          message: '¿Deseas extender el tiempo de tu reserva por 30 minutos más?',
          showProgress: false,
          actions: [
            {
              label: 'Extender tiempo',
              variant: 'primary',
              onClick: handleExtend,
              icon: faRefresh
            },
            {
              label: 'No, continuar',
              variant: 'outline-secondary',
              onClick: onClose,
              icon: faSignOutAlt
            }
          ]
        };

      default:
        return {
          title: 'Información de reserva',
          variant: 'info',
          icon: faInfoCircle,
          message: 'Información sobre tu reserva.',
          showProgress: false,
          actions: [
            {
              label: 'Cerrar',
              variant: 'secondary',
              onClick: onClose
            }
          ]
        };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      show={show}
      onHide={onClose}
      backdrop="static"
      keyboard={false}
      centered
      className="reservation-timer-modal"
    >
      <Modal.Header className={`bg-${config.variant} bg-opacity-10`}>
        <Modal.Title className={`text-${config.variant} d-flex align-items-center`}>
          <FontAwesomeIcon icon={config.icon} className="me-2" />
          {config.title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center py-4">
        <Alert variant={config.variant} className="mb-3">
          <FontAwesomeIcon icon={config.icon} className="me-2" />
          {config.message}
        </Alert>

        {config.showProgress && timeLeft > 0 && (
          <div className="timer-display mb-3">
            <h4 className={`text-${config.variant} mb-2`}>
              <FontAwesomeIcon icon={faClock} className="me-2" />
              {formatTime(timeLeft)}
            </h4>
            <ProgressBar
              variant={getTimePercentage() > 50 ? 'success' : getTimePercentage() > 25 ? 'warning' : 'danger'}
              now={getTimePercentage()}
              className="mb-2"
              style={{ height: '8px' }}
            />
            <small className="text-muted">
              Tiempo restante antes de que expire tu reserva
            </small>
          </div>
        )}

        {type === 'expired' && (
          <div className="expired-info">
            <p className="text-muted">
              Por motivos de seguridad y para mantener el sistema optimizado, 
              los datos de reserva se eliminan automáticamente después de 30 minutos 
              de inactividad.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        {config.actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            onClick={action.onClick}
            disabled={isProcessing}
            className="mx-2"
          >
            {isProcessing && action.onClick === handleExtend ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" />
                Procesando...
              </span>
            ) : (
              <span>
                {action.icon && <FontAwesomeIcon icon={action.icon} className="me-2" />}
                {action.label}
              </span>
            )}
          </Button>
        ))}
      </Modal.Footer>
    </Modal>
  );
};

export default ReservationTimerModal;
