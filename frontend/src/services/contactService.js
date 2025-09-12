// src/services/contactService.js
import { BACKEND_URL, createServiceLogger } from '../config/appConfig';
import axios from '../config/axiosConfig';
import { mapContactFromBackend, mapContactToBackend } from './dataMapper';

// Configuración del backend
const API_BASE_URL = `${BACKEND_URL}/api/comunicacion`;

// Crear logger para el servicio de contacto
const logger = createServiceLogger('CONTACT_SERVICE');

// Interceptor específico para el servicio de contacto
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo procesar errores del servicio de contacto
    if (
      error.config &&
      error.config.url &&
      error.config.url.includes('/comunicacion/')
    ) {
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
    }

    return Promise.reject(error);
  },
);

/**
 * Servicio para enviar mensajes de contacto
 *
 * INTEGRACIÓN CON DATA MAPPER:
 * Este servicio ahora utiliza el DataMapper para:
 * - Mapear datos del formulario frontend al formato esperado por el backend (toBackend)
 * - Mapear respuestas del backend al formato frontend (fromBackend)
 * - Validación automática de campos usando esquemas declarativos
 * - Transformación consistente de datos
 *
 * COMPATIBILIDAD:
 * - Mantiene la misma API pública para el frontend
 * - Agrega nuevos métodos para administración de contactos
 * - Manejo robusto de errores y validación
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

      // Mapear datos al formato del backend
      const dataToSend = mapContactToBackend(formData);

      // Realizar petición
      const response = await axios.post(
        `${API_BASE_URL}/contacto/`,
        dataToSend,
      );

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
      const response = await axios.get(`${API_BASE_URL}/contacto/`, {
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

  /**
   * Obtiene contactos desde el backend (para administración)
   * @param {Object} params - Parámetros de consulta
   * @returns {Promise<Object>} Lista de contactos mapeados
   */
  async getContacts(params = {}) {
    try {
      const response = await axios.get(`${API_BASE_URL}/contacto/`, { params });

      if (response.data) {
        // Mapear los datos desde el backend
        const mappedContacts = mapContactFromBackend(response.data);

        return {
          success: true,
          data: mappedContacts,
          message: 'Contactos obtenidos correctamente',
        };
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      logger.error('Error obteniendo contactos:', error);
      return {
        success: false,
        message: error.userMessage || 'Error obteniendo contactos',
        userMessage:
          error.userMessage || 'Ha ocurrido un error al obtener los contactos',
        originalError: error,
      };
    }
  }

  /**
   * Obtiene un contacto específico por ID (para administración)
   * @param {number} contactId - ID del contacto
   * @returns {Promise<Object>} Contacto mapeado
   */
  async getContactById(contactId) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/contacto/${contactId}/`,
      );

      if (response.data) {
        // Mapear los datos desde el backend
        const mappedContact = mapContactFromBackend(response.data);

        return {
          success: true,
          data: mappedContact,
          message: 'Contacto obtenido correctamente',
        };
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (error) {
      logger.error('Error obteniendo contacto:', error);
      return {
        success: false,
        message: error.userMessage || 'Error obteniendo contacto',
        userMessage:
          error.userMessage || 'Ha ocurrido un error al obtener el contacto',
        originalError: error,
      };
    }
  }
}

// Exportar instancia singleton
const contactService = new ContactService();
export default contactService;

// Exportar también la clase para testing
export { ContactService };
