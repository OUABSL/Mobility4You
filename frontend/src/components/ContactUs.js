// src/components/ContactUs.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Form, 
  Button, 
  Alert, 
  Card, 
  Spinner, 
  Toast 
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEnvelope, 
  faUser, 
  faTag, 
  faComment, 
  faPaperPlane, 
  faCheckCircle, 
  faExclamationTriangle,
  faMapMarkerAlt,
  faPhone,
  faBuildingUser
} from '@fortawesome/free-solid-svg-icons';
import contactService from '../services/contactService';
import '../css/ContactUs.css';

// Para código de producción/desarrollo
const DEBUG_MODE = process.env.NODE_ENV === 'development' && false;

const ContactUs = () => {
  // Estados para el formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  // Estados para la validación
  const [validated, setValidated] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estados para el proceso de envío
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');
  
  // Métodos de utilidad
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validar nombre
    if (!formData.name.trim()) {
      newErrors.name = "Por favor, introduce tu nombre";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    }
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = "Por favor, introduce tu email";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Por favor, introduce un email válido";
    }
    
    // Validar asunto
    if (!formData.subject.trim()) {
      newErrors.subject = "Por favor, introduce un asunto";
    } else if (formData.subject.trim().length < 3) {
      newErrors.subject = "El asunto debe tener al menos 3 caracteres";
    }
    
    // Validar mensaje
    if (!formData.message.trim()) {
      newErrors.message = "Por favor, escribe tu mensaje";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "El mensaje debe tener al menos 10 caracteres";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Manejo de cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    
    // Si ya se había validado, validar en tiempo real
    if (validated) {
      if (!value.trim()) {
        setErrors(prev => ({
          ...prev,
          [name]: `Por favor, completa este campo`
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };
    // Función para enviar el formulario al backend usando el servicio
  const sendContactForm = async (data) => {
    if (DEBUG_MODE) {
      // En modo desarrollo, simular respuesta exitosa
      console.log('Datos de contacto enviados (modo DEBUG):', data);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true, 
            message: 'Mensaje enviado correctamente (Simulado)',
            id: 'debug-' + Date.now()
          });
        }, 1000);
      });
    }
    
    try {
      // Usar el servicio de contacto con reintento automático
      return await contactService.sendContactFormWithRetry(data, 2);
    } catch (error) {
      console.error('Error enviando el formulario:', error);
      return {
        success: false,
        message: 'Error enviando el mensaje',
        userMessage: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.',
        originalError: error
      };
    }
  };
  
  // Manejo del envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar formulario
    setValidated(true);
    const isValid = validateForm();
    
    if (!isValid) {
      setToastMessage('Por favor, corrige los errores en el formulario.');
      setToastVariant('danger');
      setShowToast(true);
      return;
    }
    
    // Iniciar proceso de envío
    setLoading(true);
    setSuccess('');
    setError('');
    
    try {
      const response = await sendContactForm(formData);
      
      // Comprobar respuesta
      if (response.status === 200 && response.data.success) {
        // Éxito
        setSuccess('¡Mensaje enviado correctamente! Te responderemos lo antes posible.');
        setToastMessage('Mensaje enviado con éxito');
        setToastVariant('success');
        setShowToast(true);
        
        // Limpiar formulario
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        setValidated(false);
      } else {
        // Error en la respuesta
        throw new Error(response.data.message || 'Ocurrió un error al enviar el mensaje.');
      }
    } catch (err) {
      console.error('Error completo:', err);
      setError(err.response?.data?.message || err.message || 'Error al enviar el mensaje. Inténtalo más tarde.');
      setToastMessage('Error al enviar el mensaje');
      setToastVariant('danger');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizado
  return (
    <div className="contact-page-wrapper py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg={10}>
            <Card className="contact-card shadow-lg border-0">
              <Card.Body className="p-0">
                <Row className="g-0">
                  {/* Columna izquierda - Información de contacto */}
                  <Col lg={5} className="contact-info-column">
                    <div className="contact-info-content">
                      <h2 className="contact-info-title mb-4">Contacta con nosotros</h2>
                      <p className="contact-info-text mb-4">
                        Estamos aquí para ayudarte. Rellena el formulario y te responderemos 
                        lo antes posible, normalmente en menos de 24 horas.
                      </p>
                      
                      <div className="contact-details">
                        <div className="contact-detail-item">
                          <div className="contact-icon">
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                          </div>
                          <div className="contact-detail-content">
                            <h5>Dirección</h5>
                            <p>Av. Comandante García Morato, s/n<br />29004 Málaga, España</p>
                          </div>
                        </div>
                        
                        <div className="contact-detail-item">
                          <div className="contact-icon">
                            <FontAwesomeIcon icon={faPhone} />
                          </div>
                          <div className="contact-detail-content">
                            <h5>Teléfono</h5>
                            <p>+34 951 23 45 67</p>
                          </div>
                        </div>
                        
                        <div className="contact-detail-item">
                          <div className="contact-icon">
                            <FontAwesomeIcon icon={faEnvelope} />
                          </div>
                          <div className="contact-detail-content">
                            <h5>Email</h5>
                            <p>info@mobility4you.com</p>
                          </div>
                        </div>
                        
                        <div className="contact-detail-item">
                          <div className="contact-icon">
                            <FontAwesomeIcon icon={faBuildingUser} />
                          </div>
                          <div className="contact-detail-content">
                            <h5>Horario</h5>
                            <p>Lun-Vie: 9:00 - 18:00<br />Sáb: 10:00 - 14:00</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>
                  
                  {/* Columna derecha - Formulario */}
                  <Col lg={7} className="contact-form-column">
                    <div className="contact-form-container">
                      <h3 className="form-title mb-4">Envíanos un mensaje</h3>
                      
                      {success && (
                        <Alert variant="success" className="mb-4">
                          <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                          {success}
                        </Alert>
                      )}
                      
                      {error && (
                        <Alert variant="danger" className="mb-4">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                          {error}
                        </Alert>
                      )}
                      
                      <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Form.Group className="form-group mb-3">
                          <Form.Label className="input-label">
                            <FontAwesomeIcon icon={faUser} className="me-2" />
                            Nombre
                          </Form.Label>
                          <Form.Control
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={errors.name ? 'is-invalid' : ''}
                            placeholder="Tu nombre"
                            disabled={loading}
                          />
                          {errors.name && <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>}
                        </Form.Group>
                        
                        <Form.Group className="form-group mb-3">
                          <Form.Label className="input-label">
                            <FontAwesomeIcon icon={faEnvelope} className="me-2" />
                            Email
                          </Form.Label>
                          <Form.Control
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className={errors.email ? 'is-invalid' : ''}
                            placeholder="Tu correo electrónico"
                            disabled={loading}
                          />
                          {errors.email && <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>}
                        </Form.Group>
                        
                        <Form.Group className="form-group mb-3">
                          <Form.Label className="input-label">
                            <FontAwesomeIcon icon={faTag} className="me-2" />
                            Asunto
                          </Form.Label>
                          <Form.Control
                            type="text"
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleInputChange}
                            className={errors.subject ? 'is-invalid' : ''}
                            placeholder="Asunto del mensaje"
                            disabled={loading}
                          />
                          {errors.subject && <Form.Control.Feedback type="invalid">{errors.subject}</Form.Control.Feedback>}
                        </Form.Group>
                        
                        <Form.Group className="form-group mb-4">
                          <Form.Label className="input-label">
                            <FontAwesomeIcon icon={faComment} className="me-2" />
                            Mensaje
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            className={`message-textarea ${errors.message ? 'is-invalid' : ''}`}
                            placeholder="Escribe tu mensaje aquí..."
                            rows={5}
                            disabled={loading}
                          />
                          {errors.message && <Form.Control.Feedback type="invalid">{errors.message}</Form.Control.Feedback>}
                        </Form.Group>
                        
                        <div className="text-end">
                          <Button
                            type="submit"
                            className="submit-button"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                                Enviar Mensaje
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      
      {/* Toast para notificaciones */}
      <Toast 
        show={showToast} 
        onClose={() => setShowToast(false)} 
        delay={5000} 
        autohide
        className={`position-fixed toast-notification bg-${toastVariant}`}
      >
        <Toast.Header closeButton={true}>
          <strong className="me-auto">
            {toastVariant === 'success' ? 'Éxito' : 'Error'}
          </strong>
        </Toast.Header>
        <Toast.Body>{toastMessage}</Toast.Body>
      </Toast>
    </div>
  );
};

export default ContactUs;