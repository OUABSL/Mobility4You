import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Row, Col, Modal } from 'react-bootstrap';
import { DateRange } from 'react-date-range';
import { addDays, addYears, format, set } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlane, faCity } from '@fortawesome/free-solid-svg-icons';
import 'react-date-range/dist/styles.css'; // Estilos básicos
import 'react-date-range/dist/theme/default.css'; // Tema por defecto
import '../css/Home.css';

const availableTimes = ["11:00", "11:30", "12:00", "13:30"];

// Opciones iniciales de ubicaciones
const locations = [
  {
    name: "Aeropuerto de Málaga",
    icon: faPlane,
    info: {
      address: "Avenida Comandante García Morato, s/n, 29004 Málaga, España",
      hours: "Lunes - Domingo: 06:00 - 23:00",
      holidays: "06:00 - 23:00"
    }
  },
  {
    name: "Centro de Málaga",
    icon: faCity,
    info: {
      address: "Calle Larios, 29005 Málaga, España",
      hours: "Lunes - Domingo: 09:00 - 21:00",
      holidays: "09:00 - 21:00"
    }
  }
];


const Home = () => {
  // Estados para ubicación y búsqueda
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [showDropoffLocation, setShowDropoffLocation] = useState(false);
  const [cars, setCars] = useState([]);

  // Estados para fechas y horas
  const [pickupDate, setPickupDate] = useState(new Date());
  const [dropoffDate, setDropoffDate] = useState(addDays(new Date(), 1));
  const [pickupTime, setPickupTime] = useState(availableTimes[0]);
  const [dropoffTime, setDropoffTime] = useState(availableTimes[0]);

  // Estado para mostrar el modal del calendario
  const [openCalendar, setOpenCalendar] = useState(false);

  // Rango para el DateRange
  const [dateRange, setDateRange] = useState([
    {
      startDate: pickupDate,
      endDate: dropoffDate,
      key: 'selection'
    }
  ]);

  // Estados para manejar visualización de elementos
  const [sameLocation, setSameLocation] = useState(true);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  // Función para manejar el cambio en el campo de ubicación
  const handleLocationChange = (e, setLocation) => {
    const value = e.target.value;
    setLocation(value);
    if (value) {
      setLocationSuggestions(locations.filter(location => location.name.toLowerCase().includes(value.toLowerCase())));
    } else {
      setLocationSuggestions([]);
    }
  };

  // Función para cerrar las sugerencias
  const handleCloseSuggestions = () => {
    setLocationSuggestions([]);
  };

  // Renderizado de las sugerencias de ubicaciones
  const renderLocationSuggestions = (setLocation) => {
    return locationSuggestions.map((location, index) => (
      <div key={index} className="location-suggestion d-flex flex-row align-items-center px-2" style={{cursor:'pointer'}} onClick={() => {
        setLocation(location.name);
        setLocationSuggestions([]);
      }}>
        <div className='w-100'>
          <div><FontAwesomeIcon icon={location.icon} /> {location.name}</div>
        </div>
        <div className="location-info p-3">
          {location.info && (
            <>
            <FontAwesomeIcon icon={location.icon} />
              <p><strong>Dirección:</strong> {location.info.address}</p>
              <p><strong>Horario:</strong> {location.info.hours}</p>
              <p><strong>Festivos:</strong> {location.info.holidays}</p>
            </>
          )}
        </div>
      </div>
    ));
  };


  const handleSelectRange = (ranges) => {
    const { startDate, endDate } = ranges.selection;
    setDateRange([ranges.selection]);
    setPickupDate(startDate);
    setDropoffDate(endDate);
  };

  const handleSaveDates = () => {
    // Se cierra el modal al guardar el rango y las horas
    setOpenCalendar(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      // Se puede enviar la fecha y hora combinadas o separadas
      const response = await axios.post('/api/search', {
        pickupLocation,
        dropoffLocation: showDropoffLocation ? dropoffLocation : pickupLocation,
        pickupDate: format(pickupDate, 'dd-MM'),
        pickupTime,
        dropoffDate: format(dropoffDate, 'dd-MM'),
        dropoffTime,
      });
      setCars(response.data);
    } catch (error) {
      console.error('Error fetching cars:', error);
    }
  };

  return (
    <div>
    <div className="home w-100">
      <div className="search-section w-100">
        <div className="search-form bg-light text-dark mt-5 mx-5 p-3 rounded">
          <Form onSubmit={handleSearch}>
            <Row className='d-flex flex-row align-items-center'>
              {/* Ubicación */}
              <Col className='d-flex align-items-center'>
                <Form.Group controlId="pickupLocation" className='flex-grow-1'>
                  <Form.Label className='small'>Recogida</Form.Label>
                  <Form.Control
                    type="text"
                    className='w-100 input-search'
                    placeholder="Aeropuerto, ciudad o dirección"
                    value={pickupLocation}
                    onChange={(e) => handleLocationChange(e, setPickupLocation)}
                    onFocus={() => setLocationSuggestions(locations)}
                  />
                  {locationSuggestions.length > 0 && (
                    <div className="location-suggestions">
                      <div className="close-suggestions d-flex justify-content-end m-2" style={{cursor:'pointer'}} onClick={handleCloseSuggestions}>
                        <FontAwesomeIcon className="close-suggestions-icon" icon={['fas', 'times']} />
                      </div>
                      {renderLocationSuggestions(setPickupLocation)}
                    </div>
                  )}
                </Form.Group>
              </Col>

              {/* Ubicación de devolución opcional */}
              <Col className='d-flex align-items-center align-self-end'>
                <FontAwesomeIcon icon={['fas', 'exchange-alt']} className='color-texto-primario me-2 align-self-end' 
                  style={{ cursor: 'pointer', color: '#007bff' }}
                  onClick={() => {
                    setShowDropoffLocation(!showDropoffLocation);
                    setSameLocation(!sameLocation);
                  }}/>
                {sameLocation && (
                <span
                  className="span-dif-lugar text-secondary"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setShowDropoffLocation(!showDropoffLocation);
                    setSameLocation(false);
                  }}
                >
                  ¿Distinto Lugar de Devolución?
                </span>
                )}
                {showDropoffLocation && (
                  <Form.Group controlId="dropoffLocation" className='flex-grow-1 ms-2'>
                    <Form.Label className='small'>Devolución</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Aeropuerto, ciudad o dirección"
                      value={dropoffLocation}
                      onChange={(e) => handleLocationChange(e, setDropoffLocation)}
                      onFocus={() => setLocationSuggestions(locations)}
                    />
                    {locationSuggestions.length > 0 && (
                      <div className="location-suggestions">
                        {renderLocationSuggestions(setDropoffLocation)}
                        <div className="close-suggestions" onClick={handleCloseSuggestions}>
                          <FontAwesomeIcon icon={['fas', 'times']} />
                        </div>
                      </div>
                    )}
                  </Form.Group>
                )}
              </Col>
            </Row>
              <Row className='d-flex flex-row justify-content-evenly align-items-center mt-3'>
                {/* Selector combinado de Fecha y Hora para Recogida y Devolución */}
                <Col className='d-flex flex-column align-items-start'>
                  <Form.Label className='small'>
                    Fecha de Recogida
                  </Form.Label>
                  <div 
                    className="d-flex align-items-center p-2 border rounded"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setOpenCalendar(true)}
                  >
                    {/* Recogida */}
                    <span className='me-3'>
                      <FontAwesomeIcon icon={['fas', 'calendar-alt']} className='color-texto-primario me-1' />
                      {format(pickupDate, 'd MMM', { locale: undefined })} | 
                      <FontAwesomeIcon icon={['fas', 'clock']} className='color-texto-primario ms-2 me-1' />
                      {pickupTime}
                    </span>
                  </div>
                </Col>

                <Col className='d-flex flex-column align-items-start'>
                  <Form.Label className='small'>
                    Fecha de Devolución
                  </Form.Label>
                  <div 
                    className="d-flex align-items-center p-2 border rounded"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setOpenCalendar(true)}
                  >
                    {/* Devolución */}
                    <span>
                      <FontAwesomeIcon icon={['fas', 'calendar-alt']} className='color-texto-primario me-1' />
                      {format(dropoffDate, 'd MMM', { locale: undefined })} | 
                      <FontAwesomeIcon icon={['fas', 'clock']} className='color-texto-primario ms-2 me-1' />
                      {dropoffTime}
                    </span>
                  </div>
                </Col>

                {/* Botón para buscar */}
                <Col className='d-flex align-items-center align-self-end'>
                  <Button className='btn-buscar' type="submit">
                    Buscar coches
                  </Button>
                </Col>
              </Row>
            </Form>
          </div>
        </div>
      </div>

      {/* Modal con calendario y selección de horas */}
      <Modal show={openCalendar} onHide={() => setOpenCalendar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Selecciona fechas y horas</Modal.Title>
        </Modal.Header>
        <Modal.Body className='d-flex flex-column align-items-center'>
          {/* Calendario para seleccionar el rango */}
          <DateRange
            editableDateInputs={true}
            onChange={handleSelectRange}
            moveRangeOnFirstSelection={false}
            ranges={dateRange}
            minDate={new Date()}
            locale={enUS}
          />

          <hr />
          <div className='d-flex flex-row justify-content-evenly align-items-center w-100'>
            <Form.Group className=''>
              <Form.Label>Hora de Recogida</Form.Label>
              <Form.Control
                as="select"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              >
                {availableTimes.map((time, index) => (
                  <option key={index} value={time}>{time}</option>
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
                  <option key={index} value={time}>{time}</option>
                ))}
              </Form.Control>
            </Form.Group>
          </div>
          
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setOpenCalendar(false)}>
            Cancelar
          </Button>
          <Button className='btn-guardar' onClick={handleSaveDates}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Sección de promoción y características */}
      <div className="promo-section text-light p-4 w-100">
        <h2>
          <span>Alquila premium.</span><br />
          <span>Paga economy.</span>
        </h2>
        <h1>Alquiler de coches premium a precios asequibles. En todo el mundo.</h1>
      </div>
      <section className="features-section d-flex flex-row flex-wrap justify-content-evenly align-items-center">
        <div className="feature">
          <div className="icon">
            <FontAwesomeIcon icon={['fas', 'globe']} />
          </div>
          <div className="content">
            <h3>Presencia global</h3>
            <p>Más de 2,000 oficinas en más de 105 países</p>
          </div>
        </div>
        <div className="feature">
          <div className="icon">
            <FontAwesomeIcon icon={['fas', 'car']} />
          </div>
          <div className="content">
            <h3>Flota distintiva</h3>
            <p>Desde descapotables de alta gama hasta SUV premium</p>
          </div>
        </div>
        <div className="feature">
          <div className="icon">
            <FontAwesomeIcon icon={['fas', 'star']} />
          </div>
          <div className="content">
            <h3>Servicio excepcional</h3>
            <p>Sin estrés, confiable, sin costes ocultos</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
