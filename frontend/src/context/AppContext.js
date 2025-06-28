// src/context/AppContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createServiceLogger } from '../config/appConfig';

// Crear logger para el contexto
const logger = createServiceLogger('APP_CONTEXT');

// Crear el contexto
const AppContext = createContext(null);

/**
 * Hook personalizado para usar el contexto de la aplicación
 * @returns {Object} El contexto de la aplicación
 */
export const useAppContext = () => useContext(AppContext);

/**
 * Proveedor del contexto de la aplicación
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos que tendrán acceso al contexto
 */
const AppProvider = ({ children }) => {
  // Estado para el usuario actual (o null si no hay sesión)
  const [user, setUser] = useState(null);

  // Estado para el modo de la aplicación
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estado para el idioma de la aplicación
  const [language, setLanguage] = useState('es');

  // Estado para indicar si la aplicación está cargando
  const [isLoading, setIsLoading] = useState(false);

  // Estados para manejo de errores globales
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Funciones de utilidad

  /**
   * Establece o elimina la sesión del usuario
   * @param {Object|null} userData - Datos del usuario o null para cerrar sesión
   */
  const setUserSession = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('userSession', JSON.stringify(userData));
    } else {
      localStorage.removeItem('userSession');
    }
  };

  /**
   * Cambiar tema claro/oscuro
   */
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));

    // Aplicar clase al elemento root para cambios de CSS
    if (newMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  /**
   * Cambiar idioma de la aplicación
   * @param {string} lang - Código del idioma (ej: 'es', 'en')
   */
  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  // Cargar preferencias guardadas al iniciar
  useEffect(() => {
    // Intentar restaurar sesión de usuario
    const savedUser = localStorage.getItem('userSession');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        logger.error('Error parsing saved user session', e);
        localStorage.removeItem('userSession');
      }
    }

    // Cargar preferencia de tema
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      try {
        const isDark = JSON.parse(savedDarkMode);
        setIsDarkMode(isDark);
        if (isDark) {
          document.documentElement.classList.add('dark-mode');
        }
      } catch (e) {
        logger.error('Error parsing dark mode preference', e);
      }
    } else {
      // Detectar preferencia del sistema si no hay guardada
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches;
      setIsDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark-mode');
      }
    }

    // Cargar idioma guardado
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Valores a compartir en el contexto
  const contextValue = {
    // Estados
    user,
    isDarkMode,
    language,
    isLoading,
    hasError,
    errorMessage,

    // Funciones
    setUser: setUserSession,
    setIsLoading,
    toggleDarkMode,
    changeLanguage,
    setHasError,
    setErrorMessage,

    // Utilidades
    clearError: () => {
      setHasError(false);
      setErrorMessage('');
    },
  };

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
};

export default AppProvider;
