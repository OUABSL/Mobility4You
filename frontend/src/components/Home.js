// src/components/Home.js
import {
  faArrowRight,
  faCar,
  faCheck,
  faMapMarkerAlt,
  faPlay,
  faQuoteLeft,
  faStar,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Carousel,
  Col,
  Container,
  Image,
  Row,
} from 'react-bootstrap';
import '../css/Home.css';

import logoHome from '../assets/img/general/logo_home_horizontal.png';
import { createServiceLogger } from '../config/appConfig';

import {
  fetchCaracteristicas,
  fetchDestinos,
  fetchEstadisticas,
  fetchLocations,
  fetchTestimonios,
} from '../services/homeServices';
import ContactUs from './ContactUs';
import FormBusqueda from './FormBusqueda';

const logger = createServiceLogger('Home');

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
  const contactRef = useRef(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      // Ejecutar cada fetch independientemente para que el fallo de uno no afecte a los demás
      const results = await Promise.allSettled([
        fetchEstadisticas(),
        fetchCaracteristicas(),
        fetchTestimonios(),
        fetchDestinos(),
        fetchLocations(),
      ]);

      // Procesar resultados individuales
      const [
        statsResult,
        featuresResult,
        testimonialsResult,
        destinationsResult,
        locationsResult,
      ] = results;

      // Estadísticas
      if (statsResult.status === 'fulfilled') {
        setEstadisticas(statsResult.value);
        logger.info('✅ Stats loaded:', statsResult.value?.length);
      } else {
        logger.error('❌ Error loading stats:', statsResult.reason);
        setEstadisticas([]); // Valor por defecto
      }

      // Características
      if (featuresResult.status === 'fulfilled') {
        setCaracteristicas(featuresResult.value);
        logger.info('✅ Features loaded:', featuresResult.value?.length);
      } else {
        logger.error('❌ Error loading features:', featuresResult.reason);
        setCaracteristicas([]); // Valor por defecto
      }

      // Testimonios
      if (testimonialsResult.status === 'fulfilled') {
        setTestimoniosData(testimonialsResult.value);
        logger.info(
          '✅ Testimonials loaded:',
          testimonialsResult.value?.length,
          testimonialsResult.value,
        );
        logger.info(
          '🔄 [TESTIMONIOS 2025 : ]' + (testimonialsResult.value?.length || 0),
        );
      } else {
        logger.error(
          '❌ Error loading testimonials:',
          testimonialsResult.reason,
        );
        setTestimoniosData([]); // Valor por defecto
      }

      // Destinos
      if (destinationsResult.status === 'fulfilled') {
        setDestinos(destinationsResult.value);
        logger.info(
          '✅ Destinations loaded:',
          destinationsResult.value?.length,
        );
      } else {
        logger.error(
          '❌ Error loading destinations:',
          destinationsResult.reason,
        );
        setDestinos([]); // Valor por defecto
      }

      // Ubicaciones
      if (locationsResult.status === 'fulfilled') {
        setLocations(locationsResult.value);
        logger.info('✅ Locations loaded:', locationsResult.value?.length);
      } else {
        logger.error('❌ Error loading locations:', locationsResult.reason);
        setLocations([]); // Valor por defecto
      }

      // Log resumen final
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const failCount = results.filter((r) => r.status === 'rejected').length;
      logger.info(
        `🔄 [Home] Data loading completed: ${successCount} successful, ${failCount} failed`,
      );
    };

    loadData();
  }, []);

  const scrollToCaracteristicas = () => {
    caracteristicasRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const observerOptions = {
      threshold: 0.3,
      rootMargin: '-50px',
    };

    const contactObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    if (contactRef.current) {
      const contactCard = contactRef.current.querySelector('.contact-card');
      if (contactCard) {
        contactObserver.observe(contactCard);
      }
    }

    return () => {
      contactObserver.disconnect();
    };
  }, []);

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
                Tu ruta hacia el <span className="text-primary">comfort</span>
              </h1>
              <p className="hero-subtitle">
                Descubre la libertad de recorrer el mundo con la mejor flota
                premium
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
                      Experimenta la excelencia en cada kilómetro con nuestra
                      flota premium. Diseñamos cada viaje pensando en tu máxima
                      comodidad y seguridad.
                    </p>
                    <div className="hero-presentation-features d-flex flex-column align-items-start">
                      <div className="d-flex align-items-center mb-3">
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="text-success me-2"
                        />
                        <span>Cancelación gratuita hasta 24h antes</span>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="text-success me-2"
                        />
                        <span>Sin costes ocultos ni sorpresas</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <FontAwesomeIcon
                          icon={faCheck}
                          className="text-success me-2"
                        />
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
                ¿Por qué elegir{' '}
                <span className="text-primary">Mobility 4 You</span>?
              </h2>
              <p className="section-subtitle">
                Más que un alquiler de coches, somos tu compañero de viaje en
                cada destino
              </p>
            </Col>
          </Row>
          <Row>
            {caracteristicas.map((feature, index) => (
              <Col xs={12} md={6} lg={3} key={index} className="mb-4">
                <Card className="feature-card border-0 shadow-sm h-100">
                  <Card.Body className="text-center p-3 d-flex flex-column">
                    <div className={`feature-icon-wrapper mb-4`}>
                      <div
                        className={`feature-icon bg-${feature.color} text-white`}
                      >
                        <FontAwesomeIcon icon={feature.icono} size="2x" />
                      </div>
                    </div>
                    <h4 className="feature-title">{feature.titulo}</h4>
                    <p className="feature-description flex-grow-1">
                      {feature.descripcion}
                    </p>
                    <Button
                      variant="link"
                      className={`text-${feature.color} mt-auto px-0`}
                    >
                      Saber más{' '}
                      <FontAwesomeIcon icon={faArrowRight} className="ms-1" />
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
              {' '}
              <Carousel
                activeIndex={activeTestimonial}
                onSelect={(index) => setActiveTestimonial(index)}
                interval={5000}
                className="testimonial-carousel"
                indicators={true}
                controls={true}
              >
                {testimoniosData && testimoniosData.length > 0 ? (
                  testimoniosData.map((testimonio, index) => (
                    <Carousel.Item key={testimonio.id || index}>
                      <div className="testimonial-slide px-4 py-5 mx-auto">
                        <div className="testimonial-quote mb-4">
                          <FontAwesomeIcon
                            icon={faQuoteLeft}
                            className="testimonial-icon"
                          />
                        </div>
                        <p className="testimonial-text mx-3">
                          "{testimonio.comentario}"
                        </p>
                        <div className="testimonial-author d-flex align-items-center mt-4">
                          {testimonio.avatar && (
                            <div className="testimonial-avatar">
                              {testimonio.avatar}
                            </div>
                          )}
                          <div className="ms-3">
                            <h5 className="mb-0">{testimonio.nombre}</h5>
                            <small className="text-muted">
                              {testimonio.ubicacion}
                            </small>
                            <div className="testimonial-rating mt-1">
                              {[...Array(testimonio.rating)].map((_, i) => (
                                <FontAwesomeIcon
                                  key={i}
                                  icon={faStar}
                                  className="text-warning"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Carousel.Item>
                  ))
                ) : (
                  <Carousel.Item>
                    <div className="testimonial-slide px-4 py-5 mx-auto">
                      <div className="testimonial-quote mb-4">
                        <FontAwesomeIcon
                          icon={faQuoteLeft}
                          className="testimonial-icon"
                        />
                      </div>
                      <p className="testimonial-text mx-3">
                        "Cargando testimonios..."
                      </p>
                      <div className="testimonial-author d-flex align-items-center mt-4">
                        <div className="ms-3">
                          <h5 className="mb-0">Testimonios</h5>
                          <small className="text-muted">Próximamente</small>
                        </div>
                      </div>
                    </div>
                  </Carousel.Item>
                )}
              </Carousel>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Sección de contacto */}
      <section ref={contactRef} className="contact-home">
        {/* Elementos flotantes decorativos */}
        <div className="floating-element"></div>
        <div className="floating-element"></div>
        <div className="floating-element"></div>

        <Container>
          <Row className="mb-4">
            <Col className="text-center">
              <h2 className="section-title">
                ¿Tienes alguna <span className="text-primary">pregunta</span>?
              </h2>
              <p className="section-subtitle">
                Estamos aquí para ayudarte en cada paso de tu viaje
              </p>
            </Col>
          </Row>
        </Container>

        <ContactUs />
      </section>

      {/* ===== SECTION: HOW TO RENT STEPS ===== */}
      <section className="how-to-rent-section">
        <Container>
          <Row className="mb-5">
            <Col lg={10} className="mx-auto text-center">
              <div className="divider-container mb-4">
                <span className="divider-line"></span>
                <span className="divider-text">
                  ¿CÓMO ALQUILAR CON MOBILITY 4 YOU?
                </span>
                <span className="divider-line"></span>
              </div>
              <h2 className="section-title">
                <span className="lead-text">Pasos sencillos para</span>
                <span className="highlight-text d-block">
                  ¡Alquilar un coche!
                </span>
              </h2>
            </Col>
          </Row>

          <Row className="steps-container">
            <Col xs={12} sm={6} lg={3} className="mb-4">
              <Card className="step-card h-100">
                <Card.Body className="text-center p-4">
                  <div className="step-icon-wrapper mb-4">
                    <div className="step-number">1</div>
                    <div className="step-icon bg-primary">
                      <FontAwesomeIcon icon={faMapMarkerAlt} size="2x" />
                    </div>
                  </div>
                  <h4 className="step-title">Fecha y Ubicación</h4>
                  <p className="step-description">
                    Elige la ubicación y las fechas que necesitas para tu
                    alquiler.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3} className="mb-4">
              <Card className="step-card h-100">
                <Card.Body className="text-center p-4">
                  <div className="step-icon-wrapper mb-4">
                    <div className="step-number">2</div>
                    <div className="step-icon bg-success">
                      <FontAwesomeIcon icon={faCar} size="2x" />
                    </div>
                  </div>
                  <h4 className="step-title">Elige tu Vehículo</h4>
                  <p className="step-description">
                    Selecciona el vehículo perfecto de nuestro catálogo premium.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3} className="mb-4">
              <Card className="step-card h-100">
                <Card.Body className="text-center p-4">
                  <div className="step-icon-wrapper mb-4">
                    <div className="step-number">3</div>
                    <div className="step-icon bg-warning">
                      <FontAwesomeIcon icon={faUsers} size="2x" />
                    </div>
                  </div>
                  <h4 className="step-title">Haz tu Reserva</h4>
                  <p className="step-description">
                    Completa tus datos y detalles de la reserva de forma segura.
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3} className="mb-4">
              <Card className="step-card h-100">
                <Card.Body className="text-center p-4">
                  <div className="step-icon-wrapper mb-4">
                    <div className="step-number">4</div>
                    <div className="step-icon bg-info">
                      <FontAwesomeIcon icon={faCheck} size="2x" />
                    </div>
                  </div>
                  <h4 className="step-title">¡Disfruta tu Viaje!</h4>
                  <p className="step-description">
                    Recoge tu vehículo y disfruta de nuestro excelente servicio.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-5">
            <Col className="text-center">
              <Button
                size="lg"
                className="btn-cta"
                onClick={scrollToCaracteristicas}
              >
                Comenzar ahora
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
