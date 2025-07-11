// src/services/contactService.js
import axios from 'axios';
import { BACKEND_URL, createServiceLogger } from '../config/appConfig';

// Configuración del backend
const API_BASE_URL = `${BACKEND_URL}/api/comunicacion`;

// Crear logger para el servicio de contacto
const logger = createServiceLogger('CONTACT_SERVICE');

// Configuración de axios para el servicio de contacto
const contactAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
contactAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log del error para debugging
    logger.error('Contact API Error:', error);

    // Personalizar mensajes de error
    if (error.code === 'ECONNABORTED') {
      error.userMessage =
        'La solicitud tardó demasiado tiempo. Por favor, inténtalo de nuevo.';
    } else if (!error.response) {
      error.userMessage =
        'No se puede conectar con el servidor. Verifica tu conexión a internet.';
    } else {
      switch (error.response.status) {
        case 400:
          error.userMessage =
            'Datos inválidos. Por favor, revisa la información ingresada.';
          break;
        case 429:
          error.userMessage =
            'Demasiadas solicitudes. Por favor, espera un momento antes de intentar de nuevo.';
          break;
        case 500:
          error.userMessage =
            'Error interno del servidor. Inténtalo de nuevo más tarde.';
          break;
        default:
          error.userMessage =
            'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Servicio para enviar mensajes de contacto
 */
class ContactService {
  /**
   * Envía un mensaje de contacto
   * @param {Object} formData - Datos del formulario
   * @param {string} formData.name - Nombre del remitente
   * @param {string} formData.email - Email del remitente
   * @param {string} formData.subject - Asunto del mensaje
   * @param {string} formData.message - Contenido del mensaje
   * @returns {Promise<Object>} Respuesta del servidor
   */
  async sendContactForm(formData) {
    try {
      // Validación básica antes de enviar
      this.validateFormData(formData);

      // Preparar datos para envío
      const dataToSend = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      };

      // Realizar petición
      const response = await contactAPI.post('/contacto/', dataToSend);

      // Validar respuesta
      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Mensaje enviado correctamente',
          id: response.data.id,
        };
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      // Manejo de errores específicos de validación del backend
      if (error.response && error.response.data) {
        const serverError = error.response.data;

        if (serverError.errors) {
          // Errores de validación de campos
          return {
            success: false,
            message: 'Por favor, corrige los siguientes errores:',
            fieldErrors: serverError.errors,
            userMessage: this.formatValidationErrors(serverError.errors),
          };
        } else if (serverError.message) {
          return {
            success: false,
            message: serverError.message,
            userMessage: serverError.message,
          };
        }
      }

      // Error genérico
      return {
        success: false,
        message: error.userMessage || 'Error enviando el mensaje',
        userMessage: error.userMessage || 'Ha ocurrido un error inesperado',
        originalError: error,
      };
    }
  }

  /**
   * Validación del lado del cliente
   * @param {Object} formData - Datos a validar
   * @throws {Error} Si los datos no son válidos
   */
  validateFormData(formData) {
    const errors = [];

    // Validar nombre
    if (!formData.name || formData.name.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email.trim())) {
      errors.push('El email no tiene un formato válido');
    }

    // Validar asunto
    if (!formData.subject || formData.subject.trim().length < 5) {
      errors.push('El asunto debe tener al menos 5 caracteres');
    }

    // Validar mensaje
    if (!formData.message || formData.message.trim().length < 10) {
      errors.push('El mensaje debe tener al menos 10 caracteres');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('. '));
    }
  }

  /**
   * Formatea errores de validación del servidor
   * @param {Object} errors - Errores del servidor
   * @returns {string} Mensaje formateado
   */
  formatValidationErrors(errors) {
    const messages = [];

    Object.entries(errors).forEach(([field, fieldErrors]) => {
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach((error) => {
          const fieldName = this.getFieldDisplayName(field);
          messages.push(`${fieldName}: ${error}`);
        });
      }
    });

    return messages.join('. ');
  }

  /**
   * Obtiene el nombre de visualización de un campo
   * @param {string} fieldName - Nombre del campo
   * @returns {string} Nombre para mostrar
   */
  getFieldDisplayName(fieldName) {
    const fieldNames = {
      nombre: 'Nombre',
      email: 'Email',
      asunto: 'Asunto',
      mensaje: 'Mensaje',
      name: 'Nombre',
      subject: 'Asunto',
      message: 'Mensaje',
    };

    return fieldNames[fieldName] || fieldName;
  }

  /**
   * Obtiene el estado del servicio de contacto
   * @returns {Promise<Object>} Estado del servicio
   */
  async getServiceStatus() {
    try {
      const response = await contactAPI.get('/contacto/', {
        timeout: 5000,
        params: { status: 'check' },
      });

      return {
        available: true,
        message: 'Servicio de contacto disponible',
      };
    } catch (error) {
      return {
        available: false,
        message: 'Servicio de contacto no disponible temporalmente',
        error: error.userMessage,
      };
    }
  }

  /**
   * Reintenta el envío de un mensaje con backoff exponencial
   * @param {Object} formData - Datos del formulario
   * @param {number} maxRetries - Número máximo de reintentos
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendContactFormWithRetry(formData, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendContactForm(formData);

        if (result.success) {
          return result;
        }

        // Si es un error de validación, no reintentar
        if (result.fieldErrors) {
          return result;
        }

        lastError = result;

        // Esperar antes del siguiente intento (backoff exponencial)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = {
          success: false,
          message: error.message,
          userMessage: error.userMessage || error.message,
        };

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      ...lastError,
      message: `Error después de ${maxRetries} intentos: ${lastError.message}`,
      userMessage: `No se pudo enviar el mensaje después de ${maxRetries} intentos. Por favor, inténtalo más tarde.`,
    };
  }
}

// Exportar instancia singleton
const contactService = new ContactService();
export default contactService;

// Exportar también la clase para testing
export { ContactService };
