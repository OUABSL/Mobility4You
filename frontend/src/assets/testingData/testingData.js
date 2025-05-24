// Ejemplo de imágenes locales
import bmwImage from '../img/coches/BMW-320i-M-Sport.jpg';
import a3Image from '../img/coches/audi-a3-2020-660x375.jpg';


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
      imagenPrincipal: a3Image,
      imagenes: [
        { id: 1, vehiculo_id: 1, url: a3Image, portada: 1 }
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
      imagenPrincipal: bmwImage,
      imagenes: [
        { id: 2, vehiculo_id: 7, url: bmwImage, portada: 1 }
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
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 3, vehiculo_id: 2, url: a3Image, portada: 1 }
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
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 4, vehiculo_id: 3, url: a3Image, portada: 1 }
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
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 5, vehiculo_id: 4, url: a3Image, portada: 1 }
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
      imagenPrincipal: a3Image, // Usar una imagen de reemplazo
      imagenes: [
        { id: 6, vehiculo_id: 5, url: a3Image, portada: 1 }
      ]
    }
  ];

  export default testingCars;