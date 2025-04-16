// src/components/ListadoCoches.js
import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faSearch, faFilter, faExclamationTriangle, faList } from '@fortawesome/free-solid-svg-icons';
import { addDays, format } from 'date-fns';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/listadoCoches.css';
// NUEVO BLOQUE: Importar el componente de ficha
import FichaCoche from './FichaCoche';




// Componente para el formulario de búsqueda (ya existente)
import FormBusqueda from './FormBusqueda';
// Componente para los selects de filtros y orden
import FiltroSelect from './FiltroSelect';

// Ejemplo de imágenes locales (reemplaza según corresponda o usa datos de la API)
import bmwImage from '../img/coches/BMW-320i-M-Sport.jpg';
import a3Image from '../img/coches/audi-a3-2020-660x375.jpg';

  // Datos de prueba (modo testing)
  const testingCars = [
    {
      id: 1,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 2,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 3,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 4,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 5,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 6,
      marca: 'Audi',
      modelo: 'A3',
      descripcion: 'Un coche compacto y elegante.',
      precio: 10,
      combustible: 'Gasolina',
      imagen: a3Image
    },
    {
      id: 7,
      marca: 'BMW',
      modelo: '320i',
      descripcion: 'Un sedán deportivo y cómodo.',
      precio: 70,
      combustible: 'Diésel',
      imagen: bmwImage
    }
  ];


const ListadoCoches = () => {
  const [cars, setCars] = useState([]);
  const [totalCars, setTotalCars] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Definición de filtros (agregamos el campo "orden")
  const [filters, setFilters] = useState({
    marca: '',
    modelo: '',
    combustible: '',
    orden: '' // Opciones de orden (por ejemplo, Precio ascendente, Descendente, etc.)
  });

  // NUEVO BLOQUE: Definir estado para el ID del coche con ficha abierta
  const [openCarId, setOpenCarId] = useState(null);
  
  const navigate = useNavigate();


  // Función para obtener los coches (modo testing o llamando a la API)
  const fetchCars = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('testing') === 'on') {
        setCars(testingCars);
        setTotalCars(testingCars.length);
      } else {
        const response = await axios.get('/api/cars', { params: filters });
        setCars(response.data.cars);
        setTotalCars(response.data.total);
      }
    } catch (error) {
      console.error('Error al cargar los coches:', error);
      setCars([]);
      setTotalCars(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);


  // Opción para realizar búsqueda desde el formulario superior (FormBusqueda)
  const handleSearch = async (dataBusqueda) => {
    // dataBusqueda debe contener pickupLocation, dropoffLocation, fechas y horas
    try {
      const response = await axios.post('/api/search', dataBusqueda);
      setCars(response.data);
    } catch (error) {
      console.error('Error en la búsqueda:', error);
    }
  };

  // Opciones disponibles para los selects, según la base de datos  
  const opciones = {
    marca: ["Audi", "BMW", "Mercedes", "VW", "Porsche"],
    modelo: ["A3", "320i", "C-Class", "Golf", "911"],
    combustible: ["Hybrid", "Eléctrico", "Gasolina", "Diésel"],
    orden: ["Precio ascendente", "Precio descendente", "Marca A-Z", "Marca Z-A"]
  };


  // NUEVO BLOQUE: Función para manejar la apertura/cierre de la ficha
  const handleVerDetalle = (carId) => {
    setOpenCarId(prevId => prevId === carId ? null : carId);
  };

  return (
    <Container className="listado-coches my-4 w-100 mx-auto">
      {/* Formulario de búsqueda plegado */}
      <div className="search-section-listado d-flex justify-content-center align-items-center mb-2">
        <FormBusqueda onSearch={handleSearch} collapsible={true} listado={true} />
      </div>
      <Row className="mb-3">
        <Col>
          <h2 className="text-dark">
            <FontAwesomeIcon icon={faCar} className="me-2" />
            Nuestros Vehículos Disponibles Para Ti
          </h2>
        </Col>
        <hr className="separador" />
      </Row>
  
      {/* Bloque de filtros con selects y opción de orden */}
      <FiltroSelect filters={filters} setFilters={setFilters} options={opciones} />
  
      {/* Mensaje de resultados */}
      <Row className="mb-3">
        <Col>
          <div className="results-info">
            {loading ? (
              <p className="text-center">Cargando vehículos...</p>
            ) : cars.length > 0 && (
              <p className="text-muted text-end">
                <FontAwesomeIcon icon={faList} className="me-2" />
                {cars.length} de {totalCars} Vehículos.
              </p>
            )}
          </div>
        </Col>
      </Row>
  
      {/* Listado de tarjetas */}
      <Row className="results-container">
        {loading ? null : cars.length === 0 ? (
          <Col>
            <p className="text-center text-danger">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              No se han encontrado coches con los filtros aplicados.
            </p>
          </Col>
        ) : (
          cars.map(car => (
            <React.Fragment key={car.id}>
              <Col md={4} sm={6} className="mb-4">
                <Card className="car-card h-100 text-center">
                  {car.imagen ? (
                    <div className="img-container">
                      <div className="fuel-tag">{car.combustible}</div>
                      <Card.Img src={car.imagen} alt={`${car.marca} ${car.modelo}`} />
                    </div>
                  ) : (
                    <div className="card-placeholder">
                      <FontAwesomeIcon icon={faCar} size="4x" />
                    </div>
                  )}
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{car.marca} {car.modelo}</Card.Title>
                    <Card.Text className="my-2">
                      {car.descripcion ? car.descripcion : 'Descripción no disponible.'}
                    </Card.Text>
                    <p className="precio text-bold">Desde {car.precio}€ / día</p>
                    <Button
                      variant="outline-primary"
                      className="w-100 mt-auto"
                      onClick={() => handleVerDetalle(car.id)}
                    >
                      <FontAwesomeIcon icon={faSearch} className="me-1" />
                      Ver Detalle
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
              {openCarId === car.id && (
                <Col md={12}>
                  <FichaCoche car={car} onClose={() => setOpenCarId(null)} />
                </Col>
              )}
            </React.Fragment>
          ))
        )}
      </Row>
    </Container>
  );  
};

export default ListadoCoches;
