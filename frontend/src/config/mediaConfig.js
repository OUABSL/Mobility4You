// src/config/mediaConfig.js
/**
 * Configuración centralizada para URLs de media
 * Maneja automáticamente la URL base según el entorno
 */

// Determinar la URL base de media según el entorno
const getMediaBaseUrl = () => {
  // En producción, usar la URL de Backblaze B2
  if (process.env.NODE_ENV === 'production') {
    return (
      process.env.REACT_APP_MEDIA_BASE_URL ||
      'https://s3.us-west-004.backblazeb2.com/your-bucket-name/media/'
    );
  }

  // En desarrollo, usar el backend local
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
};

export const MEDIA_CONFIG = {
  BASE_URL: getMediaBaseUrl(),

  // Helper para construir URLs completas de media
  getMediaUrl: (relativePath) => {
    if (!relativePath) return null;

    // Si ya es una URL completa, devolverla tal como está
    if (relativePath.startsWith('http')) {
      return relativePath;
    }

    // Limpiar la ruta relativa
    const cleanPath = relativePath.replace(/^\/+/, '');

    // Construir URL completa
    return `${MEDIA_CONFIG.BASE_URL}${cleanPath}`;
  },

  // Helper específico para imágenes de vehículos
  getVehicleImageUrl: (imagePath) => {
    if (!imagePath) return '/placeholder-vehicle.jpg';
    return MEDIA_CONFIG.getMediaUrl(imagePath);
  },

  // Helper para avatares de usuarios
  getUserAvatarUrl: (avatarPath) => {
    if (!avatarPath) return '/default-avatar.png';
    return MEDIA_CONFIG.getMediaUrl(avatarPath);
  },
};

export default MEDIA_CONFIG;
