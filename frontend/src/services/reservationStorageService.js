// Servicio especializado para la gestión de reservas temporales en sessionStorage

/**
 * Servicio para gestionar la persistencia temporal de datos de reserva
 * con limpieza automática y manejo de expiración
 */

// Constantes de configuración
const STORAGE_KEYS = {
  RESERVATION_DATA: 'reservaData',
  RESERVATION_TIMER: 'reservaTimer',
  RESERVATION_STEP: 'reservaStep',
  RESERVATION_EXTRAS: 'reservaExtras',
  RESERVATION_CONDUCTOR: 'reservaConductor',
  TIMER_START: 'reservaTimerStart',
  USER_WARNED: 'reservaUserWarned'
};

const TIMER_DURATION = 30 * 60 * 1000; // 30 minutos en millisegundos
const WARNING_TIME = 5 * 60 * 1000; // Avisar 5 minutos antes
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Helper para logging condicional
 */
const logInfo = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`[ReservationStorage] ${message}`, data || '');
  }
};

const logError = (message, error = null) => {
  if (DEBUG_MODE) {
    console.error(`[ReservationStorage] ${message}`, error || '');
  }
};

/**
 * Clase principal del servicio de almacenamiento de reservas
 */
class ReservationStorageService {
  constructor() {
    this.timerId = null;
    this.warningTimerId = null;
    this.onExpirationCallback = null;
    this.onWarningCallback = null;
    this.isInitialized = false;
    
    // Configurar limpieza automática al cerrar ventana
    this.setupWindowCleanup();
    
    logInfo('ReservationStorageService inicializado');
  }

  /**
   * Inicializa el servicio y verifica si hay datos existentes
   */
  initialize() {
    try {
      logInfo('Inicializando servicio de almacenamiento de reservas');
      
      // Verificar si hay una reserva en progreso
      const existingData = this.getReservationData();
      const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
      
      if (existingData && timerStart) {
        const elapsed = Date.now() - parseInt(timerStart);
        const remaining = TIMER_DURATION - elapsed;
        
        if (remaining > 0) {
          // Hay tiempo restante, restaurar timer
          logInfo(`Restaurando timer con ${Math.round(remaining / 1000)} segundos restantes`);
          this.startTimer(remaining);
        } else {
          // Tiempo expirado, limpiar datos
          logInfo('Datos de reserva expirados, limpiando storage');
          this.clearAllReservationData();
        }
      }
      
      this.isInitialized = true;
      logInfo('Servicio inicializado correctamente');
    } catch (error) {
      logError('Error al inicializar servicio', error);
      this.clearAllReservationData();
    }
  }

  /**
   * Guarda los datos de reserva inicial y comienza el timer
   */
  saveReservationData(data) {
    try {
      logInfo('Guardando datos de reserva', { step: 'initial', hasData: !!data });
      
      if (!data) {
        throw new Error('No se proporcionaron datos de reserva');
      }
      
      // Validar datos mínimos requeridos
      this.validateReservationData(data);
      
      // Guardar datos principales
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_DATA, JSON.stringify(data));
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'extras');
      sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
      sessionStorage.removeItem(STORAGE_KEYS.USER_WARNED);
      
      // Iniciar timer de 30 minutos
      this.startTimer();
      
      logInfo('Datos de reserva guardados correctamente');
      return true;
    } catch (error) {
      logError('Error al guardar datos de reserva', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de extras seleccionados
   */
  updateExtras(extras) {
    try {
      logInfo('Actualizando extras', { count: extras?.length || 0 });
      
      if (!this.hasActiveReservation()) {
        throw new Error('No hay reserva activa para actualizar extras');
      }
      
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_EXTRAS, JSON.stringify(extras || []));
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'conductor');
      
      logInfo('Extras actualizados correctamente');
      return true;
    } catch (error) {
      logError('Error al actualizar extras', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos del conductor
   */
  updateConductorData(conductorData) {
    try {
      logInfo('Actualizando datos del conductor');
      
      if (!this.hasActiveReservation()) {
        throw new Error('No hay reserva activa para actualizar conductor');
      }
      
      // Validar datos del conductor
      this.validateConductorData(conductorData);
      
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_CONDUCTOR, JSON.stringify(conductorData));
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'pago');
      
      logInfo('Datos del conductor actualizados correctamente');
      return true;
    } catch (error) {
      logError('Error al actualizar datos del conductor', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los datos de la reserva consolidados
   */
  getCompleteReservationData() {
    try {
      if (!this.hasActiveReservation()) {
        return null;
      }
      
      const baseData = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA) || 'null');
      const extras = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.RESERVATION_EXTRAS) || '[]');
      const conductor = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.RESERVATION_CONDUCTOR) || 'null');
      const step = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP) || 'extras';
      
      if (!baseData) {
        return null;
      }
      
      const completeData = {
        ...baseData,
        extras: extras,
        conductor: conductor,
        currentStep: step,
        timerStart: parseInt(sessionStorage.getItem(STORAGE_KEYS.TIMER_START) || '0'),
        remainingTime: this.getRemainingTime()
      };
      
      logInfo('Datos completos de reserva obtenidos', { step, hasExtras: extras.length > 0, hasConductor: !!conductor });
      return completeData;
    } catch (error) {
      logError('Error al obtener datos completos de reserva', error);
      return null;
    }
  }

  /**
   * Obtiene solo los datos base de la reserva
   */
  getReservationData() {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logError('Error al obtener datos de reserva', error);
      return null;
    }
  }

  /**
   * Obtiene los extras seleccionados
   */
  getExtras() {
    try {
      const extras = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_EXTRAS);
      return extras ? JSON.parse(extras) : [];
    } catch (error) {
      logError('Error al obtener extras', error);
      return [];
    }
  }

  /**
   * Obtiene los datos del conductor
   */
  getConductorData() {
    try {
      const conductor = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_CONDUCTOR);
      return conductor ? JSON.parse(conductor) : null;
    } catch (error) {
      logError('Error al obtener datos del conductor', error);
      return null;
    }
  }

  /**
   * Obtiene el paso actual de la reserva
   */
  getCurrentStep() {
    return sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP) || 'extras';
  }

  /**
   * Verifica si hay una reserva activa
   */
  hasActiveReservation() {
    const data = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA);
    const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
    
    if (!data || !timerStart) {
      return false;
    }
    
    // Verificar si no ha expirado
    const elapsed = Date.now() - parseInt(timerStart);
    return elapsed < TIMER_DURATION;
  }

  /**
   * Obtiene el tiempo restante en millisegundos
   */
  getRemainingTime() {
    const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
    if (!timerStart) {
      return 0;
    }
    
    const elapsed = Date.now() - parseInt(timerStart);
    const remaining = TIMER_DURATION - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Formatea el tiempo restante en formato legible
   */
  getFormattedRemainingTime() {
    const remaining = this.getRemainingTime();
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Inicia el timer de expiración
   */
  startTimer(customDuration = null) {
    try {
      this.clearTimers();
      
      const duration = customDuration || TIMER_DURATION;
      const warningTime = Math.max(0, duration - WARNING_TIME);
      
      logInfo(`Iniciando timer por ${Math.round(duration / 1000)} segundos`);
      
      // Timer de advertencia (5 minutos antes)
      if (warningTime > 0) {
        this.warningTimerId = setTimeout(() => {
          this.handleWarning();
        }, warningTime);
      }
      
      // Timer de expiración
      this.timerId = setTimeout(() => {
        this.handleExpiration();
      }, duration);
      
    } catch (error) {
      logError('Error al iniciar timer', error);
    }
  }

  /**
   * Maneja la advertencia de expiración
   */
  handleWarning() {
    try {
      const userWarned = sessionStorage.getItem(STORAGE_KEYS.USER_WARNED);
      if (userWarned) {
        return; // Ya se advirtió al usuario
      }
      
      sessionStorage.setItem(STORAGE_KEYS.USER_WARNED, 'true');
      
      logInfo('Mostrando advertencia de expiración');
      
      if (this.onWarningCallback) {
        this.onWarningCallback(this.getRemainingTime());
      }
    } catch (error) {
      logError('Error al manejar advertencia', error);
    }
  }

  /**
   * Maneja la expiración del timer
   */
  handleExpiration() {
    try {
      logInfo('Timer de reserva expirado, iniciando limpieza');
      
      if (this.onExpirationCallback) {
        this.onExpirationCallback();
      }
      
      // Limpiar datos después de callback
      setTimeout(() => {
        this.clearAllReservationData();
      }, 100);
      
    } catch (error) {
      logError('Error al manejar expiración', error);
      this.clearAllReservationData();
    }
  }

  /**
   * Extiende el timer por 30 minutos más
   */
  extendTimer() {
    try {
      logInfo('Extendiendo timer de reserva');
      
      if (!this.hasActiveReservation()) {
        throw new Error('No hay reserva activa para extender');
      }
      
      // Actualizar tiempo de inicio
      sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
      sessionStorage.removeItem(STORAGE_KEYS.USER_WARNED);
      
      // Reiniciar timer
      this.startTimer();
      
      logInfo('Timer extendido correctamente');
      return true;
    } catch (error) {
      logError('Error al extender timer', error);
      return false;
    }
  }

  /**
   * Marca la reserva como completada (para evitar limpieza automática)
   */
  markReservationCompleted() {
    try {
      logInfo('Marcando reserva como completada');
      this.clearTimers();
      
      // Mantener los datos pero eliminar el timer
      sessionStorage.removeItem(STORAGE_KEYS.TIMER_START);
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'completed');
      
      logInfo('Reserva marcada como completada');
      return true;
    } catch (error) {
      logError('Error al marcar reserva como completada', error);
      return false;
    }
  }

  /**
   * Limpia todos los datos de reserva del storage
   */
  clearAllReservationData() {
    try {
      logInfo('Limpiando todos los datos de reserva del storage');
      
      // Limpiar timers
      this.clearTimers();
      
      // Limpiar storage
      Object.values(STORAGE_KEYS).forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      logInfo('Datos de reserva limpiados correctamente');
    } catch (error) {
      logError('Error al limpiar datos de reserva', error);
    }
  }

  /**
   * Limpia los timers activos
   */
  clearTimers() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    if (this.warningTimerId) {
      clearTimeout(this.warningTimerId);
      this.warningTimerId = null;
    }
  }

  /**
   * Configura la limpieza automática al cerrar ventana
   */
  setupWindowCleanup() {
    try {
      // Limpiar datos al cerrar ventana/pestaña
      window.addEventListener('beforeunload', () => {
        logInfo('Ventana cerrándose, limpiando datos de reserva');
        this.clearAllReservationData();
      });
      
      // Limpiar datos al cambiar de página (para SPAs)
      window.addEventListener('pagehide', () => {
        logInfo('Página ocultándose, limpiando datos de reserva');
        this.clearAllReservationData();
      });
      
      // Detectar cuando la pestaña se vuelve inactiva por mucho tiempo
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          logInfo('Pestaña oculta');
        } else {
          logInfo('Pestaña visible, verificando estado de reserva');
          // Verificar si la reserva sigue siendo válida
          if (this.hasActiveReservation() && !this.timerId) {
            // Restaurar timer si es necesario
            const remaining = this.getRemainingTime();
            if (remaining > 0) {
              this.startTimer(remaining);
            } else {
              this.clearAllReservationData();
            }
          }
        }
      });
      
      logInfo('Limpieza automática de ventana configurada');
    } catch (error) {
      logError('Error al configurar limpieza automática', error);
    }
  }

  /**
   * Valida los datos mínimos de una reserva
   */
  validateReservationData(data) {
    const requiredFields = ['fechas', 'car', 'pickupLocation', 'dropoffLocation'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }
    
    // Validar fechas
    if (!data.fechas.inicio || !data.fechas.fin) {
      throw new Error('Fechas de inicio y fin son requeridas');
    }
    
    // Validar que las fechas sean válidas
    const inicio = new Date(data.fechas.inicio);
    const fin = new Date(data.fechas.fin);
    
    if (inicio >= fin) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    }
    
    if (inicio < new Date()) {
      throw new Error('La fecha de inicio no puede ser en el pasado');
    }
  }

  /**
   * Valida los datos del conductor
   */
  validateConductorData(conductorData) {
    const requiredFields = ['nombre', 'apellidos', 'email', 'telefono', 'numeroDocumento'];
    
    for (const field of requiredFields) {
      if (!conductorData[field]) {
        throw new Error(`Campo del conductor requerido: ${field}`);
      }
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(conductorData.email)) {
      throw new Error('Email del conductor inválido');
    }
    
    // Validar términos aceptados
    if (!conductorData.aceptaTerminos) {
      throw new Error('Debe aceptar los términos y condiciones');
    }
  }

  /**
   * Configura callback para cuando expire la reserva
   */
  setOnExpirationCallback(callback) {
    this.onExpirationCallback = callback;
  }

  /**
   * Configura callback para advertencia de expiración
   */
  setOnWarningCallback(callback) {
    this.onWarningCallback = callback;
  }

  /**
   * Destruye el servicio y limpia todos los recursos
   */
  destroy() {
    try {
      logInfo('Destruyendo servicio de almacenamiento');
      this.clearTimers();
      this.onExpirationCallback = null;
      this.onWarningCallback = null;
      this.isInitialized = false;
      logInfo('Servicio destruido correctamente');
    } catch (error) {
      logError('Error al destruir servicio', error);
    }
  }
}

// Instancia singleton del servicio
let reservationStorageInstance = null;

/**
 * Obtiene la instancia singleton del servicio
 */
export const getReservationStorageService = () => {
  if (!reservationStorageInstance) {
    reservationStorageInstance = new ReservationStorageService();
  }
  return reservationStorageInstance;
};

/**
 * Funciones de conveniencia para uso directo
 */
export const saveReservationData = (data) => {
  return getReservationStorageService().saveReservationData(data);
};

export const updateExtras = (extras) => {
  return getReservationStorageService().updateExtras(extras);
};

export const updateConductorData = (conductorData) => {
  return getReservationStorageService().updateConductorData(conductorData);
};

export const getCompleteReservationData = () => {
  return getReservationStorageService().getCompleteReservationData();
};

export const clearAllReservationData = () => {
  return getReservationStorageService().clearAllReservationData();
};

export const hasActiveReservation = () => {
  return getReservationStorageService().hasActiveReservation();
};

export const extendTimer = () => {
  return getReservationStorageService().extendTimer();
};

export const markReservationCompleted = () => {
  return getReservationStorageService().markReservationCompleted();
};

// Inicializar automáticamente el servicio
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    getReservationStorageService().initialize();
  });
}

export default ReservationStorageService;
