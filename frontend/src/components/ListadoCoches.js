// src/components/ListadoCoches.js
import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faSearch, 
  faFilter, 
  faExclamationTriangle, 
  faList,
  faSortAmountDown,
  faSortAmountUp,
  faIdCard,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { addDays, format } from 'date-fns';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import '../css/listadoCoches.css';

// Componente de ficha
import FichaCoche from './FichaCoche';

// Componente para el formulario de búsqueda
import FormBusqueda from './FormBusqueda';

// Componente para los filtros
import FiltroSelect from './FiltroSelect';

// Ejemplo de imágenes locales
import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';
import a3Image from '../assets/img/coches/audi-a3-2020-660x375.jpg';

const ListadoCoches = ({ isMobile = false }) => {
  // Estados principales
  const [cars, setCars] = useState([]);
  const [totalCars, setTotalCars] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  // Estado para el ID del coche con ficha abierta
  const [openCarId, setOpenCarId] = useState(null);
  
  // Estado para los filtros
  const [filterValues, setFilterValues] = useState({
    marca: '',
    modelo: '',
    combustible: '',
    orden: '' // Opciones de orden
  });
  
  // Estado para las opciones de filtrado dinámicas
  const [filterOptions, setFilterOptions] = useState({
    marca: [],
    modelo: [],
    combustible: [],
    orden: ["Precio ascendente", "Precio descendente", "Marca A-Z", "Marca Z-A"]
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const resultsRef = useRef(null);

  // Datos de prueba adaptados al nuevo esquema
  const testingCars = [
    {
      id: 1,
      categoria_id: 1,
      grupo_id: 1,
      combustible: 'Gasolina',
      marca: 'Audi',
      modelo: 'A3',
      matricula: 'ABC1234',
      anio: 2023,
      color: 'Blanco',
      num_puertas: 5,
      num_pasajeros: 5,
      capacidad_maletero: 380,
      disponible: 1,
      activo: 1,
      fianza: 100,
      kilometraje: 2500,
      descripcion: 'Un coche compacto y elegante.',
      precio_dia: 12,
      categoria: {
        id: 1,
        nombre: 'Compacto Premium'
      },
      grupo: {
        id: 1,
        nombre: 'Segmento C',
        edad_minima: 21
      },
      imagenPrincipal: a3Image,
      imagenes: [
        { id: 1, vehiculo_id: 1, url: a3Image, portada: 1 }
      ]
    },
    {
      id: 7,
      categoria_id: 2,
      grupo_id: 3,
      combustible: 'Diésel',
      marca: 'BMW',
      modelo: '320i',
      matricula: 'XYZ5678',
      anio: 2024,
      color: 'Negro',
      num_puertas: 4,
      num_pasajeros: 5,
      capacidad_maletero: 480,
      disponible: 1,
      activo: 1,
      fianza: 400,
      kilometraje: 1200,
      descripcion: 'Un sedán deportivo y cómodo.',
      precio_dia: 70,
      categoria: {
        id: 2,
        nombre: 'Berlina Premium'
      },
      grupo: {
        id: 3,
        nombre: 'Segmento D',
        edad_minima: 23
      },
      imagenPrincipal: bmwImage,
      imagenes: [
        { id: 2, vehiculo_id: 7, url: bmwImage, portada: 1 }
      ]
    },
    {
      id: 2,
      categoria_id: 1,
      grupo_id: 1,
      combustible: 'Híbrido',
      marca: 'Toyota',
      modelo: 'Corolla',
      matricula: 'TYT1234',
      anio: 2023,
      color: 'Gris',
      num_puertas: 5,
      num_pasajeros: 5,
      capacidad_maletero: 420,
      disponible: 1,
      activo: 1,
      fianza: 300,
      kilometraje: 3500,
      descripcion: 'Eficiente y confortable con tecnología híbrida.',
      precio_dia: 55,
      categoria: {
        id: 1,
        nombre: 'Compacto Premium'
      },
      grupo: {
        id: 1,
        nombre: 'Segmento C',
        edad_minima: 21
      },
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 3, vehiculo_id: 2, url: a3Image, portada: 1 }
      ]
    },
    {
      id: 3,
      categoria_id: 3,
      grupo_id: 4,
      combustible: 'Eléctrico',
      marca: 'Tesla',
      modelo: 'Model 3',
      matricula: 'TSL789',
      anio: 2024,
      color: 'Azul',
      num_puertas: 4,
      num_pasajeros: 5,
      capacidad_maletero: 425,
      disponible: 1,
      activo: 1,
      fianza: 600,
      kilometraje: 500,
      descripcion: 'Vehículo eléctrico con gran autonomía y prestaciones.',
      precio_dia: 85,
      categoria: {
        id: 3,
        nombre: 'Eléctrico Premium'
      },
      grupo: {
        id: 4,
        nombre: 'Segmento D+',
        edad_minima: 25
      },
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 4, vehiculo_id: 3, url: a3Image, portada: 1 }
      ]
    },
    {
      id: 4,
      categoria_id: 4,
      grupo_id: 5,
      combustible: 'Gasolina',
      marca: 'Mercedes',
      modelo: 'Clase C',
      matricula: 'MRC567',
      anio: 2023,
      color: 'Plata',
      num_puertas: 4,
      num_pasajeros: 5,
      capacidad_maletero: 455,
      disponible: 1,
      activo: 1,
      fianza: 500,
      kilometraje: 2800,
      descripcion: 'Elegancia y tecnología de vanguardia.',
      precio_dia: 75,
      categoria: {
        id: 4,
        nombre: 'Berlina Premium'
      },
      grupo: {
        id: 5,
        nombre: 'Segmento E',
        edad_minima: 25
      },
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 5, vehiculo_id: 4, url: a3Image, portada: 1 }
      ]
    },
    {
      id: 5,
      categoria_id: 5,
      grupo_id: 2,
      combustible: 'Diésel',
      marca: 'Volkswagen',
      modelo: 'Golf',
      matricula: 'VWG123',
      anio: 2022,
      color: 'Rojo',
      num_puertas: 5,
      num_pasajeros: 5,
      capacidad_maletero: 380,
      disponible: 1,
      activo: 1,
      fianza: 300,
      kilometraje: 8500,
      descripcion: 'El icónico compacto alemán, versátil y dinámico.',
      precio_dia: 45,
      categoria: {
        id: 5,
        nombre: 'Compacto'
      },
      grupo: {
        id: 2,
        nombre: 'Segmento C',
        edad_minima: 21
      },
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 6, vehiculo_id: 5, url: a3Image, portada: 1 }
      ]
    }
  ];

  // Función para extraer opciones únicas de los coches
  const extractFilterOptions = (carsData) => {
    const marcas = [...new Set(carsData.map(car => car.marca))].sort();
    const modelos = [...new Set(carsData.map(car => car.modelo))].sort();
    const combustibles = [...new Set(carsData.map(car => car.combustible))].sort();
    
    setFilterOptions({
      ...filterOptions,
      marca: marcas,
      modelo: modelos,
      combustible: combustibles
    });
  };

  // Función para obtener los coches (modo testing o llamando a la API)
  const fetchCars = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      // En modo testing o desarrollo
      if (urlParams.get('testing') === 'on' || process.env.NODE_ENV === 'development') {
        let filteredCars = [...testingCars];
        
        // Aplicar filtros
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
        setTotalCars(testingCars.length);
        
        // Extraer las opciones para los filtros si no están cargadas
        if (filterOptions.marca.length === 0) {
          extractFilterOptions(testingCars);
        }
      } else {
        // Llamada a la API real
        const response = await axios.get('/api/cars', { params: filterValues });
        setCars(response.data.cars);
        setTotalCars(response.data.total);
        
        // Extraer opciones de filtro de los datos recibidos
        extractFilterOptions(response.data.cars);
      }
    } catch (error) {
      console.error('Error al cargar los coches:', error);
      setError('No se pudieron cargar los vehículos. Por favor, inténtalo de nuevo más tarde.');
      setCars([]);
      setTotalCars(0);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar los coches cuando cambian los filtros
  useEffect(() => {
    fetchCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues]);

  // Opción para realizar búsqueda desde el formulario superior (FormBusqueda)
  const handleSearch = async (dataBusqueda) => {
    setLoading(true);
    
    try {
      // En modo desarrollo, simulamos la búsqueda
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          setCars(testingCars);
          setTotalCars(testingCars.length);
          extractFilterOptions(testingCars);
          setLoading(false);
        }, 500);
      } else {
        // Llamada real a la API
        const response = await axios.post('/api/search', dataBusqueda);
        setCars(response.data);
        setTotalCars(response.data.length);
        extractFilterOptions(response.data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      setError('No se pudo realizar la búsqueda. Por favor, inténtalo de nuevo.');
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
        const el = document.getElementsByClassName(`ficha-coche-modal`)[0];
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

  return (
    <Container className="listado-coches my-4 mx-auto">
      {/* Formulario de búsqueda plegado */}
      <div className="search-section-listado d-flex justify-content-center align-items-center mb-4">
        <FormBusqueda onSearch={handleSearch} collapsible={true} listado={true} isMobile={isMobile} />
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
  
      {/* Bloque de filtros con selects y opción de orden */}
      <FiltroSelect 
        filters={filterValues} 
        setFilters={setFilterValues} 
        options={filterOptions} 
      />
  
      {/* Mensajes de carga o error */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Buscando vehículos disponibles...</p>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger" role="alert">
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
          {error}
        </div>
      )}
      
      {/* Mensaje "Sin resultados" */}
      {!loading && !error && cars.length === 0 && (
        <div className="text-center py-5">
          <div className="mb-4">
            <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-warning" />
          </div>
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
            <React.Fragment key={rowIdx}>
              {/* Fila de hasta 3 tarjetas */}
              <Row className="results-container mb-4">
                {grupo.map(car => (
                  <Col key={car.id} md={4} sm={6} className="mb-4">
                    <Card
                      className={`car-card h-100 text-center ${
                        openCarId === car.id ? 'selected-card' : ''
                      }`}
                    >
                      <div className="img-container">
                        <div className="fuel-tag">{car.combustible}</div>
                        <Card.Img src={car.imagenPrincipal} alt={`${car.marca} ${car.modelo}`} />
                      </div>
                      <Card.Body className="d-flex flex-column">
                        <Card.Title>{car.marca} {car.modelo}</Card.Title>
                        <div className="vehicle-badges mb-2">
                          <Badge bg="secondary" className="me-1">{car.categoria.nombre}</Badge>
                          <Badge bg="info">{car.grupo.nombre}</Badge>
                        </div>
                        <Card.Text className="my-2 text-start">
                          {car.descripcion || 'Descripción no disponible.'}
                        </Card.Text>
                        <div className="d-flex justify-content-between align-items-center mt-auto mb-2">
                          <span className="car-features text-muted">
                            <FontAwesomeIcon icon={faUser} className="me-1" />
                            {car.num_pasajeros}
                            <span className="ms-2 me-2">|</span>
                            <FontAwesomeIcon icon={faIdCard} className="me-1" />
                            {car.grupo.edad_minima}+
                          </span>
                          <h5 className="precio mb-0">
                            {formatCurrency(car.precio_dia)}<small>/día</small>
                          </h5>
                        </div>
                        <Button
                          variant="outline-primary"
                          className="w-100 mt-2"
                          onClick={() => handleVerDetalle(car.id)}
                        >
                          <FontAwesomeIcon icon={faSearch} className="me-1" />
                          {openCarId === car.id ? 'Ocultar detalles' : 'Ver detalles'}
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Si el coche seleccionado está en este grupo, muestro la ficha justo después de la fila */}
              {grupo.some(car => car.id === openCarId) && (
                <Row className="mb-5">
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

export default ListadoCoches;