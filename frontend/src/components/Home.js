import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Button, Badge, Image} from 'react-bootstrap';
import { DateRange } from 'react-date-range';
import { addDays, addYears, format, set } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGlobe, 
  faCar, 
  faStar, 
  faShieldAlt,
  faMapMarkerAlt,
  faUsers,
  faHeadset,
  faLeaf,
  faClock,
  faAward,
  faMedal,
  faQuoteLeft,
  faCheck,
  faArrowRight,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTwitter, faGoogle } from '@fortawesome/free-brands-svg-icons';
import 'react-date-range/dist/styles.css'; // Estilos básicos
import 'react-date-range/dist/theme/default.css'; // Tema por defecto
import '../css/Home.css';

import logoHome from '../assets/img/general/logo_home_horizontal.png';


import FormBusqueda from './FormBusqueda';
import { fetchEstadisticas, fetchCaracteristicas, fetchTestimonios, fetchDestinos, fetchLocations } from '../services/homeServices';

const availableTimes = ["11:00", "11:30", "12:00", "13:30"];


const Home = ({isMobile=false}) => {
  // Estados para ubicación y búsqueda
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [showDropoffLocation, setShowDropoffLocation] = useState(false);
  const [cars, setCars] = useState([]);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  
  // Estados para fechas y horas
  const [pickupDate, setPickupDate] = useState(new Date());
  const [dropoffDate, setDropoffDate] = useState(addDays(new Date(), 1));
  const [pickupTime, setPickupTime] = useState(availableTimes[0]);
  const [dropoffTime, setDropoffTime] = useState(availableTimes[0]);


  const [mayor21, setMayor21] = useState(false);

  // Estados para datos dinámicos
  const [estadisticas, setEstadisticas] = useState([]);
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [testimoniosData, setTestimoniosData] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [locations, setLocations] = useState([]);

  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const caracteristicasRef = useRef(null);



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



   // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, featuresData, testimonialsData, destinationsData, locationsData] = await Promise.all([
          fetchEstadisticas(),
          fetchCaracteristicas(), 
          fetchTestimonios(),
          fetchDestinos(),
          fetchLocations()
        ]);
        
        setEstadisticas(statsData);
        setCaracteristicas(featuresData);
        setTestimoniosData(testimonialsData);
        setDestinos(destinationsData);
        setLocations(locationsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
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

    const scrollToCaracteristicas = () => {
    caracteristicasRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

return (
    <div className="home-modern w-100">
      {/* Search Section - Nueva sección independiente */}
      <section className="search-main-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={12} xl={12}>
              <div className="search-main-container">
                {/* <div className="search-intro text-center my-4">
                  <Image
                    src={logoHome}
                    alt="Mobility 4 You"
                    className="img-fluid mb-3"
                    style={{ maxWidth: '500' }}
                  />
                  <h1 className="search-main-title">
                    Tu camino hacia el comfort
                  </h1>
                </div> */}
                <Card className="search-main-card shadow border-0">
                  <Card.Body className="p-4">
                    <FormBusqueda 
                      onSearch={handleSearch} 
                      collapsible={false} 
                      isMobile={isMobile}
                      locations={locations}
                      isMainSection={true}
                    />
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Hero Presentation Section */}
      <section className="hero-presentation-section mt-4">
        <div className="hero-background-presentation"></div>
        <div className="hero-overlay-presentation"></div>
        
        <Container className="hero-presentation-content mb-4">
          <Row className="align-items-center min-vh-75">
            <Col className="mx-auto text-center">
              <div className="hero-presentation-text">
                <h2 className="hero-presentation-title">
                  Tu viaje perfecto
                  <span className="text-primary d-block">comienza aquí</span>
                </h2>
                <Row className="align-items-center justify-content-center mt-4">
                  <Col xs={12} md={8} className="mb-3 mb-md-0">
                    <p className="hero-presentation-subtitle text-start">
                      Descubre el mundo con la libertad de un coche premium. 
                      Experimenta la excelencia en cada kilómetro.
                    </p>
                    <div className="hero-presentation-features d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center justify-content-center mb-3">
                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                        <span>Cancelación gratuita hasta 24h antes</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-center mb-3">
                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                        <span>Sin costes ocultos ni sorpresas</span>
                      </div>
                      <div className="d-flex align-items-center justify-content-center">
                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                        <span>Protección All Inclusive disponible</span>
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} md={4} className="mb-3 mb-md-0">
                    <div className="hero-presentation-cta">
                      <Button 
                        size="lg" 
                        className="btn-cta"
                        onClick={scrollToCaracteristicas}
                      >
                        Explorar vehículos
                        <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        size="lg"
                        className="btn-video mt-3"
                        onClick={() => setVideoModalOpen(true)}
                      >
                        <FontAwesomeIcon icon={faPlay} className="me-2" />
                        Ver cómo funciona
                      </Button>
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Características principales */}
      <section ref={caracteristicasRef} className="features-section">
        <Container>
          <Row className="mb-5">
            <Col lg={10} className="mx-auto text-center">
              <h2 className="section-title">
                ¿Por qué elegir <span className="text-primary">Mobility 4 You</span>?
              </h2>
              <p className="section-subtitle">
                Más que un alquiler de coches, somos tu compañero de viaje en cada destino
              </p>
            </Col>
          </Row>
          <Row>
            {caracteristicas.map((feature, index) => (
              <Col xs={12} md={6} lg={3} key={index} className="mb-4">
                <Card className="feature-card border-0 shadow-sm">
                  <Card.Body className="text-center p-4">
                    <div className={`feature-icon bg-${feature.color} text-white`}>
                      <FontAwesomeIcon icon={feature.icono} size="2x" />
                    </div>
                    <h4 className="feature-title">{feature.titulo}</h4>
                    <p className="feature-description">{feature.descripcion}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Testimonios */}
      <section className="testimonials-section">
        <Container>
          <Row className="mb-5">
            <Col lg={10} className="mx-auto text-center">
              <h2 className="section-title">
                Nuestros clientes opinan
              </h2>
              <p className="section-subtitle">
                Miles de viajeros confían en nosotros cada día
              </p>
            </Col>
          </Row>
          <Row>
            {testimoniosData.map((testimonio) => (
              <Col xs={12} md={6} lg={4} key={testimonio.id} className="mb-4">
                <Card className="testimonial-card border-0 shadow-sm">
                  <Card.Body className="p-4 d-flex flex-column">
                    <div className="testimonial-quote mb-3">
                      <FontAwesomeIcon icon={faQuoteLeft} className="text-primary opacity-50" size="2x" />
                    </div>
                    <p className="testimonial-text">"{testimonio.comentario}"</p>
                    <div className="testimonial-author d-flex align-items-center mt-auto">
                      <div className="avatar me-3">
                        {testimonio.avatar}
                      </div>
                      <div>
                        <h6 className="author-name mb-0">{testimonio.nombre}</h6>
                        <small className="author-location">{testimonio.ubicacion}</small>
                        <div className="rating mt-1">
                          {[...Array(testimonio.rating)].map((_, i) => (
                            <FontAwesomeIcon key={i} icon={faStar} className="text-warning" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <Container>
          <Row className="align-items-center text-center text-lg-start">
            <Col lg={8}>
              <h2 className="cta-title">
                ¿Listo para tu próxima aventura?
              </h2>
              <p className="cta-subtitle">
                Únete a más de 2 millones de viajeros que han elegido Mobility 4 You 
                para descubrir el mundo con total libertad.
              </p>
            </Col>
            <Col lg={4} className="text-center">
              <Button 
                size="lg" 
                className="btn-cta-secondary"
                href="/coches"
              >
                Buscar vehículo ahora
                <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
              </Button>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;