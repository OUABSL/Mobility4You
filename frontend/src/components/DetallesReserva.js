// src/components/DetallesReserva.js
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  ListGroup,
  Spinner,
  Badge,
  Modal,
  Image
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCarSide,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faShieldAlt,
  faPlusCircle,
  faChevronDown,
  faChevronUp,
  faEuroSign,
  faTimesCircle,
  faEdit,
  faUser,
  faUserPlus,
  faIdCard,
  faInfoCircle,
  faDownload,
  faPhone,
  faEnvelope,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import '../css/DetallesReserva.css';

import carDoorLeft from '../assets/img/icons/car-door-left.svg';

import "../css/ReservationModals.css";
import DeleteReservationModal from './Modals/DeleteReservationModal';
import EditReservationModal from './Modals/EditReservationModal';


// Imágenes de ejemplo (reemplaza con las imágenes reales o usa una API)
import bmwImage from '../assets/img/coches/BMW-320i-M-Sport.jpg';


/**
 * Componente DetallesReserva - Muestra los detalles completos de una reserva
 * 
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isMobile - Indica si el dispositivo es móvil
 * @returns {JSX.Element} Componente DetallesReserva
 */

// Datos de prueba para desarrollo
// Datos de prueba adaptados al nuevo esquema
const datosReservaPrueba = {
  id: 'R12345678',
  estado: 'confirmada', // confirmada, pendiente, cancelada
  fechaRecogida: '2025-05-14T12:30:00',
  fechaDevolucion: '2025-05-18T08:30:00',
  
  // Información del vehículo - Adaptado al nuevo esquema
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
    fianza: 0, // Este valor viene ahora de política de pago
    kilometraje: 10500,
    // Nueva estructura para categoría y grupo
    categoria: {
      id: 2,
      nombre: 'Berlina Premium'
    },
    grupo: {
      id: 3,
      nombre: 'Segmento D',
      edad_minima: 21
    },
    imagenPrincipal: bmwImage,
    // Las imágenes ahora vienen como una colección de ImagenVehiculo
    imagenes: [
      { id: 1, vehiculo_id: 7, url: bmwImage, portada: 1 }
    ]
  },
  
  // Lugares de recogida y devolución - Adaptados con la normalización de Direccion
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
      codigo_postal: '29004'
    }
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
      codigo_postal: '29004'
    }
  },
  
  // Política de pago - Adaptada a la nueva estructura con PoliticaIncluye
  politicaPago: {
    id: 1,
    titulo: 'All Inclusive',
    deductible: 0,
    descripcion: 'Cobertura completa sin franquicia y con kilometraje ilimitado',
    // Ahora los items incluidos vienen en formato {item, incluye}
    items: [
      { politica_id: 1, item: 'Cobertura a todo riesgo sin franquicia', incluye: 1 },
      { politica_id: 1, item: 'Kilometraje ilimitado', incluye: 1 },
      { politica_id: 1, item: 'Asistencia en carretera 24/7', incluye: 1 },
      { politica_id: 1, item: 'Conductor adicional gratuito', incluye: 1 },
      { politica_id: 1, item: 'Cancelación gratuita hasta 24h antes', incluye: 1 },
      { politica_id: 1, item: 'Daños bajo efectos del alcohol o drogas', incluye: 0 }
    ],
    // Penalizaciones asociadas con esta política
    penalizaciones: [
      { 
        politica_pago_id: 1, 
        tipo_penalizacion_id: 1, 
        horas_previas: 24,
        tipo_penalizacion: {
          id: 1,
          nombre: 'cancelación',
          tipo_tarifa: 'porcentaje',
          valor_tarifa: 50.00,
          descripcion: 'Cancelación con menos de 24h: cargo del 50% del valor total'
        }
      }
    ]
  },
  
  // Extras contratados - Sin cambios
  extras: [
    { id: 1, nombre: 'Asiento infantil (Grupo 1)', precio: 25.00 },
    { id: 2, nombre: 'GPS navegador', precio: 15.00 }
  ],
  
  // Conductores - Ahora usando ReservaConductor según el nuevo esquema
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
        documento: '12345678A',
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
          codigo_postal: '28001'
        }
      }
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
        documento: '87654321B',
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
          codigo_postal: '28002'
        }
      }
    }
  ],
  
  // Promoción aplicada - Acorde al esquema
  promocion: {
    id: 5,
    nombre: 'Descuento Mayo 2025',
    descuento_pct: 10.00,
    fecha_inicio: '2025-05-01',
    fecha_fin: '2025-05-31',
    activo: 1
  },
  
  // Penalizaciones (si hay)
  penalizaciones: [],
  
  // Datos de precio
  precio_dia: 79.00,
  precioBase: 316.00,
  precioExtras: 40.00,
  precioImpuestos: 74.76,
  descuentoPromocion: 35.60,
  precioTotal: 395.16
};

// Contenidos para los acordeones
const contenidosPrueba = {
  important: [
    "Llevar licencia de conducir válida para cada conductor",
    "Presentar pasaporte o DNI en buen estado",
    "Disponer de tarjeta de crédito a nombre del conductor principal",
    "Respetar las directrices generales de uso del vehículo",
    "Presentar documentos originales (no se aceptan fotocopias)"
  ],
  deposit: [
    "Depósito reembolsable de 300,00€ para opciones Economy",
    "Para reservas prepagadas: cargo total + bloqueo del depósito",
    "Para pago en recogida: solo se bloquea el importe total + depósito",
    "Con All Inclusive: sin depósito ni franquicia"
  ],
  cancel: [
    "Cancelación gratuita para reservas con pago en destino hasta 24h antes",
    "Cancelación con menos de 24h: cargo del 50% del valor total",
    "Sin presentación (no-show): cargo del importe total",
    "Reservas corporativas: aplican acuerdos individuales"
  ],
  changes: [
    "No es posible cambiar la forma de pago online",
    "Para actualizar datos del conductor, contactar con atención al cliente",
    "Los extras adicionales se pueden pagar en el momento de la recogida",
    "Modificaciones de fecha/hora sujetas a disponibilidad"
  ],
  station: [
    "Mostrador de recogida ubicado en Terminal 3, planta baja",
    "Servicio de shuttle gratuito al aparcamiento de vehículos",
    "Horario de atención: 08:00 - 22:00 todos los días",
    "Para llegadas fuera de horario, contactar con antelación"
  ]
};


const DetallesReserva = ({ isMobile = false }) => {
  // Hooks para obtener parámetros y navegación
  const { reservaId } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  // Estados del componente
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contenidos, setContenidos] = useState({});

  // Funciones para manejar la edición y eliminación de reservas
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Función para manejar la edición de la reserva
  const handleEditReservation = (reservaData) => {
    setShowEditModal(true);
  };

  // Función para manejar la eliminación de la reserva
  const handleDeleteReservation = (reservaId) => {
    setShowDeleteModal(true);
  };

  // Estados para controlar los acordeones
  const [openAccordions, setOpenAccordions] = useState({
    important: false,
    deposit: false,
    cancel: false,
    changes: false,
    station: false
  });

  // Estados para modals
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Cálculo de días de la reserva (solo si tenemos datos)
  const calcularDiasReserva = () => {
    if (!datos) return 0;
    
    const fechaRecogida = new Date(datos.fechaRecogida);
    const fechaDevolucion = new Date(datos.fechaDevolucion);
    
    // Cálculo de diferencia en días
    return Math.ceil((fechaDevolucion - fechaRecogida) / (1000 * 60 * 60 * 24));
  };

  // Formatear fecha y hora
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '', time: '' };
    
    const date = new Date(dateTimeStr);
    
    return {
      date: date.toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'}),
      time: date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'})
    };
  };

  // Formatear precio como moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-ES', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Toggle para los paneles acordeón
  const toggleAccordion = (section) => {
    setOpenAccordions(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Función para mostrar modal de conductor
  const handleShowDriverDetails = (driver) => {
    setSelectedDriver(driver);
    setShowDriverModal(true);
  };

  // Función para preparar los datos del conductor para mostrar en la UI
  const prepareDriverData = (driver) => {
    if (!driver || !driver.direccion) return null;
    
    // Formatear la dirección completa
    const direccionCompleta = `${driver.direccion.calle}, ${driver.direccion.codigo_postal} ${driver.direccion.ciudad}, ${driver.direccion.provincia}, ${driver.direccion.pais}`;
    
    // Capitalizar la primera letra de nacionalidad y tipo de documento
    const nacionalidadFormatted = driver.nacionalidad.charAt(0).toUpperCase() + driver.nacionalidad.slice(1);
    const tipoDocumentoFormatted = driver.tipo_documento === 'dni' ? 'DNI' : 
                                  driver.tipo_documento === 'nif' ? 'NIF' : 'Pasaporte';
    
    return {
      ...driver,
      direccionCompleta,
      nacionalidadFormatted,
      tipoDocumentoFormatted
    };
  };

  // Cargar datos de la reserva
  useEffect(() => {
    const fetchReserva = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulación de carga de datos (en producción usaríamos la API real)
        // const response = await axios.get(`/api/reservations/${reservaId}`, { 
        //   params: { email },
        //   headers: {
        //     'Authorization': `Bearer ${localStorage.getItem('token')}` // Si hay autenticación
        //   }
        // });
        // const reservaData = response.data;
        // setDatos(reservaData);
        
        // Simulación de datos para desarrollo/testing
        setTimeout(() => {
          setDatos(datosReservaPrueba);
          setContenidos(contenidosPrueba);
          
          // Preparar los conductores principal y adicional para la interfaz
          const conductorPrincipal = datosReservaPrueba.conductores.find(c => c.rol === 'principal')?.conductor;
          const segundoConductor = datosReservaPrueba.conductores.find(c => c.rol === 'secundario')?.conductor;
          
          if (conductorPrincipal) {
            // Añadir la propiedad para identificar en la UI
            conductorPrincipal.esSegundoConductor = false;
            datosReservaPrueba.conductorPrincipal = conductorPrincipal;
          }
          
          if (segundoConductor) {
            segundoConductor.esSegundoConductor = true;
            datosReservaPrueba.segundoConductor = segundoConductor;
          }
          
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error("Error al cargar los datos de la reserva:", err);
        setError(
          err.response?.data?.message || 
          'No se pudo recuperar los detalles de la reserva. Por favor, verifica el ID y el email proporcionados.'
        );
        setLoading(false);
      }
    };

    if (reservaId && email) {
      fetchReserva();
    } else {
      setError('Se requiere ID de reserva y email para consultar los detalles.');
      setLoading(false);
    }
  }, [reservaId, email]);


  // Renderizado de estados de carga y error
  if (loading) {
    return (
      <Container className="detalles-reserva my-5 text-center">
        <Spinner animation="border" variant="primary" className="me-2" />
        <span>Cargando detalles de la reserva...</span>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="detalles-reserva my-5">
        <Card bg="danger" text="white" className="p-3 shadow-sm">
          <Card.Body className="text-center">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" size="lg" />
            <span>{error}</span>
            <div className="mt-3">
              <Button variant="outline-light" onClick={() => navigate('/reservations')}>
                Volver a Gestión de Reservas
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // Formatear fechas/horas para mostrar
  const recogida = formatDateTime(datos.fechaRecogida);
  const devolucion = formatDateTime(datos.fechaDevolucion);
  
  // Calcular número de días de la reserva
  const diasReserva = calcularDiasReserva();

  return (
    <Container className="detalles-reserva my-5">
      {/* Botón Volver y botones de acción */}
      <div className="d-flex align-items-center mb-3">
        <Button 
          variant="outline-primary" 
          onClick={() => navigate(-1)} 
          className="d-flex align-items-center"
        >
          <FontAwesomeIcon icon={faChevronUp} rotation={270} className="me-2" />
          Volver
        </Button>
        
        <div className="ms-auto d-flex gap-2">
          <Button 
            variant="outline-warning" 
            onClick={() => handleEditReservation(datos)}
            disabled={datos.estado === 'cancelada'}
            title={datos.estado === 'cancelada' ? 'No se puede editar una reserva cancelada' : 'Editar reserva'}
          >
            <FontAwesomeIcon icon={faEdit} className="me-1" /> Editar Reserva
          </Button>
          
          <Button 
            variant="outline-danger" 
            onClick={() => handleDeleteReservation(datos.id)}
            disabled={datos.estado === 'cancelada'}
            title={datos.estado === 'cancelada' ? 'La reserva ya está cancelada' : 'Cancelar reserva'}
          >
            <FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Cancelar Reserva
          </Button>
          
          <Button 
            variant="link" 
            onClick={() => window.print()} 
            title="Imprimir/Guardar como PDF"
          >
            <FontAwesomeIcon icon={faDownload} className="me-1" /> Descargar
          </Button>
        </div>
      </div>

      {/* Tarjeta Principal */}
      <Card className="shadow reservation-details-card">
        <Card.Header className="bg-primario text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              <FontAwesomeIcon icon={faCarSide} className="me-2" />
              Reserva #{datos.id}
            </h4>
            <Badge 
              bg={datos.estado === 'confirmada' ? 'success' : 
                 datos.estado === 'pendiente' ? 'warning' : 'danger'}
              className="py-2 px-3"
            >
              {datos.estado === 'confirmada' ? 'Confirmada' : 
               datos.estado === 'pendiente' ? 'Pendiente' : 'Cancelada'}
            </Badge>
          </div>
        </Card.Header>
        
        <Card.Body>
          <Row>
            {/* Columna principal (izquierda) */}
            <Col lg={8} className="pe-lg-4">
              {/* Sección Vehículo */}
              <Card className="mb-4 vehicle-card">
                <Card.Body>
                  <Row className="align-items-center">
                    <Col md={4} className="text-center">
                      <img 
                        src={datos.vehiculo.imagenPrincipal} 
                        alt={`${datos.vehiculo.marca} ${datos.vehiculo.modelo}`} 
                        className="img-fluid car-img rounded" 
                      />
                    </Col>
                    <Col md={8}>
                      <h3 className="vehicle-title">
                        {datos.vehiculo.marca} {datos.vehiculo.modelo}
                      </h3>
                      <div className="d-flex flex-wrap align-items-center vehicle-tags mb-2">
                        <Badge bg="secondary" className="me-2 mb-1">
                          {datos.vehiculo.categoria.nombre}
                        </Badge>
                        <Badge bg="info" className="me-2 mb-1">
                          {datos.vehiculo.grupo.nombre}
                        </Badge>
                        <Badge bg="light" text="dark" className="mb-1">
                          {datos.vehiculo.combustible}
                        </Badge>
                      </div>
                      <div className="vehicle-features">
                        <span className="me-3">
                          <FontAwesomeIcon icon={faUser} className="me-1 text-muted" />
                          {datos.vehiculo.numPasajeros} asientos
                        </span>
                        <span className="me-3">
                          <Image
                            src={carDoorLeft}
                            style={{ maxWidth: '18px'}}
                            alt="Puertas"
                            className="icon-svg text-secondary mb-1 me-1"

                          />
                          {datos.vehiculo.numPuertas} puertas
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faShieldAlt} className="me-1 text-success" />
                          {datos.politicaPago.titulo}
                        </span>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Fechas y Lugares */}
              <Card className="mb-4 locations-card">
                <Card.Body>
                  <Row>
                    <Col md={6} className="border-end pickup-section">
                      <h5 className="location-title">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-primary" />
                        Recogida
                      </h5>
                      <p className="location-name">{datos.lugarRecogida.nombre}</p>
                      <p className="location-address">
                        {datos.lugarRecogida.direccion.calle}, {datos.lugarRecogida.direccion.codigo_postal}, 
                        {datos.lugarRecogida.direccion.ciudad}, {datos.lugarRecogida.direccion.provincia}
                      </p>
                      <div className="date-time mt-3">
                        <div className="d-flex mb-1">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-muted" />
                          </div>
                          <span>{recogida.date}</span>
                        </div>
                        <div className="d-flex">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon icon={faClock} className="text-muted" />
                          </div>
                          <span>{recogida.time}</span>
                        </div>
                      </div>
                    </Col>
                    
                    <Col md={6} className="dropoff-section">
                      <h5 className="location-title">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-danger" />
                        Devolución
                      </h5>
                      <p className="location-name">{datos.lugarDevolucion.nombre}</p>
                      <p className="location-address">
                        {datos.lugarDevolucion.direccion.calle}, {datos.lugarDevolucion.direccion.codigo_postal},
                        {datos.lugarDevolucion.direccion.ciudad}, {datos.lugarDevolucion.direccion.provincia}
                      </p>                      
                      <div className="date-time mt-3">
                        <div className="d-flex mb-1">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-muted" />
                          </div>
                          <span>{devolucion.date}</span>
                        </div>
                        <div className="d-flex">
                          <div className="icon-wrapper">
                            <FontAwesomeIcon icon={faClock} className="text-muted" />
                          </div>
                          <span>{devolucion.time}</span>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Protección */}
              <Card className="mb-4 protection-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-success" />
                    Protección: {datos.politicaPago.titulo}
                  </h5>
                  {datos.politicaPago.deductible === 0 ? (
                    <Badge bg="success">Sin franquicia</Badge>
                  ) : (
                    <Badge bg="warning" text="dark">
                      Franquicia: {formatCurrency(datos.politicaPago.deductible)}
                    </Badge>
                  )}
                </Card.Header>
                <ListGroup variant="flush">
                  {datos.politicaPago.items
                    .filter(item => item.incluye === 1)
                    .map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-success" />
                        {item.item}
                      </ListGroup.Item>
                    ))}
                </ListGroup>
              </Card>

              {/* Sección opcional: Lo que NO incluye */}
              {datos.politicaPago.items.some(item => item.incluye === 0) && (
                <Card className="mb-4 not-included-card">
                  <Card.Header>
                    <h5 className="mb-0 text-start">
                      <FontAwesomeIcon icon={faTimesCircle} className="me-2 text-danger" />
                      No incluido en la protección
                    </h5>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {datos.politicaPago.items
                      .filter(item => item.incluye === 0)
                      .map((item, i) => (
                        <ListGroup.Item key={i} className="py-3">
                          <FontAwesomeIcon icon={faTimesCircle} className="me-2 text-danger" />
                          {item.item}
                        </ListGroup.Item>
                      ))}
                  </ListGroup>
                </Card>
              )}

              {/* Extras */}
              {datos.extras && datos.extras.length > 0 && (
                <Card className="mb-4 extras-card">
                  <Card.Header>
                    <h5 className="mb-0 text-start">
                      <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" />
                      Extras Contratados
                    </h5>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {datos.extras.map((extra, i) => (
                      <ListGroup.Item key={i} className="py-3 d-flex justify-content-between align-items-center">
                        <span>
                          <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" />
                          {extra.nombre}
                        </span>
                        <Badge bg="light" text="dark" className="price-badge">
                          {formatCurrency(extra.precio)}
                        </Badge>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>
              )}

              {/* Datos de Conductores */}
              <Card className="drivers-card">
                <Card.Header>
                  <h5 className="text-start mb-0">
                    <FontAwesomeIcon icon={faUser} className="me-2" />
                    Conductor{datos.conductores.length > 1 ? 'es' : ''}
                  </h5>
                </Card.Header>
                <Card.Body>
                  {/* Iterar sobre los conductores usando el array de la relación */}
                  {datos.conductores.map((conductorRelacion, index) => {
                    const conductor = conductorRelacion.conductor;
                    const esPrincipal = conductorRelacion.rol === 'principal';
                    return (
                      <div key={index} className={index > 0 ? "mt-4" : ""}>
                        <div className="d-flex justify-content-between align-items-start">
                          <h6 className="driver-name">
                            <FontAwesomeIcon 
                              icon={esPrincipal ? faUser : faUserPlus} 
                              className="me-2 text-primary" 
                            />
                            {esPrincipal ? 'Conductor Principal' : 'Conductor Adicional'}
                          </h6>
                          
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => handleShowDriverDetails({
                              ...conductor,
                              esSegundoConductor: !esPrincipal
                            })}
                          >
                            Ver detalles
                          </Button>
                        </div>
                        
                        <Row className="mt-2">
                          <Col md={6} className="mb-2">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faUser} className="me-2 text-muted" />
                              <span>{conductor.nombre} {conductor.apellido}</span>
                            </div>
                          </Col>
                          <Col md={6} className="mb-2">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faIdCard} className="me-2 text-muted" />
                              <span>{conductor.documento}</span>
                            </div>
                          </Col>
                          <Col md={6} className="mb-2">
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faEnvelope} className="me-2 text-muted" />
                              <span>{conductor.email}</span>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="d-flex align-items-center">
                              <FontAwesomeIcon icon={faPhone} className="me-2 text-muted" />
                              <span>{conductor.telefono}</span>
                            </div>
                          </Col>
                        </Row>
                        
                        {index < datos.conductores.length - 1 && (
                          <hr className="my-3" />
                        )}
                      </div>
                    );
                  })}
                </Card.Body>
              </Card>
            </Col>

            {/* Columna secundaria (derecha) */}
            <Col lg={4} className="mt-4 mt-lg-0">
              {/* Resumen de Precio */}
              <Card className="mb-4 price-summary-card">
                <Card.Header className="bg-light">
                  <h5 className="mb-0 d-flex justify-content-between align-items-center">
                    <span>Resumen de Precio</span>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => setShowPriceModal(true)}
                      title="Ver desglose completo"
                    >
                      <FontAwesomeIcon icon={faInfoCircle} />
                    </Button>
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Duración del alquiler:</span>
                    <span className="fw-bold">{diasReserva} días</span>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Precio base:</span>
                    <span>{formatCurrency(datos.precioBase)}</span>
                  </div>
                  
                  {datos.extras && datos.extras.length > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Extras:</span>
                      <span>{formatCurrency(datos.precioExtras)}</span>
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Impuestos (IVA 21%):</span>
                    <span>{formatCurrency(datos.precioImpuestos)}</span>
                  </div>
                  
                  {datos.promocion && (
                    <div className="d-flex justify-content-between align-items-center mb-2 text-success">
                      <span>Descuento promoción:</span>
                      <span>-{formatCurrency(datos.descuentoPromocion)}</span>
                    </div>
                  )}
                  
                  <hr />
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <h5>Total:</h5>
                    <h4 className="text-primary">{formatCurrency(datos.precioTotal)}</h4>
                  </div>
                  
                  <div className="text-end">
                    <small className="text-muted">
                      {datos.politicaPago.deductible > 0 ? (
                        `Requiere depósito: ${formatCurrency(datos.politicaPago.deductible)}`
                      ) : (
                        'Sin depósito requerido'
                      )}
                    </small>
                  </div>
                </Card.Body>
              </Card>

              {/* Paneles acordeón con información importante */}
              {/* Información Importante */}
              <Card className="mb-3 accordion-card card-info-adicionales">
                <Card.Header
                  onClick={() => toggleAccordion('important')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary" />
                    Información importante
                  </span>
                  <FontAwesomeIcon 
                    icon={openAccordions.important ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.important && (
                  <ListGroup variant="flush">
                    {contenidos.important.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Depósito de Seguridad */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('deposit')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-secondary" />
                    Depósito de seguridad
                  </span>
                  <FontAwesomeIcon 
                    icon={openAccordions.deposit ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.deposit && (
                  <ListGroup variant="flush">
                    {contenidos.deposit.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-secondary" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Política de Cancelación */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('cancel')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon icon={faTimesCircle} className="me-2 text-danger" />
                    Política de cancelación
                  </span>
                  <FontAwesomeIcon 
                    icon={openAccordions.cancel ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.cancel && (
                  <ListGroup variant="flush">
                    {contenidos.cancel.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faTimesCircle} className="me-2 text-danger" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Modificaciones de Reserva */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('changes')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                    Modificaciones de reserva
                  </span>
                  <FontAwesomeIcon 
                    icon={openAccordions.changes ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.changes && (
                  <ListGroup variant="flush">
                    {contenidos.changes.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faEdit} className="me-2 text-warning" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>

              {/* Información de la Estación */}
              <Card className="mb-3 accordion-card">
                <Card.Header
                  onClick={() => toggleAccordion('station')}
                  className="d-flex justify-content-between align-items-center"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-title">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-info" />
                    Información de la estación
                  </span>
                  <FontAwesomeIcon 
                    icon={openAccordions.station ? faChevronUp : faChevronDown} 
                    className="text-muted"
                  />
                </Card.Header>
                {openAccordions.station && (
                  <ListGroup variant="flush">
                    {contenidos.station.map((item, i) => (
                      <ListGroup.Item key={i} className="py-3">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-info" />
                        {item}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Modal de Desglose de Precio */}
      <Modal 
        show={showPriceModal} 
        onHide={() => setShowPriceModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-primario text-white">
          <Modal.Title>Desglose del Precio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mb-4">Resumen del alquiler de {diasReserva} días</h5>
          
          <Row className="mb-3 pb-2 border-bottom">
            <Col xs={8}><strong>Concepto</strong></Col>
            <Col xs={4} className="text-end">{formatCurrency(datos.precioBase)}</Col>
          </Row>
          
          {/* Desglose de extras si existen */}
          {datos.extras && datos.extras.length > 0 && (
            <>
              <Row className="mb-2">
                <Col xs={8} className="text-primary">
                  <strong>Extras contratados</strong>
                </Col>
                <Col xs={4}></Col>
              </Row>
              
              {datos.extras.map((extra, idx) => (
                <Row key={idx} className="mb-2">
                  <Col xs={8}>· {extra.nombre}</Col>
                  <Col xs={4} className="text-end">{formatCurrency(extra.precio)}</Col>
                </Row>
              ))}
              
              <Row className="mb-2">
                <Col xs={8}><strong>Subtotal extras</strong></Col>
                <Col xs={4} className="text-end">{formatCurrency(datos.precioExtras)}</Col>
              </Row>
            </>
          )}
          
          <Row className="mb-2">
            <Col xs={8}>Subtotal antes de impuestos</Col>
            <Col xs={4} className="text-end">{formatCurrency(datos.precioBase + datos.precioExtras)}</Col>
          </Row>
          
          <Row className="mb-2">
            <Col xs={8}>IVA (21%)</Col>
            <Col xs={4} className="text-end">{formatCurrency(datos.precioImpuestos)}</Col>
          </Row>
          
          {datos.promocion && (
            <Row className="mb-2 text-success">
              <Col xs={8}>
                Descuento promoción "{datos.promocion.nombre}" ({datos.promocion.descuentoPct}%)
              </Col>
              <Col xs={4} className="text-end">-{formatCurrency(datos.descuentoPromocion)}</Col>
            </Row>
          )}
          
          <Row className="mt-3 pt-2 border-top">
            <Col xs={8}><h5>TOTAL</h5></Col>
            <Col xs={4} className="text-end">
              <h5 className="text-primary">{formatCurrency(datos.precioTotal)}</h5>
            </Col>
          </Row>
          
          <div className="mt-3 p-3 bg-light rounded">
            <h6>Información sobre el pago:</h6>
            <p className="mb-2">
              <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary" />
              {datos.politicaPago.deductible === 0 
                ? 'Tu reserva incluye protección All Inclusive sin franquicia ni depósitos.'
                : `Se requiere un depósito de seguridad de ${formatCurrency(datos.politicaPago.deductible)} que será bloqueado en tu tarjeta.`
              }
            </p>
            <p className="mb-0">
              <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary" />
              El pago se realizará en el momento de la recogida del vehículo.
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <FontAwesomeIcon icon={faDownload} className="me-2" />
            Guardar como PDF
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Detalles del Conductor */}
      <Modal
        show={showDriverModal}
        onHide={() => setShowDriverModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-primario text-white">
          <Modal.Title>
            <FontAwesomeIcon icon={faUser} className="me-2" />
            Detalles del Conductor
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDriver && (
            <>
              <Row className="mb-4">
                <Col xs={12} className="text-center mb-3">
                  <div className="driver-avatar">
                    <FontAwesomeIcon icon={faUser} size="4x" className="text-primary" />
                  </div>
                  <h4 className="mt-2">{selectedDriver.nombre} {selectedDriver.apellido}</h4>
                  <Badge 
                    bg={selectedDriver.esSegundoConductor ? "info" : "primary"}
                    className="py-1 px-2"
                  >
                    {selectedDriver.esSegundoConductor ? "Conductor Adicional" : "Conductor Principal"}
                  </Badge>
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Documento:</Col>
                <Col xs={8}>{selectedDriver.tipo_documento.toUpperCase()}: {selectedDriver.documento}</Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Email:</Col>
                <Col xs={8}>{selectedDriver.email}</Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Teléfono:</Col>
                <Col xs={8}>{selectedDriver.telefono}</Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Dirección:</Col>
                <Col xs={8}>
                  {selectedDriver.direccion.calle}<br />
                  {selectedDriver.direccion.codigo_postal} {selectedDriver.direccion.ciudad}<br />
                  {selectedDriver.direccion.provincia}, {selectedDriver.direccion.pais}
                </Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Fecha Nacimiento:</Col>
                <Col xs={8}>{new Date(selectedDriver.fecha_nacimiento).toLocaleDateString('es-ES')}</Col>
              </Row>
              
              <Row className="mb-3">
                <Col xs={4} className="text-muted">Nacionalidad:</Col>
                <Col xs={8}>{selectedDriver.nacionalidad}</Col>
              </Row>
              
              <div className="driver-license p-3 bg-light rounded mt-3">
                <h6 className="mb-3">
                  <FontAwesomeIcon icon={faIdCard} className="me-2 text-primary" />
                  Información del carnet de conducir
                </h6>
                <p className="mb-0">
                  Se verificará el carnet de conducir en el momento de la recogida del vehículo.
                  Asegúrate de llevar contigo el documento original.
                </p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDriverModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para editar reserva */}
      {showEditModal && (
        <EditReservationModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          reservationData={datos}
          onSave={(updatedData) => {
            // Actualizar los datos locales después de la edición
            setDatos({...datos, ...updatedData});
            setShowEditModal(false);
          }}
        />
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && (
        <DeleteReservationModal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          reservationId={datos.id}
          onConfirm={() => {
            // Redireccionar después de confirmar la eliminación
            navigate('/reservations', { 
              state: { 
                message: 'Reserva cancelada correctamente',
                alertType: 'success'
              } 
            });
          }}
        />
      )}
    </Container>
  );
};


export default DetallesReserva;