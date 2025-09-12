import { enUS } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css'; // Importa estilos básicos
import 'react-date-range/dist/theme/default.css'; // Importa tema por defecto
import '../css/ModalCalendario.css'; // Importa tu CSS personalizado

const ModalCalendario = ({
  openCalendar,
  onHideCalendar,
  initialValues,
  availableTimes,
  onSave,
  isMobile = false,
  useAsEditor = false, // para uso en EditReservationModal
  resetOnShow = false, //sincronizar con initialValues cuando se abre
}) => {
  // Estados para fechas y horas
  const [pickupDate, setPickupDate] = useState(
    initialValues?.pickupDate || null,
  );
  const [dropoffDate, setDropoffDate] = useState(
    initialValues?.dropoffDate || null,
  );
  const [pickupTime, setPickupTime] = useState(
    initialValues?.pickupTime || null,
  );
  const [dropoffTime, setDropoffTime] = useState(
    initialValues?.dropoffTime || null,
  );

  // Validar que tenemos datos válidos antes de continuar
  useEffect(() => {
    if (!initialValues?.pickupDate || !initialValues?.dropoffDate) {
      console.error(
        'ModalCalendario - FATAL: Sin fechas válidas en initialValues',
      );
    }
  }, [initialValues]);

  // Sincronizar estado interno con initialValues cuando resetOnShow es true y el modal se abre
  useEffect(() => {
    if (resetOnShow && openCalendar && initialValues) {
      if (initialValues.pickupDate) {
        setPickupDate(initialValues.pickupDate);
      }
      if (initialValues.dropoffDate) {
        setDropoffDate(initialValues.dropoffDate);
      }
      if (initialValues.pickupTime) {
        setPickupTime(initialValues.pickupTime);
      }
      if (initialValues.dropoffTime) {
        setDropoffTime(initialValues.dropoffTime);
      }
    }
  }, [resetOnShow, openCalendar, initialValues]);

  // Modal y DateRange
  const [dateRange, setDateRange] = useState([
    {
      startDate: pickupDate,
      endDate: dropoffDate,
      key: 'selection',
    },
  ]);

  // Actualizar dateRange cuando las fechas cambian (incluyendo sincronización)
  useEffect(() => {
    setDateRange([
      {
        startDate: pickupDate,
        endDate: dropoffDate,
        key: 'selection',
      },
    ]);
  }, [pickupDate, dropoffDate]);

  // Manejo del cambio en el rango de fechas
  const handleSelectRange = (ranges) => {
    const { startDate, endDate } = ranges.selection;

    setDateRange([
      {
        startDate: startDate,
        endDate: endDate,
        key: 'selection',
      },
    ]);

    setPickupDate(startDate);
    setDropoffDate(endDate);
  };

  // Manejo de la selección de fechas y horas con validación
  const handleSaveDates = () => {
    // Validación crítica - NO permitir datos nulos o inválidos para reservas reales
    if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime) {
      console.error('FATAL: Datos faltantes en calendario:', {
        pickupDate: !!pickupDate,
        dropoffDate: !!dropoffDate,
        pickupTime: !!pickupTime,
        dropoffTime: !!dropoffTime,
      });
      alert(
        'Error: Faltan datos de fechas. No se puede proceder con datos incompletos.',
      );
      return;
    }

    // Validación final antes de guardar - fecha debe ser al menos mañana
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pickupDateOnly = new Date(
      pickupDate.getFullYear(),
      pickupDate.getMonth(),
      pickupDate.getDate(),
    );

    if (pickupDateOnly <= today) {
      alert('La fecha de recogida debe ser al menos mañana');
      return;
    }

    if (dropoffDate <= pickupDate) {
      alert('La fecha de devolución debe ser posterior a la fecha de recogida');
      return;
    }

    try {
      // Crear fechas con horarios
      const finalPickupDate = new Date(pickupDate);
      const finalDropoffDate = new Date(dropoffDate);

      // Aplicar horarios
      const [pickupHour, pickupMinute] = pickupTime.split(':').map(Number);
      const [dropoffHour, dropoffMinute] = dropoffTime.split(':').map(Number);

      finalPickupDate.setHours(pickupHour, pickupMinute, 0, 0);
      finalDropoffDate.setHours(dropoffHour, dropoffMinute, 0, 0);

      onSave({
        pickupDate: finalPickupDate,
        dropoffDate: finalDropoffDate,
        pickupTime,
        dropoffTime,
      });
      onHideCalendar();
    } catch (error) {
      console.error('FATAL: Error procesando fechas para reserva real:', error);
      alert('Error procesando las fechas. Por favor intente de nuevo.');
    }
  };

  return (
    <div>
      <Modal
        className="modal-calendario"
        show={openCalendar}
        onHide={onHideCalendar}
        centered
        size={useAsEditor ? 'lg' : 'md'} // Ajustar tamaño si se usa como editor
        backdrop={useAsEditor ? 'static' : true} // Evitar cierre accidental en modo editor
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {useAsEditor
              ? 'Editar fechas de reserva'
              : 'Selecciona fechas y horas'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-flex flex-column align-items-center">
          {/* Calendario para seleccionar el rango */}
          <DateRange
            editableDateInputs={true}
            onChange={handleSelectRange}
            moveRangeOnFirstSelection={false}
            ranges={dateRange}
            minDate={(() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow;
            })()}
            locale={enUS}
            months={isMobile ? 1 : 2}
            direction={isMobile ? 'vertical' : 'horizontal'}
          />

          <hr />
          <div className="d-flex flex-row justify-content-evenly align-items-center w-100">
            <Form.Group>
              <Form.Label>Hora de Recogida</Form.Label>
              <Form.Control
                as="select"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              >
                {availableTimes.map((time, index) => (
                  <option key={index} value={time}>
                    {time}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group>
              <Form.Label>Hora de Devolución</Form.Label>
              <Form.Control
                as="select"
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
              >
                {availableTimes.map((time, index) => (
                  <option key={index} value={time}>
                    {time}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHideCalendar}>
            Cancelar
          </Button>
          <Button className="btn-guardar" onClick={handleSaveDates}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ModalCalendario;
