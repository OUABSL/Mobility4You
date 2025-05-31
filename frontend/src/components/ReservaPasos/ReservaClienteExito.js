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
  
    useEffect(() => {
    try {
      console.log('[ReservaClienteExito] Cargando datos de reserva completada');
      
      // Primero intentar obtener datos del state de navegación
      const stateData = location.state?.reservationData;
      
      if (stateData) {
        console.log('[ReservaClienteExito] Datos recibidos desde navigation state:', stateData);
        setReservaCompletada(stateData);
      } else {
        // Fallback a sessionStorage para datos de reserva completada
        const storedData = sessionStorage.getItem('reservaCompletada');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('[ReservaClienteExito] Datos recibidos desde sessionStorage:', parsedData);
          setReservaCompletada(parsedData);
          // Limpiar después de usar
          sessionStorage.removeItem('reservaCompletada');
        } else {
          // Último intento: obtener desde el storage service
          const completeData = storageService?.getCompleteReservationData?.();
          if (completeData) {
            console.log('[ReservaClienteExito] Datos recibidos desde storage service:', completeData);
            setReservaCompletada(completeData);
          } else {
            console.warn('[ReservaClienteExito] No se encontraron datos de reserva en ninguna fuente');
            setError('No se encontraron datos de la reserva completada.');
            return;
          }
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
      console.error('[ReservaClienteExito] Error al cargar los datos de la reserva:', err);
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

  // Helper functions para extraer datos de manera segura
  const getFechaRecogida = () => {
    if (fechas?.recogida) return fechas.recogida;
    if (fechas?.pickupDate) {
      const date = new Date(fechas.pickupDate);
      return date.toLocaleDateString('es-ES') + (fechas.pickupTime ? ` a las ${fechas.pickupTime}` : '');
    }
    return 'No especificada';
  };

  const getFechaDevolucion = () => {
    if (fechas?.devolucion) return fechas.devolucion;
    if (fechas?.dropoffDate) {
      const date = new Date(fechas.dropoffDate);
      return date.toLocaleDateString('es-ES') + (fechas.dropoffTime ? ` a las ${fechas.dropoffTime}` : '');
    }
    return 'No especificada';
  };

  const getLugarRecogida = () => {
    // Intentar múltiples fuentes para el lugar de recogida
    if (detallesReserva?.lugarRecogida?.nombre) return detallesReserva.lugarRecogida.nombre;
    if (fechas?.pickupLocation?.nombre) return fechas.pickupLocation.nombre;
    if (typeof fechas?.pickupLocation === 'string') return fechas.pickupLocation;
    if (reservaCompletada.lugarRecogida?.nombre) return reservaCompletada.lugarRecogida.nombre;
    return 'No especificado';
  };
  const getLugarDevolucion = () => {
    // Intentar múltiples fuentes para el lugar de devolución
    if (detallesReserva?.lugarDevolucion?.nombre) return detallesReserva.lugarDevolucion.nombre;
    if (fechas?.dropoffLocation?.nombre) return fechas.dropoffLocation.nombre;
    if (typeof fechas?.dropoffLocation === 'string') return fechas.dropoffLocation;
    if (reservaCompletada.lugarDevolucion?.nombre) return reservaCompletada.lugarDevolucion.nombre;
    return 'No especificado';
  };

  const getTotalPagado = () => {
    // Intentar múltiples fuentes para el total pagado
    if (detallesReserva?.precioTotal) return detallesReserva.precioTotal;
    if (detallesReserva?.total) return detallesReserva.total;
    if (reservaCompletada.precioTotal) return reservaCompletada.precioTotal;
    if (reservaCompletada.precio_total) return reservaCompletada.precio_total;
    return null;
  };
  const getConductorInfo = () => {
    // Intentar múltiples fuentes para datos del conductor
    const conductorData = conductor || reservaCompletada.conductorPrincipal || reservaCompletada.driver;
    if (!conductorData) return 'No especificado';
    
    const nombre = conductorData.nombre || conductorData.name || '';
    const apellido = conductorData.apellido || conductorData.apellidos || conductorData.surname || '';
    const email = conductorData.email || '';
    
    return `${nombre} ${apellido} ${email ? `(${email})` : ''}`.trim();
  };

  const getExtrasInfo = () => {
    // Intentar múltiples fuentes para extras
    const extrasData = extras || reservaCompletada.extrasSeleccionados || reservaCompletada.extras || [];
    
    if (!Array.isArray(extrasData) || extrasData.length === 0) {
      return <span>No se añadieron extras</span>;
    }
    
    return (
      <ul className="mb-0">
        {extrasData.map((extra, idx) => {
          const nombre = extra.nombre || extra.name || `Extra ${idx + 1}`;
          const precio = extra.precio || extra.price || 0;
          return (
            <li key={idx}>{nombre} ({formatCurrency(precio)})</li>
          );
        })}
      </ul>
    );
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
                  </tr>                  <tr>
                    <th><FontAwesomeIcon icon={faCalendarAlt} /> Fechas</th>
                    <td>{getFechaRecogida()} - {getFechaDevolucion()}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faMapMarkerAlt} /> Recogida</th>
                    <td>{getLugarRecogida()}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faMapMarkerAlt} /> Devolución</th>
                    <td>{getLugarDevolucion()}</td>
                  </tr>                  <tr>
                    <th><FontAwesomeIcon icon={faUser} /> Conductor</th>
                    <td>{getConductorInfo()}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faShieldAlt} /> Opción de pago</th>
                    <td>{paymentOption?.nombre || paymentOption}</td>
                  </tr>
                  <tr>
                    <th><FontAwesomeIcon icon={faClock} /> Fecha de pago</th>
                    <td>{fechaPagoFormateada}</td>
                  </tr>                  <tr>
                    <th>Extras</th>
                    <td>{getExtrasInfo()}</td>
                  </tr><tr>
                    <th>Total pagado</th>
                    <td>{formatCurrency(getTotalPagado())}</td>
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