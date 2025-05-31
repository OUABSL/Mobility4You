// Ejemplo de imágenes locales
import bmwImage from '../img/coches/BMW-320i-M-Sport.jpg';
import a3Image from '../img/coches/audi-a3-2020-660x375.jpg';

// ========================================
// DATOS DE UBICACIONES DE TESTING
// ========================================
// SOLO se usan cuando DEBUG_MODE = TRUE y la consulta a la DB falla
const testingLocationsData = [
  {
    id: 1,
    nombre: "Aeropuerto de Málaga (AGP)",
    icono_url: "faPlane",
    latitud: 36.6749,
    longitud: -4.4991,
    telefono: "+34 951 23 45 67",
    email: "malaga@mobility4you.com",
    direccion: {
      id: 1,
      calle: "Av. Comandante García Morato, s/n",
      ciudad: "málaga",
      provincia: "málaga", 
      pais: "españa",
      codigo_postal: "29004"
    }
  },
  {
    id: 2,
    nombre: "Centro de Málaga",
    icono_url: "faCity",
    latitud: 36.7213,
    longitud: -4.4214,
    telefono: "+34 951 23 45 68",
    email: "centro@mobility4you.com",
    direccion: {
      id: 2,
      calle: "Calle Larios, 1",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa", 
      codigo_postal: "29005"
    }
  },
  {
    id: 3,
    nombre: "Estación de Tren María Zambrano",
    icono_url: "faTrain",
    latitud: 36.7171,
    longitud: -4.4210,
    telefono: "+34 951 23 45 69",
    email: "estacion@mobility4you.com",
    direccion: {
      id: 3,
      calle: "Explanada de la Estación, s/n",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29002"
    }
  },
  {
    id: 4,
    nombre: "Puerto de Málaga",
    icono_url: "faShip",
    latitud: 36.7193,
    longitud: -4.4142,
    telefono: "+34 951 23 45 70",
    email: "puerto@mobility4you.com",
    direccion: {
      id: 4,
      calle: "Muelle Uno, s/n",
      ciudad: "málaga",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29001"
    }
  },
  {
    id: 5,
    nombre: "Marbella Centro",
    icono_url: "faCity",
    latitud: 36.5097,
    longitud: -4.8855,
    telefono: "+34 951 23 45 71",
    email: "marbella@mobility4you.com",
    direccion: {
      id: 5,
      calle: "Av. Ricardo Soriano, 2",
      ciudad: "marbella",
      provincia: "málaga",
      pais: "españa",
      codigo_postal: "29601"
    }
  },
  {
    id: 6,
    nombre: "Aeropuerto de Madrid (MAD)",
    icono_url: "faPlane",
    latitud: 40.4168,
    longitud: -3.7038,
    telefono: "+34 917 45 32 10",
    email: "madrid@mobility4you.com",
    direccion: {
      id: 6,
      calle: "Av. de la Hispanidad, s/n",
      ciudad: "madrid",
      provincia: "madrid",
      pais: "españa",
      codigo_postal: "28042"
    }
  },
  {
    id: 7,
    nombre: "Centro de Madrid",
    icono_url: "faCity",
    latitud: 40.4168,
    longitud: -3.7038,
    telefono: "+34 917 45 32 11",
    email: "centromadrid@mobility4you.com",
    direccion: {
      id: 7,
      calle: "Gran Vía, 1",
      ciudad: "madrid",
      provincia: "madrid",
      pais: "españa",
      codigo_postal: "28013"
    }
  },
  {
    id: 8,
    nombre: "Aeropuerto de Barcelona (BCN)",
    icono_url: "faPlane",
    latitud: 41.2971,
    longitud: 2.0785,
    telefono: "+34 934 78 65 00",
    email: "barcelona@mobility4you.com",
    direccion: {
      id: 8,
      calle: "El Prat de Llobregat, 08820",
      ciudad: "barcelona",
      provincia: "barcelona",
      pais: "españa",
      codigo_postal: "08820"
    }
  }
];

// ========================================
// DATOS DE DESTINOS POPULARES DE TESTING
// ========================================
const testingDestinos = [
  {
    id: 10,
    nombre: 'España - Múltiples ciudades',
    latitud: 40.4168,
    longitud: -3.7038,
    info_adicional: JSON.stringify({
      paises: 'España',
      ciudades: 'Madrid, Barcelona, Sevilla',
      imagen: 'spain.jpg'
    })
  },
  {
    id: 11,
    nombre: 'Francia - Múltiples ciudades',
    latitud: 48.8566,
    longitud: 2.3522,
    info_adicional: JSON.stringify({
      paises: 'Francia', 
      ciudades: 'París, Lyon, Niza',
      imagen: 'france.jpg'
    })
  },
  {
    id: 12,
    nombre: 'Italia - Múltiples ciudades',
    latitud: 41.9028,
    longitud: 12.4964,
    info_adicional: JSON.stringify({
      paises: 'Italia',
      ciudades: 'Roma, Milán, Florencia', 
      imagen: 'italy.jpg'
    })
  },
  {
    id: 13,
    nombre: 'Reino Unido - Múltiples ciudades',
    latitud: 51.5074,
    longitud: -0.1278,
    info_adicional: JSON.stringify({
      paises: 'Reino Unido',
      ciudades: 'Londres, Manchester, Edimburgo',
      imagen: 'uk.jpg'
    })
  }
];

// ========================================
// DATOS DE ESTADÍSTICAS DE TESTING
// ========================================
const testingEstadisticas = [
  {
    id: 1,
    tipo: 'info',
    titulo: 'Presencia Global',
    subtitulo: '150+ Países y territorios',
    cuerpo: 'Operamos en más de 150 países y territorios alrededor del mundo',
    icono_url: 'faGlobe',
    activo: true,
    info_adicional: JSON.stringify({ color: 'primary', numero: '150+' })
  },
  {
    id: 2,
    tipo: 'info', 
    titulo: 'Red de Oficinas',
    subtitulo: '2,500+ Oficinas en el mundo',
    cuerpo: 'Contamos con más de 2,500 oficinas para brindarte el mejor servicio',
    icono_url: 'faMapMarkerAlt',
    activo: true,
    info_adicional: JSON.stringify({ color: 'success', numero: '2,500+' })
  },
  {
    id: 3,
    tipo: 'info',
    titulo: 'Vehículos Disponibles',
    subtitulo: '500,000+ Vehículos',
    cuerpo: 'Flota global de más de 500,000 vehículos de todas las categorías',
    icono_url: 'faCar',
    activo: true,
    info_adicional: JSON.stringify({ color: 'warning', numero: '500K+' })
  },
  {
    id: 4,
    tipo: 'info',
    titulo: 'Satisfacción Cliente',
    subtitulo: '98% Satisfacción',
    cuerpo: 'Índice de satisfacción del cliente del 98% en nuestros servicios',
    icono_url: 'faStar',
    activo: true,
    info_adicional: JSON.stringify({ color: 'info', numero: '98%' })
  }
];

// ========================================
// DATOS DE VEHÍCULOS DE TESTING (EXISTENTES)
// ========================================
// Datos de prueba adaptados al esquema (mantenemos los existentes)
const testingCars = [
  {
    id: 1,
    categoria_id: 1,
    grupo_id: 1,
    combustible: 'Gasolina',
    marca: 'Audi',
    modelo: 'A3',
    matricula: 'ABC1234',
    anio: 2023,
    color: 'Blanco',
    num_puertas: 5,
    num_pasajeros: 5,
    capacidad_maletero: 380,
    disponible: 1,
    activo: 1,
    fianza: 100,
    kilometraje: 2500,
    descripcion: 'Un coche compacto y elegante con alto nivel de confort y rendimiento excepcional.',
    precio_dia: 69,
    categoria: {
      id: 1,
      nombre: 'Compacto Premium'
    },
    grupo: {
      id: 1,
      nombre: 'Segmento C',
      edad_minima: 21
    },
    imagenPrincipal: a3Image,    imagenes: [
      { 
        id: 1, 
        vehiculo_id: 1, 
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1 
      }
    ]
  },
  {
    id: 7,
    categoria_id: 2,
    grupo_id: 3,
    combustible: 'Diésel',
    marca: 'BMW',
    modelo: '320i',
    matricula: 'XYZ5678',
    anio: 2024,
    color: 'Negro',
    num_puertas: 4,
    num_pasajeros: 5,
    capacidad_maletero: 480,
    disponible: 1,
    activo: 1,
    fianza: 400,
    kilometraje: 1200,
    descripcion: 'Sedán deportivo con tecnología de última generación y el mejor rendimiento de su clase.',
    precio_dia: 89,
    categoria: {
      id: 2,
      nombre: 'Berlina Premium'
    },
    grupo: {
      id: 3,
      nombre: 'Segmento D',
      edad_minima: 23
    },
    imagenPrincipal: bmwImage,    imagenes: [
      { 
        id: 2, 
        vehiculo_id: 7, 
        imagen: bmwImage,
        imagen_url: bmwImage,
        url: bmwImage, // backward compatibility
        portada: 1 
      }
    ]
  },
  {
    id: 2,
    categoria_id: 1,
    grupo_id: 1,
    combustible: 'Híbrido',
    marca: 'Toyota',
    modelo: 'Corolla',
    matricula: 'TYT1234',
    anio: 2023,
    color: 'Gris',
    num_puertas: 5,
    num_pasajeros: 5,
    capacidad_maletero: 420,
    disponible: 1,
    activo: 1,
    fianza: 300,
    kilometraje: 3500,
    descripcion: 'Eficiente y confortable con tecnología híbrida para viajes eco-responsables.',
    precio_dia: 74,
    categoria: {
      id: 1,
      nombre: 'Compacto Premium'
    },
    grupo: {
      id: 1,
      nombre: 'Segmento C',
      edad_minima: 21
    },
    imagenPrincipal: a3Image,
    imagenes: [
      { 
        id: 3, 
        vehiculo_id: 2, 
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1 
      }
    ]
  },
  {
    id: 3,
    categoria_id: 3,
    grupo_id: 4,
    combustible: 'Eléctrico',
    marca: 'Tesla',
    modelo: 'Model 3',
    matricula: 'TSL789',
    anio: 2024,
    color: 'Azul',
    num_puertas: 4,
    num_pasajeros: 5,
    capacidad_maletero: 425,
    disponible: 1,
    activo: 1,
    fianza: 600,
    kilometraje: 500,
    descripcion: 'Vehículo eléctrico de última generación con gran autonomía y prestaciones sorprendentes.',
    precio_dia: 115,
    categoria: {
      id: 3,
      nombre: 'Eléctrico Premium'
    },
    grupo: {
      id: 4,
      nombre: 'Segmento D+',
      edad_minima: 25
    },
    imagenPrincipal: a3Image,
    imagenes: [
      { 
        id: 4, 
        vehiculo_id: 3, 
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1 
      }
    ]
  },
  {
    id: 4,
    categoria_id: 4,
    grupo_id: 5,
    combustible: 'Gasolina',
    marca: 'Mercedes',
    modelo: 'Clase C',
    matricula: 'MRC567',
    anio: 2023,
    color: 'Plata',
    num_puertas: 4,
    num_pasajeros: 5,
    capacidad_maletero: 455,
    disponible: 1,
    activo: 1,
    fianza: 500,
    kilometraje: 2800,
    descripcion: 'Elegancia y tecnología de vanguardia con la calidad premium de Mercedes-Benz.',
    precio_dia: 94,
    categoria: {
      id: 4,
      nombre: 'Berlina Premium'
    },
    grupo: {
      id: 5,
      nombre: 'Segmento E',
      edad_minima: 25
    },
    imagenPrincipal: a3Image,
    imagenes: [
      { 
        id: 5, 
        vehiculo_id: 4, 
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1 
      }
    ]
  },
  {
    id: 5,
    categoria_id: 5,
    grupo_id: 2,
    combustible: 'Diésel',
    marca: 'Volkswagen',
    modelo: 'Golf',
    matricula: 'VWG123',
    anio: 2022,
    color: 'Rojo',
    num_puertas: 5,
    num_pasajeros: 5,
    capacidad_maletero: 380,
    disponible: 1,
    activo: 1,
    fianza: 300,
    kilometraje: 8500,
    descripcion: 'El icónico compacto alemán, versátil y dinámico para cualquier tipo de viaje.',
    precio_dia: 65,
    categoria: {
      id: 5,
      nombre: 'Compacto'
    },
    grupo: {
      id: 2,
      nombre: 'Segmento C',
      edad_minima: 21
    },
    imagenPrincipal: a3Image,
    imagenes: [
      { 
        id: 6, 
        vehiculo_id: 5, 
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1 
      }
    ]
  }
];

// ========================================
// DATOS DE CARACTERÍSTICAS DE TESTING
// ========================================
const testingCaracteristicas = [
  {
    id: 1,
    titulo: 'Servicio 24/7',
    descripcion: 'Atención al cliente disponible las 24 horas del día, los 7 días de la semana para resolver cualquier incidencia.',
    info_adicional: JSON.stringify({ 
      icono: 'faHeadset', 
      color: 'primary' 
    })
  },
  {
    id: 2,
    titulo: 'Cobertura Global',
    descripcion: 'Presencia en más de 150 países y territorios, garantizando servicio donde vayas.',
    info_adicional: JSON.stringify({ 
      icono: 'faGlobe', 
      color: 'success' 
    })
  },
  {
    id: 3,
    titulo: 'Garantía Total',
    descripcion: 'Garantía completa en todos nuestros vehículos con cobertura integral de seguros.',
    info_adicional: JSON.stringify({ 
      icono: 'faShieldAlt', 
      color: 'warning' 
    })
  },
  {
    id: 4,
    titulo: 'Eco-Friendly',
    descripcion: 'Flota moderna con vehículos híbridos y eléctricos para un viaje sostenible.',
    info_adicional: JSON.stringify({ 
      icono: 'faLeaf', 
      color: 'info' 
    })
  }
];

// ========================================
// DATOS DE TESTIMONIOS DE TESTING
// ========================================
const testingTestimonios = [
  {
    id: 1,
    nombre: 'María',
    apellido: 'González',
    direccion: {
      ciudad: 'Madrid',
      pais: 'España'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Excelente servicio, vehículo impecable y atención al cliente excepcional. Totalmente recomendable.',
      avatar: 'https://via.placeholder.com/80x80?text=MG'
    })
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Ruiz',
    direccion: {
      ciudad: 'Barcelona',
      pais: 'España'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Proceso de reserva muy sencillo y rápido. El coche estaba en perfectas condiciones.',
      avatar: 'https://via.placeholder.com/80x80?text=CR'
    })
  },
  {
    id: 3,
    nombre: 'Ana',
    apellido: 'Martín',
    direccion: {
      ciudad: 'Sevilla',
      pais: 'España'
    },
    info_adicional: JSON.stringify({
      rating: 4,
      comentario: 'Muy buena experiencia. Personal amable y vehículos de calidad. Volveré a usar sus servicios.',
      avatar: 'https://via.placeholder.com/80x80?text=AM'
    })
  },
  {
    id: 4,
    nombre: 'David',
    apellido: 'López',
    direccion: {
      ciudad: 'Valencia',
      pais: 'España'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Servicio impecable desde la reserva hasta la devolución. Precios competitivos y gran variedad.',
      avatar: 'https://via.placeholder.com/80x80?text=DL'
    })
  }
];

// ========================================
// EXPORTACIONES PARA FALLBACK DE TESTING
// ========================================
export { testingLocationsData, testingDestinos, testingEstadisticas, testingCaracteristicas, testingTestimonios };
export default testingCars;