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

// Basado en tabla Lugar con Direccion normalizada
const locationsData = [
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
  }
];

// Basado en tabla Contenido con tipo 'info'
const estadisticasGlobales = [
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
    titulo: 'Flota de Vehículos', 
    subtitulo: '50K+ Vehículos disponibles',
    cuerpo: 'Una flota de más de 50,000 vehículos premium para elegir',
    icono_url: 'faCar',
    activo: true,
    info_adicional: JSON.stringify({ color: 'warning', numero: '50K+' })
  },
  {
    id: 4,
    tipo: 'info',
    titulo: 'Satisfacción del Cliente',
    subtitulo: '2M+ Clientes satisfechos', 
    cuerpo: 'Más de 2 millones de clientes confían en nuestro servicio',
    icono_url: 'faUsers',
    activo: true,
    info_adicional: JSON.stringify({ color: 'info', numero: '2M+' })
  }
];

// Basado en tabla PoliticaPago con PoliticaIncluye
const caracteristicasPrincipales = [
  {
    id: 1,
    titulo: 'Protección All Inclusive',
    deductible: 0,
    descripcion: 'Cobertura completa sin franquicia. Conduce con total tranquilidad.',
    items: [
      { item: 'Cobertura a todo riesgo sin franquicia', incluye: 1 },
      { item: 'Asistencia en carretera 24/7', incluye: 1 }
    ],
    info_adicional: JSON.stringify({ icono: 'faShieldAlt', color: 'success' })
  },
  {
    id: 2,
    titulo: 'Reserva Instantánea',
    deductible: 0,
    descripcion: 'Confirma tu reserva al instante, disponible 24/7 online.',
    items: [
      { item: 'Confirmación inmediata', incluye: 1 },
      { item: 'Disponible 24/7', incluye: 1 }
    ],
    info_adicional: JSON.stringify({ icono: 'faClock', color: 'primary' })
  },
  {
    id: 3,
    titulo: 'Soporte 24/7',
    deductible: 0,
    descripcion: 'Asistencia en carretera y atención al cliente las 24 horas.',
    items: [
      { item: 'Atención telefónica 24/7', incluye: 1 },
      { item: 'Asistencia en carretera', incluye: 1 }
    ],
    info_adicional: JSON.stringify({ icono: 'faHeadset', color: 'info' })
  },
  {
    id: 4,
    titulo: 'Flota Eco-Friendly',
    deductible: 0,
    descripcion: 'Vehículos híbridos y eléctricos para un viaje sostenible.',
    items: [
      { item: 'Vehículos híbridos disponibles', incluye: 1 },
      { item: 'Opciones 100% eléctricas', incluye: 1 }
    ],
    info_adicional: JSON.stringify({ icono: 'faLeaf', color: 'warning' })
  }
];

// Basado en tabla Usuario (testimonios como usuarios con rol 'cliente')
const testimonios = [
  {
    id: 123,
    nombre: 'María',
    apellido: 'González',
    email: 'maria.gonzalez@example.com',
    nacionalidad: 'española',
    idioma: 'es',
    rol: 'cliente',
    direccion: {
      ciudad: 'madrid',
      pais: 'españa'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Excelente servicio. El coche estaba impecable y el proceso fue muy sencillo. Lo recomiendo 100%.',
      avatar: 'MG'
    })
  },
  {
    id: 124,
    nombre: 'James',
    apellido: 'Wilson', 
    email: 'james.wilson@example.com',
    nacionalidad: 'británica',
    idioma: 'en',
    rol: 'cliente',
    direccion: {
      ciudad: 'londres',
      pais: 'reino unido'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Perfect for our family trip to Spain. Great car, great service, great price!',
      avatar: 'JW'
    })
  },
  {
    id: 125,
    nombre: 'Sophie',
    apellido: 'Dubois',
    email: 'sophie.dubois@example.com',
    nacionalidad: 'francesa',
    idioma: 'fr',
    rol: 'cliente',
    direccion: {
      ciudad: 'parís',
      pais: 'francia'
    },
    info_adicional: JSON.stringify({
      rating: 5,
      comentario: 'Service impeccable et voitures de qualité. Je recommande vivement Mobility 4 You.',
      avatar: 'SD'
    })
  }
];

// Basado en tabla Lugar para destinos populares
const destinosPopulares = [
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



  // Fetch para ubicaciones
  const fetchLocations = async () => {
    const debug = true; // Cambiar a false en producción
    
    if (debug) {
      return locationsData;
    }
    
    try {
      const response = await axios.get('/api/locations');
      return response.data;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return locationsData; // Fallback a datos de prueba
    }
  };

  // Fetch para estadísticas
  const fetchEstadisticas = async () => {
    const debug = true;
    
    if (debug) {
      return estadisticasGlobales
        .filter(item => item.activo) // CAMBIADO de activo a activo
        .map(item => ({
          icono: item.icono_url,
          numero: JSON.parse(item.info_adicional).numero,
          texto: item.subtitulo,
          color: JSON.parse(item.info_adicional).color
        }));
    }
    
    try {
      const response = await axios.get('/api/contenidos', { // CAMBIADO de /api/content a /api/contenidos
        params: { tipo: 'info', activo: true } // CAMBIADO de activo a activo
      });
      return response.data
        .filter(item => item.activo)
        .map(item => ({
          icono: item.icono_url,
          numero: JSON.parse(item.info_adicional).numero,
          texto: item.subtitulo,
          color: JSON.parse(item.info_adicional).color
        }));
    } catch (error) {
      console.error('Error fetching estadisticas:', error);
      return estadisticasGlobales
        .filter(item => item.activo)
        .map(item => ({
          icono: item.icono_url,
          numero: JSON.parse(item.info_adicional).numero,
          texto: item.subtitulo,
          color: JSON.parse(item.info_adicional).color
        }));
    }
  };

  // Fetch para características
  const fetchCaracteristicas = async () => {
    const debug = true;
    
    if (debug) {
      return caracteristicasPrincipales.map(item => ({
        icono: JSON.parse(item.info_adicional).icono,
        titulo: item.titulo,
        descripcion: item.descripcion,
        color: JSON.parse(item.info_adicional).color
      }));
    }
    
    try {
      const response = await axios.get('/api/politicas-pago'); // Verificar endpoint correcto
      return response.data.map(item => ({
        icono: item.info_adicional ? JSON.parse(item.info_adicional).icono : 'faShieldAlt',
        titulo: item.titulo,
        descripcion: item.descripcion,
        color: item.info_adicional ? JSON.parse(item.info_adicional).color : 'primary'
      }));
    } catch (error) {
      console.error('Error fetching características:', error);
      return caracteristicasPrincipales.map(item => ({
        icono: JSON.parse(item.info_adicional).icono,
        titulo: item.titulo,
        descripcion: item.descripcion,
        color: JSON.parse(item.info_adicional).color
      }));
    }
  };

  // Fetch para testimonios
  const fetchTestimonios = async () => {
    const debug = true;
    
    if (debug) {
      return testimonios.map(user => {
        const extra = JSON.parse(user.info_adicional);
        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          ubicacion: `${user.direccion.ciudad}, ${user.direccion.pais}`,
          rating: extra.rating,
          comentario: extra.comentario,
          avatar: extra.avatar
        };
      });
    }
    
    try {
      const response = await axios.get('/api/users/testimonials');
      return response.data.map(user => {
        const extra = JSON.parse(user.info_adicional);
        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          ubicacion: `${user.direccion.ciudad}, ${user.direccion.pais}`,
          rating: extra.rating,
          comentario: extra.comentario,
          avatar: extra.avatar
        };
      });
    } catch (error) {
      console.error('Error fetching testimonios:', error);
      return testimonios.map(user => {
        const extra = JSON.parse(user.info_adicional);
        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          ubicacion: `${user.direccion.ciudad}, ${user.direccion.pais}`,
          rating: extra.rating,
          comentario: extra.comentario,
          avatar: extra.avatar
        };
      });
    }
  };

  // Fetch para destinos
 const fetchDestinos = async () => {
  const debug = true;
  
  if (debug) {
    return destinosPopulares.map(lugar => {
      const extra = JSON.parse(lugar.info_adicional);
      return {
        nombre: extra.paises,
        ciudades: extra.ciudades,
        imagen: extra.imagen
      };
    });
  }
  
  try {
    const response = await axios.get('/api/lugares/destinos'); // CAMBIADO de /api/locations/destinations
    return response.data.map(lugar => {
      const extra = lugar.info_adicional ? JSON.parse(lugar.info_adicional) : {};
      return {
        nombre: extra.paises || lugar.nombre,
        ciudades: extra.ciudades || lugar.direccion?.ciudad,
        imagen: extra.imagen || 'default.jpg'
      };
    });
  } catch (error) {
    console.error('Error fetching destinos:', error);
    return destinosPopulares.map(lugar => {
      const extra = JSON.parse(lugar.info_adicional);
      return {
        nombre: extra.paises,
        ciudades: extra.ciudades,
        imagen: extra.imagen
      };
    });
  }
};

export {
    fetchLocations,
    fetchEstadisticas,
    fetchCaracteristicas,
    fetchTestimonios,
    fetchDestinos
};