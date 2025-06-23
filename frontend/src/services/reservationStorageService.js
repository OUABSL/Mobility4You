// Servicio especializado para la gestión de reservas temporales en sessionStorage

/**
 * Servicio para gestionar la persistencia temporal de datos de reserva
 * con limpieza automática y manejo de expiración
 */

import { roundToDecimals } from './universalDataMapper';

// Constantes de configuración
const STORAGE_KEYS = {
  RESERVATION_DATA: 'reservaData',
  RESERVATION_TIMER: 'reservaTimer',
  RESERVATION_STEP: 'reservaStep',
  RESERVATION_EXTRAS: 'reservaExtras',
  RESERVATION_CONDUCTOR: 'reservaConductor',
  TIMER_START: 'reservaTimerStart',
  USER_WARNED: 'reservaUserWarned',
};

const TIMER_DURATION = 30 * 60 * 1000; // 30 minutos en millisegundos
const WARNING_TIME = 5 * 60 * 1000; // Avisar 5 minutos antes
const DEBUG_MODE = false; //process.env.NODE_ENV === 'development';

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
   */ initialize() {
    try {
      logInfo('Inicializando servicio de almacenamiento de reservas');

      // Verificar si hay una reserva en progreso
      const existingData = this.getReservationData();
      const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
      const step = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP);

      if (existingData && timerStart) {
        const elapsed = Date.now() - parseInt(timerStart);
        const remaining = TIMER_DURATION - elapsed;

        if (remaining > 0) {
          // Hay tiempo restante, restaurar timer
          logInfo(
            `Restaurando timer con ${Math.round(
              remaining / 1000,
            )} segundos restantes`,
          );
          this.startTimer(remaining);
        } else {
          // Tiempo expirado, limpiar datos
          logInfo(
            'Datos de reserva expirados durante inicialización, limpiando storage',
          );
          this.clearAllReservationData();
        }
      } else if (existingData && !timerStart) {
        // Datos sin timer - verificar si es una reserva completada
        if (step === 'completed') {
          logInfo(
            'Datos de reserva completada encontrados, manteniendo sin timer',
          );
        } else {
          // Datos inconsistentes sin timer y no completada - limpiar
          logInfo(
            'Datos existentes sin timer y no completada, limpiando datos inconsistentes',
          );
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
   * Método de recuperación automática para datos inconsistentes
   */
  autoRecoverReservation() {
    try {
      const reservationData = sessionStorage.getItem(
        STORAGE_KEYS.RESERVATION_DATA,
      );
      const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);

      if (reservationData && !timerStart) {
        logInfo('Recuperando automáticamente reserva sin timer');
        sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
        this.startTimer();
        return true;
      }

      return false;
    } catch (error) {
      logError('Error en recuperación automática', error);
      return false;
    }
  }
  /**
   * Guarda los datos de reserva inicial y comienza el timer
   */
  saveReservationData(data) {
    try {
      logInfo('Guardando datos de reserva', {
        step: 'initial',
        hasData: !!data,
        isLegacyMigration:
          !sessionStorage.getItem(STORAGE_KEYS.TIMER_START) &&
          !!sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA),
      });

      if (!data) {
        throw new Error('No se proporcionaron datos de reserva');
      }

      // Validar datos mínimos requeridos
      this.validateReservationData(data);
      // Verificar si ya existe un timer activo para evitar sobrescribir
      const existingTimerStart = sessionStorage.getItem(
        STORAGE_KEYS.TIMER_START,
      );

      // Guardar datos principales
      sessionStorage.setItem(
        STORAGE_KEYS.RESERVATION_DATA,
        JSON.stringify(data),
      );

      // Solo actualizar el step si no existe o está en un estado inicial
      const currentStep = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP);
      if (!currentStep || currentStep === 'extras') {
        sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'extras');
      }

      // Solo inicializar timer si no existe ya uno activo
      if (!existingTimerStart) {
        sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
        sessionStorage.removeItem(STORAGE_KEYS.USER_WARNED);

        // Iniciar timer de 30 minutos
        this.startTimer();
        logInfo('Nuevo timer iniciado para reserva');
      } else {
        logInfo('Timer existente preservado', {
          existing: existingTimerStart,
          current: Date.now(),
        });
      }

      logInfo('Datos de reserva guardados correctamente');
      return true;
    } catch (error) {
      logError('Error al guardar datos de reserva', error);
      throw error;
    }
  }
  /**
   * Actualiza los datos de extras seleccionados y detalles de precios
   * @param {Array} extrasData - Lista de extras seleccionados
   * @param {Object} detallesReserva - Detalles de precios calculados (opcional)
   */
  updateExtras(extrasData, detallesReserva = null) {
    try {
      logInfo('Actualizando extras', {
        count: extrasData?.length || 0,
        hasDetalles: !!detallesReserva,
      });

      // Debug: verificar estado del storage
      const reservationData = sessionStorage.getItem(
        STORAGE_KEYS.RESERVATION_DATA,
      );
      const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
      const step = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP);
      const elapsed = timerStart ? Date.now() - parseInt(timerStart) : 0;
      const remaining = TIMER_DURATION - elapsed;

      logInfo('Debug - Estado de la reserva antes de updateExtras:', {
        hasReservationData: !!reservationData,
        hasTimerStart: !!timerStart,
        currentStep: step,
        elapsed: Math.round(elapsed / 1000) + 's',
        remaining: Math.round(remaining / 1000) + 's',
        timerDuration: Math.round(TIMER_DURATION / 1000) + 's',
        extrasDataType: Array.isArray(extrasData)
          ? extrasData.length > 0
            ? typeof extrasData[0]
            : 'empty'
          : typeof extrasData,
        detallesReserva: detallesReserva ? Object.keys(detallesReserva) : null,
      });

      // Verificar que hay datos de reserva
      if (!reservationData) {
        throw new Error('No hay datos de reserva para actualizar extras');
      }

      // Intentar recuperación automática si no hay timer pero hay datos
      if (!timerStart && reservationData) {
        logInfo('Inicializando timer para datos existentes');
        sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
        this.startTimer();
      }

      // Verificar si la reserva ha expirado solo si hay timer
      if (timerStart && remaining <= 0) {
        throw new Error(
          'La reserva ha expirado. Por favor, inicie una nueva búsqueda.',
        );
      }

      // Asegurar que guardamos objetos completos de extras, no solo IDs
      const extrasToSave = Array.isArray(extrasData) ? extrasData : [];

      // Si se proporcionan detalles de reserva, actualizar los datos base
      if (detallesReserva) {
        try {
          const currentData = JSON.parse(reservationData);
          const updatedData = {
            ...currentData,
            detallesReserva,
            // También agregar campos de compatibilidad para componentes legacy
            precioBase:
              detallesReserva.precioCocheBase || detallesReserva.base || 0,
            precio_base:
              detallesReserva.precioCocheBase || detallesReserva.base || 0,
            precioExtras: roundToDecimals(
              detallesReserva.precioExtras || detallesReserva.extras || 0,
            ),
            precio_extras: roundToDecimals(
              detallesReserva.precioExtras || detallesReserva.extras || 0,
            ),
            precioImpuestos: roundToDecimals(
              detallesReserva.iva || detallesReserva.impuestos || 0,
            ),
            precio_impuestos: roundToDecimals(
              detallesReserva.iva || detallesReserva.impuestos || 0,
            ),
            precioTotal: roundToDecimals(detallesReserva.total || 0),
            precio_total: roundToDecimals(detallesReserva.total || 0),
          };

          sessionStorage.setItem(
            STORAGE_KEYS.RESERVATION_DATA,
            JSON.stringify(updatedData),
          );

          logInfo('Detalles de precios actualizados en datos base:', {
            total: detallesReserva.total,
            base: detallesReserva.precioCocheBase || detallesReserva.base,
            extras: detallesReserva.precioExtras || detallesReserva.extras,
            iva: detallesReserva.iva || detallesReserva.impuestos,
          });
        } catch (parseError) {
          logError(
            'Error al actualizar detalles de precios en datos base',
            parseError,
          );
        }
      }

      sessionStorage.setItem(
        STORAGE_KEYS.RESERVATION_EXTRAS,
        JSON.stringify(extrasToSave),
      );
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'conductor');

      logInfo('Extras actualizados correctamente', {
        extrasCount: extrasToSave.length,
        extrasType: extrasToSave.length > 0 ? typeof extrasToSave[0] : 'none',
        hasCompleteObjects:
          extrasToSave.length > 0 &&
          typeof extrasToSave[0] === 'object' &&
          extrasToSave[0].nombre,
        nextStep: 'conductor',
        pricingUpdated: !!detallesReserva,
      });
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

      // Debug: verificar estado antes de proceder
      const reservationData = sessionStorage.getItem(
        STORAGE_KEYS.RESERVATION_DATA,
      );
      const timerStart = sessionStorage.getItem(STORAGE_KEYS.TIMER_START);
      const step = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP);

      logInfo('Debug - Estado antes de updateConductorData:', {
        hasReservationData: !!reservationData,
        hasTimerStart: !!timerStart,
        currentStep: step,
      });

      // Verificar que hay datos de reserva
      if (!reservationData) {
        throw new Error('No hay datos de reserva para actualizar conductor');
      }

      // Intentar recuperación automática si no hay timer pero hay datos
      if (!timerStart && reservationData) {
        logInfo('Inicializando timer para datos existentes');
        sessionStorage.setItem(STORAGE_KEYS.TIMER_START, Date.now().toString());
        this.startTimer();
      }

      // Verificar si la reserva ha expirado solo si hay timer
      if (timerStart) {
        const elapsed = Date.now() - parseInt(timerStart);
        if (elapsed >= TIMER_DURATION) {
          throw new Error(
            'La reserva ha expirado. Por favor, inicie una nueva búsqueda.',
          );
        }
      }

      // Validar datos del conductor
      this.validateConductorData(conductorData);

      sessionStorage.setItem(
        STORAGE_KEYS.RESERVATION_CONDUCTOR,
        JSON.stringify(conductorData),
      );
      sessionStorage.setItem(STORAGE_KEYS.RESERVATION_STEP, 'pago');

      logInfo('Datos del conductor actualizados correctamente');
      return true;
    } catch (error) {
      logError('Error al actualizar datos del conductor', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos del conductor sin validación estricta (para cambios intermedios)
   */
  updateConductorDataIntermediate(conductorData) {
    try {
      logInfo('Actualizando datos del conductor (modo intermedio)');

      // Verificar que hay datos de reserva
      const reservationData = sessionStorage.getItem(
        STORAGE_KEYS.RESERVATION_DATA,
      );
      if (!reservationData) {
        // En modo intermedio, intentar recuperación silenciosa
        this.autoRecoverReservation();
        if (!sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA)) {
          logInfo('No se pueden guardar datos intermedios sin reserva base');
          return false;
        }
      }

      // Marcar como update intermedio para saltear validaciones estrictas
      const dataToSave = { ...conductorData, _isIntermediateUpdate: true };

      sessionStorage.setItem(
        STORAGE_KEYS.RESERVATION_CONDUCTOR,
        JSON.stringify(dataToSave),
      );

      logInfo('Datos intermedios del conductor guardados');
      return true;
    } catch (error) {
      logError('Error al guardar datos intermedios del conductor', error);
      return false;
    }
  }
  /**
   * Obtiene todos los datos de la reserva consolidados
   */
  async getCompleteReservationData() {
    try {
      if (!this.hasActiveReservation()) {
        return null;
      }

      const baseData = JSON.parse(
        sessionStorage.getItem(STORAGE_KEYS.RESERVATION_DATA) || 'null',
      );
      const extrasRaw = JSON.parse(
        sessionStorage.getItem(STORAGE_KEYS.RESERVATION_EXTRAS) || '[]',
      );
      const conductor = JSON.parse(
        sessionStorage.getItem(STORAGE_KEYS.RESERVATION_CONDUCTOR) || 'null',
      );
      const step =
        sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP) || 'extras';

      if (!baseData) {
        return null;
      }

      // Procesar extras: convertir IDs a objetos completos cuando sea necesario
      let extras = extrasRaw;

      // Si extras son solo IDs (números), intentar obtener los objetos completos
      if (extrasRaw.length > 0 && typeof extrasRaw[0] === 'number') {
        logInfo(
          'Detectados extras como IDs, intentando obtener objetos completos',
        );

        try {
          // Importar dinámicamente el servicio de reservas para evitar dependencia circular
          const { getExtrasDisponibles } = await import(
            './reservationServices.js'
          );
          const availableExtras = await getExtrasDisponibles();

          // Mapear IDs a objetos completos
          extras = extrasRaw
            .map((extraId) => {
              const extraCompleto = availableExtras.find(
                (e) => e.id === extraId,
              );
              if (extraCompleto) {
                return {
                  ...extraCompleto,
                  cantidad: 1, // Cantidad por defecto
                };
              } else {
                logError(
                  `Extra con ID ${extraId} no encontrado en la lista de disponibles`,
                );
                return null;
              }
            })
            .filter(Boolean); // Filtrar nulls

          logInfo(
            `Extras convertidos de IDs a objetos: ${extrasRaw.length} IDs -> ${extras.length} objetos`,
          );
        } catch (fetchError) {
          logError(
            'Error al obtener extras disponibles, manteniendo IDs originales',
            fetchError,
          );
          // En caso de error, mantener los IDs originales
          extras = extrasRaw;
        }
      }

      // Calcular detalles de precios si no están presentes
      let detallesReserva = baseData.detallesReserva;
      if (!detallesReserva && baseData.precioTotal) {
        // Construir detallesReserva a partir de datos disponibles
        const precioBase = baseData.precioBase || baseData.precio_base || 0;
        const precioExtras = extras.reduce((total, extra) => {
          return total + (extra.precio || 0) * (extra.cantidad || 1);
        }, 0);
        const precioImpuestos =
          baseData.precioImpuestos || baseData.precio_impuestos || 0;
        const descuentoPromocion =
          baseData.descuentoPromocion || baseData.descuento_promocion || 0;
        const total =
          baseData.precioTotal ||
          baseData.precio_total ||
          precioBase + precioExtras + precioImpuestos - descuentoPromocion;

        detallesReserva = {
          base: precioBase,
          extras: precioExtras,
          impuestos: precioImpuestos,
          descuento: descuentoPromocion,
          total: total,
        };
      }

      // Asegurar que los extras estén disponibles tanto en 'extras' como en 'extrasSeleccionados' para compatibilidad
      const completeData = {
        ...baseData,
        extras: extras,
        extrasSeleccionados: extras, // Para compatibilidad con componentes que usan 'extrasSeleccionados'
        conductor: conductor,
        conductorPrincipal: conductor, // Para compatibilidad con componentes que usan 'conductorPrincipal'
        detallesReserva: detallesReserva, // Asegurar que siempre esté presente

        // Campos de precio adicionales para compatibilidad
        precioBase:
          detallesReserva?.base ||
          baseData.precioBase ||
          baseData.precio_base ||
          0,
        precioExtras: detallesReserva?.extras || 0,
        precioImpuestos:
          detallesReserva?.impuestos ||
          baseData.precioImpuestos ||
          baseData.precio_impuestos ||
          0,
        descuentoPromocion:
          detallesReserva?.descuento ||
          baseData.descuentoPromocion ||
          baseData.descuento_promocion ||
          0,
        precioTotal:
          detallesReserva?.total ||
          baseData.precioTotal ||
          baseData.precio_total ||
          0,

        currentStep: step,
        timerStart: parseInt(
          sessionStorage.getItem(STORAGE_KEYS.TIMER_START) || '0',
        ),
        remainingTime: this.getRemainingTime(),
      };

      logInfo('Datos completos de reserva obtenidos', {
        step,
        hasExtras: extras.length > 0,
        hasConductor: !!conductor,
        extrasCount: extras.length,
        hasDetallesReserva: !!detallesReserva,
        precioTotal: completeData.precioTotal,
        extrasType: extras.length > 0 ? typeof extras[0] : 'none',
      });
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
      const conductor = sessionStorage.getItem(
        STORAGE_KEYS.RESERVATION_CONDUCTOR,
      );
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
    const step = sessionStorage.getItem(STORAGE_KEYS.RESERVATION_STEP);

    // Si no hay datos de reserva, no hay reserva activa
    if (!data) {
      if (DEBUG_MODE) {
        console.log(
          '[ReservationStorage] hasActiveReservation = false: No reservation data',
        );
      }
      return false;
    }

    // Si la reserva está marcada como completada, está activa pero no necesita timer
    if (step === 'completed') {
      if (DEBUG_MODE) {
        console.log(
          '[ReservationStorage] hasActiveReservation = true: Reservation completed',
        );
      }
      return true;
    }

    // Si no hay timer start, la reserva no está activa (se requiere timer para validez)
    if (!timerStart) {
      if (DEBUG_MODE) {
        console.log(
          '[ReservationStorage] hasActiveReservation = false: No timer start found',
        );
      }
      return false;
    }

    // Verificar si no ha expirado
    const elapsed = Date.now() - parseInt(timerStart);
    const isActive = elapsed < TIMER_DURATION;

    if (DEBUG_MODE) {
      console.log('[ReservationStorage] hasActiveReservation =', isActive, {
        elapsed: Math.round(elapsed / 1000) + 's',
        duration: Math.round(TIMER_DURATION / 1000) + 's',
        step: step,
      });
    }

    // Si ha expirado, limpiar datos automáticamente
    if (!isActive) {
      if (DEBUG_MODE) {
        console.log(
          '[ReservationStorage] Reservation expired, cleaning up data',
        );
      }
      this.clearAllReservationData();
    }

    return isActive;
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
      Object.values(STORAGE_KEYS).forEach((key) => {
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
    // Validación básica de que hay datos
    if (!data || typeof data !== 'object') {
      throw new Error('Datos de reserva inválidos');
    }

    // Campos alternativos para diferentes formatos de datos
    const hasCarData = data.car || data.vehiculo;
    const hasFechas =
      data.fechas || (data.fechaRecogida && data.fechaDevolucion);

    // Verificar ubicación en diferentes formatos posibles
    const hasLocation =
      data.pickupLocation ||
      data.lugarRecogida ||
      data.lugar_recogida ||
      (data.fechas && data.fechas.pickupLocation) ||
      (data.fechas && data.fechas.lugarRecogida);

    if (!hasCarData) {
      throw new Error('Datos del vehículo son requeridos');
    }

    if (!hasFechas) {
      throw new Error('Datos de fechas son requeridos');
    }

    if (!hasLocation) {
      throw new Error('Datos de ubicación son requeridos');
    }

    // Validar fechas si están disponibles
    if (data.fechas) {
      const fechaInicio = data.fechas.pickupDate || data.fechas.inicio;
      const fechaFin = data.fechas.dropoffDate || data.fechas.fin;

      if (!fechaInicio || !fechaFin) {
        logInfo(
          'Fechas incompletas en datos.fechas, pero continúando con validación flexible',
        );
      } else {
        // Validar que las fechas sean válidas
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        if (inicio >= fin) {
          throw new Error(
            'La fecha de fin debe ser posterior a la fecha de inicio',
          );
        }

        // Comentamos esta validación para datos legacy que pueden tener fechas pasadas
        // if (inicio < new Date()) {
        //   throw new Error('La fecha de inicio no puede ser en el pasado');
        // }
      }
    }

    logInfo('Validación de datos de reserva completada exitosamente');
  }
  /**
   * Valida los datos del conductor
   */
  validateConductorData(conductorData) {
    // Para validación durante escritura (modo permisivo)
    if (conductorData._isIntermediateUpdate) {
      logInfo('Validación intermedia de conductor - modo permisivo');
      return; // No validar durante updates intermedios
    }

    const requiredFields = [
      'nombre',
      'apellidos',
      'email',
      'telefono',
      'numeroDocumento',
    ];

    for (const field of requiredFields) {
      if (!conductorData[field]) {
        throw new Error(`Campo del conductor requerido: ${field}`);
      }
    }

    // Validar email solo si no está vacío
    if (conductorData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(conductorData.email)) {
        throw new Error('Email del conductor inválido');
      }
    }

    // Validar términos aceptados solo en envío final del formulario
    // No validar durante cambios intermedios de input
    if (conductorData.aceptaTerminos === false) {
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

export const updateExtras = (extras, detallesReserva = null) => {
  return getReservationStorageService().updateExtras(extras, detallesReserva);
};

export const updateConductorData = (conductorData) => {
  return getReservationStorageService().updateConductorData(conductorData);
};

export const updateConductorDataIntermediate = (conductorData) => {
  return getReservationStorageService().updateConductorDataIntermediate(
    conductorData,
  );
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

export const autoRecoverReservation = () => {
  return getReservationStorageService().autoRecoverReservation();
};

export const initializeStorageService = () => {
  return getReservationStorageService().initialize();
};

// Inicializar automáticamente el servicio solo en páginas de reserva
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Solo inicializar en páginas de reserva
    const currentPath = window.location.pathname;
    const isReservationPage =
      currentPath.includes('/reservation') ||
      currentPath.includes('/extras') ||
      currentPath.includes('/confirmar') ||
      currentPath.includes('/pago');

    if (isReservationPage) {
      getReservationStorageService().initialize();
    }
  });
}

export default ReservationStorageService;
