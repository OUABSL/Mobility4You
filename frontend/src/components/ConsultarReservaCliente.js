// src/components/ConsultarReservaCliente.js
import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';import axios from 'axios';
import '../css/ConsultarReservaCliente.css';

const ConsultarReservaCliente = ({isMobile=false}) => {
  const [reservaId, setReservaId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [datos, setDatos]     = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDatos(null);

    if (!reservaId.trim() || !email.trim()) {
      setError('Por favor complete ambos campos.');
      return;
    }
    setLoading(true);
    try {
      // TODO: sustituir URL por la real en producción
      const resp = await axios.get(`/api/reservations/${reservaId}`, {
        params: { email }
      });
      setDatos(resp.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Error al recuperar la reserva. Compruebe sus datos.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="reserva-cliente my-5">
      <Row className="justify-content-center">
        <Col lg={6} md={8} sm={10}>
          <Card className="reserva-cliente-card shadow-sm">
            <Card.Header className="text-center bg-primario text-white">
              <h3 className="mb-0">Gestión de Reservas</h3>
            </Card.Header>
            <Card.Body>
  
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col md={12} xs={12}>
                    <Form.Group controlId="reservaId">
                      <Form.Label>ID de Reserva</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Ej. R12345"
                        value={reservaId}
                        onChange={e => setReservaId(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12} xs={12}>
                    <Form.Group controlId="emailUsuario">
                      <Form.Label>Correo Electrónico</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
  
                <div className="text-center mt-4">
                  <Button
                    type="submit"
                    className="btn-primario px-4"
                    disabled={loading}
                  >
                    {loading
                      ? <><Spinner animation="border" size="sm" /> Validando…</>
                      : 'Buscar Reserva'
                    }
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
  
};

export default ConsultarReservaCliente;