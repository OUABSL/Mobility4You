// src/components/common/ImageManager.js
import { useEffect, useState } from 'react';
import { createServiceLogger, DEBUG_MODE } from '../../config/appConfig';

// Crear logger para el componente
const logger = createServiceLogger('IMAGE_MANAGER');

/**
 * Componente para gestión inteligente de imágenes con fallbacks y placeholders
 * Maneja casos de error, imágenes faltantes y carga lazy
 */
const ImageManager = ({
  src,
  alt = 'Imagen',
  className = '',
  width,
  height,
  style = {},
  fallbackSrc = null,
  placeholder = 'default',
  placeholderType,
  showPlaceholder,
  onError = null,
  onLoad = null,
  lazy = true,
  ...restProps
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filtrar props que no son válidas para DOM elements - ya extraídas arriba
  const validDOMProps = restProps;

  // Placeholders por defecto
  const getPlaceholder = (type = 'default') => {
    const placeholders = {
      default: '/api/placeholder/300/200?text=Sin+Imagen',
      vehicle: '/api/placeholder/400/300?text=Vehículo',
      extra: '/api/placeholder/150/150?text=Extra',
      user: '/api/placeholder/100/100?text=Usuario',
      location: '/api/placeholder/250/200?text=Ubicación',
    };

    return placeholders[type] || placeholders.default;
  };

  // Procesar la URL de imagen
  const processImageUrl = (url) => {
    if (!url) return null;

    // Si es una URL completa, devolverla tal cual
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Detectar si es un objeto de imagen del universal mapper
    if (url && typeof url === 'object') {
      return url.original || url.url || null;
    }

    // Si es una ruta relativa del backend
    if (url.startsWith('/media/') || url.startsWith('media/')) {
      // En desarrollo con nginx proxy, usar window.location.origin
      const baseUrl =
        process.env.REACT_APP_BACKEND_URL ||
        process.env.REACT_APP_API_URL?.replace('/api', '') ||
        window.location.origin;
      return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Si es solo el nombre del archivo, asumir estructura por defecto
    if (!url.startsWith('/') && !url.includes('/')) {
      const baseUrl =
        process.env.REACT_APP_BACKEND_URL ||
        process.env.REACT_APP_API_URL?.replace('/api', '') ||
        window.location.origin;

      // Detectar tipo de imagen por patrones en el nombre
      if (url.match(/\d+_\d+\./)) {
        // Patrón de imagen de vehículo: vehiculoId_imagenId.extensión
        return `${baseUrl}/media/vehiculos/${url}`;
      } else {
        // Por defecto, asumir que es un extra
        return `${baseUrl}/media/extras/${url}`;
      }
    }

    return url;
  };

  // Efecto para manejar cambios en src
  useEffect(() => {
    setImageError(false);
    setIsLoading(true);

    const processedSrc = processImageUrl(src);

    if (!processedSrc) {
      // No hay imagen, usar placeholder directamente
      setImageSrc(getPlaceholder(placeholder));
      setIsLoading(false);
      if (DEBUG_MODE) {
        logger.info(
          `No hay imagen disponible, usando placeholder: ${placeholder}`,
        );
      }
      return;
    }

    // Verificar si la imagen existe
    const img = new Image();

    img.onload = () => {
      setImageSrc(processedSrc);
      setIsLoading(false);
      if (onLoad) onLoad();
      if (DEBUG_MODE) {
        logger.info(`Imagen cargada exitosamente: ${processedSrc}`);
      }
    };

    img.onerror = () => {
      if (DEBUG_MODE) {
        logger.warn(`Error cargando imagen: ${processedSrc}`);
      }

      // Intentar con fallback si existe
      if (fallbackSrc && !imageError) {
        const processedFallback = processImageUrl(fallbackSrc);
        if (processedFallback !== processedSrc) {
          setImageSrc(processedFallback);
          setIsLoading(false);
          return;
        }
      }

      // Usar placeholder como último recurso
      setImageSrc(getPlaceholder(placeholder));
      setImageError(true);
      setIsLoading(false);

      if (onError) onError();
    };

    img.src = processedSrc;
  }, [src, fallbackSrc, placeholder, onError, onLoad, imageError]);

  // Estilos para el contenedor
  const containerStyle = {
    ...style,
    width: width || style.width,
    height: height || style.height,
    minHeight: '250px',
    display: 'inline-block',
    overflow: 'hidden',
    position: 'relative',
  };

  // Estilos para la imagen
  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
    opacity: isLoading ? 0.5 : 1,
  };

  return (
    <div style={containerStyle} className={`image-manager ${className}`}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          style={imageStyle}
          loading={lazy ? 'lazy' : 'eager'}
          {...validDOMProps}
        />
      )}

      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.1)',
            fontSize: '12px',
            color: '#666',
          }}
        >
          Cargando...
        </div>
      )}

      {imageError && DEBUG_MODE && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: 'rgba(255,0,0,0.8)',
            color: 'white',
            fontSize: '10px',
            padding: '2px 4px',
            borderRadius: '2px',
          }}
          title="Error cargando imagen original"
        >
          !
        </div>
      )}
    </div>
  );
};

export default ImageManager;
