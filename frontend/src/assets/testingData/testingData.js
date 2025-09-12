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
    nombre: 'Aeropuerto de Málaga (AGP)',
    icono_url: 'faPlane',
    latitud: 36.6749,
    longitud: -4.4991,
    telefono: '+34 951 23 45 67',
    email: 'malaga@mobility4you.com',
    direccion: {
      id: 1,
      calle: 'Av. Comandante García Morato, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29004',
    },
  },
  {
    id: 2,
    nombre: 'Centro de Málaga',
    icono_url: 'faCity',
    latitud: 36.7213,
    longitud: -4.4214,
    telefono: '+34 951 23 45 68',
    email: 'centro@mobility4you.com',
    direccion: {
      id: 2,
      calle: 'Calle Larios, 1',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29005',
    },
  },
  {
    id: 3,
    nombre: 'Estación de Tren María Zambrano',
    icono_url: 'faTrain',
    latitud: 36.7171,
    longitud: -4.421,
    telefono: '+34 951 23 45 69',
    email: 'estacion@mobility4you.com',
    direccion: {
      id: 3,
      calle: 'Explanada de la Estación, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29002',
    },
  },
  {
    id: 4,
    nombre: 'Puerto de Málaga',
    icono_url: 'faShip',
    latitud: 36.7193,
    longitud: -4.4142,
    telefono: '+34 951 23 45 70',
    email: 'puerto@mobility4you.com',
    direccion: {
      id: 4,
      calle: 'Muelle Uno, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29001',
    },
  },
  {
    id: 5,
    nombre: 'Marbella Centro',
    icono_url: 'faCity',
    latitud: 36.5097,
    longitud: -4.8855,
    telefono: '+34 951 23 45 71',
    email: 'marbella@mobility4you.com',
    direccion: {
      id: 5,
      calle: 'Av. Ricardo Soriano, 2',
      ciudad: 'marbella',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29601',
    },
  },
  {
    id: 6,
    nombre: 'Aeropuerto de Madrid (MAD)',
    icono_url: 'faPlane',
    latitud: 40.4168,
    longitud: -3.7038,
    telefono: '+34 917 45 32 10',
    email: 'madrid@mobility4you.com',
    direccion: {
      id: 6,
      calle: 'Av. de la Hispanidad, s/n',
      ciudad: 'madrid',
      provincia: 'madrid',
      pais: 'españa',
      codigo_postal: '28042',
    },
  },
  {
    id: 7,
    nombre: 'Centro de Madrid',
    icono_url: 'faCity',
    latitud: 40.4168,
    longitud: -3.7038,
    telefono: '+34 917 45 32 11',
    email: 'centromadrid@mobility4you.com',
    direccion: {
      id: 7,
      calle: 'Gran Vía, 1',
      ciudad: 'madrid',
      provincia: 'madrid',
      pais: 'españa',
      codigo_postal: '28013',
    },
  },
  {
    id: 8,
    nombre: 'Aeropuerto de Barcelona (BCN)',
    icono_url: 'faPlane',
    latitud: 41.2971,
    longitud: 2.0785,
    telefono: '+34 934 78 65 00',
    email: 'barcelona@mobility4you.com',
    direccion: {
      id: 8,
      calle: 'El Prat de Llobregat, 08820',
      ciudad: 'barcelona',
      provincia: 'barcelona',
      pais: 'españa',
      codigo_postal: '08820',
    },
  },
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
      imagen: 'spain.jpg',
    }),
  },
  {
    id: 11,
    nombre: 'Francia - Múltiples ciudades',
    latitud: 48.8566,
    longitud: 2.3522,
    info_adicional: JSON.stringify({
      paises: 'Francia',
      ciudades: 'París, Lyon, Niza',
      imagen: 'france.jpg',
    }),
  },
  {
    id: 12,
    nombre: 'Italia - Múltiples ciudades',
    latitud: 41.9028,
    longitud: 12.4964,
    info_adicional: JSON.stringify({
      paises: 'Italia',
      ciudades: 'Roma, Milán, Florencia',
      imagen: 'italy.jpg',
    }),
  },
  {
    id: 13,
    nombre: 'Reino Unido - Múltiples ciudades',
    latitud: 51.5074,
    longitud: -0.1278,
    info_adicional: JSON.stringify({
      paises: 'Reino Unido',
      ciudades: 'Londres, Manchester, Edimburgo',
      imagen: 'uk.jpg',
    }),
  },
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
    info_adicional: JSON.stringify({ color: 'primary', numero: '150+' }),
  },
  {
    id: 2,
    tipo: 'info',
    titulo: 'Red de Oficinas',
    subtitulo: '2,500+ Oficinas en el mundo',
    cuerpo:
      'Contamos con más de 2,500 oficinas para brindarte el mejor servicio',
    icono_url: 'faMapMarkerAlt',
    activo: true,
    info_adicional: JSON.stringify({ color: 'success', numero: '2,500+' }),
  },
  {
    id: 3,
    tipo: 'info',
    titulo: 'Vehículos Disponibles',
    subtitulo: '500,000+ Vehículos',
    cuerpo: 'Flota global de más de 500,000 vehículos de todas las categorías',
    icono_url: 'faCar',
    activo: true,
    info_adicional: JSON.stringify({ color: 'warning', numero: '500K+' }),
  },
  {
    id: 4,
    tipo: 'info',
    titulo: 'Satisfacción Cliente',
    subtitulo: '98% Satisfacción',
    cuerpo: 'Índice de satisfacción del cliente del 98% en nuestros servicios',
    icono_url: 'faStar',
    activo: true,
    info_adicional: JSON.stringify({ color: 'info', numero: '98%' }),
  },
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
    descripcion:
      'Un coche compacto y elegante con alto nivel de confort y rendimiento excepcional.',
    precio_dia: 69,
    categoria: {
      id: 1,
      nombre: 'Compacto Premium',
    },
    grupo: {
      id: 1,
      nombre: 'Segmento C',
      edad_minima: 21,
    },
    imagenPrincipal: a3Image,
    imagenes: [
      {
        id: 1,
        vehiculo_id: 1,
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1,
      },
    ],
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
    descripcion:
      'Sedán deportivo con tecnología de última generación y el mejor rendimiento de su clase.',
    precio_dia: 89,
    categoria: {
      id: 2,
      nombre: 'Berlina Premium',
    },
    grupo: {
      id: 3,
      nombre: 'Segmento D',
      edad_minima: 23,
    },
    imagenPrincipal: bmwImage,
    imagenes: [
      {
        id: 2,
        vehiculo_id: 7,
        imagen: bmwImage,
        imagen_url: bmwImage,
        url: bmwImage, // backward compatibility
        portada: 1,
      },
    ],
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
    descripcion:
      'Eficiente y confortable con tecnología híbrida para viajes eco-responsables.',
    precio_dia: 74,
    categoria: {
      id: 1,
      nombre: 'Compacto Premium',
    },
    grupo: {
      id: 1,
      nombre: 'Segmento C',
      edad_minima: 21,
    },
    imagenPrincipal: a3Image,
    imagenes: [
      {
        id: 3,
        vehiculo_id: 2,
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1,
      },
    ],
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
    descripcion:
      'Vehículo eléctrico de última generación con gran autonomía y prestaciones sorprendentes.',
    precio_dia: 115,
    categoria: {
      id: 3,
      nombre: 'Eléctrico Premium',
    },
    grupo: {
      id: 4,
      nombre: 'Segmento D+',
      edad_minima: 25,
    },
    imagenPrincipal: a3Image,
    imagenes: [
      {
        id: 4,
        vehiculo_id: 3,
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1,
      },
    ],
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
    descripcion:
      'Elegancia y tecnología de vanguardia con la calidad premium de Mercedes-Benz.',
    precio_dia: 94,
    categoria: {
      id: 4,
      nombre: 'Berlina Premium',
    },
    grupo: {
      id: 5,
      nombre: 'Segmento E',
      edad_minima: 25,
    },
    imagenPrincipal: a3Image,
    imagenes: [
      {
        id: 5,
        vehiculo_id: 4,
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1,
      },
    ],
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
    descripcion:
      'El icónico compacto alemán, versátil y dinámico para cualquier tipo de viaje.',
    precio_dia: 65,
    categoria: {
      id: 5,
      nombre: 'Compacto',
    },
    grupo: {
      id: 2,
      nombre: 'Segmento C',
      edad_minima: 21,
    },
    imagenPrincipal: a3Image,
    imagenes: [
      {
        id: 6,
        vehiculo_id: 5,
        imagen: a3Image,
        imagen_url: a3Image,
        url: a3Image, // backward compatibility
        portada: 1,
      },
    ],
  },
];

// ========================================
// DATOS DE CARACTERÍSTICAS DE TESTING
// ========================================
const testingCaracteristicas = [
  {
    id: 1,
    titulo: 'Servicio 24/7',
    descripcion:
      'Atención al cliente disponible las 24 horas del día, los 7 días de la semana para resolver cualquier incidencia.',
    info_adicional: JSON.stringify({
      icono: 'faHeadset',
      color: 'primary',
    }),
  },
  {
    id: 2,
    titulo: 'Cobertura Global',
    descripcion:
      'Presencia en más de 150 países y territorios, garantizando servicio donde vayas.',
    info_adicional: JSON.stringify({
      icono: 'faGlobe',
      color: 'success',
    }),
  },
  {
    id: 3,
    titulo: 'Garantía Total',
    descripcion:
      'Garantía completa en todos nuestros vehículos con cobertura integral de seguros.',
    info_adicional: JSON.stringify({
      icono: 'faShieldAlt',
      color: 'warning',
    }),
  },
  {
    id: 4,
    titulo: 'Eco-Friendly',
    descripcion:
      'Flota moderna con vehículos híbridos y eléctricos para un viaje sostenible.',
    info_adicional: JSON.stringify({
      icono: 'faLeaf',
      color: 'info',
    }),
  },
];

// ========================================
// DATOS DE TESTIMONIOS DE TESTING
// ========================================
const testingTestimonios = [
  {
    id: 1,
    nombre: 'María',
    apellido: 'García',
    direccion: {
      ciudad: 'Madrid',
      pais: 'España',
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario:
        'Excelente servicio. El coche estaba impecable y la atención al cliente fue excepcional. Sin duda repetiré.',
    }),
  },
  {
    id: 2,
    nombre: 'Carlos',
    apellido: 'Rodríguez',
    direccion: {
      ciudad: 'Barcelona',
      pais: 'España',
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario:
        'Proceso de alquiler muy fácil y rápido. El vehículo cumplió perfectamente con mis expectativas para el viaje de negocios.',
    }),
  },
  {
    id: 3,
    nombre: 'Ana',
    apellido: 'Martínez',
    direccion: {
      ciudad: 'Sevilla',
      pais: 'España',
    },
    info_adicional: JSON.stringify({
      rating: 4,
      comentario:
        'Muy buena experiencia en general. El coche era cómodo y perfecto para nuestras vacaciones familiares.',
    }),
  },
  {
    id: 4,
    nombre: 'David',
    apellido: 'López',
    direccion: {
      ciudad: 'Valencia',
      pais: 'España',
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario:
        'Servicio profesional y confiable. La entrega y recogida fue puntual. Totalmente recomendable.',
    }),
  },
];

// ========================================
// DATOS DE POLÍTICAS DE PAGO DE TESTING
// ========================================
const testingPoliticas = [
  {
    id: 1,
    titulo: 'All Inclusive',
    descripcion:
      'Política de pago completa sin preocupaciones con cobertura total',
    franquicia: 0,
    activo: true,
    incluye: [
      {
        id: 1,
        titulo: 'Política de combustible Full-Full',
        descripcion: 'Recoge lleno, devuelve lleno sin cargos adicionales',
      },
      {
        id: 2,
        titulo: 'Cobertura a todo riesgo sin franquicia',
        descripcion: 'Protección completa sin depósitos ni franquicias',
      },
      {
        id: 3,
        titulo: 'Kilometraje ilimitado',
        descripcion: 'Conduce sin límites de distancia',
      },
      {
        id: 4,
        titulo: 'Entrega a domicilio GRATIS',
        descripcion: 'Llevamos el vehículo donde necesites',
      },
      {
        id: 5,
        titulo: 'Asistencia en carretera 24/7',
        descripcion: 'Apoyo completo las 24 horas del día',
      },
      {
        id: 6,
        titulo: 'Pago flexible',
        descripcion: 'Pago por adelantado o a la llegada',
      },
      {
        id: 7,
        titulo: 'Cancelación gratuita hasta 24h',
        descripcion: 'Cancela sin costo hasta 24 horas antes',
      },
      {
        id: 8,
        titulo: 'Parking express',
        descripcion: 'Recogida y devolución en parking express',
      },
      {
        id: 9,
        titulo: 'Conductor adicional gratuito',
        descripcion: 'Incluye un conductor adicional sin costo',
      },
    ],
    no_incluye: [
      {
        id: 1,
        titulo: 'Daños bajo efectos del alcohol',
        descripcion: 'Daños causados bajo efectos de alcohol o drogas',
      },
      {
        id: 2,
        titulo: 'Cargo por no devolver lleno',
        descripcion: 'Cargo aplicable si no se devuelve con el tanque lleno',
      },
    ],
  },
  {
    id: 2,
    titulo: 'Economy',
    descripcion: 'Opción económica con protección básica',
    franquicia: 1200,
    activo: true,
    incluye: [
      {
        id: 10,
        titulo: 'Tarifa no reembolsable',
        descripcion: 'Sin cancelaciones ni modificaciones permitidas',
      },
      {
        id: 11,
        titulo: 'Kilometraje ampliado',
        descripcion: '500km/día, máximo 3.500km total',
      },
      {
        id: 12,
        titulo: 'Cobertura básica con franquicia',
        descripcion: 'Protección estándar con depósito de 1200€',
      },
    ],
    no_incluye: [
      {
        id: 3,
        titulo: 'Daños bajo efectos del alcohol',
        descripcion: 'Daños causados bajo efectos de alcohol o drogas',
      },
      {
        id: 4,
        titulo: 'Cargo por no devolver lleno',
        descripcion: 'Cargo aplicable si no se devuelve con el tanque lleno',
      },
      {
        id: 5,
        titulo: 'Cancelaciones o modificaciones',
        descripcion: 'No se permiten cambios una vez confirmada la reserva',
      },
    ],
  },
  {
    id: 3,
    titulo: 'Premium',
    descripcion: 'Protección premium con servicios exclusivos',
    franquicia: 500,
    activo: true,
    incluye: [
      {
        id: 13,
        titulo: 'Cobertura premium',
        descripcion: 'Protección avanzada con franquicia reducida',
      },
      {
        id: 14,
        titulo: 'Kilometraje extendido',
        descripcion: '1000km/día, máximo 7.000km total',
      },
      {
        id: 15,
        titulo: 'Conductor adicional incluido',
        descripcion: 'Un conductor adicional sin costo extra',
      },
      {
        id: 16,
        titulo: 'Cancelación flexible',
        descripcion: 'Cancela hasta 48 horas antes sin penalización',
      },
      {
        id: 17,
        titulo: 'Upgrade gratuito',
        descripcion:
          'Posibilidad de upgrade de categoría sujeto a disponibilidad',
      },
    ],
    no_incluye: [
      {
        id: 6,
        titulo: 'Daños bajo efectos del alcohol',
        descripcion: 'Daños causados bajo efectos de alcohol o drogas',
      },
      {
        id: 7,
        titulo: 'Cargo por combustible',
        descripcion: 'Cargos por no respetar la política de combustible',
      },
    ],
  },
];

// ========================================
// OPCIONES DE PAGO DE FALLBACK PARA FICHA COCHE
// ========================================
// SOLO se usan cuando DEBUG_MODE = TRUE y la API falla en FichaCoche.js
const testingPaymentOptions = [
  {
    id: 'all-inclusive',
    title: 'All Inclusive',
    deductible: 0,
    incluye: [
      'Política de combustible Full-Full',
      'Cobertura a todo riesgo sin franquicia ni depósitos',
      'Kilometraje ilimitado',
      'Entrega a domicilio (GRATIS)',
      'Asistencia en carretera completa 24/7',
      'Pago por adelantado o a la llegada',
      'Cancelación gratuita hasta 24h antes',
      'Recogida y devolución en el parking express',
      'Conductor adicional gratuito',
    ],
    noIncluye: [
      'Daños bajo efectos del alcohol o drogas',
      'Cargo por no devolver lleno',
    ],
  },
  {
    id: 'economy',
    title: 'Economy',
    deductible: 1200,
    incluye: [
      'No Reembolsable (sin cancelaciones ni modificaciones)',
      'Kilometraje ampliado (500km/día, máx 3.500km)',
      'Cobertura básica con franquicia (depósito 1200€)',
    ],
    noIncluye: [
      'Daños bajo efectos del alcohol o drogas',
      'Cargo por no devolver lleno',
    ],
  },
];

// ========================================
// DATOS DE RESERVA COMPLETA DE TESTING
// ========================================
// Para tests de flujo completo de reserva
const testingReservationData = {
  id: 'RSV-12345',
  car: {
    id: 1,
    marca: 'Volkswagen',
    modelo: 'Golf',
    matricula: 'ABC-1234',
    imagen: 'https://example.com/golf.jpg',
  },
  fechas: {
    pickupDate: '2025-06-15T10:00:00.000Z',
    pickupTime: '10:00',
    dropoffDate: '2025-06-20T18:00:00.000Z',
    dropoffTime: '18:00',
    pickupLocation: {
      id: 1,
      nombre: 'Aeropuerto de Madrid-Barajas',
      direccion: 'Terminal 1, Planta 0',
      coordenadas: { lat: 40.4719, lng: -3.5626 },
    },
    dropoffLocation: {
      id: 2,
      nombre: 'Estación de Atocha',
      direccion: 'Plaza del Emperador Carlos V',
      coordenadas: { lat: 40.4068, lng: -3.6915 },
    },
  },
  conductor: {
    nombre: 'Juan',
    apellido: 'Pérez García',
    apellidos: 'Pérez García',
    email: 'juan.perez@email.com',
    telefono: '+34 666 777 888',
    fechaNacimiento: '1990-01-01',
    nacionalidad: 'Española',
    tipoDocumento: 'dni',
    numeroDocumento: '12345678A',
    calle: 'Calle Principal 123',
    ciudad: 'Madrid',
    provincia: 'Madrid',
    pais: 'España',
    codigoPostal: '28001',
    tieneSegundoConductor: false,
    metodoPago: 'tarjeta',
    aceptaTerminos: true,
  },
  extras: [
    {
      id: 1,
      nombre: 'GPS Navigator',
      precio: 15.5,
    },
    {
      id: 2,
      nombre: 'Silla infantil',
      precio: 25.0,
    },
    {
      id: 3,
      nombre: 'Asiento bebé',
      precio: 8.0,
    },
  ],
  paymentOption: {
    id: 'all-inclusive',
    nombre: 'Pago Completo',
  },
  detallesReserva: {
    precioBase: 200.0,
    iva: 42.0,
    precioExtras: 43.5,
    precioTotal: 285.5,
    total: 285.5,
  },
  fechaPago: '2025-05-31T14:30:00.000Z',
  metodo_pago: 'Tarjeta de Crédito',
  importe_pagado_inicial: 285.5,
  importe_pendiente_inicial: 0,
  importe_pagado_extra: 40.5,
  importe_pendiente_extra: 0,
};

// ========================================
// DATOS DE RESERVA DE TESTING
// ========================================
// SOLO se usan cuando DEBUG_MODE = TRUE y la consulta a la DB falla

export const datosReservaPrueba = {
  id: 'R12345678',
  estado: 'confirmada',
  fechaRecogida: '2025-05-14T12:30:00',
  fechaDevolucion: '2025-05-18T08:30:00',

  vehiculo: {
    id: 7,
    categoria_id: 2,
    grupo_id: 3,
    combustible: 'Diésel',
    marca: 'BMW',
    modelo: '320i',
    matricula: 'ABC1234',
    anio: 2023,
    color: 'Negro',
    num_puertas: 5,
    num_pasajeros: 5,
    capacidad_maletero: 480,
    disponible: 1,
    activo: 1,
    fianza: 0,
    kilometraje: 10500,
    categoria: {
      id: 2,
      nombre: 'Berlina Premium',
    },
    grupo: {
      id: 3,
      nombre: 'Segmento D',
      edad_minima: 21,
    },
    imagenPrincipal: bmwImage,
    imagenes: [{ id: 1, vehiculo_id: 7, url: bmwImage, portada: 1 }],
  },

  lugarRecogida: {
    id: 1,
    nombre: 'Aeropuerto de Málaga (AGP)',
    direccion_id: 5,
    telefono: '+34 951 23 45 67',
    email: 'malaga@mobility4you.com',
    icono_url: 'faPlane',
    direccion: {
      id: 5,
      calle: 'Av. Comandante García Morato, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29004',
    },
  },
  lugarDevolucion: {
    id: 1,
    nombre: 'Aeropuerto de Málaga (AGP)',
    direccion_id: 5,
    telefono: '+34 951 23 45 67',
    email: 'malaga@mobility4you.com',
    icono_url: 'faPlane',
    direccion: {
      id: 5,
      calle: 'Av. Comandante García Morato, s/n',
      ciudad: 'málaga',
      provincia: 'málaga',
      pais: 'españa',
      codigo_postal: '29004',
    },
  },

  politicaPago: {
    id: 1,
    titulo: 'All Inclusive',
    deductible: 0,
    descripcion:
      'Cobertura completa sin franquicia y con kilometraje ilimitado',
    items: [
      {
        politica_id: 1,
        item: 'Cobertura a todo riesgo sin franquicia',
        incluye: 1,
      },
      { politica_id: 1, item: 'Kilometraje ilimitado', incluye: 1 },
      { politica_id: 1, item: 'Asistencia en carretera 24/7', incluye: 1 },
      { politica_id: 1, item: 'Conductor adicional gratuito', incluye: 1 },
      {
        politica_id: 1,
        item: 'Cancelación gratuita hasta 24h antes',
        incluye: 1,
      },
      {
        politica_id: 1,
        item: 'Daños bajo efectos del alcohol o drogas',
        incluye: 0,
      },
    ],
    penalizaciones: [
      {
        politica_pago_id: 1,
        tipo_penalizacion_id: 1,
        horas_previas: 24,
        tipo_penalizacion: {
          id: 1,
          nombre: 'cancelación',
          tipo_tarifa: 'porcentaje',
          valor_tarifa: 50.0,
          descripcion:
            'Cancelación con menos de 24h: cargo del 50% del valor total',
        },
      },
    ],
  },

  extras: [
    { id: 1, nombre: 'Asiento infantil (Grupo 1)', precio: 25.0 },
    { id: 2, nombre: 'GPS navegador', precio: 15.0 },
  ],

  conductores: [
    {
      reserva_id: 'R12345678',
      conductor_id: 123,
      rol: 'principal',
      conductor: {
        id: 123,
        nombre: 'Juan',
        apellido: 'Pérez García',
        email: 'juan.perez@example.com',
        fecha_nacimiento: '1985-06-15',
        sexo: 'masculino',
        nacionalidad: 'española',
        tipo_documento: 'dni',
        numero_documento: '12345678A',
        telefono: '+34 600 123 456',
        direccion_id: 10,
        rol: 'cliente',
        idioma: 'es',
        activo: 1,
        registrado: 1,
        verificado: 1,
        direccion: {
          id: 10,
          calle: 'Calle Principal 123',
          ciudad: 'madrid',
          provincia: 'madrid',
          pais: 'españa',
          codigo_postal: '28001',
        },
      },
    },
    {
      reserva_id: 'R12345678',
      conductor_id: 124,
      rol: 'secundario',
      conductor: {
        id: 124,
        nombre: 'María',
        apellido: 'López Sánchez',
        email: 'maria.lopez@example.com',
        fecha_nacimiento: '1987-04-22',
        sexo: 'femenino',
        nacionalidad: 'española',
        tipo_documento: 'dni',
        numero_documento: '87654321B',
        telefono: '+34 600 789 012',
        direccion_id: 11,
        rol: 'cliente',
        idioma: 'es',
        activo: 1,
        registrado: 1,
        verificado: 1,
        direccion: {
          id: 11,
          calle: 'Calle Secundaria 456',
          ciudad: 'madrid',
          provincia: 'madrid',
          pais: 'españa',
          codigo_postal: '28002',
        },
      },
    },
  ],

  promocion: {
    id: 5,
    nombre: 'Descuento Mayo 2025',
    descuento_pct: 10.0,
    fecha_inicio: '2025-05-01',
    fecha_fin: '2025-05-31',
    activo: 1,
  },

  penalizaciones: [],

  precio_dia: 79.0,
  precioBase: 316.0,
  precioExtras: 40.0,
  iva: 74.76,
  descuentoPromocion: 35.6,
  precioTotal: 395.16,
  diferenciaPendiente: 0,
  metodoPagoDiferencia: null,
  diferenciaPagada: null,
  metodo_pago: 'tarjeta',
  importe_pagado_inicial: 395.16,
  importe_pendiente_inicial: 0.0,
  importe_pagado_extra: 0.0,
  importe_pendiente_extra: 0.0,
};

// ========================================
// DATOS DE EXTRAS DE TESTING
// ========================================
// SOLO se usan cuando DEBUG_MODE = TRUE y la consulta a la DB falla

export const extrasDisponiblesPrueba = [
  {
    id: 1,
    nombre: 'Asiento infantil (Grupo 1)',
    descripcion:
      'Asiento de seguridad para niños de 9-18 kg (aprox. 9 meses a 4 años)',
    categoria: 'seguridad',
    precio: 25.0,
    unidad: 'por día',
    disponible: true,
    activo: true,
    imagen_url: null,
  },
  {
    id: 2,
    nombre: 'GPS navegador',
    descripcion: 'Sistema de navegación GPS con mapas actualizados de Europa',
    categoria: 'navegacion',
    precio: 15.0,
    unidad: 'por día',
    disponible: true,
    activo: true,
    imagen_url: null,
  },
  {
    id: 3,
    nombre: 'Conductor adicional',
    descripcion:
      'Autorización para conductor adicional con cobertura de seguro',
    categoria: 'conductor',
    precio: 8.0,
    unidad: 'por día',
    disponible: true,
    activo: true,
    imagen_url: null,
  },
  {
    id: 4,
    nombre: 'WiFi portátil',
    descripcion: 'Dispositivo WiFi portátil con datos ilimitados',
    categoria: 'conectividad',
    precio: 12.0,
    unidad: 'por día',
    disponible: true,
    activo: true,
    imagen_url: null,
  },
];

// Funciones mock para Stripe (solo para testing)
const generateMockPaymentIntent = (amount) => ({
  id: `pi_test_${Date.now()}`,
  amount: amount * 100,
  currency: 'eur',
  status: 'requires_payment_method',
});

const generateMockConfirmResult = () => ({
  paymentIntent: {
    id: `pi_test_${Date.now()}`,
    status: 'succeeded',
  },
});

const generateMockPaymentStatus = () => ({
  status: 'paid',
  payment_method: 'card',
});

const generateMockRefund = (amount) => ({
  id: `re_test_${Date.now()}`,
  amount: amount * 100,
  currency: 'eur',
  status: 'succeeded',
});

const generateMockPaymentHistory = () => [
  {
    id: `pi_test_${Date.now()}`,
    amount: 25000,
    currency: 'eur',
    status: 'succeeded',
    created: Date.now(),
  },
];

// Exportar las funciones mock de Stripe
const testingStripeMocks = {
  generateMockPaymentIntent,
  generateMockConfirmResult,
  generateMockPaymentStatus,
  generateMockRefund,
  generateMockPaymentHistory,
};

// ========================================
// EXPORTACIONES PRINCIPALES
// ========================================

export {
  testingCaracteristicas,
  testingCars as testingCarsData,
  testingDestinos as testingDestinationsData,
  testingDestinos,
  testingEstadisticas,
  testingCaracteristicas as testingFeaturesData,
  testingLocationsData,
  testingReservationData,
  testingReservationData as testingSimpleReservationData,
  testingEstadisticas as testingStatisticsData,
  testingStripeMocks,
  testingTestimonios as testingTestimonialsData,
  testingTestimonios,
  testingCars as testingVehiclesData,
};

// Flag de control para debugging
export const DEBUG_MODE =
  process.env.NODE_ENV === 'development' &&
  process.env.REACT_APP_DEBUG_MODE === 'true';

// Helper function para verificar si debemos usar datos de testing
export const shouldUseTestingData = (apiCallFailed = false) => {
  return DEBUG_MODE && apiCallFailed;
};
