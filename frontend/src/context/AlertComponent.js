// src/context/AlertComponent.js
import {
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect } from 'react';
import { Alert, Container } from 'react-bootstrap';
import { useAlertContext } from './AlertContext';

/**
 * Componente de alerta estilizado para usar con AlertContext
 * Muestra alertas con estilos coherentes con el diseño de la aplicación
 */
const AlertComponent = () => {
  const { alert, hideAlert } = useAlertContext();

  // Función para obtener el ícono según el tipo de alerta
  const getAlertIcon = () => {
    switch (alert.icon || alert.variant) {
      case 'check-circle':
      case 'success':
        return faCheckCircle;
      case 'exclamation-triangle':
      case 'danger':
        return faExclamationTriangle;
      case 'exclamation-circle':
      case 'warning':
        return faExclamationCircle;
      case 'info-circle':
      case 'info':
      default:
        return faInfoCircle;
    }
  };

  // Restablecer temporizador cuando cambia alert.show
  useEffect(() => {
    if (alert.show && alert.timeout !== 0) {
      const timeout = setTimeout(() => {
        hideAlert();
      }, alert.timeout || 300000);

      return () => clearTimeout(timeout);
    }
  }, [alert.show, alert.timeout, hideAlert]);

  // No renderizar nada si no hay alerta para mostrar
  if (!alert.show) {
    return null;
  }

  // Clases adicionales según la posición
  const positionClass =
    alert.position === 'bottom' ? 'alert-bottom' : 'alert-top';

  return (
    <div className={`global-alert-container ${positionClass}`}>
      <Container>
        <Alert
          variant={alert.variant}
          onClose={hideAlert}
          dismissible
          className="d-flex align-items-center shadow-sm border-0 alert-animated"
        >
          <div className="d-flex align-items-center flex-grow-1">
            <div className="alert-icon me-3">
              <FontAwesomeIcon icon={getAlertIcon()} />
            </div>
            <div className="alert-content">{alert.message}</div>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={hideAlert}
          />
        </Alert>
      </Container>
    </div>
  );
};

// Estilos para el componente
export const alertStyles = `
  /* Estilos para el contenedor de alertas */
  .global-alert-container {
    position: fixed;
    top: 200px;
    left: 0;
    right: 0;
    z-index: 1100;
    padding: 1rem;
    transition: all 0.3s ease-in-out;
    pointer-events: none;
  }
  
  .alert-top {
    top: 0;
  }
  
  .alert-bottom {
    bottom: 0;
  }

  .global-alert-container .alert {
    pointer-events: auto; /* Permite interacción con la alerta */
  }
  
  /* Estilos para las alertas */
  .alert-animated {
    animation: slideInDown 0.3s forwards;
    border-radius: 0.5rem;
    box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
  }
  
  .alert-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
  }
  
  /* Variantes de color para las alertas */
  .alert-success {
    background-color: #d4edda;
    color: #155724;
    border-color: #c3e6cb;
  }
  
  .alert-danger {
    background-color: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
  }
  
  .alert-warning {
    background-color: #fff3cd;
    color: #856404;
    border-color: #ffeeba;
  }
  
  .alert-info {
    background-color: #d1ecf1;
    color: #0c5460;
    border-color: #bee5eb;
  }
  
  /* Animaciones */
  @keyframes slideInDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideInUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  /* Ajustes para versión móvil */
  @media (max-width: 768px) {
    .global-alert-container {
      padding: 0.5rem;
    }
    
    .alert-animated {
      font-size: 0.9rem;
    }
  }
  
  /* Soporte para tema oscuro */
  .dark-mode .alert-success {
    background-color: rgba(40, 167, 69, 0.2);
    color: #a3d7a3;
  }
  
  .dark-mode .alert-danger {
    background-color: rgba(220, 53, 69, 0.2);
    color: #f1aeb5;
  }
  
  .dark-mode .alert-warning {
    background-color: rgba(255, 193, 7, 0.2);
    color: #ffe187;
  }
  
  .dark-mode .alert-info {
    background-color: rgba(13, 202, 240, 0.2);
    color: #9eeaf9;
  }
`;

export default AlertComponent;
