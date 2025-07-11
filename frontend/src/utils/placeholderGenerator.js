// src/utils/placeholderGenerator.js
import { createServiceLogger } from '../config/appConfig';

const logger = createServiceLogger('PLACEHOLDER_GENERATOR');

/**
 * Generador de placeholders para imágenes
 * Proporciona URLs de placeholders locales y remotos
 */
class PlaceholderGenerator {
  constructor() {
    this.baseUrl = 'https://via.placeholder.com';
    this.fallbackUrl = 'https://placehold.co';
  }

  /**
   * Generar placeholder con texto personalizado
   */
  generate(width = 300, height = 200, options = {}) {
    const {
      text = 'Sin Imagen',
      backgroundColor = 'f0f0f0',
      textColor = '666666',
      format = 'png',
    } = options;

    // URL principal
    const mainUrl = `${
      this.baseUrl
    }/${width}x${height}/${backgroundColor}/${textColor}.${format}?text=${encodeURIComponent(
      text,
    )}`;

    // URL de fallback
    const fallbackUrl = `${
      this.fallbackUrl
    }/${width}x${height}/${backgroundColor}/${textColor}.${format}?text=${encodeURIComponent(
      text,
    )}`;

    return {
      main: mainUrl,
      fallback: fallbackUrl,
      local: this.generateLocalSVG(
        width,
        height,
        text,
        backgroundColor,
        textColor,
      ),
    };
  }

  /**
   * Generar SVG local como fallback final
   */
  generateLocalSVG(
    width,
    height,
    text,
    backgroundColor = '#f0f0f0',
    textColor = '#666666',
  ) {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="${textColor}" font-family="Arial, sans-serif" font-size="${
      Math.min(width, height) / 10
    }">
          ${text}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Placeholders específicos por tipo de contenido
   */
  getVehiclePlaceholder(width = 400, height = 300) {
    return this.generate(width, height, {
      text: 'Vehículo',
      backgroundColor: 'e3f2fd',
      textColor: '1976d2',
    });
  }

  getExtraPlaceholder(width = 150, height = 150) {
    return this.generate(width, height, {
      text: 'Extra',
      backgroundColor: 'f3e5f5',
      textColor: '7b1fa2',
    });
  }

  getUserPlaceholder(width = 100, height = 100) {
    return this.generate(width, height, {
      text: 'Usuario',
      backgroundColor: 'e8f5e8',
      textColor: '388e3c',
    });
  }

  getLocationPlaceholder(width = 250, height = 200) {
    return this.generate(width, height, {
      text: 'Ubicación',
      backgroundColor: 'fff3e0',
      textColor: 'f57c00',
    });
  }

  /**
   * Obtener placeholder por tipo
   */
  getByType(type, width, height) {
    switch (type) {
      case 'vehicle':
        return this.getVehiclePlaceholder(width, height);
      case 'extra':
        return this.getExtraPlaceholder(width, height);
      case 'user':
        return this.getUserPlaceholder(width, height);
      case 'location':
        return this.getLocationPlaceholder(width, height);
      default:
        return this.generate(width, height);
    }
  }
}

// Instancia singleton
const placeholderGenerator = new PlaceholderGenerator();

export default placeholderGenerator;

/**
 * Hook para usar placeholders en componentes
 */
export const usePlaceholder = () => {
  return {
    generate: placeholderGenerator.generate.bind(placeholderGenerator),
    getByType: placeholderGenerator.getByType.bind(placeholderGenerator),
    vehicle:
      placeholderGenerator.getVehiclePlaceholder.bind(placeholderGenerator),
    extra: placeholderGenerator.getExtraPlaceholder.bind(placeholderGenerator),
    user: placeholderGenerator.getUserPlaceholder.bind(placeholderGenerator),
    location:
      placeholderGenerator.getLocationPlaceholder.bind(placeholderGenerator),
  };
};
