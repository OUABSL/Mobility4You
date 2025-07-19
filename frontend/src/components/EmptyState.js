// src/components/EmptyState.js
/**
 * 🏗️ COMPONENTE DE ESTADO VACÍO
 *
 * Componente para mostrar mensajes informativos cuando no hay datos disponibles
 * de forma elegante y con opciones de acción.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-19
 */

import {
  faCalendarAlt,
  faCarSide,
  faExclamationTriangle,
  faMapMarkerAlt,
  faPhone,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Button, Card } from 'react-bootstrap';

const EmptyState = ({
  type = 'vehicles',
  message = '',
  suggestion = '',
  onRetry = null,
  onModifySearch = null,
  onContact = null,
  showActions = true,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'vehicles':
        return faCarSide;
      case 'search':
        return faSearch;
      case 'locations':
        return faMapMarkerAlt;
      case 'dates':
        return faCalendarAlt;
      case 'error':
        return faExclamationTriangle;
      default:
        return faCarSide;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'vehicles':
        return 'No hay vehículos disponibles';
      case 'search':
        return 'No se encontraron resultados para tu búsqueda';
      case 'locations':
        return 'No hay ubicaciones disponibles';
      case 'dates':
        return 'No hay fechas disponibles';
      case 'error':
        return 'Ha ocurrido un error';
      default:
        return 'No hay datos disponibles';
    }
  };

  const getDefaultSuggestion = () => {
    switch (type) {
      case 'vehicles':
        return 'Intenta modificar tus criterios de búsqueda o contacta con nosotros para más opciones.';
      case 'search':
        return 'Prueba con fechas diferentes, otra ubicación o amplía tus criterios de búsqueda.';
      case 'locations':
        return 'El servicio no está disponible temporalmente. Intenta más tarde.';
      case 'dates':
        return 'Selecciona fechas diferentes.';
      case 'error':
        return 'Intenta recargar la página o contacta con soporte técnico.';
      default:
        return 'Intenta nuevamente más tarde.';
    }
  };

  const displayMessage = message || getDefaultMessage();
  const displaySuggestion = suggestion || getDefaultSuggestion();

  return (
    <Card className="text-center my-4">
      <Card.Body className="py-5">
        <div className="mb-4">
          <FontAwesomeIcon
            icon={getIcon()}
            size="4x"
            className={`text-${
              getVariant() === 'danger'
                ? 'danger'
                : getVariant() === 'warning'
                ? 'warning'
                : 'muted'
            }`}
          />
        </div>

        <h4 className="mb-3">{displayMessage}</h4>

        {displaySuggestion && (
          <p className="text-muted mb-4">{displaySuggestion}</p>
        )}

        {showActions && (
          <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
            {onModifySearch && (
              <Button
                variant="primary"
                onClick={onModifySearch}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                <FontAwesomeIcon icon={faSearch} />
                Modificar búsqueda
              </Button>
            )}

            {onRetry && (
              <Button
                variant="outline-primary"
                onClick={onRetry}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                <FontAwesomeIcon icon={faSearch} />
                Intentar de nuevo
              </Button>
            )}

            {onContact && (
              <Button
                variant="outline-secondary"
                onClick={onContact}
                className="d-flex align-items-center justify-content-center gap-2"
              >
                <FontAwesomeIcon icon={faPhone} />
                Contactar
              </Button>
            )}
          </div>
        )}

        {type === 'vehicles' && (
          <Alert variant="light" className="mt-4 mx-3">
            <small>
              <strong>Consejos:</strong> Intenta con fechas más flexibles,
              diferentes ubicaciones o contacta directamente con nosotros para
              opciones personalizadas.
            </small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default EmptyState;
