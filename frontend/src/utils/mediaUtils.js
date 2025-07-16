// utils/mediaUtils.js

import { MEDIA_CONFIG } from '../config/appConfig';

/**
 * Utilidades para manejo de archivos multimedia con soporte para Backblaze B2
 */

/**
 * Construye la URL completa para un archivo multimedia
 * @param {string} relativePath - Ruta relativa del archivo
 * @param {string} type - Tipo de archivo: 'vehicle', 'extra', 'carnet', 'reservation', 'contrato', 'factura', 'general'
 * @returns {string|null} URL completa del archivo o null si no existe
 */
export const buildMediaUrl = (relativePath, type = 'general') => {
  if (!relativePath) return null;

  switch (type) {
    case 'vehicle':
      return MEDIA_CONFIG.getVehicleImageUrl(relativePath);
    case 'extra':
      return MEDIA_CONFIG.getExtraImageUrl(relativePath);
    case 'carnet':
      return MEDIA_CONFIG.getCarnetImageUrl(relativePath);
    case 'reservation':
      return MEDIA_CONFIG.getReservationDocumentUrl(relativePath);
    case 'contrato':
      return MEDIA_CONFIG.getContratoUrl(relativePath);
    case 'factura':
      return MEDIA_CONFIG.getFacturaUrl(relativePath);
    default:
      return MEDIA_CONFIG.getMediaUrl(relativePath);
  }
};

/**
 * Verifica si una URL de imagen es válida y está disponible
 * @param {string} imageUrl - URL de la imagen
 * @returns {Promise<boolean>} true si la imagen está disponible
 */
export const isImageAvailable = async (imageUrl) => {
  if (!imageUrl) return false;

  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Error checking image availability:', error);
    return false;
  }
};

/**
 * Obtiene una imagen con fallback a imagen por defecto
 * @param {string} relativePath - Ruta relativa de la imagen
 * @param {string} type - Tipo de imagen
 * @param {string} fallbackUrl - URL de imagen por defecto
 * @returns {Promise<string>} URL de la imagen o fallback
 */
export const getImageWithFallback = async (
  relativePath,
  type = 'general',
  fallbackUrl = '/images/no-image.jpg',
) => {
  const imageUrl = buildMediaUrl(relativePath, type);

  if (!imageUrl) return fallbackUrl;

  const isAvailable = await isImageAvailable(imageUrl);
  return isAvailable ? imageUrl : fallbackUrl;
};

/**
 * Hook personalizado para manejo de imágenes con estado de carga
 * @param {string} relativePath - Ruta relativa de la imagen
 * @param {string} type - Tipo de imagen
 * @param {string} fallbackUrl - URL de imagen por defecto
 * @returns {object} Estado de la imagen con url, loading, error
 */
export const useImageLoader = (
  relativePath,
  type = 'general',
  fallbackUrl = '/images/no-image.jpg',
) => {
  const [imageState, setImageState] = React.useState({
    url: fallbackUrl,
    loading: true,
    error: false,
  });

  React.useEffect(() => {
    const loadImage = async () => {
      setImageState((prev) => ({ ...prev, loading: true, error: false }));

      try {
        const url = await getImageWithFallback(relativePath, type, fallbackUrl);
        setImageState({
          url,
          loading: false,
          error: false,
        });
      } catch (error) {
        console.error('Error loading image:', error);
        setImageState({
          url: fallbackUrl,
          loading: false,
          error: true,
        });
      }
    };

    loadImage();
  }, [relativePath, type, fallbackUrl]);

  return imageState;
};

/**
 * Componente de imagen con carga lazy y fallback automático
 */
export const MediaImage = ({
  src,
  type = 'general',
  alt = '',
  className = '',
  fallbackUrl = '/images/no-image.jpg',
  ...props
}) => {
  const [imageSrc, setImageSrc] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      setError(false);

      try {
        const url = await getImageWithFallback(src, type, fallbackUrl);
        setImageSrc(url);
      } catch (err) {
        console.error('Error loading media image:', err);
        setImageSrc(fallbackUrl);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      loadImage();
    } else {
      setImageSrc(fallbackUrl);
      setLoading(false);
    }
  }, [src, type, fallbackUrl]);

  if (loading) {
    return (
      <div className={`media-image-placeholder ${className}`} {...props}>
        <div className="loading-spinner">Cargando...</div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`media-image ${error ? 'error' : ''} ${className}`}
      onError={() => {
        if (imageSrc !== fallbackUrl) {
          setImageSrc(fallbackUrl);
          setError(true);
        }
      }}
      {...props}
    />
  );
};

export default {
  buildMediaUrl,
  isImageAvailable,
  getImageWithFallback,
  useImageLoader,
  MediaImage,
};
