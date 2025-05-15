// src/components/Footer.js
import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFacebookF,
  faInstagram,
  faTwitter,
  faYoutube
} from '@fortawesome/free-brands-svg-icons';
import '../css/Footer.css';

const AppFooter = () => (
  <footer className="site-footer mt-auto">
    <Container>
      <Row className="footer-top py-5">
        <Col md={4} sm={12} className="mb-4">
          <h5 className="footer-title">Movility for You</h5>
          <p className="footer-text">
            Tu camino hacia el confort.
          </p>
          <div className="social-icons">
            <a href="#" aria-label="Facebook">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href="#" aria-label="Instagram" className="ms-3">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
            <a href="#" aria-label="Twitter" className="ms-3">
              <FontAwesomeIcon icon={faTwitter} />
            </a>
            <a href="#" aria-label="YouTube" className="ms-3">
              <FontAwesomeIcon icon={faYoutube} />
            </a>
          </div>
        </Col>

        <Col md={2} sm={6} className="mb-4">
          <h6 className="footer-heading">Productos</h6>
          <Nav className="flex-column">
            <Nav.Link href="/coches">Coches</Nav.Link>
            <Nav.Link href="/furgonetas">Furgonetas</Nav.Link>
          </Nav>
        </Col>

        <Col md={4} sm={12}>
          <h6 className="footer-heading">Contáctanos</h6>
          <p className="footer-text mb-1">
            Email:&nbsp;
            <a href="mailto:info@movility.com">info@movility.com</a>
          </p>
          <p className="footer-text">
            Teléfono:&nbsp;
            <a href="tel:+34951234567">+34 951 23 45 67</a>
          </p>
        </Col>
      </Row>

        {/* Nueva fila para Ayuda con enlaces en línea */}
        <Row className="footer-help py-3">
            <Col>
                <Nav className="justify-content-evenly">
                  <Nav.Link href="/info-rental" className="me-4">Información de alquiler</Nav.Link>
                  <Nav.Link href="/terminos" className="me-4">Términos y condiciones</Nav.Link>
                  <Nav.Link href="/privacidad" className="me-4">Política de privacidad</Nav.Link>
                  <Nav.Link href="/cookies">Gestión de cookies</Nav.Link>
                </Nav>
            </Col>
        </Row>

      <Row className="footer-bottom py-3">
        <Col md={6} sm={12}>
          <small>© Movility for You 2025. Todos los derechos reservados.</small>
        </Col>
        <Col md={6} sm={12} className="text-md-end">
          <Nav className="justify-content-md-end">
            <Nav.Link href="/privacidad">Privacidad</Nav.Link>
            <Nav.Link href="/cookies" className="ms-3">Cookies</Nav.Link>
            <Nav.Link href="/terminos" className="ms-3">Términos</Nav.Link>
          </Nav>
        </Col>
      </Row>
    </Container>
  </footer>
);

export default AppFooter;
