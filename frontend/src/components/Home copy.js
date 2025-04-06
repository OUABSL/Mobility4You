import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, Row, Col } from 'react-bootstrap';
import '../css/Home.css';

const Home = () => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [showDropoffLocation, setShowDropoffLocation] = useState(false);
  const [cars, setCars] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/search', {
        pickupLocation,
        dropoffLocation: showDropoffLocation ? dropoffLocation : pickupLocation,
        pickupDate,
        dropoffDate,
      });
      setCars(response.data);
    } catch (error) {
      console.error('Error fetching cars:', error);
    }
  };

  return (
    <div>
      <div className="home w-100">
        <div className="search-section w-100">
          <div className="search-form bg-light text-dark mt-5 mx-5">
            <Form onSubmit={handleSearch}>
              <Row className='d-flex flex-row'>
                <Col>
                  <Form.Group controlId="pickupLocation">
                    <Form.Label className='small'>Recogida y devolución</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Aeropuerto, ciudad o dirección"
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col className='d-flex align-items-end'>
                  <Form.Group controlId="dropoffLocation" style={{ display: showDropoffLocation ? 'block' : 'none' }}>
                    <Form.Label className='small'>Devolución</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Aeropuerto, ciudad o dirección"
                      value={dropoffLocation}
                      onChange={(e) => setDropoffLocation(e.target.value)}
                    />
                  </Form.Group>
                  <span
                    className="text-secondary"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowDropoffLocation(!showDropoffLocation)}
                  >
                    Different return location?
                  </span>
                </Col>
              </Row>
              <Row className='d-flex flex-row'>
                <Col>
                  <Form.Group controlId="pickupDate">
                    <Form.Label className='small'>Fecha y hora de recogida</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col>
                  <Form.Group controlId="dropoffDate">
                    <Form.Label className='small'>Fecha y hora de devolución</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={dropoffDate}
                      onChange={(e) => setDropoffDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="primary" type="submit">
                Buscar coches
              </Button>
            </Form>
          </div>
          <div className='oculto'></div>
        </div>
      </div>
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
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path>
            </svg>
          </div>
          <div className="content">
            <h3>Presencia global</h3>
            <p>Más de 2,000 oficinas en más de 105 países</p>
          </div>
        </div>
        <div className="feature">
          <div className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM7.5 16c-.83 0-1.5-.67-1.5-1.5S6.67 13 7.5 13s1.5.67 1.5 1.5S8.33 16 7.5 16zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5.81 10l1.04-3h10.29l1.04 3H5.81z"></path>
            </svg>
          </div>
          <div className="content">
            <h3>Flota distintiva</h3>
            <p>Desde descapotables de alta gama hasta SUV premium</p>
          </div>
        </div>
        <div className="feature">
          <div className="icon">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M1 11h4v11H1zm15-7.75C16.65 2.49 17.66 2 18.7 2 20.55 2 22 3.45 22 5.3c0 2.27-2.91 4.9-6 7.7-3.09-2.81-6-5.44-6-7.7C10 3.45 11.45 2 13.3 2c1.04 0 2.05.49 2.7 1.25zM20 17h-7l-2.09-.73.33-.94L13 16h2.82c.65 0 1.18-.53 1.18-1.18 0-.49-.31-.93-.77-1.11L8.97 11H7v9.02L14 22l8.01-3c-.01-1.1-.9-2-2.01-2z"></path>
            </svg>
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
