// src/components/FormBusqueda.js
import { addDays, format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom'; // Agrega esta línea
import ModalCalendario from './ModalCalendario';

import {
  faCalendarAlt,
  faCarSide,
  faCity,
  faClock,
  faEdit,
  faExchangeAlt,
  faInfoCircle,
  faMapMarkerAlt,
  faPlane,
  faTimes,
  faTruck,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { createServiceLogger } from '../config/appConfig';
import { useAlertContext } from '../context/AlertContext'; // Importar el contexto de alertas
import {
  availableTimes,
  fetchLocations,
  saveSearchParams,
  searchAvailableVehicles,
  validateSearchForm,
} from '../services/searchServices';

import '../css/FormBusqueda.css';

// Opciones de horarios disponibles (importados desde searchServices)
// const availableTimes = availableTimes; // Ya disponible desde el import

// Tipos de búsqueda (vehículos)
const searchTypes = [
  { id: 'coches', label: 'Coches', icon: faCarSide },
  { id: 'furgonetas', label: 'Furgonetas', icon: faTruck },
];

// Grupos de coches (subcategorías) — más adelante vendrán de la API
const carGroups = [
  { id: 'A', title: 'Fiat 500, Panda o similar' },
  { id: 'B', title: 'Seat Ibiza, VW Polo, Fabia o similar' },
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
 *   onSearch={(params) => logger.info(params)}
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

// Crear logger para el componente
const logger = createServiceLogger('FORM_BUSQUEDA');

const FormBusqueda = ({
  collapsible = false,
  onSearch,
  initialValues = {},
  listado = false,
  isMobile = false,
  locations = [], // Nueva prop para las ubicaciones
  isMainSection = false, // Nueva prop para identificar uso en sección principal
}) => {
  // Estado para la ubicación de recogida (objeto con id y nombre)
  const [pickupLocation, setPickupLocation] = useState(
    initialValues.pickupLocation || null,
  );
  // Estado para la ubicación de devolución (objeto con id y nombre)
  const [dropoffLocation, setDropoffLocation] = useState(
    initialValues.dropoffLocation || null,
  );

  // Estados para los valores de los inputs (solo para display)
  const [pickupLocationInput, setPickupLocationInput] = useState(
    initialValues.pickupLocation?.nombre || initialValues.pickupLocation || '',
  );
  const [dropoffLocationInput, setDropoffLocationInput] = useState(
    initialValues.dropoffLocation?.nombre ||
      initialValues.dropoffLocation ||
      '',
  );
  // Estado para mostrar u ocultar el campo de ubicación de devolución
  const [showDropoffLocation, setShowDropoffLocation] = useState(
    initialValues.showDropoffLocation || false,
  );
  // Estado para determinar si la ubicación de recogida y devolución son iguales
  const [sameLocation, setSameLocation] = useState(true);
  // Estado para las sugerencias de ubicaciones de recogida
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  // Estado para las sugerencias de ubicaciones de devolución
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  // Estado para las ubicaciones cargadas desde la API
  const [availableLocations, setAvailableLocations] = useState([]);

  // Estado para controlar si el formulario está expandido o colapsado
  const [expanded, setExpanded] = useState(!collapsible);

  // Estado para la fecha de recogida
  const [pickupDate, setPickupDate] = useState(
    initialValues.pickupDate || addDays(new Date(), 1),
  );
  // Estado para la fecha de devolución
  const [dropoffDate, setDropoffDate] = useState(
    initialValues.dropoffDate || addDays(new Date(), 8),
  );

  // Estado para la hora de recogida
  const [pickupTime, setPickupTime] = useState(
    initialValues.pickupTime || availableTimes[0],
  );
  // Estado para la hora de devolución
  const [dropoffTime, setDropoffTime] = useState(
    initialValues.dropoffTime || availableTimes[0],
  );

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

  // Estados de alertas
  const { showSuccess, showError, showWarning } = useAlertContext();
  // Navegación
  const navigate = useNavigate();
  const location = useLocation();

  // Función auxiliar para recuperar datos almacenados con mejor formato
  const getStoredDataWithLocations = () => {
    try {
      const storedData = sessionStorage.getItem('reservaData');
      if (!storedData) return null;

      const data = JSON.parse(storedData);

      // Verificar si tenemos datos en el formato nuevo (con información completa de lugares)
      if (data.lugares && data.fechas) {
        return {
          pickupLocation: data.lugares.recogida,
          dropoffLocation: data.lugares.devolucion,
          pickupDate: new Date(data.fechas.pickupDate),
          dropoffDate: new Date(data.fechas.dropoffDate),
          pickupTime: data.fechas.pickupTime,
          dropoffTime: data.fechas.dropoffTime,
          mayor21: data.mayor21,
          showDropoffLocation:
            data.lugares.recogida?.id !== data.lugares.devolucion?.id,
        };
      }

      // Fallback al formato anterior
      if (data.fechas) {
        return {
          pickupLocation: data.fechas.pickupLocation,
          dropoffLocation: data.fechas.dropoffLocation,
          pickupDate: new Date(data.fechas.pickupDate),
          dropoffDate: new Date(data.fechas.dropoffDate),
          pickupTime: data.fechas.pickupTime,
          dropoffTime: data.fechas.dropoffTime,
          mayor21: data.mayor21,
          showDropoffLocation: !!data.fechas.dropoffLocation,
        };
      }

      return null;
    } catch (error) {
      logger.error(
        '❌ [FormBusqueda] Error recuperando datos almacenados:',
        error,
      );
      return null;
    }
  };
  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        logger.info('🔍 [FormBusqueda] Cargando ubicaciones...');

        // OPTIMIZACIÓN: Usar ubicaciones pasadas como prop si están disponibles
        let locationsData = [];

        if (locations && locations.length > 0) {
          logger.info(
            '✅ [FormBusqueda] Usando ubicaciones desde props:',
            locations.length,
          );
          locationsData = locations;
          setAvailableLocations(locationsData);
        } else {
          // Solo hacer la llamada a la API si no se pasaron ubicaciones como prop
          logger.info('🌐 [FormBusqueda] Cargando ubicaciones desde API...');
          locationsData = await fetchLocations();
          logger.info(
            '✅ [FormBusqueda] Ubicaciones disponibles:',
            locationsData,
          );
          setAvailableLocations(locationsData);
        }

        // Verificar si no hay ubicaciones disponibles
        if (locationsData.length === 0) {
          logger.warn(
            '⚠️ [FormBusqueda] No hay ubicaciones disponibles en el sistema',
          );
          showWarning(
            'No hay ubicaciones disponibles en el sistema. El servicio no está disponible temporalmente.',
            {
              timeout: 10000,
            },
          );
          return; // No proceder con el resto de la inicialización
        }

        // Verificar si hay datos guardados en sessionStorage (con formato mejorado)
        const storedData = getStoredDataWithLocations();
        if (storedData) {
          logger.info(
            '� [FormBusqueda] Recuperando datos almacenados:',
            storedData,
          );

          // Manejar ubicaciones que pueden ser strings (legacy) u objetos (nuevo formato)
          const handleStoredLocation = (
            storedLocation,
            setLocation,
            setLocationInput,
          ) => {
            if (typeof storedLocation === 'string') {
              // Datos legacy: buscar el objeto correspondiente por nombre
              const foundLocation = locationsData.find(
                (loc) =>
                  loc.nombre?.toLowerCase() === storedLocation.toLowerCase(),
              );
              if (foundLocation) {
                setLocation(foundLocation);
                setLocationInput(foundLocation.nombre);
              } else {
                // Si no se encuentra, solo mostrar el string
                setLocation(null);
                setLocationInput(storedLocation);
              }
            } else if (
              storedLocation &&
              typeof storedLocation === 'object' &&
              (storedLocation.id || storedLocation.nombre)
            ) {
              // Formato nuevo: objeto con ID o al menos nombre
              setLocation(storedLocation);
              setLocationInput(storedLocation.nombre || '');
            }
          };

          handleStoredLocation(
            storedData.pickupLocation,
            setPickupLocation,
            setPickupLocationInput,
          );

          handleStoredLocation(
            storedData.dropoffLocation,
            setDropoffLocation,
            setDropoffLocationInput,
          );

          setShowDropoffLocation(storedData.showDropoffLocation);
          setSameLocation(!storedData.showDropoffLocation);
          setPickupDate(storedData.pickupDate || addDays(new Date(), 1));
          setDropoffDate(storedData.dropoffDate || addDays(new Date(), 8));
          setPickupTime(storedData.pickupTime || availableTimes[0]);
          setDropoffTime(storedData.dropoffTime || availableTimes[0]);
          setMayor21(storedData.mayor21 || false);
        }
      } catch (error) {
        logger.error('❌ [FormBusqueda] Error cargando ubicaciones:', error);
        showWarning(
          'No se pudieron cargar todas las ubicaciones. Por favor, intenta más tarde.',
          {
            timeout: 7000,
          },
        );
      }
    };
    loadInitialData();
  }, [showWarning, locations]); // Incluir locations como dependencia controlada
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
  }, []); // Función para manejar el cambio en los campos de ubicación y generar sugerencias
  const handleLocationChange = (
    e,
    setLocationInput,
    setLocation,
    setSuggestions,
  ) => {
    const value = e.target.value;
    setLocationInput(value);

    // Limpiar la ubicación seleccionada si el usuario está escribiendo
    setLocation(null);

    if (value && value.length >= 2) {
      // Filtrar las ubicaciones cargadas desde la API
      const filteredLocations = availableLocations.filter(
        (location) =>
          location.nombre?.toLowerCase().includes(value.toLowerCase()) ||
          location.direccion?.ciudad
            ?.toLowerCase()
            .includes(value.toLowerCase()) ||
          location.direccion?.calle
            ?.toLowerCase()
            .includes(value.toLowerCase()),
      );
      setSuggestions(filteredLocations);
    } else {
      setSuggestions([]);
    }
  }; // Función para renderizar las sugerencias de ubicaciones
  const renderSuggestions = (
    suggestions,
    setLocation,
    setLocationInput,
    setSuggestions,
  ) => {
    // Debug: Verificar la estructura de datos
    logger.info(
      '🔍 [FormBusqueda] renderSuggestions - datos recibidos:',
      suggestions,
    );

    // Verificar que suggestions sea un array válido
    if (!Array.isArray(suggestions)) {
      logger.error(
        '❌ [FormBusqueda] suggestions no es un array:',
        suggestions,
      );
      return [];
    }

    return suggestions
      .map((location, index) => {
        // Debug: Verificar cada objeto de ubicación
        logger.info(
          `🔍 [FormBusqueda] Procesando ubicación ${index}:`,
          location,
        );

        // Validar que location sea un objeto válido
        if (!location || typeof location !== 'object') {
          logger.error(
            '❌ [FormBusqueda] Ubicación inválida en índice',
            index,
            ':',
            location,
          );
          return null;
        }

        // Mapear iconos de string a componentes
        const getIcon = (iconName) => {
          switch (iconName) {
            case 'faPlane':
              return faPlane;
            case 'faCity':
              return faCity;
            default:
              return faMapMarkerAlt;
          }
        };

        // Construir la dirección completa manejando valores vacíos
        const buildAddress = (direccion) => {
          if (!direccion) return '';

          const parts = [];
          if (direccion.calle) parts.push(direccion.calle);
          if (direccion.ciudad) parts.push(direccion.ciudad);
          if (direccion.codigoPostal) parts.push(direccion.codigoPostal);

          return parts.join(', ');
        };

        const fullAddress = buildAddress(location.direccion);
        return (
          <div
            key={index}
            className="suggestion-option"
            onClick={() => {
              // Guardar el objeto completo de ubicación
              setLocation(location);
              // Actualizar el input con el nombre para display
              setLocationInput(location.nombre || '');
              setSuggestions([]);
            }}
          >
            <div className="suggestion-main">
              <FontAwesomeIcon
                className="me-2"
                icon={getIcon(location.icono_url)}
              />
              <strong>{location.nombre || 'Ubicación sin nombre'}</strong>
            </div>
            {(fullAddress || location.telefono || location.email) && (
              <div className="suggestion-detail">
                {fullAddress && (
                  <p className="mb-1">
                    <small>
                      <strong>Dirección:</strong> {fullAddress}
                    </small>
                  </p>
                )}
                {location.telefono && (
                  <p className="mb-1">
                    <small>
                      <strong>Teléfono:</strong> {location.telefono}
                    </small>
                  </p>
                )}
                {location.email && (
                  <p className="mb-0">
                    <small>
                      <strong>Email:</strong> {location.email}
                    </small>
                  </p>
                )}
              </div>
            )}{' '}
          </div>
        );
      })
      .filter(Boolean); // Filtrar elementos nulos o undefined
  };

  // Función para guardar las fechas seleccionadas en el calendario modal
  const handleSaveDates = ({
    pickupDate,
    dropoffDate,
    pickupTime,
    dropoffTime,
  }) => {
    setPickupDate(pickupDate);
    setDropoffDate(dropoffDate);
    setPickupTime(pickupTime);
    setDropoffTime(dropoffTime);
  };
  // Función para manejar el envío del formulario y generar los parámetros de búsqueda
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Verificar que hay ubicaciones disponibles en el sistema
    if (availableLocations.length === 0) {
      showError(
        'No hay ubicaciones disponibles en el sistema. El servicio no está disponible temporalmente.',
        { timeout: 8000 },
      );
      return;
    }

    // Validar que se hayan seleccionado ubicaciones válidas (objetos con ID)
    if (!pickupLocation || !pickupLocation.id) {
      showError(
        'Por favor, selecciona una ubicación de recogida válida de la lista de sugerencias',
        { timeout: 8000 },
      );
      return;
    }

    const finalDropoffLocation = showDropoffLocation
      ? dropoffLocation
      : pickupLocation;
    if (!finalDropoffLocation || !finalDropoffLocation.id) {
      showError(
        'Por favor, selecciona una ubicación de devolución válida de la lista de sugerencias',
        { timeout: 8000 },
      );
      return;
    }

    // Crear objeto con los datos de búsqueda usando IDs numéricos
    const searchParams = {
      pickupLocation: pickupLocation.id, // ID numérico
      dropoffLocation: finalDropoffLocation.id, // ID numérico
      pickupDate: format(pickupDate, 'yyyy-MM-dd'),
      pickupTime,
      dropoffDate: format(dropoffDate, 'yyyy-MM-dd'),
      dropoffTime,
      tipo: tipoBusqueda,
      grupo: grupoSeleccionado,
      mayor21,
      // Agregar datos completos de ubicación para referencia
      pickupLocationData: pickupLocation,
      dropoffLocationData: finalDropoffLocation,
    };

    // Validar formulario
    const { isValid, errors } = validateSearchForm({
      ...searchParams,
      checkMayor21: mayor21,
    });

    if (!isValid) {
      // Mostrar errores
      const errorMessage = Object.values(errors).join('. ');
      showError(errorMessage, { timeout: 8000 });
      return;
    }
    try {
      // Guardar parámetros en sessionStorage
      saveSearchParams(searchParams);

      // Realizar búsqueda usando servicio unificado
      await searchAvailableVehicles(searchParams);

      // Mostrar mensaje de éxito
      showSuccess('Búsqueda realizada con éxito', { timeout: 3000 });

      // Llamar a la función onSearch para pasar los resultados al componente padre
      if (onSearch) {
        onSearch(searchParams);
      }

      // Si ya estamos en /coches, forzar recarga
      if (location.pathname === '/coches') {
        navigate(0); // Recarga la ruta actual
      } else {
        // Navegar a la página de resultados
        navigate('/coches');
      }
    } catch (error) {
      // Mostrar mensaje de error
      showError(error.message || 'Error al realizar la búsqueda', {
        timeout: 8000,
      });
    }
  };
  // Función auxiliar para obtener el nombre de ubicación para mostrar
  const getLocationDisplayName = (location, locationInput) => {
    if (location && location.nombre) {
      return location.nombre;
    }
    if (locationInput) {
      return locationInput;
    }
    return 'No definido';
  };

  // Función auxiliar para obtener la información de devolución
  const getDropoffDisplayInfo = () => {
    if (showDropoffLocation) {
      return getLocationDisplayName(dropoffLocation, dropoffLocationInput);
    }

    const pickupName = getLocationDisplayName(
      pickupLocation,
      pickupLocationInput,
    );
    return pickupName !== 'No definido'
      ? `Igual que recogida (${pickupName})`
      : 'Igual que recogida';
  };

  // Efecto para sincronizar estado cuando cambien los initialValues
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      logger.info(
        '🔄 [FormBusqueda] Sincronizando con initialValues:',
        initialValues,
      );

      if (initialValues.pickupLocation) {
        setPickupLocation(initialValues.pickupLocation);
        setPickupLocationInput(
          initialValues.pickupLocation?.nombre ||
            initialValues.pickupLocation ||
            '',
        );
      }

      if (initialValues.dropoffLocation) {
        setDropoffLocation(initialValues.dropoffLocation);
        setDropoffLocationInput(
          initialValues.dropoffLocation?.nombre ||
            initialValues.dropoffLocation ||
            '',
        );
      }

      if (initialValues.showDropoffLocation !== undefined) {
        setShowDropoffLocation(initialValues.showDropoffLocation);
        setSameLocation(!initialValues.showDropoffLocation);
      }

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

      if (initialValues.mayor21 !== undefined) {
        setMayor21(initialValues.mayor21);
      }
    }
  }, [initialValues]);

  if (collapsible && !expanded) {
    return (
      <div
        className={`form-busqueda-collapsed ${
          isFixedForm ? 'fixed-search' : ''
        } w-100 d-flex flex-row justify-content-between align-items-center`}
        style={{ top: isFixedForm ? `${navbarHeight}px` : 'auto' }}
      >
        <div className="d-flex flex-row align-items-center justify-content-between w-100 flex-wrap">
          <span className="me-3 ms-1">
            <strong>Recogida:</strong>{' '}
            {getLocationDisplayName(pickupLocation, pickupLocationInput)}
          </span>
          <span className="me-3 ms-1">
            <strong>Devolución:</strong> {getDropoffDisplayInfo()}
          </span>
          <span className="me-3 ms-1">
            <strong>Fechas:</strong> {format(pickupDate, 'd MMM')} -{' '}
            {format(dropoffDate, 'd MMM')}
          </span>
          <span className="me-3 ms-1">
            <strong>Horarios:</strong> {pickupTime} - {dropoffTime}
          </span>
          <Button
            onClick={handleExpand}
            className="btn-modificar d-flex align-items-center justify-content-center bg-none"
            title="Modificar búsqueda"
          >
            <FontAwesomeIcon icon={faEdit} className="me-1" />
            Modificar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-section w-100" style={{ position: 'relative' }}>
      <div
        className={`search-form bg-light text-dark mt-5 p-3 rounded ${
          isMobile ? 'mobile-form' : ''
        } ${isFixedForm ? '' : 'mx-5'}`}
      >
        {' '}
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
                fontSize: '1.5rem',
              }}
              onClick={handleCloseExpand}
            >
              <FontAwesomeIcon icon={faTimes} />
            </div>
          )}
          {/* Selección de tipo de búsqueda */}
          <Row
            className={`mb-3 ${isMobile ? 'flex-nowrap overflow-auto' : ''}`}
          >
            <Col>
              <div className={`d-flex ${isMobile ? 'flex-row' : 'flex-wrap'}`}>
                {searchTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={
                      tipoBusqueda === type.id ? 'primario' : 'outline-primario'
                    }
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
          <Row
            className={`${
              isMobile
                ? 'd-flex flex-column gap-3'
                : 'd-flex flex-row align-items-center'
            } mt-3`}
          >
            <Col className="d-flex align-items-center">
              <Form.Group
                controlId="pickupLocation"
                className="flex-grow-1 position-relative"
              >
                <Form.Label className="small">Recogida</Form.Label>{' '}
                <Form.Control
                  type="text"
                  className="w-100 input-search"
                  placeholder="Aeropuerto, ciudad o dirección"
                  value={pickupLocationInput}
                  onChange={(e) =>
                    handleLocationChange(
                      e,
                      setPickupLocationInput,
                      setPickupLocation,
                      setPickupSuggestions,
                    )
                  }
                  onFocus={() => {
                    if (availableLocations && availableLocations.length > 0) {
                      setPickupSuggestions([...availableLocations]);
                    }
                  }}
                  autoComplete="off"
                />
                {pickupLocationInput && (
                  <div
                    className="reset-search position-absolute"
                    style={{ top: '50%', right: '10px', cursor: 'pointer' }}
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      onClick={() => {
                        setPickupLocationInput('');
                        setPickupLocation(null);
                        setPickupSuggestions(availableLocations);
                      }}
                    />
                  </div>
                )}
                {pickupSuggestions.length > 0 && (
                  <div ref={pickupRef} className="suggestions-container">
                    <div
                      className="close-suggestions"
                      onClick={() => setPickupSuggestions([])}
                    >
                      <FontAwesomeIcon
                        className="close-suggestions-icon"
                        icon={faTimes}
                      />
                    </div>
                    {renderSuggestions(
                      pickupSuggestions,
                      setPickupLocation,
                      setPickupLocationInput,
                      setPickupSuggestions,
                    )}
                  </div>
                )}
              </Form.Group>
            </Col>

            <Col
              className={`d-flex ${
                isMobile && !sameLocation
                  ? 'flex-column'
                  : 'align-items-center align-self-end'
              }`}
            >
              <FontAwesomeIcon
                icon={faExchangeAlt}
                className={`color-texto-primario me-2 ${
                  isMobile
                    ? !sameLocation
                      ? 'mb-2 h5'
                      : 'align-self-end'
                    : 'align-self-end'
                }`}
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
                <Form.Group
                  controlId="dropoffLocation"
                  className={`flex-grow-1 position-relative ${
                    isMobile ? '' : 'ms-2 '
                  }`}
                >
                  <Form.Label className="small">Devolución</Form.Label>{' '}
                  <Form.Control
                    type="text"
                    placeholder="Aeropuerto, ciudad o dirección"
                    value={dropoffLocationInput}
                    onChange={(e) =>
                      handleLocationChange(
                        e,
                        setDropoffLocationInput,
                        setDropoffLocation,
                        setDropoffSuggestions,
                      )
                    }
                    onFocus={() => {
                      if (availableLocations && availableLocations.length > 0) {
                        setDropoffSuggestions([...availableLocations]);
                      }
                    }}
                    autoComplete="off"
                  />{' '}
                  {dropoffLocationInput && (
                    <div
                      className="reset-search position-absolute"
                      style={{ top: '50%', right: '10px', cursor: 'pointer' }}
                    >
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="reset-search"
                        onClick={() => {
                          setDropoffLocationInput('');
                          setDropoffLocation(null);
                          setDropoffSuggestions(availableLocations);
                        }}
                      />
                    </div>
                  )}
                  {dropoffSuggestions.length > 0 && (
                    <div ref={dropoffRef} className="suggestions-container">
                      <div
                        className="close-suggestions"
                        onClick={() => setDropoffSuggestions([])}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </div>
                      {renderSuggestions(
                        dropoffSuggestions,
                        setDropoffLocation,
                        setDropoffLocationInput,
                        setDropoffSuggestions,
                      )}
                    </div>
                  )}
                </Form.Group>
              )}
            </Col>
          </Row>
          {/* Selección de fechas y horas */}
          <Row
            className={`${
              isMobile
                ? 'd-flex flex-column gap-3'
                : 'd-flex flex-row justify-content-evenly align-items-center'
            } mt-3`}
          >
            <Col className="d-flex flex-column align-items-start">
              <Form.Label className="small">Fecha de Recogida</Form.Label>
              <div
                className="d-flex align-items-center p-2 border rounded"
                style={{ cursor: 'pointer' }}
                onClick={() => setOpenCalendar(true)}
              >
                <span className="me-3">
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="color-texto-primario me-1"
                  />
                  {format(pickupDate, 'd MMM')} |
                  <FontAwesomeIcon
                    icon={faClock}
                    className="color-texto-primario ms-2 me-1"
                  />
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
                  <FontAwesomeIcon
                    icon={faCalendarAlt}
                    className="color-texto-primario me-1"
                  />
                  {format(dropoffDate, 'd MMM')} |
                  <FontAwesomeIcon
                    icon={faClock}
                    className="color-texto-primario ms-2 me-1"
                  />
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
                  {carGroups.map((g) => (
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
                label="Mayor de 21 años"
                checked={mayor21}
                onChange={(e) => setMayor21(e.target.checked)}
              />
              <div
                className="tooltip-container position-relative"
                onMouseEnter={() => setHoverTooltip(true)}
                onMouseLeave={() => setHoverTooltip(false)}
                onClick={() =>
                  alert(
                    'Actualmente, nuestros servicios están disponibles únicamente para conductores mayores de 21 años. Agradecemos su comprensión.',
                  )
                }
              >
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="info-icon ms-2"
                />
                {hoverTooltip && (
                  <div className="tooltip-content text-center bg-light border rounded p-2">
                    Actualmente, nuestros servicios están disponibles únicamente
                    para conductores mayores de 21 años.
                  </div>
                )}
              </div>
            </Col>

            {/* Botón Buscar */}
            <Col
              className={`d-flex align-items-center  ${
                isMobile
                  ? 'justify-content-start align-self-start'
                  : 'justify-content-end align-self-end'
              } `}
              style={{ maxWidth: '200px' }}
            >
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
