// src/components/ListadoCoches.js
import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Badge, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faSearch, 
  faFilter, 
  faExclamationTriangle, 
  faList,
  faSortAmountDown,
  faIdCard,
  faUser,
  faGasPump,
  faRoad,
  faMapMarkerAlt,
  faCalendarAlt,
  faArrowRight,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import { addDays, format } from 'date-fns';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/listadoCoches.css';

// Componentes
import FichaCoche from './FichaCoche';
import FormBusqueda from './FormBusqueda';
import FiltroSelect from './FiltroSelect';

import backgroundHero from '../assets/img/general/audi_wallpaper.png';

import { useAlertContext } from '../context/AlertContext'; // Importar el contexto de alertas
import { validateSearchForm, saveSearchParams, searchAvailableVehicles } from '../services/searchServices';
import { fetchCarsService } from '../services/carService';

const ListadoCoches = ({ isMobile = false }) => {
  // Estados principales
  const [cars, setCars] = useState([]);
  const [totalCars, setTotalCars] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCarId, setOpenCarId] = useState(null);
  const [hasBusquedaData, setHasBusquedaData] = useState(false);
  // Contexto de alertas
  const { showSuccess, showError, showWarning } = useAlertContext();

  
  // Estado para los filtros
  const [filterValues, setFilterValues] = useState({
    marca: '',
    modelo: '',
    combustible: '',
    orden: ''
  });
  
  // Estado para las opciones de filtrado
  const [filterOptions, setFilterOptions] = useState({
    marca: [],
    modelo: [],
    combustible: [],
    orden: ["Precio ascendente", "Precio descendente", "Marca A-Z", "Marca Z-A"]
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const resultsRef = useRef(null);



  // Verificar si hay datos de búsqueda en sessionStorage al cargar
  useEffect(() => {
    const checkReservaData = () => {
      const storedData = sessionStorage.getItem('reservaData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          if (data.fechas && 
              data.fechas.pickupLocation && 
              data.fechas.pickupDate && 
              data.fechas.dropoffDate) {
            setHasBusquedaData(true);
          } else {
            setHasBusquedaData(false);
          }
        } catch (err) {
          console.error("Error parsing reservaData:", err);
          setHasBusquedaData(false);
        }
      } else {
        setHasBusquedaData(false);
      }
    };
    
    checkReservaData();
    
    // Actualizar el estado de carga según si tenemos datos de búsqueda
    if (hasBusquedaData) {
      fetchCars();
    } else {
      setLoading(false);
    }
  }, [hasBusquedaData]);

  // Función para obtener los coches usando servicios unificados
  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar si hay datos de búsqueda guardados
      const storedData = sessionStorage.getItem('reservaData');
      let useSearchService = false;
      let searchParams = null;
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          if (data.fechas && 
              data.fechas.pickupLocation && 
              data.fechas.pickupDate && 
              data.fechas.dropoffDate) {
            useSearchService = true;
            searchParams = {
              pickupLocation: data.fechas.pickupLocation,
              pickupDate: data.fechas.pickupDate,
              dropoffLocation: data.fechas.dropoffLocation,
              dropoffDate: data.fechas.dropoffDate,
              categoria_id: data.categoria_id,
              grupo_id: data.grupo_id
            };
          }
        } catch (parseError) {
          console.error('Error parsing reservaData:', parseError);
        }
      }

      let result;
      if (useSearchService && searchParams) {
        // Usar servicio de búsqueda de disponibilidad
        result = await searchAvailableVehicles(searchParams);
        setCars(result.results || []);
        setTotalCars(result.count || 0);
        
        // Aplicar filtros locales si están definidos
        if (filterValues.marca || filterValues.modelo || filterValues.combustible || filterValues.orden) {
          let filteredCars = [...(result.results || [])];
          
          if (filterValues.marca) {
            filteredCars = filteredCars.filter(car => car.marca === filterValues.marca);
          }
          if (filterValues.modelo) {
            filteredCars = filteredCars.filter(car => car.modelo === filterValues.modelo);
          }
          if (filterValues.combustible) {
            filteredCars = filteredCars.filter(car => car.combustible === filterValues.combustible);
          }
          
          // Aplicar ordenación
          if (filterValues.orden) {
            switch (filterValues.orden) {
              case 'Precio ascendente':
                filteredCars.sort((a, b) => a.precio_dia - b.precio_dia);
                break;
              case 'Precio descendente':
                filteredCars.sort((a, b) => b.precio_dia - a.precio_dia);
                break;
              case 'Marca A-Z':
                filteredCars.sort((a, b) => a.marca.localeCompare(b.marca));
                break;
              case 'Marca Z-A':
                filteredCars.sort((a, b) => b.marca.localeCompare(a.marca));
                break;
              default:
                break;
            }
          }
          setCars(filteredCars);
        }
        
        // Extraer opciones de filtro
        if (result.filterOptions) {
          setFilterOptions(prevOptions => ({
            ...prevOptions,
            ...result.filterOptions
          }));
        }
      } else {
        // Usar servicio general de coches con filtros
        result = await fetchCarsService(filterValues);
        setCars(result.cars || []);
        setTotalCars(result.total || 0);
        
        // Extraer opciones de filtro
        if (result.filterOptions) {
          setFilterOptions(prevOptions => ({
            ...prevOptions,
            ...result.filterOptions
          }));
        }
      }
    } catch (error) {
      console.error('Error al cargar los coches:', error);
      setError(error.message || 'No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.');
      setCars([]);
      setTotalCars(0);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar los coches cuando cambian los filtros
  useEffect(() => {
    if (hasBusquedaData) {
      fetchCars();
    }
  }, [filterValues, hasBusquedaData]);
  // Manejar búsqueda desde el formulario usando servicio unificado
  const handleSearch = async (dataBusqueda) => {
    // Validar los datos de búsqueda
    const { isValid, errors } = validateSearchForm({
      ...dataBusqueda,
      checkMayor21: dataBusqueda.mayor21
    });
    
    if (!isValid) {
      // Mostrar errores
      const errorMessage = Object.values(errors).join('. ');
      showError(errorMessage, { timeout: 8000 });
      return;
    }
    
    // Guardar datos en sessionStorage
    const saved = saveSearchParams(dataBusqueda);
    if (!saved) {
      showWarning('No se pudieron guardar los datos de búsqueda', { timeout: 5000 });
    }
    
    // Indicar que tenemos datos de búsqueda
    setHasBusquedaData(true);
    setLoading(true);
    
    try {
      // Usar servicio unificado de búsqueda
      const result = await searchAvailableVehicles(dataBusqueda);
      setCars(result.results || []);
      setTotalCars(result.count || 0);
      
      // Actualizar opciones de filtro
      if (result.filterOptions) {
        setFilterOptions(prevOptions => ({
          ...prevOptions,
          ...result.filterOptions
        }));
      }
      
      showSuccess('Búsqueda realizada con éxito', { timeout: 3000 });
    } catch (error) {
      showError('Error al buscar vehículos disponibles', { timeout: 7000 });
      setError(error.message || 'No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  
  // Función para manejar la apertura/cierre de la ficha
  const handleVerDetalle = (carId) => {
    const newId = openCarId === carId ? null : carId;
    setOpenCarId(newId);
  
    if (newId) {
      // Después de un pequeño delay, hacemos scroll suave hasta la ficha
      setTimeout(() => {
        const el = document.getElementsByClassName('ficha-coche-modal')[0];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

  // Formatear el precio como moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Función para mostrar la sección de búsqueda inicial
  const renderSearchSection = () => {
    return (
      <div className="search-hero-section">
        <div className="search-hero-background"></div>
        <div className="search-hero-overlay"></div>
        
        <Container className="search-hero-content">
          <Row className="justify-content-center mb-5">
            <Col lg={10} className="text-center">
              <h1 className="search-hero-title">
                Encuentra el vehículo ideal para tu viaje
              </h1>
              <p className="search-hero-subtitle">
                Descubre nuestra flota premium y disfruta de la mejor experiencia de conducción
              </p>
            </Col>
          </Row>
          
          <Row className="justify-content-center">
            <Col lg={12} xl={12} className="search-form-container">
              <div className="search-card">
                <div className="search-card-header">
                  <h4 className="mb-0">
                    <FontAwesomeIcon icon={faSearch} className="me-2" />
                    Buscar vehículos disponibles
                  </h4>
                </div>
                <div className="search-card-body">
                  <FormBusqueda 
                    onSearch={handleSearch} 
                    collapsible={false} 
                    isMobile={isMobile} 
                  />
                  
                  <div className="search-tips mt-4">
                    <h6 className="search-tips-title">
                      <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                      Consejos para tu búsqueda:
                    </h6>
                    <ul className="search-tips-list">
                      <li>
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-primary" />
                        Reserva con antelación para obtener mejores tarifas
                      </li>
                      <li>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-primary" />
                        Disponemos de oficinas en aeropuertos y centros urbanos
                      </li>
                      <li>
                        <FontAwesomeIcon icon={faCar} className="me-2 text-primary" />
                        Amplia variedad de vehículos para cada necesidad
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  };

  // Renderizar la lista de vehículos
  const renderCarsList = () => {
    return (
      <Container className="listado-coches my-4 mx-auto">
        {/* Formulario de búsqueda plegado */}
        <div className="search-section-listado mb-4">
          <FormBusqueda 
            onSearch={handleSearch} 
            collapsible={true} 
            listado={true} 
            isMobile={isMobile} 
          />
        </div>
        
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="text-dark mb-0">
                <FontAwesomeIcon icon={faCar} className="me-2" />
                Vehículos Disponibles
              </h2>
              {!loading && cars.length > 0 && (
                <div className="results-count">
                  <span className="badge bg-primary rounded-pill">
                    <FontAwesomeIcon icon={faList} className="me-1" />
                    {cars.length} de {totalCars} vehículos
                  </span>
                </div>
              )}
            </div>
            <hr className="separador" />
          </Col>
        </Row>
    
        {/* Bloque de filtros mejorado */}
        <FiltroSelect 
          filters={filterValues} 
          setFilters={setFilterValues} 
          options={filterOptions} 
        />
    
        {/* Mensajes de carga o error */}
        {loading && (
          <div className="text-center py-5">
            <div className="loader-container">
              <Spinner animation="border" variant="primary" />
            </div>
            <p className="mt-3">Buscando vehículos disponibles...</p>
          </div>
        )}
        
        {error && (
          <Alert variant="danger" className="my-4" role="alert">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
        )}
        
        {/* Mensaje "Sin resultados" */}
        {!loading && !error && cars.length === 0 && (
          <div className="text-center py-5">
            <div className="empty-results">
              <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-warning mb-3" />
              <h4>No se encontraron vehículos</h4>
              <p className="text-muted">
                No hay vehículos disponibles con los filtros seleccionados.
                <br />
                Intenta con otros criterios de búsqueda.
              </p>
              <Button 
                variant="outline-primary"
                onClick={() => setFilterValues({ marca: '', modelo: '', combustible: '', orden: '' })}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        )}
    
        {/* Listado de tarjetas */}
        <div ref={resultsRef}>
          {!loading && !error && cars.length > 0 && (() => {
            // Partir el array en grupos de 3
            const filas = [];
            for (let i = 0; i < cars.length; i += 3) {
              filas.push(cars.slice(i, i + 3));
            }
              return filas.map((grupo, rowIdx) => (
              <React.Fragment key={`row-${rowIdx}`}>
                {/* Fila de hasta 3 tarjetas */}
                <Row className="results-container mb-4">
                  {grupo.map(car => (
                    <Col key={`car-${car.id}`} md={4} sm={6} className="mb-4">
                      <Card
                        className={`car-card h-100 ${
                          openCarId === car.id ? 'selected-card' : ''
                        }`}
                      >
                        <div className="img-container">
                          <div className="fuel-tag">
                            <FontAwesomeIcon icon={faGasPump} className="me-1" />
                            {car.combustible}
                          </div>
                          <Card.Img 
                            src={car.imagenPrincipal || 'https://via.placeholder.com/300x200?text=Sin+Imagen'} 
                            alt={`${car.marca} ${car.modelo}`} 
                          />
                        </div>
                        <Card.Body className="d-flex flex-column">
                          <Card.Title className="car-card-title">{car.marca} {car.modelo}</Card.Title>
                          <div className="vehicle-badges mb-2">
                            <Badge bg="secondary" className="me-1">{car.categoria.nombre}</Badge>
                            <Badge bg="info">{car.grupo.nombre}</Badge>
                          </div>
                          <Card.Text className="car-card-description my-2">
                            {car.descripcion || 'Descripción no disponible.'}
                          </Card.Text>
                          <div className="car-features-list my-3">
                            <div className="car-feature">
                              <FontAwesomeIcon icon={faUser} className="text-primary" />
                              <span>{car.num_pasajeros} asientos</span>
                            </div>
                            <div className="car-feature">
                              <FontAwesomeIcon icon={faIdCard} className="text-primary" />
                              <span>{car.grupo.edad_minima}+ años</span>
                            </div>
                            <div className="car-feature">
                              <FontAwesomeIcon icon={faRoad} className="text-primary" />
                              <span>Ilimitado</span>
                            </div>
                          </div>
                          <div className="mt-auto">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h5 className="precio mb-0">
                                {formatCurrency(car.precio_dia)}<small>/día</small>
                              </h5>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="btn-ver-mas"
                                onClick={() => handleVerDetalle(car.id)}
                              >
                                <FontAwesomeIcon icon={openCarId === car.id ? 'angle-up' : 'angle-down'} className="me-1" />
                                {openCarId === car.id ? 'Cerrar' : 'Ver más'}
                              </Button>
                            </div>
                            <Button
                              variant="primary"
                              className="w-100 btn-reservar"
                            >
                              Reservar ahora
                              <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>                {/* Si el coche seleccionado está en este grupo, muestro la ficha justo después de la fila */}
                {grupo.some(car => car.id === openCarId) && (
                  <Row key={`ficha-${rowIdx}-${openCarId}`} className="mb-5">
                    <Col md={12}>
                      <FichaCoche
                        car={cars.find(c => c.id === openCarId)}
                        onClose={() => handleVerDetalle(openCarId)}
                      />
                    </Col>
                  </Row>
                )}
              </React.Fragment>
            ));
          })()}
        </div>
      </Container>
    );
  };

  // Renderizado principal
  return hasBusquedaData ? renderCarsList() : renderSearchSection();
};

export default ListadoCoches;