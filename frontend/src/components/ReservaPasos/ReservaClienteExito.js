// src/components/ReservaPasos/ReservaClienteExito.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle,
  faCarSide, 
  faCalendarAlt, 
  faClock, 
  faMapMarkerAlt, 
  faShieldAlt, 
  faUser,
  faEnvelope,
  faPhone,
  faIdCard,
  faHome,
  faPrint,
  faDownload
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { getReservationStorageService } from '../../services/reservationStorageService';
import '../../css/ReservaClienteExito.css';

const ReservaClienteExito = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storageService = getReservationStorageService();
  
  const [reservaCompletada, setReservaCompletada] = useState(null);
  const [error, setError] = useState(null);
  const debugMode = true; 
  
  useEffect(() => {
    try {
      // Primero intentar obtener datos del state de navegación
      const stateData = location.state?.reservationData;
      
      if (stateData) {
        setReservaCompletada(stateData);
      } else {
        // Fallback a sessionStorage para datos de reserva completada
        const storedData = sessionStorage.getItem('reservaCompletada');
        if (storedData) {
          setReservaCompletada(JSON.parse(storedData));
          // Limpiar después de usar
          sessionStorage.removeItem('reservaCompletada');
        } else {
          setError('No se encontraron datos de la reserva completada.');
          return;
        }
      }
        // Asegurar que el storage se limpia después de mostrar el éxito
      if (storageService) {
        setTimeout(() => {
          try {
            storageService.clearAllReservationData();
          } catch (err) {
            console.warn('Error al limpiar storage:', err);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error al cargar los datos de la reserva:', err);
      setError('Error al cargar los datos de la reserva.');
    }
  }, [location.state, storageService]);

  // Imprimir la reserva
  const handleImprimirReserva = () => {
    try {
      window.print();
    } catch (err) {
      setError('No se pudo imprimir la reserva.');
    }
  };

  // Descargar la reserva como JSON
  const handleDescargarReserva = () => {
    try {
      if (reservaCompletada) {
        const blob = new Blob([JSON.stringify(reservaCompletada, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reserva_${reservaCompletada.id || 'mobility4you'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('No se pudo descargar la reserva.');
    }
  };

  // Volver al inicio
  const handleVolverInicio = () => {
    try {
      navigate('/');
    } catch (err) {
      setError('No se pudo volver al inicio.');
    }
  };

  // Ir a gestión de reservas
  const handleGestionReservas = () => {
    try {
      navigate('/mis-reservas');
    } catch (err) {
      setError('No se pudo acceder a la gestión de reservas.');
    }
  };

  if (error) {
    return <div className="error">{error}</div>;
  }
  if (!reservaCompletada) {
    return <div className="loading">Cargando datos de la reserva...</div>;
  }

  // Extraer datos relevantes
  const { id, car, fechas, paymentOption, extras, detallesReserva, conductor, fechaPago, metodo_pago, importe_pagado_inicial, importe_pendiente_inicial, importe_pagado_extra, importe_pendiente_extra } = reservaCompletada;
  // Formatear fecha de pago
  const fechaPagoFormateada = fechaPago ? new Date(fechaPago).toLocaleString() : 'No disponible';

  // Función para formatear moneda
  const formatCurrency = (value) => {
    if (typeof value !== 'number') return '-';
    return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  };

  // Renderizado principal
  return (
    <Container className="reserva-exito-container mt-4 mb-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg">
            <Card.Body>
              <div className="text-center mb-4">
                <FontAwesomeIcon icon={faCheckCircle} size="3x" color="#28a745" />
                <h2 className="mt-3">¡Reserva completada con éxito!</h2>
                <p className="lead">Tu reserva ha sido procesada correctamente. Te hemos enviado un email con los detalles.</p>
              </div>
              <Table bordered responsive className="mb-4">
                <tbody>
                  <tr>
                    <th>ID Reserva</th>
                    <td><Badge bg="success">{id}</Badge></td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faCarSide} /> Vehículo</th>
                    <td>{car?.marca} {car?.modelo} ({car?.matricula})</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faCalendarAlt} /> Fechas</th>
                    <td>{fechas?.recogida} - {fechas?.devolucion}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faMapMarkerAlt} /> Recogida</th>
                    <td>{detallesReserva?.lugarRecogida?.nombre}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faMapMarkerAlt} /> Devolución</th>
                    <td>{detallesReserva?.lugarDevolucion?.nombre}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faUser} /> Conductor</th>
                    <td>{conductor?.nombre} {conductor?.apellido} ({conductor?.email})</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faShieldAlt} /> Opción de pago</th>
                    <td>{paymentOption?.nombre || paymentOption}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faClock} /> Fecha de pago</th>
                    <td>{fechaPagoFormateada}</td>
                  </tr>
                  <tr>
                    <th>Extras</th>
                    <td>
                      {extras && extras.length > 0 ? (
                        <ul className="mb-0">
                          {extras.map((extra, idx) => (
                            <li key={idx}>{extra.nombre} ({formatCurrency(extra.precio)})</li>
                          ))}
                        </ul>
                      ) : (
                        <span>No se añadieron extras</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Total pagado</th>
                    <td>{formatCurrency(detallesReserva?.precioTotal)}</td>
                  </tr>
                  <tr>
                    <th>Método de pago inicial</th>
                    <td>{metodo_pago}</td>
                  </tr>
                  <tr>
                    <th>Importe pagado inicial</th>
                    <td>{formatCurrency(importe_pagado_inicial)}</td>
                  </tr>
                  <tr>
                    <th>Importe pendiente inicial</th>
                    <td>{formatCurrency(importe_pendiente_inicial)}</td>
                  </tr>
                  <tr>
                    <th>Importe pagado extra</th>
                    <td>{formatCurrency(importe_pagado_extra)}</td>
                  </tr>
                  <tr>
                    <th>Importe pendiente extra</th>
                    <td>{formatCurrency(importe_pendiente_extra)}</td>
                  </tr>
                </tbody>
              </Table>
              <div className="d-flex justify-content-between">
                <Button variant="outline-primary" onClick={handleImprimirReserva}>
                  <FontAwesomeIcon icon={faPrint} className="me-2" /> Imprimir
                </Button>
                <Button variant="outline-success" onClick={handleDescargarReserva}>
                  <FontAwesomeIcon icon={faDownload} className="me-2" /> Descargar
                </Button>
                <Button variant="secondary" onClick={handleGestionReservas}>
                  Gestionar mis reservas
                </Button>
                <Button variant="primary" onClick={handleVolverInicio}>
                  Volver al inicio
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ReservaClienteExito;