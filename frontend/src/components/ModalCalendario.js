import React, { useState, useEffect } from 'react';
import { Form, Button, Modal } from 'react-bootstrap';
import { DateRange } from 'react-date-range';
import { addDays } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-date-range/dist/styles.css'; // Importa estilos básicos
import 'react-date-range/dist/theme/default.css'; // Importa tema por defecto
import '../css/ModalCalendario.css'; // Importa tu CSS personalizado

const ModalCalendario = ({ openCalendar, onHideCalendar, initialValues, availableTimes, onSave, isMobile=false }) => {
    // Estados para fechas y horas
    const [pickupDate, setPickupDate] = useState(initialValues.pickupDate || new Date());
    const [dropoffDate, setDropoffDate] = useState(initialValues.dropoffDate || addDays(new Date(), 1));
    const [pickupTime, setPickupTime] = useState(initialValues.pickupTime || availableTimes[0]);
    const [dropoffTime, setDropoffTime] = useState(initialValues.dropoffTime || availableTimes[0]);



    // Modal y DateRange
    const [dateRange, setDateRange] = useState([
        {
            startDate: pickupDate,
            endDate: dropoffDate,
            key: 'selection',
        },
    ]);

    // Manejo del cambio en el rango de fechas
    const handleSelectRange = (ranges) => {
        const { startDate, endDate } = ranges.selection;
        setDateRange([ranges.selection]);
        setPickupDate(startDate);
        setDropoffDate(endDate);
    };

    // Manejo de la selección de fechas y horas
    const handleSaveDates = () => {
        onSave({ pickupDate, dropoffDate, pickupTime, dropoffTime });
        onHideCalendar();
    };


    return (
        <div>

            {/* Modal con calendario y selección de horas */}
            <Modal className='modal-calendario' show={openCalendar} onHide={onHideCalendar} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Selecciona fechas y horas</Modal.Title>
                </Modal.Header>
                <Modal.Body className="d-flex flex-column align-items-center">
                    {/* Calendario para seleccionar el rango */}
                    <DateRange
                        editableDateInputs={true}
                        onChange={handleSelectRange}
                        moveRangeOnFirstSelection={false}
                        ranges={dateRange}
                        minDate={new Date()}
                        locale={enUS}
                        months={isMobile ? 1 : 2} // Cambia el número de meses mostrados según el tamaño de la pantalla
                        direction={isMobile ? 'vertical' : 'horizontal'} // Cambia la dirección según el tamaño de la pantalla
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
