// src/context/AlertContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

// Crear el contexto
const AlertContext = createContext(null);

/**
 * Hook personalizado para usar el contexto de alertas
 * @returns {Object} El contexto de alertas
 */
export const useAlertContext = () => useContext(AlertContext);

/**
 * Proveedor del contexto de alertas
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 */
export const AlertProvider = ({ children }) => {
  // Estado inicial de la alerta
  const [alert, setAlert] = useState({
    show: false,
    message: '',
    variant: 'info', // 'success', 'danger', 'warning', 'info'
    icon: null,
    timeout: 30000, // tiempo en ms antes de ocultar automáticamente
    position: 'top', // 'top', 'bottom'
  });
  
  // Referencia para el temporizador de autoclose
  const timeoutRef = React.useRef(null);

    /**
     * Oculta la alerta actual
     */
    const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, show: false }));

    // Limpiar temporizador
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
    }, []);

        /**
     * Muestra una alerta con los parámetros especificados
     * @param {Object} alertConfig - Configuración de la alerta
     */
    const showAlert = useCallback((alertConfig) => {
    // Limpiar temporizador anterior si existe
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }

    // Actualizar el estado de la alerta
    setAlert({
        ...alert,
        ...alertConfig,
        show: true,
    });

    // Configurar autoclose si hay timeout
    if (alertConfig.timeout !== 0) {
        const timeout = alertConfig.timeout || alert.timeout;
        timeoutRef.current = setTimeout(() => {
        hideAlert();
        }, timeout);
    }
    }, [alert, hideAlert]);
  
  /**
   * Muestra una alerta de éxito
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones adicionales
   */
  const showSuccess = useCallback((message, options = {}) => {
    showAlert({
      message,
      variant: 'success',
      icon: 'check-circle',
      ...options,
    });
  }, [showAlert]);
  
  /**
   * Muestra una alerta de error
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones adicionales
   */
  const showError = useCallback((message, options = {}) => {
    showAlert({
      message,
      variant: 'danger',
      icon: 'exclamation-triangle',
      ...options,
    });
  }, [showAlert]);
  
  /**
   * Muestra una alerta de advertencia
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones adicionales
   */
  const showWarning = useCallback((message, options = {}) => {
    showAlert({
      message,
      variant: 'warning',
      icon: 'exclamation-circle',
      ...options,
    });
  }, [showAlert]);
  
  /**
   * Muestra una alerta informativa
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones adicionales
   */
  const showInfo = useCallback((message, options = {}) => {
    showAlert({
      message,
      variant: 'info',
      icon: 'info-circle',
      ...options,
    });
  }, [showAlert]);
  
  // Limpiar temporizador al desmontar
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Valores a compartir en el contexto
  const alertContextValue = {
    alert,
    setAlert,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
  
  return (
    <AlertContext.Provider value={alertContextValue}>
      {children}
    </AlertContext.Provider>
  );
};

export { AlertContext };