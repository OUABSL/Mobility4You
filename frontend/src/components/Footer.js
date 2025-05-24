// src/components/Footer.js
import React from 'react';
import { Container, Row, Col, Nav, Button, InputGroup, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faInstagram,
  faTwitter,
  faYoutube,
  faLinkedinIn
} from '@fortawesome/free-brands-svg-icons';
import {
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faCar,
  faTruck,
  faShieldAlt,
  faInfoCircle,
  faFileAlt,
  faCookieBite,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import '../css/Footer.css';
import logoFooter from '../assets/img/general/logo_home_horizontal.png';

const AppFooter = () => (
  <footer className="site-footer mt-auto">
    <div className="footer-top">
      <Container>
        <Row className="py-5">
          <Col lg={3} md={6} sm={12} className="mb-4 mb-lg-0 d-flex flex-column align-items-center justify-content-center ">
            <div className="text-start footer-brand mb-4">
              <img 
                src={logoFooter} 
                alt="Mobility 4 You" 
                className="footer-logo mb-3" 
                style={{ 
                  maxWidth: '200px',
                  filter: 'brightness(0) invert(1)'
                }}
              />
              <p className="footer-text">
                Tu camino hacia el confort.
              </p>
            </div>
            
            <div className="social-icons d-flex">
              <a href="#" className="social-icon" aria-label="Facebook">
                <FontAwesomeIcon icon={faFacebookF} />
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                <FontAwesomeIcon icon={faInstagram} />
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              <a href="#" className="social-icon" aria-label="YouTube">
                <FontAwesomeIcon icon={faYoutube} />
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <FontAwesomeIcon icon={faLinkedinIn} />
              </a>
            </div>
          </Col>

          <Col lg={3} md={6} sm={6} className="mb-4 mb-lg-0">
            <h6 className="footer-heading">Nuestra Flota</h6>
            <Nav className="flex-column footer-nav">
              <Nav.Link href="/coches">
                <FontAwesomeIcon icon={faCar} className="me-2" />
                Coches
              </Nav.Link>
              <Nav.Link href="/furgonetas">
                <FontAwesomeIcon icon={faTruck} className="me-2" />
                Furgonetas
              </Nav.Link>
              <Nav.Link href="/promociones">
                <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                Protección All-Inclusive
              </Nav.Link>
              <Nav.Link href="/seguro">
                <FontAwesomeIcon icon={faShieldAlt} className="me-2" />
                Protección Economy
              </Nav.Link>
            </Nav>
          </Col>

          <Col lg={3} md={6} sm={6} className="mb-4 mb-lg-0">
            <h6 className="footer-heading">Enlaces Rápidos</h6>
            <Nav className="flex-column footer-nav">
              <Nav.Link href="/info-rental">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                Información de Alquiler
              </Nav.Link>
              <Nav.Link href="/terminos">
                <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                Términos y Condiciones
              </Nav.Link>
              <Nav.Link href="/privacidad">
                <FontAwesomeIcon icon={faFileAlt} className="me-2" />
                Política de Privacidad
              </Nav.Link>
              <Nav.Link href="/cookies">
                <FontAwesomeIcon icon={faCookieBite} className="me-2" />
                Gestión de Cookies
              </Nav.Link>
            </Nav>
          </Col>

          <Col lg={3} md={6} sm={12}>
            <h6 className="footer-heading">Contáctanos</h6>
            <ul className="footer-contact">
              <li>
                <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-icon" />
                <div>
                  <span>Av. Principal 123</span>
                  <span>29001 Málaga, España</span>
                </div>
              </li>
              <li>
                <FontAwesomeIcon icon={faPhone} className="contact-icon" />
                <div>
                  <a href="tel:+34951234567">+34 951 23 45 67</a>
                  <span className="contact-time">Lun-Vie: 9am - 6pm</span>
                </div>
              </li>
              <li>
                <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                <div>
                  <a href="mailto:info@mobility4you.com">info@mobility4you.com</a>
                  <span className="contact-time">Respondemos en 24h</span>
                </div>
              </li>
            </ul>
          </Col>
        </Row>
      </Container>
    </div>

    <div className="footer-bottom">
      <Container>
        <Row className="py-3 align-items-center">
          <Col md={6} className="text-center text-md-start mb-2 mb-md-0">
            <small className="copyright">
              &copy; Mobility 4 You {new Date().getFullYear()}. Todos los derechos reservados.
            </small>
          </Col>
          <Col md={6} className="d-flex justify-content-center justify-content-md-end">
            <Nav className="footer-bottom-nav">
              <Nav.Link href="/ayuda">Ayuda</Nav.Link>
              <Nav.Link href="/faq">FAQ</Nav.Link>
              <Nav.Link href="/sitemap">Mapa del Sitio</Nav.Link>
            </Nav>
          </Col>
        </Row>
      </Container>
    </div>
  </footer>
);

export default AppFooter;