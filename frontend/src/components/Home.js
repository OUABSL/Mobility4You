// src/components/Home.js
import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Image, Carousel } from 'react-bootstrap';
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
  faCheck,
  faArrowRight,
  faPlay,
  faQuoteLeft
} from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faTwitter } from '@fortawesome/free-brands-svg-icons';
import '../css/Home.css';

import backgroundHero from '../assets/img/general/audi_wallpaper.png';
import malagaBackground from '../assets/img/general/malaga_sunset.jpg';
import logoHome from '../assets/img/general/logo_home_horizontal.png';

import FormBusqueda from './FormBusqueda';
import { fetchEstadisticas, fetchCaracteristicas, fetchTestimonios, fetchDestinos, fetchLocations } from '../services/homeServices';

const Home = ({ isMobile = false }) => {
  // States for data
  const [estadisticas, setEstadisticas] = useState([]);
  const [caracteristicas, setCaracteristicas] = useState([]);
  const [testimoniosData, setTestimoniosData] = useState([]);
  const [destinos, setDestinos] = useState([]);
  const [locations, setLocations] = useState([]);
  
  // UI states
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const caracteristicasRef = useRef(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Load data on component mount
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

  const scrollToCaracteristicas = () => {
    caracteristicasRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-modern w-100">
      {/* ===== SECTION 1: HERO WITH SEARCH FORM ===== */}
      <section className="hero-section">
        <div className="hero-background"></div>
        <div className="hero-overlay"></div>
        
        <Container className="hero-content">
          <Row className="justify-content-center mb-3">
            <Col lg={10} xl={8} className="text-center">
              <Image
                src={logoHome}
                alt="Mobility 4 You"
                className="img-fluid mb-4 hero-logo"
              />
              <h1 className="hero-title">
                Tu camino hacia el <span className="text-primary">comfort</span>
              </h1>
              <p className="hero-subtitle">
                Descubre la libertad de recorrer el mundo con la mejor flota premium
              </p>
            </Col>
          </Row>
          
          <Row className="justify-content-center">
            <Col lg={12} className="hero-search-container">
              <FormBusqueda 
                onSearch={() => {}} 
                collapsible={false} 
                isMobile={isMobile}
                locations={locations}
                isMainSection={true}
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* ===== SECTION 2: HERO PRESENTATION ===== */}
      <section className="hero-presentation-section">
        <div className="hero-background-presentation"></div>
        <div className="hero-overlay-presentation"></div>
        
        <Container className="hero-presentation-content">
          <Row className="align-items-center min-vh-75">
            <Col className="mx-auto text-center">
              <div className="hero-presentation-text">
                <h2 className="hero-presentation-title">
                  Tu viaje perfecto
                  <span className="text-primary d-block">comienza aquí</span>
                </h2>
                <Row className="align-items-center justify-content-center mt-3">
                  <Col xs={12} md={8} className="mb-3 mb-md-0">
                    <p className="hero-presentation-subtitle text-start">
                      Experimenta la excelencia en cada kilómetro con nuestra flota premium.
                      Diseñamos cada viaje pensando en tu máxima comodidad y seguridad.
                    </p>
                    <div className="hero-presentation-features d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center mb-3">
                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                        <span>Cancelación gratuita hasta 24h antes</span>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <FontAwesomeIcon icon={faCheck} className="text-success me-2" />
                        <span>Sin costes ocultos ni sorpresas</span>
                      </div>
                      <div className="d-flex align-items-center">
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

      {/* ===== SECTION 3: WHY CHOOSE US ===== */}
      <section ref={caracteristicasRef} className="features-section">
        <Container>
          <Row className="mb-3">
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
                <Card className="feature-card border-0 shadow-sm h-100">
                  <Card.Body className="text-center p-3 d-flex flex-column">
                    <div className={`feature-icon-wrapper mb-4`}>
                      <div className={`feature-icon bg-${feature.color} text-white`}>
                        <FontAwesomeIcon icon={feature.icono} size="2x" />
                      </div>
                    </div>
                    <h4 className="feature-title">{feature.titulo}</h4>
                    <p className="feature-description flex-grow-1">{feature.descripcion}</p>
                    <Button variant="link" className={`text-${feature.color} mt-auto px-0`}>
                      Saber más <FontAwesomeIcon icon={faArrowRight} className="ms-1" />
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ===== SECTION 4: TESTIMONIALS (CAROUSEL) ===== */}
      <section className="testimonials-section">
        <div className="testimonials-background"></div>
        <div className="testimonials-overlay"></div>
        
        <Container>
          <Row className="mb-5">
            <Col lg={10} className="mx-auto text-center">
              <h2 className="section-title text-white">
                Nuestros clientes opinan
              </h2>
              <p className="section-subtitle text-white">
                Miles de viajeros confían en nosotros cada día
              </p>
            </Col>
          </Row>
          
          <Row className="justify-content-center">
            <Col md={10} lg={8}>
              <Carousel 
                activeIndex={activeTestimonial}
                onSelect={(index) => setActiveTestimonial(index)}
                interval={5000}
                className="testimonial-carousel"
                indicators={true}
                controls={true}
              >
                {testimoniosData.map((testimonio, index) => (
                  <Carousel.Item key={index}>
                    <div className="testimonial-slide px-4 py-5 mx-auto">
                      <div className="testimonial-quote mb-4">
                        <FontAwesomeIcon icon={faQuoteLeft} className="testimonial-icon" />
                      </div>
                      <p className="testimonial-text mx-3">"{testimonio.comentario}"</p>
                      <div className="testimonial-author d-flex align-items-center mt-4">
                        <div className="testimonial-avatar">
                          {testimonio.avatar}
                        </div>
                        <div className="ms-3">
                          <h5 className="mb-0">{testimonio.nombre}</h5>
                          <small className="text-muted">{testimonio.ubicacion}</small>
                          <div className="testimonial-rating mt-1">
                            {[...Array(testimonio.rating)].map((_, i) => (
                              <FontAwesomeIcon key={i} icon={faStar} className="text-warning" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Carousel.Item>
                ))}
              </Carousel>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;