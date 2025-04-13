// src/components/ListadoCoches.js
import React, { useEffect, useState, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faSearch, faFilter, faExclamationTriangle, faList } from '@fortawesome/free-solid-svg-icons';
import { addDays, format } from 'date-fns';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/listadoCoches.css';

// Componente para el formulario de búsqueda (ya existente)
import FormBusqueda from './FormBusqueda';
// Componente para los selects de filtros y orden
import FiltroSelect from './FiltroSelect';

// Ejemplo de imágenes locales (reemplaza según corresponda o usa datos de la API)
import bmwImage from '../img/coches/BMW-320i-M-Sport.jpg';
import a3Image from '../img/coches/audi-a3-2020-660x375.jpg';

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
  
  const navigate = useNavigate();

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
      marca: 'BMW',
      modelo: '320i',
      descripcion: 'Un sedán deportivo y cómodo.',
      precio: 70,
      combustible: 'Diésel',
      imagen: bmwImage
    }
  ];

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

  const handleVerDetalle = (id) => {
    navigate(`/cars/${id}`);
  };

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

  return (
    <Container className="listado-coches my-4 w-100 mx-auto">
      
      {/* Formulario de búsqueda plegado */}
      <div className="search-section-listado">
        <FormBusqueda onSearch={handleSearch} collapsible={true} />
      </div>

      <Row className="mb-3">
        <Col>
          <h2>
            <FontAwesomeIcon icon={faCar} className="me-2" />
            Listado de Coches
          </h2>
        </Col>
      </Row>

      {/* Bloque de filtros con selects y opción de orden */}
      <FiltroSelect filters={filters} setFilters={setFilters} options={opciones} />

      {/* Mensaje de resultados */}
      <Row className="mb-3">
        <Col>
          <div className="results-info">
            {loading ? (
              <p>Cargando coches...</p>
            ) : cars.length === 0 ? (
              <p>
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                No se han encontrado coches con los filtros aplicados.
              </p>
            ) : (
              <p>
                <FontAwesomeIcon icon={faList} className="me-2" />
                Mostrando {cars.length} de {totalCars} coches encontrados.
              </p>
            )}
          </div>
        </Col>
      </Row>

      {/* Listado de tarjetas */}
      <Row className="results-container">
        {cars.map(car => (
          <Col key={car.id} md={4} sm={6} className="mb-4">
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
        ))}
      </Row>
    </Container>
  );
};

export default ListadoCoches;
