/**
 * 🖼️ UTILIDADES DE GESTIÓN DE IMÁGENES UNIFICADAS
 *
 * Sistema unificado para gestión de imágenes usando Backblaze B2
 * Elimina dependencia de servicios externos como via.placeholder
 *
 * @author OUAEL BOUSSIALI
 * @version 2.0.0
 * @updated 2025-09-12
 */

import {
  createServiceLogger,
  DEBUG_MODE,
  MEDIA_CONFIG,
} from '../config/appConfig';

// Crear logger para las utilidades de imágenes
const logger = createServiceLogger('IMAGE_UTILS');

/**
 * Procesa una URL de imagen y genera la URL absoluta usando B2
 * @param {string} imageUrl - URL de la imagen (puede ser relativa o absoluta)
 * @param {string} baseUrl - URL base del backend (opcional)
 * @returns {string} URL absoluta de la imagen
 */
export function processImageUrl(imageUrl, baseUrl = null) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    logger.warn('URL de imagen inválida proporcionada:', imageUrl);
    return MEDIA_CONFIG.getPlaceholderUrl('default');
  }

  // Limpiar la URL
  const cleanUrl = imageUrl.trim();

  // Si ya es una URL absoluta válida, retornarla
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }

  // Usar MEDIA_CONFIG para construir URLs
  return (
    MEDIA_CONFIG.getMediaUrl(cleanUrl) ||
    MEDIA_CONFIG.getPlaceholderUrl('default')
  );
}

/**
 * Genera un placeholder para un tipo específico de imagen
 * @param {string} type - Tipo de imagen (vehicle, extra, user, etc.)
 * @param {number} width - Ancho del placeholder
 * @param {number} height - Alto del placeholder
 * @returns {string} URL del placeholder
 */
export function getPlaceholder(type = 'default', width = 300, height = 200) {
  const placeholderConfigs = {
    vehicle: {
      bgColor: 'e3f2fd',
      textColor: '1976d2',
      text: 'Vehículo',
    },
    extra: {
      bgColor: 'f3e5f5',
      textColor: '7b1fa2',
      text: 'Extra',
    },
    user: {
      bgColor: 'e8f5e8',
      textColor: '388e3c',
      text: 'Usuario',
    },
    location: {
      bgColor: 'fff3e0',
      textColor: 'f57c00',
      text: 'Lugar',
    },
    default: {
      bgColor: 'f5f5f5',
      textColor: '757575',
      text: 'Imagen',
    },
  };

  // Usar MEDIA_CONFIG en lugar de via.placeholder
  return MEDIA_CONFIG.getPlaceholderUrl(type, width, height);
}

/**
 * Obtiene un placeholder por defecto desde B2
 * @returns {string} URL del placeholder por defecto
 */
export function getDefaultPlaceholder() {
  return MEDIA_CONFIG.getPlaceholderUrl('default', 300, 200);
}

/**
 * Valida si una URL de imagen es válida
 * @param {string} imageUrl - URL a validar
 * @returns {Promise<boolean>} True si la imagen es válida
 */
export async function validateImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return false;
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      if (DEBUG_MODE) {
        logger.info('Imagen válida:', imageUrl);
      }
      resolve(true);
    };

    img.onerror = () => {
      if (DEBUG_MODE) {
        logger.warn('Imagen inválida:', imageUrl);
      }
      resolve(false);
    };

    // Timeout después de 5 segundos
    setTimeout(() => {
      if (DEBUG_MODE) {
        logger.warn('Timeout validando imagen:', imageUrl);
      }
      resolve(false);
    }, 5000);

    img.src = imageUrl;
  });
}

/**
 * Prepara datos de imagen con fallbacks inteligentes
 * @param {string} imageUrl - URL de la imagen original
 * @param {string} type - Tipo de imagen para el placeholder
 * @param {object} dimensions - Dimensiones para el placeholder
 * @returns {object} Datos de imagen preparados
 */
export function prepareImageData(imageUrl, type = 'default', dimensions = {}) {
  const { width = 300, height = 200 } = dimensions;

  return {
    original: processImageUrl(imageUrl),
    placeholder: getPlaceholder(type, width, height),
    hasImage: !!imageUrl,
    type,
    dimensions: { width, height },
  };
}

/**
 * Obtiene imagen optimizada según el contexto de uso
 * @param {string} imageUrl - URL original de la imagen
 * @param {string} context - Contexto de uso (thumbnail, gallery, hero, etc.)
 * @returns {string} URL de la imagen optimizada
 */
export function getOptimizedImageUrl(imageUrl, context = 'default') {
  const processedUrl = processImageUrl(imageUrl);

  // Si es un placeholder de B2, no necesita optimización
  if (processedUrl.includes(MEDIA_CONFIG.PATHS.PLACEHOLDERS)) {
    return processedUrl;
  }

  // Configuraciones de optimización por contexto
  const optimizations = {
    thumbnail: '?w=150&h=150&q=75&f=webp',
    gallery: '?w=400&h=300&q=85&f=webp',
    hero: '?w=1200&h=600&q=90&f=webp',
    card: '?w=300&h=200&q=80&f=webp',
    default: '?w=300&h=200&q=75&f=webp',
  };

  const optimization = optimizations[context] || optimizations.default;

  // Para imágenes de B2, aplicar optimización si el CDN lo soporta
  if (processedUrl.includes('backblazeb2.com')) {
    // B2 no soporta optimización automática, retornar imagen original
    return processedUrl;
  }

  // Solo aplicar optimización si es una imagen del propio servidor local
  if (
    processedUrl.includes(window.location.origin) ||
    processedUrl.includes(process.env.REACT_APP_BACKEND_URL)
  ) {
    return `${processedUrl}${optimization}`;
  }

  return processedUrl;
}

/**
 * Función helper para obtener imagen de extras con fallbacks inteligentes
 * @param {Object} extra - Objeto extra con datos de imagen
 * @param {Object} imageMap - Mapeo de imágenes locales (opcional)
 * @param {string} defaultImage - Imagen por defecto (opcional)
 * @returns {string} URL de la imagen a utilizar
 */
export function getImageForExtra(extra, imageMap = {}, defaultImage = null) {
  // 1. Si el extra tiene imagen_url del serializer optimizado
  if (
    extra.imagen_url &&
    typeof extra.imagen_url === 'string' &&
    extra.imagen_url.trim() !== ''
  ) {
    return processImageUrl(extra.imagen_url);
  }

  // 2. Si el extra tiene estructura de imagen del universal mapper
  if (extra.imagen && typeof extra.imagen === 'object') {
    return extra.imagen.original || extra.imagen.placeholder;
  }

  // 3. Si el extra tiene imagen directa del Django admin
  if (
    extra.imagen &&
    typeof extra.imagen === 'string' &&
    extra.imagen.trim() !== ''
  ) {
    return processImageUrl(extra.imagen);
  }

  // 4. Fallback a imagen local basada en palabras clave
  if (Object.keys(imageMap).length > 0) {
    const nombre = extra.nombre?.toLowerCase() || '';
    const categoria = extra.categoria?.toLowerCase() || '';

    // Buscar por palabras clave en el nombre o categoría
    for (const [key, image] of Object.entries(imageMap)) {
      if (nombre.includes(key) || categoria.includes(key)) {
        return image;
      }
    }
  }

  // 5. Imagen por defecto específica o placeholder
  return defaultImage || getPlaceholder('extra', 80, 80);
}

/**
 * Función helper para obtener imagen de vehículos
 * @param {Object} vehicle - Objeto vehículo con datos de imagen
 * @param {string} context - Contexto de uso de la imagen
 * @returns {string} URL de la imagen a utilizar
 */
export function getImageForVehicle(vehicle, context = 'card') {
  // Verificar múltiples fuentes de imagen
  const imageSources = [
    vehicle.imagen_principal_url,
    vehicle.imagen_principal,
    vehicle.imagen,
    vehicle.imagen_url,
  ];

  for (const imageSource of imageSources) {
    if (
      imageSource &&
      typeof imageSource === 'string' &&
      imageSource.trim() !== ''
    ) {
      return getOptimizedImageUrl(imageSource, context);
    }
  }

  // Fallback a placeholder específico para vehículos
  const dimensions = {
    thumbnail: { width: 150, height: 100 },
    card: { width: 300, height: 200 },
    gallery: { width: 400, height: 300 },
    hero: { width: 800, height: 400 },
  };

  const { width, height } = dimensions[context] || dimensions.card;
  return getPlaceholder('vehicle', width, height);
}

/**
 * Extrae información de imagen desde diferentes formatos de datos
 * @param {any} imageData - Datos de imagen en cualquier formato
 * @returns {object} Información estructurada de la imagen
 */
export function extractImageInfo(imageData) {
  const result = {
    url: null,
    hasImage: false,
    isValid: false,
    type: 'unknown',
  };

  if (!imageData) {
    return result;
  }

  // Si es una string, asumir que es URL
  if (typeof imageData === 'string') {
    const cleanUrl = imageData.trim();
    if (cleanUrl) {
      result.url = processImageUrl(cleanUrl);
      result.hasImage = true;
      result.isValid = true;
      result.type = 'url';
    }
    return result;
  }

  // Si es un objeto, buscar propiedades conocidas
  if (typeof imageData === 'object') {
    const urlProperties = ['url', 'original', 'src', 'imagen_url', 'imagen'];

    for (const prop of urlProperties) {
      if (imageData[prop] && typeof imageData[prop] === 'string') {
        result.url = processImageUrl(imageData[prop]);
        result.hasImage = true;
        result.isValid = true;
        result.type = 'object';
        break;
      }
    }
  }

  return result;
}

/**
 * Genera un conjunto de URLs de imagen para diferentes tamaños
 * @param {string} baseImageUrl - URL base de la imagen
 * @returns {object} Conjunto de URLs optimizadas
 */
export function generateImageSet(baseImageUrl) {
  const processedUrl = processImageUrl(baseImageUrl);

  return {
    thumbnail: getOptimizedImageUrl(processedUrl, 'thumbnail'),
    card: getOptimizedImageUrl(processedUrl, 'card'),
    gallery: getOptimizedImageUrl(processedUrl, 'gallery'),
    hero: getOptimizedImageUrl(processedUrl, 'hero'),
    original: processedUrl,
  };
}
