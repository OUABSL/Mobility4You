// src/services/groupsService.js

/**
 * 🚗 SERVICIO DE GRUPOS DE COCHE
 *
 * Gestiona la obtención de grupos de coche disponibles desde la base de datos
 * para el selector de categorías en el formulario de búsqueda.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-19
 */

import { API_URLS, createServiceLogger } from '../config/appConfig';
import axios from '../config/axiosConfig';
import { withCache } from './cacheService';

// Crear logger específico para este servicio
const logger = createServiceLogger('GROUPS_SERVICE');

// URL base para grupos de coche
const API_URL = API_URLS.BASE;

/**
 * Obtiene todos los grupos de coche disponibles
 * @returns {Promise<Array>} Lista de grupos de coche
 */
export const fetchCarGroups = async () => {
  return await withCache('car_groups', async () => {
    try {
      logger.info('🔍 Consultando grupos de coche desde BD');

      const response = await axios.get(`${API_URL}/vehiculos/grupos/`, {
        timeout: 8000,
        params: {
          ordering: 'nombre',
        },
      });

      // Normalizar respuesta según estructura del backend
      let groups = [];
      if (response.data?.success && response.data?.results) {
        groups = response.data.results;
      } else if (Array.isArray(response.data)) {
        groups = response.data;
      } else {
        throw new Error('Estructura de respuesta inesperada');
      }

      // Validar y mapear datos
      const validGroups = groups
        .filter((group) => group && group.id && group.nombre)
        .map((group) => ({
          id: group.id,
          nombre: group.nombre,
          descripcion: group.descripcion || '',
          edad_minima: group.edad_minima || 21,
          // Campos adicionales para compatibilidad
          value: group.id,
          label: group.nombre,
          text: group.nombre,
        }));

      logger.info(`✅ Grupos de coche cargados: ${validGroups.length} grupos`);
      return validGroups;
    } catch (error) {
      logger.error('❌ Error cargando grupos de coche:', error);

      // En caso de error, devolver lista vacía
      // No usamos fallback de testing data para grupos ya que son datos críticos de BD
      return [];
    }
  });
};

/**
 * Obtiene un grupo específico por ID
 * @param {number} groupId - ID del grupo
 * @returns {Promise<Object|null>} Grupo encontrado o null
 */
export const fetchCarGroupById = async (groupId) => {
  try {
    if (!groupId) return null;

    logger.info(`🔍 Buscando grupo de coche ID: ${groupId}`);

    const response = await axios.get(
      `${API_URL}/vehiculos/grupos/${groupId}/`,
      {
        timeout: 5000,
      },
    );

    if (response.data?.success && response.data?.result) {
      const group = response.data.result;
      logger.info(`✅ Grupo encontrado: ${group.nombre}`);

      return {
        id: group.id,
        nombre: group.nombre,
        descripcion: group.descripcion || '',
        edad_minima: group.edad_minima || 21,
        value: group.id,
        label: group.nombre,
        text: group.nombre,
      };
    }

    return null;
  } catch (error) {
    logger.error(`❌ Error obteniendo grupo ${groupId}:`, error);
    return null;
  }
};

/**
 * Verifica si un grupo específico existe
 * @param {number} groupId - ID del grupo a verificar
 * @returns {Promise<boolean>} True si existe
 */
export const verifyGroupExists = async (groupId) => {
  try {
    const group = await fetchCarGroupById(groupId);
    return group !== null;
  } catch (error) {
    logger.error(`❌ Error verificando grupo ${groupId}:`, error);
    return false;
  }
};

/**
 * Obtiene opciones formateadas para componentes de select
 * @returns {Promise<Array>} Opciones para select con formato {value, label}
 */
export const getCarGroupsAsOptions = async () => {
  try {
    const groups = await fetchCarGroups();

    // Agregar opción "Todos" al inicio
    const options = [
      {
        value: '',
        label: 'Todas las categorías',
        text: 'Todas las categorías',
        id: null,
      },
      ...groups.map((group) => ({
        value: group.id.toString(),
        label: group.nombre,
        text: group.nombre,
        id: group.id,
        descripcion: group.descripcion,
        edad_minima: group.edad_minima,
      })),
    ];

    logger.info(`📋 Opciones de grupos generadas: ${options.length} opciones`);
    return options;
  } catch (error) {
    logger.error('❌ Error generando opciones de grupos:', error);

    // Fallback mínimo
    return [
      {
        value: '',
        label: 'Todas las categorías',
        text: 'Todas las categorías',
        id: null,
      },
    ];
  }
};

/**
 * Limpia caché de grupos (útil cuando se actualizan desde admin)
 */
export const clearCarGroupsCache = () => {
  // Importar cacheService dinámicamente para evitar dependencias circulares
  import('./cacheService').then(({ clearCache }) => {
    clearCache('car_groups');
    logger.info('🗑️ Caché de grupos de coche limpiado');
  });
};

export default {
  fetchCarGroups,
  fetchCarGroupById,
  verifyGroupExists,
  getCarGroupsAsOptions,
  clearCarGroupsCache,
};
