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
  faTimes,
  faSearch,
  faEdit,
  faInfoCircle,
  faTruck,
  faCarSide
} from '@fortawesome/free-solid-svg-icons';
import '../css/FormBusqueda.css';
import ModalCalendario from './ModalCalendario';
import { is } from 'date-fns/locale';

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
// Opciones de horarios disponibles (podrías importarlos desde un módulo común)
const availableTimes = ["11:00", "11:30", "12:00", "13:30"];

// Tipos de búsqueda (vehículos)
const searchTypes = [
  { id: 'coches',   label: 'Coches',   icon: faCarSide },
  { id: 'furgonetas', label: 'Furgonetas', icon: faTruck }
];

// Grupos de coches (subcategorías) — más adelante vendrán de la API
const carGroups = [
  { id: 'A', title: 'Fiat 500, Panda o similar' },
  { id: 'B', title: 'Seat Ibiza, VW Polo, Fabia o similar' }
  // C se añadirá luego
];

// Componente del formulario de búsqueda
/**
 * Componente `FormBusqueda` para realizar búsquedas con opciones de recogida y devolución, 
 * fechas y horarios. Incluye funcionalidad para sugerencias de ubicaciones, 
 * manejo de fechas y un diseño plegable/expandible.
 *
 * @param {Object} props - Propiedades del componente.
 * @param {boolean} [props.collapsible=false] - Indica si el formulario puede plegarse o expandirse.
 * @param {Function} props.onSearch - Función que se ejecuta al enviar el formulario con los parámetros de búsqueda.
 * @param {Object} [props.initialValues={}] - Valores iniciales para los campos del formulario.
 * @param {boolean} [props.listado=false] - Indica si el formulario se muestra en un contexto de listado.
 *
 * @returns {JSX.Element} Componente de formulario de búsqueda.
 *
 * @example
 * <FormBusqueda 
 *   collapsible={true} 
 *   onSearch={(params) => console.log(params)} 
 *   initialValues={{
 *     pickupLocation: "Madrid",
 *     dropoffLocation: "Barcelona",
 *     pickupDate: new Date(),
 *     dropoffDate: new Date(),
 *     pickupTime: "10:00",
 *     dropoffTime: "12:00"
 *   }} 
 *   listado={true} 
 * />
 *
 * @description
 * Este componente permite a los usuarios seleccionar ubicaciones de recogida y devolución, 
 * fechas y horarios para realizar una búsqueda. Incluye:
 * - Sugerencias de ubicaciones basadas en texto ingresado.
 * - Manejo de fechas y horarios con un calendario modal.
 * - Diseño plegable para optimizar el espacio en pantalla.
 * - Funcionalidad para detectar el scroll y fijar el formulario en la parte superior.
 */
const FormBusqueda = ({ collapsible = false, onSearch, initialValues = {}, listado=false, isMobile=false}) => {
  // Estado para la ubicación de recogida
  const [pickupLocation, setPickupLocation] = useState(initialValues.pickupLocation || '');
  // Estado para la ubicación de devolución
  const [dropoffLocation, setDropoffLocation] = useState(initialValues.dropoffLocation || '');
  // Estado para mostrar u ocultar el campo de ubicación de devolución
  const [showDropoffLocation, setShowDropoffLocation] = useState(initialValues.showDropoffLocation || false);
  // Estado para determinar si la ubicación de recogida y devolución son iguales
  const [sameLocation, setSameLocation] = useState(true);

  // Estado para las sugerencias de ubicaciones de recogida
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  // Estado para las sugerencias de ubicaciones de devolución
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);

  // Estado para controlar si el formulario está expandido o colapsado
  const [expanded, setExpanded] = useState(!collapsible);

  // Estado para la fecha de recogida
  const [pickupDate, setPickupDate] = useState(initialValues.pickupDate || new Date());
  // Estado para la fecha de devolución
  const [dropoffDate, setDropoffDate] = useState(initialValues.dropoffDate || addDays(new Date(), 1));
  // Estado para la hora de recogida
  const [pickupTime, setPickupTime] = useState(initialValues.pickupTime || availableTimes[0]);
  // Estado para la hora de devolución
  const [dropoffTime, setDropoffTime] = useState(initialValues.dropoffTime || availableTimes[0]);

  // Estado para controlar la apertura del calendario modal
  const [openCalendar, setOpenCalendar] = useState(false);

  // Estado para controlar si la edad del conductor es mayor de 21 años
  const [mayor21, setMayor21] = useState(false);
  // Estado para controlar la visibilidad del tooltip de información de edad
  const [hoverTooltip, setHoverTooltip] = useState(false);
  // Referencias para los campos de recogida y devolución
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  // Estado para determinar si el formulario debe fijarse al hacer scroll
  const [isFixedForm, setIsFixedForm] = useState(false);
  // Estado para almacenar la altura de la barra de navegación
  const [navbarHeight, setNavbarHeight] = useState(0);

  // Tipo de búsqueda y grupo seleccionado
const [tipoBusqueda, setTipoBusqueda] = useState('coches');
const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);

// Simular llamada a API para tipos y grupos
useEffect(() => {
  // Aquí se haría el fetch('/api/search-types')…
  // Por simplicidad, estamos usando datos estáticos en este ejemplo
  //setTipoBusqueda('coches'); // Cambia esto según la lógica de tu aplicación
  //setGrupoSeleccionado(carGroups[0]); // Selecciona el primer grupo por defecto
}, []);

  // Efecto para manejar el scroll y fijar el formulario si es necesario
  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      setNavbarHeight(navbar.offsetHeight);
    }

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsFixedForm(true);
      } else {
        setIsFixedForm(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Función para expandir el formulario y desplazarse al inicio de la página
  const handleExpand = () => {
    setExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Función para contraer el formulario
  const handleCloseExpand = () => {
    setExpanded(false);
  };

  // Efecto para cerrar las sugerencias al hacer clic fuera de los campos
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

  // Función para manejar el cambio en los campos de ubicación y generar sugerencias
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

  // Función para renderizar las sugerencias de ubicaciones
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

  // Función para guardar las fechas seleccionadas en el calendario modal
  const handleSaveDates = ({ pickupDate, dropoffDate, pickupTime, dropoffTime }) => {
    setPickupDate(pickupDate);
    setDropoffDate(dropoffDate);
    setPickupTime(pickupTime);
    setDropoffTime(dropoffTime);
  };

  // Función para manejar el envío del formulario y generar los parámetros de búsqueda
  const handleSubmit = (e) => {
    e.preventDefault();
    const searchParams = {
      pickupLocation,
      dropoffLocation: showDropoffLocation ? dropoffLocation : pickupLocation,
      pickupDate: format(pickupDate, 'dd-MM'),
      pickupTime,
      dropoffDate: format(dropoffDate, 'dd-MM'),
      dropoffTime,
      tipo: tipoBusqueda,
      grupo: grupoSeleccionado,
    };
    if (onSearch) {
      onSearch(searchParams);
    }
  };



  if (collapsible && !expanded) {
    return (
      <div
        className={`form-busqueda-collapsed ${isFixedForm ? 'fixed-search' : ''} w-100 d-flex flex-row justify-content-between align-items-center`}
        style={{ top: isFixedForm ? `${navbarHeight}px` : 'auto' }}
      >
        <Row className="align-items-center" style={{ display: 'contents' }}>
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
        {/* NUEVO BLOQUE: Botón para modificar y expandir formulario */}
        <Button onClick={handleExpand} className="btn-modificar d-flex align-items-center justify-content-center bg-none">
          <FontAwesomeIcon icon={faEdit} className="me-1" />
        </Button>
      </div>
    );
  }
  

  return (
    <div className="search-section w-100" style={{ position: 'relative' }}>
      <div className={`search-form bg-light text-dark mt-5 mx-5 p-3 rounded ${isMobile ? 'mobile-form' : ''}`}>
        <Form onSubmit={handleSubmit}>
          {/* Icono de cierre para formulario expandido */}
          {listado && (
          <div
            className="expand-close-icon align-end"
            style={{
              position: 'absolute',
              top: '20px',
              right: '60px',
              justifySelf: 'flex-end',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
            onClick={handleCloseExpand}
          >
            <FontAwesomeIcon icon={faTimes} />
          </div>
          )}
          {/* Selección de tipo de búsqueda */}
          <Row className={`mb-3 ${isMobile ? 'flex-nowrap overflow-auto' : ''}`}>
            <Col>
              <div className={`d-flex ${isMobile ? 'flex-row' : 'flex-wrap'}`}>
                {searchTypes.map(type => (
                  <Button
                    key={type.id}
                    variant={tipoBusqueda === type.id ? 'primario' : 'outline-primario'}
                    className={`me-2 mb-2 tipo-btn`}
                    onClick={() => {
                      setTipoBusqueda(type.id);
                        setGrupoSeleccionado(null);
                      }}
                      >
                      <FontAwesomeIcon icon={type.icon} className="me-1" />
                      {type.label}
                      </Button>
                    ))}
                    </div>
                  </Col>
                  </Row>

                  
          {/* Selección de ubicaciones de recogida y devolución */}
          <Row className={`${isMobile ? 'd-flex flex-column gap-3' : 'd-flex flex-row align-items-center'} mt-3`}>
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
                
                {pickupLocation && (
                  <div className="reset-search position-absolute" style={{ top: '50%', right: '10px', cursor: 'pointer' }}>
                    <FontAwesomeIcon
                      icon={faTimes}
                      onClick={() => {
                        setPickupLocation(''); 
                        setPickupSuggestions(locations);}
                      }
                    />
                  </div>
                )}
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

            <Col className={`d-flex ${isMobile && !sameLocation ? 'flex-column' : 'align-items-center align-self-end'}`}>
              <FontAwesomeIcon
                icon={faExchangeAlt}
                className={`color-texto-primario me-2 ${isMobile ? !sameLocation ? 'mb-2 h5' : 'align-self-end' : 'align-self-end'}`}
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

                <Form.Group controlId="dropoffLocation" className={`flex-grow-1 position-relative ${isMobile ? '' : 'ms-2 '}`}>
                  <Form.Label className="small">Devolución</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Aeropuerto, ciudad o dirección"
                    value={dropoffLocation}
                    onChange={(e) => handleLocationChange(e, setDropoffLocation, setDropoffSuggestions)}
                    onFocus={() => setDropoffSuggestions(locations)}
                  />
                  {dropoffLocation && (
                    <div className="reset-search position-absolute" style={{ top: '50%', right: '10px', cursor: 'pointer' }}>
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="reset-search"
                        onClick={() => {
                          setDropoffLocation('');
                          setDropoffSuggestions(locations);
                        }}
                      />
                    </div>
                  )}
                  {dropoffSuggestions.length > 0 && (
                    <div ref={dropoffRef} className="suggestions-container">
                      <div className="close-suggestions" onClick={() => setDropoffSuggestions([])}>
                        <FontAwesomeIcon icon={faTimes} />
                      </div>
                      {renderSuggestions(dropoffSuggestions, setDropoffLocation, setDropoffSuggestions)}                  
                    </div>
                  )}
                </Form.Group>
              )}
            </Col>
          </Row>
          {/* Selección de fechas y horas */}
          <Row className={`${isMobile ? 'd-flex flex-column gap-3' : 'd-flex flex-row justify-content-evenly align-items-center'} mt-3`}>
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

          {/* Si es 'coches', muestro subcategorías */}
          {tipoBusqueda === 'coches' && (
            <Col>
              <Form.Label className="small">Categoría de coche</Form.Label>
              <Form.Select
                value={grupoSeleccionado || ''}
                onChange={(e) => setGrupoSeleccionado(e.target.value || null)}
              >
                <option value="">Todos</option>
                {carGroups.map(g => (
                <option key={g.id} value={g.id}>
                  Segmento {g.id}: {g.title}
                </option>
                ))}
              </Form.Select>
            </Col>
          )}

          <Col className="d-flex flex-row align-items-center align-self-end justify-content-start flex-nowrap">
            <Form.Check
              type="checkbox"
              label="Conductor mayor de 21 años"
              checked={mayor21}
              onChange={(e) => setMayor21(e.target.checked)}
            />
            <div
              className="tooltip-container position-relative"
              onMouseEnter={() => setHoverTooltip(true)}
              onMouseLeave={() => setHoverTooltip(false)}
              onClick={() => alert('Actualmente, nuestros servicios están disponibles únicamente para conductores mayores de 21 años. Agradecemos su comprensión.')}
            >
              <FontAwesomeIcon
                icon={faInfoCircle}
                className="info-icon ms-2"
              />
              {hoverTooltip && (
                <div className="tooltip-content text-center bg-light border rounded p-2">
                  Actualmente, nuestros servicios están disponibles únicamente para conductores mayores de 21 años.
                </div>
              )}
            </div>
          </Col>

          {/* Botón Buscar */}
            <Col className={`d-flex align-items-center  ${isMobile ? 'justify-content-start align-self-start' : 'justify-content-end align-self-end'} `} style={{maxWidth: '200px'}}>
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
        isMobile={isMobile} // Prop para determinar si es móvil o no
      />
    </div>
  );
};

export default FormBusqueda;
