// src/components/FormBusqueda.js
import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Row, Col, Modal } from 'react-bootstrap';
import { DateRange } from 'react-date-range';
import { addDays, format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlane, 
  faCity, 
  faCalendarAlt, 
  faClock, 
  faExchangeAlt, 
  faTimes 
} from '@fortawesome/free-solid-svg-icons';
import '../css/FormBusqueda.css';
import ModalCalendario from './ModalCalendario';

// Opciones y datos de ejemplo para ubicaciones (podrías importarlos desde un módulo común)
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

const availableTimes = ["11:00", "11:30", "12:00", "13:30"];
const FormBusqueda = ({ collapsible = false, onSearch, initialValues = {} }) => {
  const [pickupLocation, setPickupLocation] = useState(initialValues.pickupLocation || '');
  const [dropoffLocation, setDropoffLocation] = useState(initialValues.dropoffLocation || '');
  const [showDropoffLocation, setShowDropoffLocation] = useState(initialValues.showDropoffLocation || false);
  const [sameLocation, setSameLocation] = useState(true);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);

  const [expanded, setExpanded] = useState(!collapsible);

  const [pickupDate, setPickupDate] = useState(initialValues.pickupDate || new Date());
  const [dropoffDate, setDropoffDate] = useState(initialValues.dropoffDate || addDays(new Date(), 1));
  const [pickupTime, setPickupTime] = useState(initialValues.pickupTime || availableTimes[0]);
  const [dropoffTime, setDropoffTime] = useState(initialValues.dropoffTime || availableTimes[0]);

  const [openCalendar, setOpenCalendar] = useState(false);

  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickupRef.current && !pickupRef.current.contains(event.target)) {
        setPickupSuggestions([]);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target)) {
        setDropoffSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationChange = (e, setLocation, setSuggestions) => {
    const value = e.target.value;
    setLocation(value);
    if (value) {
      setSuggestions(
        locations.filter(location =>
          location.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setSuggestions([]);
    }
  };

  const renderSuggestions = (suggestions, setLocation, setSuggestions) => {
    return suggestions.map((location, index) => (
      <div
        key={index}
        className="suggestion-option"
        onClick={() => {
          setLocation(location.name);
          setSuggestions([]);
        }}
      >
        <div className="suggestion-main">
          <FontAwesomeIcon className="me-2" icon={location.icon} /> {location.name}
        </div>
        <div className="suggestion-detail">
          <p><strong>Dirección:</strong> {location.info.address}</p>
          <p><strong>Horario:</strong> {location.info.hours}</p>
          <p><strong>Festivos:</strong> {location.info.holidays}</p>
        </div>
      </div>
    ));
  };

  const handleSaveDates = ({ pickupDate, dropoffDate, pickupTime, dropoffTime }) => {
    setPickupDate(pickupDate);
    setDropoffDate(dropoffDate);
    setPickupTime(pickupTime);
    setDropoffTime(dropoffTime);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const searchParams = {
      pickupLocation,
      dropoffLocation: showDropoffLocation ? dropoffLocation : pickupLocation,
      pickupDate: format(pickupDate, 'dd-MM'),
      pickupTime,
      dropoffDate: format(dropoffDate, 'dd-MM'),
      dropoffTime,
    };
    if (onSearch) {
      onSearch(searchParams);
    }
  };

  if (collapsible && !expanded) {
    return (
      <div className="form-busqueda-collapsed" onClick={() => setExpanded(true)}>
        <Row className="align-items-center">
          <Col>
            <span><strong>Recogida:</strong> {pickupLocation || "No definido"}</span>
          </Col>
          <Col>
            <span>
              <strong>Devolución:</strong>{" "}
              {showDropoffLocation
                ? dropoffLocation || "No definido"
                : pickupLocation || "Igual que recogida"}
            </span>
          </Col>
          <Col>
            <span>
              <strong>Fechas:</strong> {format(pickupDate, 'd MMM')} - {format(dropoffDate, 'd MMM')}
            </span>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="search-section w-100">
      <div className="search-form bg-light text-dark mt-5 mx-5 p-3 rounded">
        <Form onSubmit={handleSubmit}>
          <Row className="d-flex flex-row align-items-center">
            <Col className="d-flex align-items-center">
              <Form.Group controlId="pickupLocation" className="flex-grow-1 position-relative">
                <Form.Label className="small">Recogida</Form.Label>
                <Form.Control
                  type="text"
                  className="w-100 input-search"
                  placeholder="Aeropuerto, ciudad o dirección"
                  value={pickupLocation}
                  onChange={(e) => handleLocationChange(e, setPickupLocation, setPickupSuggestions)}
                  onFocus={() => setPickupSuggestions(locations)}
                />
                {pickupSuggestions.length > 0 && (
                  <div ref={pickupRef} className="suggestions-container">
                    <div className="close-suggestions" onClick={() => setPickupSuggestions([])}>
                      <FontAwesomeIcon className="close-suggestions-icon" icon={faTimes} />
                    </div>
                    {renderSuggestions(pickupSuggestions, setPickupLocation, setPickupSuggestions)}
                  </div>
                )}
              </Form.Group>
            </Col>

            <Col className="d-flex align-items-center align-self-end">
              <FontAwesomeIcon
                icon={faExchangeAlt}
                className="color-texto-primario me-2 align-self-end"
                style={{ cursor: 'pointer', color: '#007bff' }}
                onClick={() => {
                  setShowDropoffLocation(!showDropoffLocation);
                  setSameLocation(!sameLocation);
                }}
              />
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
                <Form.Group controlId="dropoffLocation" className="flex-grow-1 ms-2 position-relative">
                  <Form.Label className="small">Devolución</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Aeropuerto, ciudad o dirección"
                    value={dropoffLocation}
                    onChange={(e) => handleLocationChange(e, setDropoffLocation, setDropoffSuggestions)}
                    onFocus={() => setDropoffSuggestions(locations)}
                  />
                  {dropoffSuggestions.length > 0 && (
                    <div ref={dropoffRef} className="suggestions-container">
                      {renderSuggestions(dropoffSuggestions, setDropoffLocation, setDropoffSuggestions)}
                      <div className="close-suggestions" onClick={() => setDropoffSuggestions([])}>
                        <FontAwesomeIcon icon={faTimes} />
                      </div>
                    </div>
                  )}
                </Form.Group>
              )}
            </Col>
          </Row>
          <Row className="d-flex flex-row justify-content-evenly align-items-center mt-3">
          <Col className="d-flex flex-column align-items-start">
            <Form.Label className="small">Fecha de Recogida</Form.Label>
            <div
              className="d-flex align-items-center p-2 border rounded"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenCalendar(true)}
            >
              <span className="me-3">
                <FontAwesomeIcon icon={faCalendarAlt} className="color-texto-primario me-1" />
                {format(pickupDate, 'd MMM')} |
                <FontAwesomeIcon icon={faClock} className="color-texto-primario ms-2 me-1" />
                {pickupTime}
              </span>
            </div>
          </Col>

          <Col className="d-flex flex-column align-items-start">
            <Form.Label className="small">Fecha de Devolución</Form.Label>
            <div
              className="d-flex align-items-center p-2 border rounded"
              style={{ cursor: 'pointer' }}
              onClick={() => setOpenCalendar(true)}
            >
              <span>
                <FontAwesomeIcon icon={faCalendarAlt} className="color-texto-primario me-1" />
                {format(dropoffDate, 'd MMM')} |
                <FontAwesomeIcon icon={faClock} className="color-texto-primario ms-2 me-1" />
                {dropoffTime}
              </span>
            </div>
          </Col>


            <Col className="d-flex align-items-center align-self-end">
              <Button className="btn-buscar" type="submit">
                Buscar coches
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
      <ModalCalendario
      openCalendar={openCalendar}
      onHideCalendar={() => setOpenCalendar(false)}
      initialValues={{ pickupDate, dropoffDate, pickupTime, dropoffTime }}
      availableTimes={availableTimes}
      onSave={handleSaveDates}
    />
    </div>
  );
};

export default FormBusqueda;
