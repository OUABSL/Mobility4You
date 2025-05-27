// Componente indicador visual del timer de reserva

import React from 'react';
import { Badge, ProgressBar, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faClock, 
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import '../../css/ReservationTimerIndicator.css';

/**
 * Indicador visual del timer de reserva
 */
const ReservationTimerIndicator = ({
  isActive = false,
  remainingTime = 0,
  formattedTime = '00:00',
  showProgress = true,
  size = 'normal', // 'small' | 'normal' | 'large'
  position = 'inline', // 'inline' | 'fixed' | 'sticky'
  onExtendRequest = null,
  className = ''
}) => {
  
  /**
   * Calcula el porcentaje de tiempo restante
   */
  const getTimePercentage = () => {
    const totalTime = 30 * 60 * 1000; // 30 minutos en ms
    return Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
  };

  /**
   * Obtiene la variante de color según el tiempo restante
   */
  const getVariant = () => {
    const percentage = getTimePercentage();
    if (percentage > 50) return 'success';
    if (percentage > 25) return 'warning';
    return 'danger';
  };

  /**
   * Obtiene el icono según el estado
   */
  const getIcon = () => {
    if (!isActive) return faCheckCircle;
    
    const percentage = getTimePercentage();
    if (percentage > 25) return faClock;
    return faExclamationTriangle;
  };

  /**
   * Obtiene el tooltip según el estado
   */
  const getTooltipContent = () => {
    if (!isActive) {
      return "No hay reserva activa";
    }
    
    const percentage = getTimePercentage();
    const minutes = Math.floor(remainingTime / 60000);
    
    if (percentage > 50) {
      return `Tu reserva expira en ${formattedTime}. Tiempo suficiente para completar el proceso.`;
    } else if (percentage > 25) {
      return `Atención: Tu reserva expira en ${formattedTime}. Te recomendamos completar pronto el proceso.`;
    } else {
      return `¡Urgente! Tu reserva expira en ${formattedTime}. Completa la reserva o extiende el tiempo.`;
    }
  };

  /**
   * Maneja el clic en el indicador
   */
  const handleClick = () => {
    if (isActive && getTimePercentage() <= 25 && onExtendRequest) {
      onExtendRequest();
    }
  };

  // Si no está activo y no se debe mostrar, retornar null
  if (!isActive && position === 'inline') {
    return null;
  }

  const variant = getVariant();
  const icon = getIcon();
  const isClickable = isActive && getTimePercentage() <= 25 && onExtendRequest;

  // Clases CSS dinámicas
  const indicatorClasses = [
    'reservation-timer-indicator',
    `size-${size}`,
    `position-${position}`,
    `variant-${variant}`,
    isClickable ? 'clickable' : '',
    !isActive ? 'inactive' : '',
    className
  ].filter(Boolean).join(' ');

  const content = (
    <div className={indicatorClasses} onClick={isClickable ? handleClick : undefined}>
      <div className="timer-content">
        <div className="timer-icon-time">
          <FontAwesomeIcon 
            icon={icon} 
            className={`timer-icon text-${variant}`}
          />
          <span className={`timer-text text-${variant}`}>
            {isActive ? formattedTime : '00:00'}
          </span>
        </div>
        
        {showProgress && isActive && (
          <ProgressBar
            variant={variant}
            now={getTimePercentage()}
            className="timer-progress"
            style={{ height: size === 'small' ? '4px' : size === 'large' ? '8px' : '6px' }}
          />
        )}
        
        {size !== 'small' && (
          <div className="timer-label">
            <small className={`text-${variant}`}>
              {isActive ? 'Tiempo restante' : 'Sin reserva activa'}
            </small>
          </div>
        )}
      </div>
      
      {isClickable && (
        <div className="extend-hint">
          <small className="text-muted">
            <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
            Clic para extender
          </small>
        </div>
      )}
    </div>
  );

  // Envolver en tooltip si es necesario
  if (position !== 'inline') {
    return (
      <OverlayTrigger
        placement="bottom"
        delay={{ show: 250, hide: 400 }}
        overlay={
          <Tooltip id="timer-tooltip">
            {getTooltipContent()}
          </Tooltip>
        }
      >
        {content}
      </OverlayTrigger>
    );
  }

  return content;
};

/**
 * Variante compacta para header/navbar
 */
export const ReservationTimerBadge = ({
  isActive,
  remainingTime,
  formattedTime,
  onExtendRequest
}) => {
  if (!isActive) return null;

  const totalTime = 30 * 60 * 1000;
  const percentage = Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
  const variant = percentage > 50 ? 'success' : percentage > 25 ? 'warning' : 'danger';
  const icon = percentage > 25 ? faClock : faExclamationTriangle;

  const tooltip = (
    <Tooltip id="timer-badge-tooltip">
      {percentage > 25 
        ? `Tu reserva expira en ${formattedTime}`
        : `¡Urgente! Reserva expira en ${formattedTime}`
      }
    </Tooltip>
  );

  return (
    <OverlayTrigger placement="bottom" overlay={tooltip}>
      <Badge 
        bg={variant} 
        className="reservation-timer-badge d-flex align-items-center"
        style={{ cursor: percentage <= 25 ? 'pointer' : 'default' }}
        onClick={percentage <= 25 && onExtendRequest ? onExtendRequest : undefined}
      >
        <FontAwesomeIcon icon={icon} className="me-1" />
        {formattedTime}
      </Badge>
    </OverlayTrigger>
  );
};

/**
 * Variante flotante para esquina de pantalla
 */
export const ReservationTimerFloating = ({
  isActive,
  remainingTime,
  formattedTime,
  onExtendRequest,
  position = 'top-right' // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}) => {
  if (!isActive) return null;

  const totalTime = 30 * 60 * 1000;
  const percentage = Math.max(0, Math.min(100, (remainingTime / totalTime) * 100));
  const variant = percentage > 50 ? 'success' : percentage > 25 ? 'warning' : 'danger';
  const isUrgent = percentage <= 25;

  return (
    <div className={`reservation-timer-floating ${position} ${isUrgent ? 'urgent' : ''}`}>
      <div className={`floating-content bg-${variant} text-white`}>
        <div className="d-flex align-items-center">
          <FontAwesomeIcon icon={faClock} className="me-2" />
          <div>
            <div className="fw-bold">{formattedTime}</div>
            <small>Tiempo restante</small>
          </div>
        </div>
        
        {isUrgent && onExtendRequest && (
          <button 
            className="btn btn-light btn-sm mt-2 w-100"
            onClick={onExtendRequest}
          >
            <FontAwesomeIcon icon={faInfoCircle} className="me-1" />
            Extender tiempo
          </button>
        )}
      </div>
    </div>
  );
};

export default ReservationTimerIndicator;
