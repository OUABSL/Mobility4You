// src/components/ContactUs.js
import React, { useState } from 'react';
import axios from 'axios';
import '../css/ContactUs.css';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Control del cambio en los campos del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Maneja el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const response = await axios.post('/api/contact', formData);
      // Puedes ajustar la validación de la respuesta según la API
      if (response.data.success) {
        setSuccess('Mensaje enviado correctamente.');
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
      } else {
        setError('Ocurrió un error al enviar el mensaje.');
      }
    } catch (err) {
      setError('Error al enviar el mensaje. Inténtalo más tarde.');
    }
    setLoading(false);
  };

  return (
    <div className="contactus-container align-middle mt-5">
      <h2>Contáctanos</h2>
      <form className="contactus-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nombre</label>
          <input 
            type="text" 
            id="name" 
            name="name" 
            placeholder="Tu nombre" 
            value={formData.name} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Correo</label>
          <input 
            type="email" 
            id="email" 
            name="email" 
            placeholder="Tu correo electrónico" 
            value={formData.email} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="subject">Asunto</label>
          <input 
            type="text" 
            id="subject" 
            name="subject" 
            placeholder="Asunto del mensaje" 
            value={formData.subject} 
            onChange={handleInputChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Mensaje</label>
          <textarea 
            id="message" 
            name="message" 
            placeholder="Escribe tu mensaje aquí..." 
            value={formData.message} 
            onChange={handleInputChange} 
            required 
          ></textarea>
        </div>

        <div className="form-group">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </div>

        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default ContactUs;
