// frontend/src/services/stripePaymentServices.js
import { loadStripe } from '@stripe/stripe-js';
import { testingStripeMocks } from '../assets/testingData/testingData';
import {
  API_URL,
  createServiceLogger,
  shouldUseTestingData,
} from '../config/appConfig';
import axios from '../config/axiosConfig';
import { logError, logInfo, withTimeout } from '../utils';
import universalMapper from './universalDataMapper';

// Configuración de Stripe
let stripePromise = null;

// Crear logger para el servicio de Stripe
const logger = createServiceLogger('STRIPE_SERVICE');

// Helper function para obtener headers de autenticación
const getAuthHeaders = () => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const token =
    localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

/**
 * Inicializa Stripe con la clave pública
 * @returns {Promise<Stripe>} Instancia de Stripe
 */
export const initializeStripe = async () => {
  try {
    if (!stripePromise) {
      logInfo('Inicializando Stripe...');

      let publishable_key;

      try {
        // Intentar obtener configuración de Stripe del backend
        const response = await withTimeout(
          axios.get(`${API_URL}/payments/stripe/config/`, getAuthHeaders()),
          10000,
        );

        publishable_key = response.data.publishable_key;
      } catch (error) {
        logInfo(
          'Backend no disponible, usando clave de entorno',
          error.message,
        );
        // Fallback a variable de entorno si el backend no está disponible
        publishable_key = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
      }

      if (!publishable_key) {
        throw new Error(
          'Clave pública de Stripe no disponible ni en backend ni en variables de entorno',
        );
      }

      stripePromise = loadStripe(publishable_key);
      logInfo('Stripe inicializado correctamente');
    }

    return await stripePromise;
  } catch (error) {
    logError('Error inicializando Stripe', error);
    throw new Error('No se pudo inicializar el procesador de pagos');
  }
};

/**
 * Obtiene la configuración de Stripe del backend
 * @returns {Promise<Object>} Configuración de Stripe
 */
// frontend/src/services/stripePaymentServices.js - CORREGIR función getStripeConfig

export const getStripeConfig = async () => {
  try {
    logInfo('Obteniendo configuración de Stripe');

    // Intentar backend primero, luego fallback
    try {
      const response = await withTimeout(
        axios.get(`${API_URL}/payments/stripe/config/`, getAuthHeaders()),
        5000,
      );

      logInfo('Configuración de Stripe obtenida del backend', response.data);
      return response.data;
    } catch (error) {
      logInfo('Backend no disponible, usando configuración de entorno');

      // Validar que la clave existe antes de usarla
      const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey || publishableKey === 'pk_test_placeholder') {
        throw new Error(
          'Clave pública de Stripe no configurada. Configura REACT_APP_STRIPE_PUBLISHABLE_KEY en tu archivo .env',
        );
      }

      const fallbackConfig = {
        publishable_key: publishableKey,
        currency: 'eur',
        country: 'ES',
        supported_payment_methods: ['card'],
        statement_descriptor: 'MOBILITY4YOU',
      };

      logInfo('Configuración de Stripe desde entorno', fallbackConfig);
      return fallbackConfig;
    }
  } catch (error) {
    logError('Error obteniendo configuración de Stripe', error);
    throw new Error(
      error.message || 'No se pudo obtener la configuración de pagos',
    );
  }
};

/**
 * Crea un Payment Intent en Stripe
 * @param {Object} reservaData - Datos de la reserva
 * @param {string} tipoPago - Tipo de pago (INICIAL, DIFERENCIA, EXTRA, PENALIZACION)
 * @param {Object} metadataExtra - Metadatos adicionales
 * @returns {Promise<Object>} Datos del Payment Intent creado
 */
export const createPaymentIntent = async (
  reservaData,
  tipoPago = 'INICIAL',
  metadataExtra = {},
) => {
  try {
    logInfo('Creando Payment Intent', { tipoPago, reservaData });

    if (shouldUseTestingData(false)) {
      // Simular creación de Payment Intent en modo debug
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockPaymentIntent = testingStripeMocks.generateMockPaymentIntent(
        tipoPago,
        reservaData,
      );

      logInfo('Payment Intent simulado creado', mockPaymentIntent);
      return mockPaymentIntent;
    }

    // Crear Payment Intent real
    const response = await withTimeout(
      axios.post(
        `${API_URL}/payments/stripe/create-payment-intent/`,
        {
          reserva_data: reservaData,
          tipo_pago: tipoPago,
          metadata_extra: metadataExtra,
        },
        getAuthHeaders(),
      ),
      15000,
    );

    if (response.data.success) {
      logInfo('Payment Intent creado exitosamente', response.data);
      return response.data;
    } else {
      throw new Error(response.data.error || 'Error creando Payment Intent');
    }
  } catch (error) {
    logError('Error creando Payment Intent', error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Error al crear el intento de pago';

    throw new Error(errorMessage);
  }
};

/**
 * Confirma un Payment Intent con Stripe Elements
 * @param {Object} stripe - Instancia de Stripe
 * @param {Object} elements - Instancia de Stripe Elements
 * @param {string} clientSecret - Client secret del Payment Intent
 * @param {Object} paymentData - Datos adicionales del pago
 * @returns {Promise<Object>} Resultado de la confirmación
 */
export const confirmPaymentIntent = async (
  stripe,
  elements,
  clientSecret,
  paymentData = {},
) => {
  try {
    logInfo('Confirmando Payment Intent', { clientSecret, paymentData });

    if (shouldUseTestingData(false)) {
      // Simular confirmación exitosa en modo debug
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResult =
        testingStripeMocks.generateMockConfirmResult(clientSecret);

      logInfo('Payment Intent simulado confirmado', mockResult);
      return mockResult;
    }

    if (!stripe || !elements) {
      throw new Error('Stripe no está correctamente inicializado');
    }

    // Obtener el elemento de tarjeta
    const cardElement = elements.getElement('card');

    if (!cardElement) {
      throw new Error('Elemento de tarjeta no encontrado');
    }

    // Confirmar el pago con Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: paymentData.name || '',
            email: paymentData.email || '',
            phone: paymentData.phone || '',
            address: paymentData.address || {},
          },
        },
      },
    );

    if (error) {
      logError('Error confirmando Payment Intent con Stripe', error);
      throw new Error(error.message || 'Error procesando el pago');
    }

    if (paymentIntent.status === 'succeeded') {
      logInfo('Payment Intent confirmado exitosamente', paymentIntent);

      // Notificar al backend sobre el pago exitoso
      try {
        await axios.post(
          `${API_URL}/payments/stripe/confirm-payment-intent/`,
          {
            payment_intent_id: paymentIntent.id,
          },
          getAuthHeaders(),
        );
      } catch (backendError) {
        logError('Error notificando pago exitoso al backend', backendError);
        // No lanzar error aquí ya que el pago fue exitoso en Stripe
      }

      return {
        success: true,
        status: paymentIntent.status,
        payment_intent_id: paymentIntent.id,
        charge_id: paymentIntent.charges?.data?.[0]?.id,
        numero_pedido: paymentIntent.metadata?.numero_pedido,
      };
    } else {
      logError('Payment Intent en estado inesperado', paymentIntent);
      throw new Error(`Pago en estado inesperado: ${paymentIntent.status}`);
    }
  } catch (error) {
    logError('Error confirmando Payment Intent', error);
    throw error;
  }
};

/**
 * Procesa un pago completo (crear + confirmar)
 * @param {Object} reservaData - Datos de la reserva
 * @param {Object} paymentFormData - Datos del formulario de pago
 * @param {string} tipoPago - Tipo de pago
 * @returns {Promise<Object>} Resultado del pago
 */
export const processPayment = async (
  reservaData,
  paymentFormData,
  tipoPago = 'INICIAL',
) => {
  try {
    logInfo('Iniciando procesamiento de pago completo', {
      reservaData,
      tipoPago,
    });

    // 1. Inicializar Stripe
    const stripe = await initializeStripe();

    // 2. Crear Payment Intent
    const paymentIntent = await createPaymentIntent(reservaData, tipoPago);

    if (!paymentIntent.success) {
      throw new Error(
        paymentIntent.error || 'Error creando el intento de pago',
      );
    }

    // 3. Crear elementos de Stripe (esto se haría en el componente)
    // Por ahora retornamos la información necesaria para el frontend

    logInfo('Payment Intent listo para confirmación', paymentIntent);

    return {
      success: true,
      paymentIntent: paymentIntent,
      stripe: stripe,
      nextStep: 'confirm_payment',
    };
  } catch (error) {
    logError('Error en procesamiento de pago completo', error);
    throw error;
  }
};

/**
 * Obtiene el estado de un pago
 * @param {string} numeroPedido - Número de pedido del pago
 * @returns {Promise<Object>} Estado del pago
 */
export const getPaymentStatus = async (numeroPedido) => {
  try {
    logInfo('Obteniendo estado del pago', { numeroPedido });

    if (shouldUseTestingData(false)) {
      // Simular estado de pago en modo debug
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockStatus = testingStripeMocks.generateMockPaymentStatus(
        `pi_mock_${numeroPedido}`,
      );

      logInfo('Estado de pago simulado', mockStatus);
      return mockStatus;
    }

    const response = await withTimeout(
      axios.get(
        `${API_URL}/payments/stripe/payment-status/${numeroPedido}/`,
        getAuthHeaders(),
      ),
      10000,
    );

    logInfo('Estado de pago obtenido', response.data);
    return response.data;
  } catch (error) {
    logError('Error obteniendo estado del pago', error);

    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      'Error al obtener el estado del pago';

    throw new Error(errorMessage);
  }
};

/**
 * Procesa un reembolso
 * @param {number} pagoId - ID del pago a reembolsar
 * @param {number} importeReembolso - Importe a reembolsar (opcional)
 * @param {string} motivo - Motivo del reembolso
 * @param {string} descripcion - Descripción del reembolso
 * @returns {Promise<Object>} Resultado del reembolso
 */
export const processRefund = async (
  pagoId,
  importeReembolso = null,
  motivo = 'CANCELACION_CLIENTE',
  descripcion = '',
) => {
  try {
    logInfo('Procesando reembolso', { pagoId, importeReembolso, motivo });

    if (shouldUseTestingData(false)) {
      // Simular reembolso en modo debug
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockRefund = testingStripeMocks.generateMockRefund(
        `ch_mock_${pagoId}`,
        importeReembolso || 316.5,
      );

      logInfo('Reembolso simulado procesado', mockRefund);
      return mockRefund;
    }

    const response = await withTimeout(
      axios.post(
        `${API_URL}/payments/stripe/refund/${pagoId}/`,
        {
          importe_reembolso: importeReembolso,
          motivo: motivo,
          descripcion: descripcion,
        },
        getAuthHeaders(),
      ),
      15000,
    );

    logInfo('Reembolso procesado exitosamente', response.data);
    return response.data;
  } catch (error) {
    logError('Error procesando reembolso', error);

    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      'Error al procesar el reembolso';

    throw new Error(errorMessage);
  }
};

/**
 * Obtiene el historial de pagos del usuario
 * @param {Object} filters - Filtros para la consulta
 * @returns {Promise<Object>} Historial de pagos
 */
export const getPaymentHistory = async (filters = {}) => {
  try {
    logInfo('Obteniendo historial de pagos', filters);

    if (shouldUseTestingData(false)) {
      // Simular historial de pagos en modo debug
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockHistory = testingStripeMocks.generateMockPaymentHistory(3);

      logInfo('Historial de pagos simulado', mockHistory);
      return mockHistory;
    }

    // Construir parámetros de consulta
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined) {
        params.append(key, filters[key]);
      }
    });

    const response = await withTimeout(
      axios.get(
        `${API_URL}/payments/stripe/payment-history/?${params.toString()}`,
        getAuthHeaders(),
      ),
      10000,
    );

    logInfo('Historial de pagos obtenido', response.data);
    return response.data;
  } catch (error) {
    logError('Error obteniendo historial de pagos', error);

    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      'Error al obtener el historial de pagos';

    throw new Error(errorMessage);
  }
};

/**
 * Función de compatibilidad con el sistema actual
 * Procesa un pago manteniendo la interfaz actual
 * @param {string} reservaId - ID de la reserva
 * @param {Object} paymentData - Datos del pago
 * @returns {Promise<Object>} Resultado del pago
 */
export const processPaymentLegacy = async (reservaId, paymentData) => {
  try {
    logInfo('Procesando pago (modo legacy)', { reservaId, paymentData });

    if (shouldUseTestingData(false)) {
      // Usar el procesamiento simulado
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        message: 'Pago procesado correctamente (simulado)',
        payment_intent_id: `pi_mock_${Date.now()}`,
        client_secret: `pi_mock_${Date.now()}_secret_mock`,
        publishable_key: 'pk_test_mock',
        numero_pedido: `M4Y-LEG-${reservaId}-${Date.now()}`,
        importe: paymentData.importe || 316.5,
        transaction_id: `M4Y-LEG-${reservaId}-${Date.now()}`,
      };
    }

    const response = await withTimeout(
      axios.post(
        `${API_URL}/payments/process-payment/`,
        {
          reserva_id: reservaId,
          payment_data: paymentData,
          diferencia: paymentData.diferencia,
        },
        getAuthHeaders(),
      ),
      15000,
    );

    logInfo('Pago legacy procesado', response.data);
    return response.data;
  } catch (error) {
    logError('Error en pago legacy', error);

    const errorMessage =
      error.response?.data?.error ||
      error.message ||
      'Error al procesar el pago';

    throw new Error(errorMessage);
  }
};

/**
 * Valida los datos de tarjeta usando Stripe
 * @param {Object} stripe - Instancia de Stripe
 * @param {Object} elements - Instancia de Stripe Elements
 * @returns {Promise<Object>} Resultado de la validación
 */
export const validateCardData = async (stripe, elements) => {
  try {
    logInfo('Validando datos de tarjeta');

    if (!stripe || !elements) {
      throw new Error('Stripe no está correctamente inicializado');
    }

    const cardElement = elements.getElement('card');

    if (!cardElement) {
      throw new Error('Elemento de tarjeta no encontrado');
    }

    // Crear Payment Method para validar la tarjeta
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      logError('Error validando tarjeta', error);
      return {
        valid: false,
        error: error.message,
      };
    }

    logInfo('Tarjeta validada correctamente', paymentMethod);
    return {
      valid: true,
      paymentMethod: paymentMethod,
    };
  } catch (error) {
    logError('Error en validación de tarjeta', error);
    return {
      valid: false,
      error: error.message,
    };
  }
};

/**
 * Utilidades para formateo - MIGRADO AL MAPPER UNIVERSAL
 * @deprecated Usar universalMapper.formatCurrency y universalMapper.formatPaymentDate
 */
export const formatCurrency = (amount, currency = 'EUR') => {
  logger.warn('[DEPRECATED] Usar universalMapper.formatCurrency en su lugar');
  return universalMapper.formatCurrency(amount, currency);
};

/**
 * Utilidades para formateo de fecha - MIGRADO AL MAPPER UNIVERSAL
 * @deprecated Usar universalMapper.formatPaymentDate
 */
export const formatPaymentDate = (dateString) => {
  logger.warn(
    '[DEPRECATED] Usar universalMapper.formatPaymentDate en su lugar',
  );
  return universalMapper.formatPaymentDate(dateString);
};

/**
 * Mapea estados de Stripe a estados locales - MIGRADO AL MAPPER UNIVERSAL
 * @deprecated Usar universalMapper.mapStripeStatus
 */
export const mapStripeStatus = (stripeStatus) => {
  logger.warn('[DEPRECATED] Usar universalMapper.mapStripeStatus en su lugar');
  return universalMapper.mapStripeStatus(stripeStatus);
};

/**
 * Cancela un Payment Intent
 * @param {string} paymentIntentId - ID del Payment Intent a cancelar
 * @param {string} motivo - Motivo de la cancelación
 * @returns {Promise<Object>} Resultado de la cancelación
 */
export const cancelPaymentIntent = async (
  paymentIntentId,
  motivo = 'Usuario canceló el pago',
) => {
  try {
    logInfo('Cancelando Payment Intent', { paymentIntentId, motivo });

    if (shouldUseTestingData(false)) {
      // Simular cancelación en modo debug
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockResult = {
        success: true,
        status: 'canceled',
        payment_intent_id: paymentIntentId,
        numero_pedido: `M4Y-MOCK-${Date.now()}`,
      };

      logInfo('Payment Intent simulado cancelado', mockResult);
      return mockResult;
    }

    const response = await withTimeout(
      axios.post(
        `${API_URL}/payments/stripe/cancel-payment-intent/`,
        {
          payment_intent_id: paymentIntentId,
          motivo: motivo,
        },
        getAuthHeaders(),
      ),
      10000,
    );

    if (response.data.success) {
      logInfo('Payment Intent cancelado exitosamente', response.data);
      return response.data;
    } else {
      throw new Error(response.data.error || 'Error cancelando Payment Intent');
    }
  } catch (error) {
    logError('Error cancelando Payment Intent', error);

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Error al cancelar el intento de pago';

    throw new Error(errorMessage);
  }
};

// Exportar todas las funciones
const StripePaymentServices = {
  initializeStripe,
  getStripeConfig,
  createPaymentIntent,
  confirmPaymentIntent,
  processPayment,
  getPaymentStatus,
  processRefund,
  getPaymentHistory,
  processPaymentLegacy,
  validateCardData,
  formatCurrency,
  formatPaymentDate,
  mapStripeStatus,
  cancelPaymentIntent,
};

export default StripePaymentServices;
