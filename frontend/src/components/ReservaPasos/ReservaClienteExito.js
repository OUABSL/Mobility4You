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
import { useNavigate } from 'react-router-dom';
import '../../css/ReservaClienteExito.css';

const ReservaClienteExito = () => {
  const navigate = useNavigate();
  const [reservaCompletada, setReservaCompletada] = useState(null);
  const debugMode = true; 
  
  useEffect(() => {
    // Recuperar datos de la reserva completada
    const storedData = sessionStorage.getItem('reservaCompletada');
    if (storedData || debugMode) {
      // Si estamos en modo debug, usar datos de prueba
      setReservaCompletada(JSON.parse(storedData));
    }
  }, []);

  const handleImprimirReserva = () => {
    window.print();
  };

  const handleDescargarReserva = () => {
    // Implementación futura: generación de PDF
    alert('Funcionalidad de descarga en desarrollo');
  };

  const handleVolverInicio = () => {
    // Limpiar datos de reserva al volver al inicio
    sessionStorage.removeItem('reservaData');
    sessionStorage.removeItem('reservaCompletada');
    navigate('/');
  };

  const handleGestionReservas = () => {
    // Redireccionar a la gestión de reservas
    navigate('/reservations');
  };

  // Si no hay datos de reserva, mostrar mensaje de redirección
  if (!reservaCompletada) {
    return (
      <Container className="reserva-exito my-5">
        <Card className="shadow-sm">
          <Card.Header className="bg-warning text-dark">
            <h5 className="mb-0">Información no disponible</h5>
          </Card.Header>
          <Card.Body className="text-center py-5">
            <h4 className="mb-4">No se encontraron datos de una reserva completada</h4>
            <p>Es posible que hayas accedido a esta página directamente sin completar el proceso de reserva.</p>
            <Button 
              variant="primary" 
              onClick={() => navigate('/coches')}
              className="mt-3"
            >
              <FontAwesomeIcon icon={faHome} className="me-2" />
              Ir al listado de coches
            </Button>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Extraer datos relevantes
  const { reservaId, car, fechas, paymentOption, extras, detallesReserva, conductor, fechaPago } = reservaCompletada;
  
  // Formatear fecha de pago
  const fechaPagoFormateada = fechaPago ? new Date(fechaPago).toLocaleString() : 'No disponible';

  return (
    <Container className="reserva-exito my-4">
      <div className="reservation-progress mb-4">
        <div className="progress-steps">
          <div className="step completed">1. Selección de Extras</div>
          <div className="step completed">2. Datos del Conductor</div>
          <div className="step completed">3. Pago</div>
          <div className="step active">4. Confirmación</div>
        </div>
      </div>
      
      <Card className="shadow-sm print-area">
        <Card.Header className="bg-success text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">¡Reserva Completada Exitosamente!</h5>
            <div className="print-download-buttons d-print-none">
              <Button 
                variant="light" 
                size="sm" 
                className="me-2" 
                onClick={handleImprimirReserva}
              >
                <FontAwesomeIcon icon={faPrint} className="me-1" />
                Imprimir
              </Button>
              <Button 
                variant="light" 
                size="sm" 
                onClick={handleDescargarReserva}
              >
                <FontAwesomeIcon icon={faDownload} className="me-1" />
                Descargar
              </Button>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="confirmation-message text-center mb-4">
            <FontAwesomeIcon icon={faCheckCircle} size="4x" className="text-success mb-3" />
            <h4>¡Gracias por tu reserva!</h4>
            <p className="lead">
              ID de Reserva: <strong>{reservaId}</strong>
            </p>
            <p>
              Hemos enviado un correo electrónico de confirmación a <strong>{conductor?.email}</strong> con todos los detalles.
            </p>
          </div>
          
          <Row>
            <Col md={6}>
              <Card className="mb-4 reservation-details">
                <Card.Header>
                  <h5 className="mb-0">Detalles de la Reserva</h5>
                </Card.Header>
                <Card.Body>
                  <Table className="table-borderless">
                    <tbody>
                      <tr>
                        <td><strong>Vehículo:</strong></td>
                        <td>{car?.marca} {car?.modelo}</td>
                      </tr>
                      <tr>
                        <td><strong>Protección:</strong></td>
                        <td>
                          {paymentOption === 'all-inclusive' ? 
                            <Badge bg="success">All Inclusive</Badge> : 
                            <Badge bg="secondary">Economy</Badge>
                          }
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Recogida:</strong></td>
                        <td>
                          {fechas?.pickupLocation}
                          <br />
                          {fechas?.pickupDate ? new Date(fechas.pickupDate).toLocaleDateString() : ""} a las {fechas?.pickupTime}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Devolución:</strong></td>
                        <td>
                          {fechas?.dropoffLocation}
                          <br />
                          {fechas?.dropoffDate ? new Date(fechas.dropoffDate).toLocaleDateString() : ""} a las {fechas?.dropoffTime}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Extras:</strong></td>
                        <td>
                          {extras && extras.length > 0 ? (
                            <ul className="extras-list mb-0">
                              {extras.map((extra, index) => (
                                <li key={index}>{extra.nombre}</li>
                              ))}
                            </ul>
                          ) : (
                            "Ninguno seleccionado"
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="mb-4 customer-details">
                <Card.Header>
                  <h5 className="mb-0">Datos del Conductor</h5>
                </Card.Header>
                <Card.Body>
                  <Table className="table-borderless">
                    <tbody>
                      <tr>
                        <td><FontAwesomeIcon icon={faUser} className="me-2" />Nombre:</td>
                        <td>{conductor?.nombre} {conductor?.apellidos}</td>
                      </tr>
                      <tr>
                        <td><FontAwesomeIcon icon={faEnvelope} className="me-2" />Email:</td>
                        <td>{conductor?.email}</td>
                      </tr>
                      <tr>
                        <td><FontAwesomeIcon icon={faPhone} className="me-2" />Teléfono:</td>
                        <td>{conductor?.telefono}</td>
                      </tr>
                      <tr>
                        <td><FontAwesomeIcon icon={faIdCard} className="me-2" />Documento:</td>
                        <td>{conductor?.tipoDocumento.toUpperCase()}: {conductor?.numeroDocumento}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
              
              <Card className="payment-summary">
                <Card.Header>
                  <h5 className="mb-0">Resumen de Pago</h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Fecha de Pago:</span>
                    <span>{fechaPagoFormateada}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Método de Pago:</span>
                    <span>Tarjeta de Crédito</span>
                  </div>
                  <hr />
                  {detallesReserva && (
                    <div className="detalles-precio">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Precio base:</span>
                        <span>{detallesReserva.precioCocheBase.toFixed(2)}€</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA (21%):</span>
                        <span>{detallesReserva.iva.toFixed(2)}€</span>
                      </div>
                      {detallesReserva.precioExtras > 0 && (
                        <div className="d-flex justify-content-between mb-2">
                          <span>Extras:</span>
                          <span>{detallesReserva.precioExtras.toFixed(2)}€</span>
                        </div>
                      )}
                      <hr />
                      <div className="d-flex justify-content-between fw-bold total-amount">
                        <span>Total:</span>
                        <span>{detallesReserva.total.toFixed(2)}€</span>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <div className="next-steps mt-4 text-center d-print-none">
            <h5 className="mb-3">¿Qué hacer ahora?</h5>
            <p>Puedes gestionar tu reserva o realizar una nueva búsqueda.</p>
            <div className="d-flex justify-content-center mt-3">
              <Button 
                variant="primary" 
                className="me-3"
                onClick={handleGestionReservas}
              >
                Gestionar mis Reservas
              </Button>
              <Button 
                variant="outline-primary"
                onClick={handleVolverInicio}
              >
                Volver al Inicio
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ReservaClienteExito;