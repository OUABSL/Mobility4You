import axios from '../config/axiosConfig';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGlobe, 
  faCar, 
  faStar, 
  faShieldAlt,
  faMapMarkerAlt,
  faUsers,
  faHeadset,
  faLeaf,
  faClock,
  faAward,
  faMedal,
  faQuoteLeft,
  faCheck,
  faArrowRight,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { act } from "react";
import { 
  testingLocationsData, 
  testingDestinos, 
  testingEstadisticas,
  testingCaracteristicas,
  testingTestimonios
} from '../assets/testingData/testingData';
import { withTimeout } from './func';
import { withCache } from './cacheService';

// ========================================
// CONFIGURACIÓN Y CONSTANTES
// ========================================
// Constante para modo debug - CAMBIAR a false en producción
export const DEBUG_MODE = false; // TEMPORAL: Activado para resolver 502 errors
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Funciones de logging condicional
const logInfo = (message, data = null) => {
  if (DEBUG_MODE) {
    console.log(`[HOME SERVICES] ${message}`, data);
  }
};

const logError = (message, error = null) => {
  if (DEBUG_MODE) {
    console.error(`[HOME SERVICES ERROR] ${message}`, error);
  }
};

// ========================================
// DATOS ESTÁTICOS ELIMINADOS - MIGRACIÓN COMPLETADA
// ========================================
// Los datos estáticos hardcodeados han sido migrados a:
// - Base de datos (fuente principal en producción)  
// - testingData.js (fallback solo con DEBUG_MODE = true)
//
// Se eliminaron las siguientes constantes estáticas:
// - locationsData (array de ubicaciones hardcodeadas)
// - estadisticasGlobales (array de estadísticas hardcodeadas)
// - caracteristicasPrincipales (array de características hardcodeadas)
// - testimonios (array de testimonios hardcodeados)
// - destinosPopulares (array de destinos hardcodeados)
//
// El sistema ahora prioriza la base de datos y solo usa datos 
// de testing cuando DEBUG_MODE = true Y la API falla

// ========================================
// FUNCIONES DE DATOS - MIGRADAS A DATABASE-FIRST
// ========================================

/**
 * Obtiene las ubicaciones disponibles para mostrar en componentes del home
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de ubicaciones
 */
const fetchLocations = async () => {
  return await withCache('locations', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando ubicaciones desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/lugares/`),
        8000
      );
      
      // Manejar formato de respuesta con paginación del backend
      let locations;
      if (response.data && response.data.results) {
        locations = response.data.results;
        logInfo('Ubicaciones cargadas desde BD (paginadas)', { count: locations.length });
      } else if (Array.isArray(response.data)) {
        locations = response.data;
        logInfo('Ubicaciones cargadas desde BD (array directo)', { count: locations.length });
      } else {
        logError('Formato de respuesta inesperado:', response.data);
        locations = [];
      }
      
      return locations;
    } catch (error) {
      logError('Error al consultar BD, verificando fallback', error);
      
      // SEGUNDA PRIORIDAD: Solo usar datos de testing si DEBUG_MODE = true
      if (DEBUG_MODE) {
        logInfo('DEBUG_MODE activo - usando datos de testing como fallback');
        return testingLocationsData;
      }
      
      // PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de ubicación disponibles');
      throw new Error('Error al cargar ubicaciones. Por favor, intente nuevamente.');
    }
  });
};

/**
 * Obtiene las estadísticas para mostrar en el home
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de estadísticas
 */
const fetchEstadisticas = async () => {
  return await withCache('stats', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando estadísticas desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/contenidos/`, {
          params: { tipo: 'estadistica', activo: true }
        }),
        8000
      );
      
      // Validar que response.data existe y es un array
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        // Si no es array, podría ser un objeto con un array dentro
        if (dataArray && dataArray.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray && dataArray.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          logError('Estructura de datos inesperada:', dataArray);
          throw new Error('Estructura de datos inesperada en la respuesta de la API');
        }
      }
      
      const mappedData = dataArray
        .filter(item => item && item.activo)
        .map(item => {
          try {
            // Parsing seguro de JSON
            let infoAdicional = {};
            if (item.info_adicional) {
              if (typeof item.info_adicional === 'string') {
                infoAdicional = JSON.parse(item.info_adicional);
              } else {
                infoAdicional = item.info_adicional;
              }
            }
            
            return {
              icono: item.icono_url || '',
              numero: infoAdicional.numero || '0',
              texto: item.subtitulo || '',
              color: infoAdicional.color || '#007bff'
            };
          } catch (parseError) {
            logError('Error parseando item de estadísticas:', parseError);
            return {
              icono: item.icono_url || '',
              numero: '0',
              texto: item.subtitulo || '',
              color: '#007bff'
            };
          }
        });
      
      logInfo('Estadísticas cargadas desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar estadísticas desde BD', error);
      
      // SEGUNDA PRIORIDAD: Solo usar datos de testing si DEBUG_MODE = true
      if (DEBUG_MODE) {
        logInfo('DEBUG_MODE activo - usando estadísticas de testing como fallback');
        
        // Validar que testingEstadisticas existe y es array
        if (!Array.isArray(testingEstadisticas)) {
          logError('testingEstadisticas no es un array válido');
          return [];
        }
        
        return testingEstadisticas
          .filter(item => item && item.activo)
          .map(item => {
            try {
              let infoAdicional = {};
              if (item.info_adicional) {
                if (typeof item.info_adicional === 'string') {
                  infoAdicional = JSON.parse(item.info_adicional);
                } else {
                  infoAdicional = item.info_adicional;
                }
              }
              
              return {
                icono: item.icono_url || '',
                numero: infoAdicional.numero || '0',
                texto: item.subtitulo || '',
                color: infoAdicional.color || '#007bff'
              };
            } catch (parseError) {
              logError('Error parseando item de testing:', parseError);
              return {
                icono: item.icono_url || '',
                numero: '0',
                texto: item.subtitulo || '',
                color: '#007bff'
              };
            }
          });
      }
      
      // PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de estadísticas disponibles');
      throw new Error('Error al cargar estadísticas. Por favor, intente nuevamente.');
    }
  });
};

/**
 * Obtiene las características para mostrar en el home
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de características
 */
const fetchCaracteristicas = async () => {
  return await withCache('features', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando características desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/contenidos/`, {
          params: { tipo: 'caracteristica', activo: true }
        }),
        8000
      );
      
      // Validar que response.data existe y es un array
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        // Si no es array, podría ser un objeto con un array dentro
        if (dataArray && dataArray.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray && dataArray.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          logError('Estructura de datos inesperada:', dataArray);
          throw new Error('Estructura de datos inesperada en la respuesta de la API');
        }
      }
      
      const mappedData = dataArray
        .filter(item => item && item.activo)
        .map(item => {
          try {
            // Parsing seguro de JSON
            let infoAdicional = {};
            if (item.info_adicional) {
              if (typeof item.info_adicional === 'string') {
                infoAdicional = JSON.parse(item.info_adicional);
              } else {
                infoAdicional = item.info_adicional;
              }
            }
            
            return {
              icono: infoAdicional.icono || 'faCheck',
              titulo: item.titulo || '',
              descripcion: item.descripcion || '',
              color: infoAdicional.color || '#007bff'
            };
          } catch (parseError) {
            logError('Error parseando item de características:', parseError);
            return {
              icono: 'faCheck',
              titulo: item.titulo || '',
              descripcion: item.descripcion || '',
              color: '#007bff'
            };
          }
        });
      
      logInfo('Características cargadas desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar características desde BD', error);
      
      // SEGUNDA PRIORIDAD: Solo usar datos de testing si DEBUG_MODE = true
      if (DEBUG_MODE) {
        logInfo('DEBUG_MODE activo - usando características de testing como fallback');
        
        // Validar que testingCaracteristicas existe y es array
        if (!Array.isArray(testingCaracteristicas)) {
          logError('testingCaracteristicas no es un array válido');
          return [];
        }
        
        return testingCaracteristicas.map(item => {
          try {
            let infoAdicional = {};
            if (item.info_adicional) {
              if (typeof item.info_adicional === 'string') {
                infoAdicional = JSON.parse(item.info_adicional);
              } else {
                infoAdicional = item.info_adicional;
              }
            }
            
            return {
              icono: infoAdicional.icono || 'faCheck',
              titulo: item.titulo || '',
              descripcion: item.descripcion || '',
              color: infoAdicional.color || '#007bff'
            };
          } catch (parseError) {
            logError('Error parseando item de testing características:', parseError);
            return {
              icono: 'faCheck',
              titulo: item.titulo || '',
              descripcion: item.descripcion || '',
              color: '#007bff'
            };
          }
        });
      }
      
      // PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de características disponibles');
      throw new Error('Error al cargar características. Por favor, intente nuevamente.');
    }
  });
};

/**
 * Obtiene los testimonios para mostrar en el home
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de testimonios
 */
const fetchTestimonios = async () => {
  return await withCache('testimonials', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando testimonios desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/contenidos/`, {
          params: { tipo: 'testimonial', activo: true }
        }),
        8000
      );
      
      // Validar que response.data existe y es un array
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        // Si no es array, podría ser un objeto con un array dentro
        if (dataArray && dataArray.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray && dataArray.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          logError('Estructura de datos inesperada:', dataArray);
          throw new Error('Estructura de datos inesperada en la respuesta de la API');
        }
      }
      
      const mappedData = dataArray.map(contenido => {
        try {
          // Parse the info_adicional JSON that contains rating, comentario, etc.
          let extra = {};
          if (contenido.info_adicional) {
            if (typeof contenido.info_adicional === 'string') {
              extra = JSON.parse(contenido.info_adicional);
            } else {
              extra = contenido.info_adicional;
            }
          }
          
          return {
            id: contenido.id,
            nombre: contenido.titulo || 'Usuario', // Use titulo as the name
            ubicacion: contenido.subtitulo || 'Ubicación', // Use subtitulo as location
            rating: extra.rating || 5,
            comentario: contenido.cuerpo || extra.comentario || '',
            avatar: extra.avatar || contenido.icono_url || 'https://via.placeholder.com/80x80?text=U'
          };
        } catch (parseError) {
          logError('Error parseando testimonios:', parseError);
          return {
            id: contenido.id || Math.random(),
            nombre: contenido.titulo || 'Usuario',
            ubicacion: contenido.subtitulo || 'Ubicación',
            rating: 5,
            comentario: contenido.cuerpo || '',
            avatar: 'https://via.placeholder.com/80x80?text=U'
          };
        }
      });
      
      logInfo('Testimonios cargados desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar testimonios desde BD', error);
      
      // SEGUNDA PRIORIDAD: Solo usar datos de testing si DEBUG_MODE = true
      if (DEBUG_MODE) {
        logInfo('DEBUG_MODE activo - usando testimonios de testing como fallback');
        
        // Validar que testingTestimonios existe y es array
        if (!Array.isArray(testingTestimonios)) {
          logError('testingTestimonios no es un array válido');
          return [];
        }
        
        return testingTestimonios.map(user => {
          try {
            let extra = {};
            if (user.info_adicional) {
              if (typeof user.info_adicional === 'string') {
                extra = JSON.parse(user.info_adicional);
              } else {
                extra = user.info_adicional;
              }
            }
            
            return {
              id: user.id,
              nombre: `${user.nombre || ''} ${user.apellido || ''}`.trim() || 'Usuario',
              ubicacion: user.direccion ? `${user.direccion.ciudad || ''}, ${user.direccion.pais || ''}`.trim() : 'Ubicación',
              rating: extra.rating || 5,
              comentario: extra.comentario || '',
              avatar: extra.avatar || 'https://via.placeholder.com/80x80?text=U'
            };
          } catch (parseError) {
            logError('Error parseando testimonios de testing:', parseError);
            return {
              id: user.id || Math.random(),
              nombre: 'Usuario',
              ubicacion: 'Ubicación',
              rating: 5,
              comentario: '',
              avatar: 'https://via.placeholder.com/80x80?text=U'
            };
          }
        });
      }
      
      // PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de testimonios disponibles');
      throw new Error('Error al cargar testimonios. Por favor, intente nuevamente.');
    }
  });
};

/**
 * Obtiene los destinos populares para mostrar en el home
 * MIGRADO: Prioriza base de datos, fallback a testingData solo si DEBUG_MODE = true y API falla
 * OPTIMIZADO: Implementa caché para evitar llamadas duplicadas
 * @returns {Promise<Array>} - Lista de destinos
 */
const fetchDestinos = async () => {
  return await withCache('destinations', async () => {
    try {
      // PRIMERA PRIORIDAD: Consultar base de datos
      logInfo('Consultando destinos populares desde BD');
      const response = await withTimeout(
        axios.get(`${API_URL}/lugares/`, {
          params: { popular: true, activo: true }
        }),
        8000
      );
      
      // Validar que response.data existe y es un array
      let dataArray = response.data;
      if (!Array.isArray(dataArray)) {
        // Si no es array, podría ser un objeto con un array dentro
        if (dataArray && dataArray.results && Array.isArray(dataArray.results)) {
          dataArray = dataArray.results;
        } else if (dataArray && dataArray.data && Array.isArray(dataArray.data)) {
          dataArray = dataArray.data;
        } else {
          logError('Estructura de datos inesperada:', dataArray);
          throw new Error('Estructura de datos inesperada en la respuesta de la API');
        }
      }
      
      const mappedData = dataArray.map(lugar => {
        try {
          let extra = {};
          if (lugar.info_adicional) {
            if (typeof lugar.info_adicional === 'string') {
              extra = JSON.parse(lugar.info_adicional);
            } else {
              extra = lugar.info_adicional;
            }
          }
          
          return {
            nombre: extra.paises || lugar.nombre || 'Destino',
            ciudades: extra.ciudades || (lugar.direccion ? lugar.direccion.ciudad : '') || 'Ciudad',
            imagen: extra.imagen || 'default.jpg'
          };
        } catch (parseError) {
          logError('Error parseando destinos:', parseError);
          return {
            nombre: lugar.nombre || 'Destino',
            ciudades: lugar.direccion ? lugar.direccion.ciudad : 'Ciudad',
            imagen: 'default.jpg'
          };
        }
      });
      
      logInfo('Destinos populares cargados desde BD', { count: mappedData.length });
      return mappedData;
    } catch (error) {
      logError('Error al consultar destinos desde BD', error);
      
      // SEGUNDA PRIORIDAD: Solo usar datos de testing si DEBUG_MODE = true
      if (DEBUG_MODE) {
        logInfo('DEBUG_MODE activo - usando destinos de testing como fallback');
        
        // Validar que testingDestinos existe y es array
        if (!Array.isArray(testingDestinos)) {
          logError('testingDestinos no es un array válido');
          return [];
        }
        
        return testingDestinos.map(lugar => {
          try {
            let extra = {};
            if (lugar.info_adicional) {
              if (typeof lugar.info_adicional === 'string') {
                extra = JSON.parse(lugar.info_adicional);
              } else {
                extra = lugar.info_adicional;
              }
            }
            
            return {
              nombre: extra.paises || lugar.nombre || 'Destino',
              ciudades: extra.ciudades || 'Ciudad',
              imagen: extra.imagen || 'default.jpg'
            };
          } catch (parseError) {
            logError('Error parseando destinos de testing:', parseError);
            return {
              nombre: lugar.nombre || 'Destino',
              ciudades: 'Ciudad',
              imagen: 'default.jpg'
            };
          }
        });
      }
      
      // PRODUCCIÓN: Error sin fallback
      logError('Error en producción - no hay datos de destinos disponibles');
      throw new Error('Error al cargar destinos. Por favor, intente nuevamente.');
    }
  });
};

export {
  fetchLocations,
  fetchEstadisticas,
  fetchCaracteristicas,
  fetchTestimonios,
  fetchDestinos
};