// src/components/modals/EditReservationModal.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSave, 
  faTimes, 
  faCalculator, 
  faExclamationTriangle,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { calculateReservationPrice, editReservation } from '../../services/reservationServices';
import { format } from 'date-fns';
import ModalCalendario from '../ModalCalendario';

const EditReservationModal = ({ show, onHide, reservationData, onSave }) => {
  const [formData, setFormData] = useState({
    fechaRecogida: new Date(reservationData.fechaRecogida),
    fechaDevolucion: new Date(reservationData.fechaDevolucion),
    lugarRecogida_id: reservationData.lugarRecogida.id,
    lugarDevolucion_id: reservationData.lugarDevolucion.id,
    politicaPago_id: reservationData.politicaPago.id,
    extras: reservationData.extras.map(extra => extra.id)
  });
  
  const [locations, setLocations] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [availableExtras, setAvailableExtras] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [priceEstimate, setPriceEstimate] = useState(null);
  
  // Estados para el calendario
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState('pickup'); // pickup o dropoff
  
  // Horarios disponibles
  const availableTimes = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
  ];
  
  // Cargar datos necesarios al abrir el modal
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simular carga de datos
        setLocations([
          { id: reservationData.lugarRecogida.id, nombre: reservationData.lugarRecogida.nombre },
          { id: 2, nombre: 'Centro de Málaga' },
          { id: 3, nombre: 'Estación de Tren de Málaga' }
        ]);
        
        setPolicies([
          { id: reservationData.politicaPago.id, titulo: reservationData.politicaPago.titulo },
          { id: 2, titulo: 'Economy' }
        ]);
        
        setAvailableExtras([
          { id: 1, nombre: 'Asiento infantil (Grupo 1)', precio: 25.00 },
          { id: 2, nombre: 'GPS navegador', precio: 15.00 },
          { id: 3, nombre: 'WiFi portátil', precio: 20.00 },
          { id: 4, nombre: 'Cadenas para nieve', precio: 18.00 }
        ]);
      } catch (err) {
        setError('Error al cargar los datos necesarios');
      }
    };
    
    if (show) {
      fetchData();
    }
  }, [show, reservationData]);
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset price estimate when form changes
    setPriceEstimate(null);
  };
  
  // Manejar cambios en los extras
  const handleExtraChange = (extraId, isChecked) => {
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        extras: [...prev.extras, extraId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        extras: prev.extras.filter(id => id !== extraId)
      }));
    }
    
    // Reset price estimate when extras change
    setPriceEstimate(null);
  };
  
  // Calcular precio estimado
  const handleCalculatePrice = async () => {
    setCalculating(true);
    setError(null);
    
    try {
      const priceData = await calculateReservationPrice({
        ...formData,
        id: reservationData.id,
        fechaRecogida: formData.fechaRecogida.toISOString(),
        fechaDevolucion: formData.fechaDevolucion.toISOString()
      });
      
      setPriceEstimate(priceData);
    } catch (err) {
      setError('Error al calcular el precio: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setCalculating(false);
    }
  };
  
  // Guardar cambios
  const handleSubmit = async () => {
    if (!priceEstimate) {
      setError('Por favor calcule el precio antes de guardar los cambios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Si hay diferencia positiva, redirigir a pago de diferencia
      if (priceEstimate.difference > 0) {
        // Guardar datos temporales para el pago de diferencia
        sessionStorage.setItem('editReservaData', JSON.stringify({
          id: reservationData.id,
          formData,
          priceEstimate
        }));
        // Redirigir a la pantalla de pago de diferencia
        window.location.href = `/pago-diferencia/${reservationData.id}`;
        return;
      }
      // Si no hay diferencia positiva, guardar normalmente
      const updatedData = await editReservation(
        reservationData.id,
        {
          ...formData,
          fechaRecogida: formData.fechaRecogida.toISOString(),
          fechaDevolucion: formData.fechaDevolucion.toISOString()
        }
      );
      
      onSave(updatedData);
    } catch (err) {
      setError('Error al actualizar la reserva: ' + (err.message || 'Intente nuevamente'));
    } finally {
      setLoading(false);
    }
  };
  
  // Función para formatear la fecha para mostrar
  const formatDate = (date) => {
    return format(date, 'dd/MM/yyyy HH:mm');
  };
  
  return (
    <>
      <Modal 
        show={show} 
        onHide={onHide}
        backdrop="static"
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Reserva #{reservationData.id}</Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {error}
            </Alert>
          )}
          
          <Form>
            {/* Fechas de reserva */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha de Recogida</Form.Label>
                  <div 
                    className="form-control d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCalendarType('pickup');
                      setShowCalendar(true);
                    }}
                  >
                    <span>{formatDate(formData.fechaRecogida)}</span>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha de Devolución</Form.Label>
                  <div 
                    className="form-control d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCalendarType('dropoff');
                      setShowCalendar(true);
                    }}
                  >
                    <span>{formatDate(formData.fechaDevolucion)}</span>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
            {/* Lugares de recogida y devolución */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lugar de Recogida</Form.Label>
                  <Form.Select 
                    name="lugarRecogida_id"
                    value={formData.lugarRecogida_id}
                    onChange={handleChange}
                  >
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lugar de Devolución</Form.Label>
                  <Form.Select 
                    name="lugarDevolucion_id"
                    value={formData.lugarDevolucion_id}
                    onChange={handleChange}
                  >
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            {/* Política de Pago */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Política de Protección</Form.Label>
                  <Form.Select 
                    name="politicaPago_id"
                    value={formData.politicaPago_id}
                    onChange={handleChange}
                  >
                    {policies.map(policy => (
                      <option key={policy.id} value={policy.id}>
                        {policy.titulo}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            {/* Extras */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Extras</Form.Label>
                  <div className="p-3 border rounded">
                    {availableExtras.map(extra => (
                      <Form.Check
                        key={extra.id}
                        type="checkbox"
                        id={`extra-${extra.id}`}
                        label={`${extra.nombre} (${new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(extra.precio)})`}
                        checked={formData.extras.includes(extra.id)}
                        onChange={(e) => handleExtraChange(extra.id, e.target.checked)}
                        className="mb-2"
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
            </Row>
            
            {/* Cálculo de precio */}
            <Row className="mb-3">
              <Col md={12} className="d-flex justify-content-center">
                <Button 
                  variant="outline-primary" 
                  onClick={handleCalculatePrice}
                  disabled={calculating}
                >
                  {calculating ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Calculando...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCalculator} className="me-2" />
                      Calcular Precio
                    </>
                  )}
                </Button>
              </Col>
            </Row>
            
            {/* Mostrar estimación de precio */}
            {priceEstimate && (
              <Row className="mb-3">
                <Col md={12}>
                  <div className="price-estimate p-3 bg-light rounded">
                    <h5 className="mb-3">Estimación de Precio</h5>
                    <div className="d-flex justify-content-between">
                      <span>Precio original:</span>
                      <span>{new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(priceEstimate.originalPrice)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Nuevo precio:</span>
                      <span>{new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(priceEstimate.newPrice)}</span>
                    </div>
                    {priceEstimate.difference !== 0 && (
                      <div className="d-flex justify-content-between mt-2">
                        <span>Diferencia ({priceEstimate.difference > 0 ? 'a pagar' : 'a reembolsar'}):</span>
                        <span className={priceEstimate.difference > 0 ? 'text-danger' : 'text-success'}>
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(Math.abs(priceEstimate.difference))}
                        </span>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            )}
          </Form>
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={loading || !priceEstimate}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span className="ms-2">Guardando...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="me-1" /> Guardar Cambios
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal de Calendario */}
      <ModalCalendario
        openCalendar={showCalendar}
        onHideCalendar={() => setShowCalendar(false)}
        initialValues={{
          pickupDate: calendarType === 'pickup' ? formData.fechaRecogida : formData.fechaRecogida,
          dropoffDate: calendarType === 'dropoff' ? formData.fechaDevolucion : formData.fechaDevolucion,
          pickupTime: format(formData.fechaRecogida, 'HH:mm'),
          dropoffTime: format(formData.fechaDevolucion, 'HH:mm')
        }}
        availableTimes={availableTimes}
        onSave={(values) => {
          if (calendarType === 'pickup') {
            setFormData(prev => ({ ...prev, fechaRecogida: values.pickupDate }));
          } else {
            setFormData(prev => ({ ...prev, fechaDevolucion: values.dropoffDate }));
          }
          // Reset price estimate when date changes
          setPriceEstimate(null);
          setShowCalendar(false);
        }}
        isMobile={false}
      />
    </>
  );
};

export default EditReservationModal;