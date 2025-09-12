import {
  faCheckCircle,
  faExclamationTriangle,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';

const DeleteReservationModal = ({
  show,
  onHide,
  reservationId,
  reservationNumber,
  onConfirm,
  loading = false,
  error = null,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(reservationId);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="me-2 text-warning"
          />
          Cancelar Reserva
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
        )}

        <p>¿Está seguro que desea cancelar la reserva #{reservationNumber}?</p>
        <p>
          Esta acción no se puede deshacer y puede estar sujeta a penalizaciones
          según la política de cancelación.
        </p>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          <FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Volver
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
              />
              <span className="ms-2">Procesando...</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCheckCircle} className="me-1" />{' '}
              Confirmar Cancelación
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteReservationModal;
