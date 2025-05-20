import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Button, Offcanvas, NavLink } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import '../css/MyNavbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Image } from 'react-bootstrap';
import logo from '../assets/img/general/logo_mobility4you.png';


const MyNavbar = () => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  // NUEVO BLOQUE: Agregar estado y efecto para detectar scroll y aplicar clase "fixed" al Navbar
  const [isFixed, setIsFixed] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      // Si el scroll es mayor a 100px se activa el estado fixed
      if (window.scrollY > 100) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <>
      <Navbar
          expand="lg"
          className={`text-light px-5 d-flex justify-content-between ${isFixed ? 'fixed-navbar' : ''}`}
          style={{ backgroundColor: 'black', overflow: 'hidden' }}
      >
        <div className="d-flex justify-content-start align-items-center">     
          <Button className='me-2' variant="outline-claro" onClick={handleShow}>
            <span className="navbar-toggler-icon"></span>
          </Button>
          <Navbar.Brand className='text-light ms-4' as={Link} to="/">
            <Image src={logo} alt="menu" className='menu-icon' style={{maxWidth: '120px', background: 'none', filter: 'brightness(0) invert(1)'}}/>
          </Navbar.Brand>
        </div>
        <div className="d-flex justify-content-end align-items-center text-light">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/reservations" className='text-light'><FontAwesomeIcon icon={['fas', 'circle-user']} /> Gestión de Reservas</Nav.Link>
          </Nav>
          </div>
      </Navbar>

      <Offcanvas show={show} onHide={handleClose} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title><Image src={logo} alt="menu" className='menu-icon ms-3' style={{maxWidth: '100px', background: 'none'}}/></Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column">
            <Nav.Link as={Link} to="/" onClick={handleClose}><FontAwesomeIcon icon={['fas', 'house']} /> Inicio</Nav.Link>
            <Nav.Link as={Link} to="/contactus" onClick={handleClose}><FontAwesomeIcon icon={['fas', 'envelope']} /> Contacto</Nav.Link>
            <Nav.Link as={Link} to="/coches" onClick={handleClose}><FontAwesomeIcon icon={['fas', 'car']} /> Listado de Coches</Nav.Link>
            <Nav.Link as={Link} to="/user/profile" onClick={handleClose}>Perfil de Usuario</Nav.Link>
            <Nav.Link as={Link} to="/admin" onClick={handleClose}>Panel de Administración</Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default MyNavbar;
