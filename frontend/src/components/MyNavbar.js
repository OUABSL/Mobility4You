// src/components/MyNavbar.js
import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Offcanvas, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faEnvelope, 
  faCar, 
  faUser, 
  faCalendarCheck, 
  faBars,
  faSignInAlt
} from '@fortawesome/free-solid-svg-icons';
import { Image } from 'react-bootstrap';
import '../css/MyNavbar.css';
import logo from '../assets/img/general/logo_home_horizontal.png';

const MyNavbar = ({isMobile = false}) => {
  const [show, setShow] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [navbarBg, setNavbarBg] = useState('transparent');
  const location = useLocation();

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // Apply scroll effect only on home page
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      // If scroll is more than 100px, fix the navbar
      if (window.scrollY > 100) {
        setIsFixed(true);
        setNavbarBg('var(--color-primario)');
      } else {
        setIsFixed(false);
        setNavbarBg(isHomePage ? 'var(--color-fondo)' : 'var(--color-primario)');
      }
    };

    // Set initial navbar style based on page
    setNavbarBg(isHomePage ? 'var(--color-fondo)' : 'var(--color-primario)');
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  return (
    <>
      {!(isMobile && show) && (
      <Navbar
        expand="lg"
        className={`py-3 px-4 ${isFixed ? 'fixed-navbar shadow-nav' : ''}`}
        style={{ 
          backgroundColor: navbarBg,
          transition: 'all 0.3s ease',
        }}
      >
        <Container>
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex align-items-center">
              {isMobile && (
              <Button 
                variant="link" 
                className="me-2 nav-toggle" 
                onClick={handleShow}
              >
                <FontAwesomeIcon icon={faBars} className="text-white" />
              </Button>
              )}
              <Navbar.Brand as={Link} to="/" className="ms-2">
                <Image 
                  src={logo} 
                  alt="Mobility 4 You" 
                  className="navbar-logo" 
                  style={{
                    maxWidth: '120px',
                    filter: 'brightness(0) invert(1)',
                    transition: 'all 0.3s ease'
                  }}
                />
              </Navbar.Brand>
            </div>
            
            <div className="d-none d-lg-flex">
              <Nav className="main-nav me-4">
                <Nav.Link as={Link} to="/" className="nav-link-white mx-2">
                  Inicio
                </Nav.Link>
                <Nav.Link as={Link} to="/coches" className="nav-link-white mx-2">
                  Vehículos
                </Nav.Link>
                <Nav.Link as={Link} to="/contactus" className="nav-link-white mx-2">
                  Contacto
                </Nav.Link>
              </Nav>
            </div>
            
            <div className="d-flex align-items-center">
              <Nav.Link 
                as={Link} 
                to="/reservations" 
                className="text-white d-none d-sm-flex me-3 nav-link-white"
              >
                <FontAwesomeIcon icon={faCalendarCheck} className="me-1" />
                <span>Mis Reservas</span>
              </Nav.Link>
              
              {/* <Button 
                as={Link} 
                to="/user/login" 
                variant="outline-light" 
                className="nav-btn-outline"
              >
                <FontAwesomeIcon icon={faSignInAlt} className="me-1" />
                <span className="d-none d-md-inline">Acceder</span>
              </Button> */}
            </div>
          </div>
        </Container>
      </Navbar>
  )}

      {isMobile && (
      <Offcanvas show={show} onHide={handleClose} placement="start" className="mobile-menu">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <Image 
              src={logo} 
              alt="Mobility 4 You" 
              className="offcanvas-logo"
              style={{ maxWidth: '150px' }}
            />
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column mobile-nav">
            <Nav.Link as={Link} to="/" onClick={handleClose} className="mobile-nav-link">
              <FontAwesomeIcon icon={faHome} className="me-3" /> 
              Inicio
            </Nav.Link>
            <Nav.Link as={Link} to="/coches" onClick={handleClose} className="mobile-nav-link">
              <FontAwesomeIcon icon={faCar} className="me-3" /> 
              Vehículos
            </Nav.Link>
            <Nav.Link as={Link} to="/reservations" onClick={handleClose} className="mobile-nav-link">
              <FontAwesomeIcon icon={faCalendarCheck} className="me-3" /> 
              Mis Reservas
            </Nav.Link>
            <Nav.Link as={Link} to="/contactus" onClick={handleClose} className="mobile-nav-link">
              <FontAwesomeIcon icon={faEnvelope} className="me-3" /> 
              Contacto
            </Nav.Link>
            
            <hr className="my-4" />
            
            {/* <div className="mobile-cta">
              <Button 
                as={Link} 
                to="/user/login" 
                variant="primary" 
                className="w-100 mb-3"
                onClick={handleClose}
              >
                <FontAwesomeIcon icon={faSignInAlt} className="me-2" />
                Iniciar Sesión
              </Button>
              <Button 
                as={Link} 
                to="/user/register" 
                variant="outline-primary" 
                className="w-100"
                onClick={handleClose}
              >
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Registrarse
              </Button>
            </div> */}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
      )}
    </>
  );
};

export default MyNavbar;