// Hook personalizado para manejar el timer de reserva

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getReservationStorageService } from '../services/reservationStorageService';

/**
 * Hook personalizado para manejar el timer de reservas y sus estados
 */
const useReservationTimer = () => {
  const navigate = useNavigate();
  const storageService = useRef(getReservationStorageService());
  
  // Estados del timer
  const [remainingTime, setRemainingTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [formattedTime, setFormattedTime] = useState('30:00');

  /**
   * Actualiza el tiempo restante y formato
   */
  const updateTime = useCallback(() => {
    try {
      const remaining = storageService.current.getRemainingTime();
      const formatted = storageService.current.getFormattedRemainingTime();
      const hasActive = storageService.current.hasActiveReservation();
      
      setRemainingTime(remaining);
      setFormattedTime(formatted);
      setIsActive(hasActive);
      
      // Si no hay tiempo restante y había una reserva activa, mostrar modal de expiración
      if (remaining <= 0 && hasActive) {
        setShowExpiredModal(true);
        setIsActive(false);
      }
    } catch (error) {
      console.error('[useReservationTimer] Error al actualizar tiempo:', error);
      setIsActive(false);
      setRemainingTime(0);
      setFormattedTime('00:00');
    }
  }, []);

  /**
   * Maneja la advertencia de expiración
   */
  const handleWarning = useCallback((timeLeft) => {
    console.log('[useReservationTimer] Mostrando advertencia de expiración');
    setShowWarningModal(true);
  }, []);

  /**
   * Maneja la expiración del timer
   */
  const handleExpiration = useCallback(() => {
    console.log('[useReservationTimer] Timer expirado');
    setShowExpiredModal(true);
    setIsActive(false);
    updateTime();
  }, [updateTime]);

  /**
   * Inicializa el timer con una nueva reserva
   */
  const startTimer = useCallback((reservationData) => {
    try {
      console.log('[useReservationTimer] Iniciando timer para nueva reserva');
      
      if (!reservationData) {
        throw new Error('No se proporcionaron datos de reserva');
      }
      
      // Guardar datos y comenzar timer
      storageService.current.saveReservationData(reservationData);
      setIsActive(true);
      updateTime();
      
      console.log('[useReservationTimer] Timer iniciado correctamente');
      return true;
    } catch (error) {
      console.error('[useReservationTimer] Error al iniciar timer:', error);
      return false;
    }
  }, [updateTime]);

  /**
   * Extiende el timer por 30 minutos más
   */
  const extendTimer = useCallback(async () => {
    try {
      console.log('[useReservationTimer] Extendiendo timer');
      
      const success = storageService.current.extendTimer();
      if (success) {
        setShowWarningModal(false);
        setShowExpiredModal(false);
        updateTime();
        console.log('[useReservationTimer] Timer extendido correctamente');
        return true;
      } else {
        throw new Error('No se pudo extender el timer');
      }
    } catch (error) {
      console.error('[useReservationTimer] Error al extender timer:', error);
      return false;
    }
  }, [updateTime]);

  /**
   * Pausa el timer (marca como completado)
   */
  const pauseTimer = useCallback(() => {
    try {
      console.log('[useReservationTimer] Pausando timer');
      storageService.current.markReservationCompleted();
      setIsActive(false);
      return true;
    } catch (error) {
      console.error('[useReservationTimer] Error al pausar timer:', error);
      return false;
    }
  }, []);

  /**
   * Cancela la reserva y limpia todos los datos
   */
  const cancelReservation = useCallback(() => {
    try {
      console.log('[useReservationTimer] Cancelando reserva');
      storageService.current.clearAllReservationData();
      setIsActive(false);
      setShowWarningModal(false);
      setShowExpiredModal(false);
      setRemainingTime(0);
      setFormattedTime('00:00');
      
      // Navegar al inicio
      navigate('/');
      return true;
    } catch (error) {
      console.error('[useReservationTimer] Error al cancelar reserva:', error);
      return false;
    }
  }, [navigate]);

  /**
   * Continúa con una nueva reserva después de expiración
   */
  const startNewReservation = useCallback(() => {
    try {
      console.log('[useReservationTimer] Iniciando nueva reserva');
      storageService.current.clearAllReservationData();
      setShowExpiredModal(false);
      setIsActive(false);
      
      // Navegar a búsqueda de coches
      navigate('/coches');
      return true;
    } catch (error) {
      console.error('[useReservationTimer] Error al iniciar nueva reserva:', error);
      return false;
    }
  }, [navigate]);

  /**
   * Cierra modales sin acciones adicionales
   */
  const closeModals = useCallback(() => {
    setShowWarningModal(false);
    setShowExpiredModal(false);
  }, []);

  /**
   * Obtiene el estado actual completo de la reserva
   */
  const getReservationState = useCallback(() => {
    try {
      return {
        isActive,
        remainingTime,
        formattedTime,
        hasActiveReservation: storageService.current.hasActiveReservation(),
        currentStep: storageService.current.getCurrentStep(),
        reservationData: storageService.current.getCompleteReservationData()
      };
    } catch (error) {
      console.error('[useReservationTimer] Error al obtener estado:', error);
      return {
        isActive: false,
        remainingTime: 0,
        formattedTime: '00:00',
        hasActiveReservation: false,
        currentStep: 'extras',
        reservationData: null
      };
    }
  }, [isActive, remainingTime, formattedTime]);

  /**
   * Restaura una reserva existente al cargar el componente
   */
  const restoreExistingReservation = useCallback(() => {
    try {
      console.log('[useReservationTimer] Verificando reserva existente');
      
      const hasReservation = storageService.current.hasActiveReservation();
      if (hasReservation) {
        console.log('[useReservationTimer] Restaurando reserva existente');
        setIsActive(true);
        updateTime();
      } else {
        console.log('[useReservationTimer] No hay reserva existente');
        setIsActive(false);
      }
    } catch (error) {
      console.error('[useReservationTimer] Error al restaurar reserva:', error);
      setIsActive(false);
    }
  }, [updateTime]);

  // Configurar callbacks del servicio de almacenamiento
  useEffect(() => {
    try {
      storageService.current.setOnWarningCallback(handleWarning);
      storageService.current.setOnExpirationCallback(handleExpiration);
      
      // Restaurar reserva existente si la hay
      restoreExistingReservation();
      
      return () => {
        storageService.current.setOnWarningCallback(null);
        storageService.current.setOnExpirationCallback(null);
      };
    } catch (error) {
      console.error('[useReservationTimer] Error al configurar callbacks:', error);
    }
  }, [handleWarning, handleExpiration, restoreExistingReservation]);

  // Actualizar tiempo cada segundo cuando está activo
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isActive, updateTime]);

  // Retornar API del hook
  return {
    // Estados
    isActive,
    remainingTime,
    formattedTime,
    showWarningModal,
    showExpiredModal,
    
    // Acciones
    startTimer,
    extendTimer,
    pauseTimer,
    cancelReservation,
    startNewReservation,
    closeModals,
    
    // Utilidades
    getReservationState,
    restoreExistingReservation,
    updateTime,
    
    // Funciones para los modales
    onExtendTimer: extendTimer,
    onCancelReservation: cancelReservation,
    onStartNewReservation: startNewReservation,
    onCloseModals: closeModals
  };
};

export default useReservationTimer;
