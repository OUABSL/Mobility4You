import React, { useState, useRef, useEffect } from 'react';
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
import FormBusqueda from './FormBusqueda'; // Asegúrate de que la ruta sea correcta

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


const Home = ({isMobile=false}) => {
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

  // Estados para manejar visualización de elementos
  const [sameLocation, setSameLocation] = useState(true);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);

  const [mayor21, setMayor21] = useState(false);


  // Función para manejar el cambio en el campo de ubicación
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

  // Refs para detectar clics externos en las sugerencias
  const pickupRef = useRef(null);
  const dropoffRef = useRef(null);

  useEffect(() => {
    // Función para manejar clics fuera de las sugerencias
    const handleClickOutside = (event) => {
      // Si existe el ref y el click ocurrió fuera de él, se cierra
      if (pickupRef.current && !pickupRef.current.contains(event.target)) {
        setPickupSuggestions([]);
      }
      if (dropoffRef.current && !dropoffRef.current.contains(event.target)) {
        setDropoffSuggestions([]);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  

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
        mayor21
        
      });
      setCars(response.data);
    } catch (error) {
      console.error('Error fetching cars:', error);
    }
  };

  return (
    <div className="home w-100">
      {/* Sección de búsqueda */}
      <div className="search-section d-flex flex-column align-items-center justify-content-center text-light">
        <FormBusqueda onSearch={handleSearch} collapsible={false} isMobile={isMobile} />
      </div>
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
