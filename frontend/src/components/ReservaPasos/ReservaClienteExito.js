// src/components/ReservaPasos/ReservaClienteExito.js
import {
  faCalendarAlt,
  faCarSide,
  faCheckCircle,
  faClock,
  faDownload,
  faInfoCircle,
  faMapMarkerAlt,
  faPrint,
  faShieldAlt,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Row,
  Table,
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { createServiceLogger } from '../../config/appConfig';
import '../../css/ReservaClienteExito.css';
import { getReservationStorageService } from '../../services/reservationStorageService';

// Crear logger para el componente
const logger = createServiceLogger('RESERVA_CLIENTE_EXITO');

const ReservaClienteExito = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const storageService = getReservationStorageService();
  const [reservaCompletada, setReservaCompletada] = useState(null);
  const [error, setError] = useState(null);
  // Estado para activar modo debug (útil para solucionar problemas)
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    try {
      logger.info('[ReservaClienteExito] Cargando datos de reserva completada');

      // Primero intentar obtener datos del state de navegación
      let foundData = false;
      let stateData =
        location.state?.reservationData ||
        location.state?.reservaData ||
        location.state?.reserva;

      // Si los datos vienen anidados en un objeto de respuesta del backend
      if (stateData?.reserva) {
        stateData = stateData.reserva;
      }

      if (stateData) {
        logger.info(
          '[ReservaClienteExito] Datos recibidos desde navigation state:',
          stateData,
        );
        setReservaCompletada(stateData);
        foundData = true;
      } else {
        // Intentar varios posibles nombres de clave en sessionStorage
        const possibleKeys = [
          'reservaCompletada',
          'reservationData',
          'reservaData',
          'reserva',
          'completedReservation',
        ];
        let parsedData = null;

        for (const key of possibleKeys) {
          const storedData = sessionStorage.getItem(key);
          if (storedData) {
            try {
              parsedData = JSON.parse(storedData);

              // Si los datos vienen anidados en un objeto de respuesta del backend
              if (parsedData?.reserva) {
                parsedData = parsedData.reserva;
              }

              logger.info(
                `[ReservaClienteExito] Datos recibidos desde sessionStorage (${key}):`,
                parsedData,
              );
              setReservaCompletada(parsedData);
              // Limpiar después de usar
              sessionStorage.removeItem(key);
              foundData = true;
              break;
            } catch (parseErr) {
              logger.warn(
                `Error al parsear datos de sessionStorage (${key}):`,
                parseErr,
              );
            }
          }
        }

        // Si aún no hay datos, intentar con el storage service
        if (!foundData) {
          // Probar varios métodos posibles
          const methods = [
            'getCompleteReservationData',
            'getReservationData',
            'getReservaData',
            'getReserva',
          ];
          for (const method of methods) {
            if (typeof storageService?.[method] === 'function') {
              let completeData = storageService[method]();

              // Si los datos vienen anidados en un objeto de respuesta del backend
              if (completeData?.reserva) {
                completeData = completeData.reserva;
              }

              if (completeData) {
                logger.info(
                  `[ReservaClienteExito] Datos recibidos desde storage service (${method}):`,
                  completeData,
                );
                setReservaCompletada(completeData);
                foundData = true;
                break;
              }
            }
          }
        }
      }

      // Si después de todos los intentos no hay datos, mostrar error
      if (!foundData) {
        logger.warn(
          '[ReservaClienteExito] No se encontraron datos de reserva en ninguna fuente',
        );
        setError('No se encontraron datos de la reserva completada.');
        return;
      }

      // Asegurar que el storage se limpia después de mostrar el éxito
      if (storageService) {
        setTimeout(() => {
          try {
            // Intentar varios métodos de limpieza
            const cleanupMethods = [
              'clearAllReservationData',
              'clearReservationData',
              'clearData',
            ];
            let cleaned = false;

            for (const method of cleanupMethods) {
              if (typeof storageService[method] === 'function') {
                storageService[method]();
                logger.info(
                  `[ReservaClienteExito] Storage limpiado usando ${method}`,
                );
                cleaned = true;
                break;
              }
            }

            if (!cleaned) {
              logger.warn(
                '[ReservaClienteExito] No se encontró un método para limpiar el storage',
              );
            }
          } catch (err) {
            logger.warn('[ReservaClienteExito] Error al limpiar storage:', err);
          }
        }, 1000);
      }
    } catch (err) {
      logger.error(
        '[ReservaClienteExito] Error al cargar los datos de la reserva:',
        err,
      );
      setError(
        `Error al cargar los datos de la reserva: ${
          err.message || 'Error desconocido'
        }`,
      );
    }
  }, [location.state, storageService]);

  // Imprimir la reserva
  const handleImprimirReserva = () => {
    try {
      // Crear una nueva ventana para imprimir solo el contenido de la reserva
      const printWindow = window.open('', '_blank');

      if (!printWindow) {
        setError(
          'No se pudo abrir la ventana de impresión. Verifica que no estés bloqueando ventanas emergentes.',
        );
        return;
      }

      // Obtener el HTML del contenido de la reserva
      const printContent = document.querySelector('.reserva-exito-container');

      if (!printContent) {
        setError('No se encontró el contenido de la reserva para imprimir.');
        return;
      }

      // Estilos básicos para la impresión
      const printStyles = `
        <style>
          @media print {
            body { font-family: Arial, sans-serif; margin: 20px; }
            .no-print { display: none !important; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 1.5rem; }
            .mt-3 { margin-top: 1rem; }
            .lead { font-size: 1.1em; }
            .badge { background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
            .shadow-lg { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            /* Estilos específicos para iconos FontAwesome en impresión */
            .fa, .fas, .far, .fal, .fab, [data-icon] {
              font-size: 16px !important;
              width: 16px !important;
              height: 16px !important;
              max-width: 16px !important;
              max-height: 16px !important;
            }
            svg[data-icon] {
              width: 16px !important;
              height: 16px !important;
              max-width: 16px !important;
              max-height: 16px !important;
            }
            .btn .fa, .btn .fas, .btn svg[data-icon] {
              font-size: 14px !important;
              width: 14px !important;
              height: 14px !important;
            }
          }
          @media screen {
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-center { text-align: center; }
            .mb-4 { margin-bottom: 1.5rem; }
            .mt-3 { margin-top: 1rem; }
            .lead { font-size: 1.1em; }
            .badge { background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
            .shadow-lg { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
          }
        </style>
      `;

      // Crear el HTML completo para la ventana de impresión
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reserva - Mobility for You</title>
          <meta charset="utf-8">
          ${printStyles}
        </head>
        <body>
          <div class="print-content">
            ${printContent.innerHTML.replace(
              /class="d-flex[^"]*"/g,
              'class="no-print"',
            )}
          </div>
        </body>
        </html>
      `;

      // Escribir el contenido en la nueva ventana
      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Esperar a que se cargue y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    } catch (err) {
      logger.error('Error al imprimir reserva:', err);
      setError('No se pudo imprimir la reserva. Inténtalo de nuevo.');
    }
  };

  // Descargar la reserva como PDF (usando impresión del navegador)
  const handleDescargarReserva = () => {
    try {
      if (!reservaCompletada) {
        setError('No hay datos de reserva para descargar.');
        return;
      }

      // Crear un objeto con los datos formateados para descarga
      const reservaParaDescarga = {
        id: reservaCompletada.numero_reserva || reservaCompletada.id,
        id_interno: reservaCompletada.id,
        fecha_creacion: new Date().toISOString(),
        vehiculo: getVehicleInfo(),
        fechas: {
          recogida: getFechaRecogida(),
          devolucion: getFechaDevolucion(),
        },
        lugares: {
          recogida: getLugarRecogida(),
          devolucion: getLugarDevolucion(),
        },
        conductor: getConductorInfo(),
        opcion_pago: getPaymentOption(),
        metodo_pago: getPaymentMethod(),
        importes: {
          total: formatCurrency(getTotalPagado()),
          pagado_inicial: formatCurrency(
            reservaCompletada.importe_pagado_inicial || 0,
          ),
          pendiente_inicial: formatCurrency(
            reservaCompletada.importe_pendiente_inicial || 0,
          ),
          pagado_extra: formatCurrency(
            reservaCompletada.importe_pagado_extra || 0,
          ),
          pendiente_extra: formatCurrency(
            reservaCompletada.importe_pendiente_extra || 0,
          ),
        },
        extras: getExtrasArray(),
        fecha_pago: fechaPagoFormateada(),
        datos_completos: reservaCompletada,
      };

      // Crear el archivo JSON para descarga
      const blob = new Blob([JSON.stringify(reservaParaDescarga, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reserva_${
        reservaCompletada.numero_reserva ||
        reservaCompletada.id ||
        'mobility4you'
      }_${new Date().toISOString().split('T')[0]}.json`;
      a.style.display = 'none';

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logger.info('Reserva descargada exitosamente');
    } catch (err) {
      logger.error('Error al descargar reserva:', err);
      setError('No se pudo descargar la reserva. Inténtalo de nuevo.');
    }
  };

  // Volver al inicio
  const handleVolverInicio = () => {
    try {
      navigate('/');
    } catch (err) {
      setError('No se pudo volver al inicio.');
    }
  };

  // Ir a gestión de reservas
  const handleGestionReservas = () => {
    try {
      navigate('/reservations');
    } catch (err) {
      setError('No se pudo acceder a la gestión de reservas.');
    }
  };

  // Activar modo debug con tecla secreta (presionar 'd' cinco veces seguidas)
  useEffect(() => {
    let keyPresses = [];
    const keyListener = (e) => {
      if (e.key === 'd') {
        keyPresses.push(Date.now());
        // Solo mantener las últimas 5 pulsaciones
        if (keyPresses.length > 5) {
          keyPresses.shift();
        }
        // Comprobar si hay 5 pulsaciones en menos de 3 segundos
        if (keyPresses.length === 5 && keyPresses[4] - keyPresses[0] < 3000) {
          setDebugMode((prev) => !prev);
          keyPresses = [];
        }
      } else {
        keyPresses = [];
      }
    };

    window.addEventListener('keydown', keyListener);
    return () => {
      window.removeEventListener('keydown', keyListener);
    };
  }, []);

  if (error) {
    return (
      <Container className="reserva-exito-container mt-4 mb-4">
        <Row className="justify-content-center">
          <Col md={8}>
            <Card className="shadow-lg border-danger">
              <Card.Body>
                <div className="text-center mb-4">
                  <h3 className="text-danger">
                    Error al cargar los datos de la reserva
                  </h3>
                  <p>{error}</p>
                  <Button variant="primary" onClick={() => navigate('/')}>
                    Volver al inicio
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!reservaCompletada) {
    return (
      <Container className="reserva-exito-container mt-4 mb-4">
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <Card className="shadow-lg">
              <Card.Body>
                <div className="spinner-border text-primary my-4" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <h3>Cargando datos de la reserva...</h3>
                <p>
                  Por favor espere mientras se obtienen los datos de su reserva.
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Si estamos en modo debug, mostrar datos en crudo
  if (debugMode) {
    return (
      <Container className="mt-4 mb-4">
        <Row className="justify-content-center">
          <Col>
            <Card className="shadow-lg">
              <Card.Header className="bg-dark text-white">
                <h3 className="mb-0">MODO DEBUG - DATOS DE RESERVA</h3>
              </Card.Header>
              <Card.Body>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {JSON.stringify(reservaCompletada, null, 2)}
                </pre>
                <div className="text-center mt-3">
                  <Button variant="warning" onClick={() => setDebugMode(false)}>
                    Salir del modo debug
                  </Button>
                  <Button
                    variant="primary"
                    className="ms-2"
                    onClick={handleVolverInicio}
                  >
                    Volver al inicio
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  // Extraer datos relevantes
  const {
    id,
    car,
    coche, // Alternativa al campo 'car'
    fechas,
    dates, // Alternativa al campo 'fechas'
    paymentOption,
    opcion_pago, // Alternativa al campo 'paymentOption'
    extras,
    extrasSeleccionados, // Alternativa al campo 'extras'
    detallesReserva,
    reservation_details, // Alternativa al campo 'detallesReserva'
    conductor,
    driver, // Alternativa al campo 'conductor'
    conductorPrincipal, // Otra alternativa al campo 'conductor'
    fechaPago,
    fecha_pago, // Alternativa al campo 'fechaPago'
    metodo_pago,
    payment_method, // Alternativa al campo 'metodo_pago'
    importe_pagado_inicial,
    importe_pendiente_inicial,
    importe_pagado_extra,
    importe_pendiente_extra,
    precio_total, // Campo alternativo para el precio total
    precioTotal, // Otra alternativa para el precio total
    total, // Otra alternativa para el precio total
  } = reservaCompletada; // Función para formatear moneda
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';

    let numericValue;
    if (typeof value === 'string') {
      // Convertir string a número
      try {
        numericValue = parseFloat(value.replace(',', '.'));
      } catch (err) {
        return '-';
      }
    } else if (typeof value === 'number') {
      numericValue = value;
    } else {
      return '-';
    }

    // Verificar si es NaN después de la conversión
    if (isNaN(numericValue)) return '-';

    try {
      return numericValue.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch (err) {
      // Fallback en caso de error
      return numericValue.toFixed(2) + ' €';
    }
  };

  // Formatear fecha de pago
  const fechaPagoFormateada = () => {
    // Intentar con created_at del backend
    if (reservaCompletada.created_at) {
      return new Date(reservaCompletada.created_at).toLocaleDateString(
        'es-ES',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    }

    // Campos alternativos
    if (reservaCompletada.fecha_pago) {
      return new Date(reservaCompletada.fecha_pago).toLocaleDateString(
        'es-ES',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    }

    // Por compatibilidad con datos del frontend
    if (fechaPago) return new Date(fechaPago).toLocaleString();
    if (fecha_pago) return new Date(fecha_pago).toLocaleString();
    if (reservaCompletada.payment_date)
      return new Date(reservaCompletada.payment_date).toLocaleString();

    return 'No disponible';
  };

  // Obtener método de pago
  const getPaymentMethod = () => {
    // Campo directo del backend
    if (reservaCompletada.metodo_pago) {
      const metodo = reservaCompletada.metodo_pago;
      switch (metodo) {
        case 'tarjeta':
          return 'Tarjeta de crédito/débito';
        case 'efectivo':
          return 'Efectivo';
        case 'transferencia':
          return 'Transferencia bancaria';
        case 'paypal':
          return 'PayPal';
        default:
          return metodo;
      }
    }

    // Campos alternativos por compatibilidad
    if (metodo_pago) return metodo_pago;
    if (payment_method) return payment_method;
    if (reservaCompletada.payment_method)
      return reservaCompletada.payment_method;
    if (reservaCompletada.forma_pago) return reservaCompletada.forma_pago;

    return 'No especificado';
  }; // Helper functions para extraer datos de manera segura desde la estructura del backend
  const getFechaRecogida = () => {
    // Campo directo del backend
    if (reservaCompletada.fecha_recogida) {
      const date = new Date(reservaCompletada.fecha_recogida);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Campos alternativos por compatibilidad
    if (reservaCompletada.pickup_date) {
      const date = new Date(reservaCompletada.pickup_date);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Datos del objeto fechas (desde frontend)
    if (fechas?.recogida) return fechas.recogida;
    if (fechas?.pickupDate) {
      const date = new Date(fechas.pickupDate);
      return (
        date.toLocaleDateString('es-ES') +
        (fechas.pickupTime ? ` a las ${fechas.pickupTime}` : '')
      );
    }

    return 'No especificada';
  };

  const getFechaDevolucion = () => {
    // Campo directo del backend
    if (reservaCompletada.fecha_devolucion) {
      const date = new Date(reservaCompletada.fecha_devolucion);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Campos alternativos por compatibilidad
    if (reservaCompletada.dropoff_date) {
      const date = new Date(reservaCompletada.dropoff_date);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Datos del objeto fechas (desde frontend)
    if (fechas?.devolucion) return fechas.devolucion;
    if (fechas?.dropoffDate) {
      const date = new Date(fechas.dropoffDate);
      return (
        date.toLocaleDateString('es-ES') +
        (fechas.dropoffTime ? ` a las ${fechas.dropoffTime}` : '')
      );
    }

    return 'No especificada';
  };

  const getLugarRecogida = () => {
    // Campos del backend ReservaDetailSerializer
    if (reservaCompletada.lugar_recogida_nombre) {
      return reservaCompletada.lugar_recogida_nombre;
    }

    // Campos alternativos por compatibilidad
    if (reservaCompletada.pickup_location_name) {
      return reservaCompletada.pickup_location_name;
    }

    // Objeto detallesReserva (desde frontend)
    if (detallesReserva?.lugarRecogida?.nombre)
      return detallesReserva.lugarRecogida.nombre;
    if (detallesReserva?.pickup_location?.nombre)
      return detallesReserva.pickup_location.nombre;

    // Campos directos por compatibilidad
    if (reservaCompletada.lugarRecogida?.nombre)
      return reservaCompletada.lugarRecogida.nombre;
    if (typeof reservaCompletada.lugarRecogida === 'string')
      return reservaCompletada.lugarRecogida;

    return 'No especificado';
  };

  const getLugarDevolucion = () => {
    // Campos del backend ReservaDetailSerializer
    if (reservaCompletada.lugar_devolucion_nombre) {
      return reservaCompletada.lugar_devolucion_nombre;
    }

    // Campos alternativos por compatibilidad
    if (reservaCompletada.dropoff_location_name) {
      return reservaCompletada.dropoff_location_name;
    }

    // Objeto detallesReserva (desde frontend)
    if (detallesReserva?.lugarDevolucion?.nombre)
      return detallesReserva.lugarDevolucion.nombre;
    if (detallesReserva?.dropoff_location?.nombre)
      return detallesReserva.dropoff_location.nombre;

    // Campos directos por compatibilidad
    if (reservaCompletada.lugarDevolucion?.nombre)
      return reservaCompletada.lugarDevolucion.nombre;
    if (typeof reservaCompletada.lugarDevolucion === 'string')
      return reservaCompletada.lugarDevolucion;

    return 'No especificado';
  };

  const getTotalPagado = () => {
    // Cálculo correcto del total incluyendo tarifa de política
    if (typeof reservaCompletada.precio_total === 'number') {
      return reservaCompletada.precio_total;
    }

    // Campos alternativos por compatibilidad
    if (detallesReserva?.precioTotal) return detallesReserva.precioTotal;
    if (reservaCompletada.precioTotal) return reservaCompletada.precioTotal;
    if (precio_total) return precio_total;
    if (precioTotal) return precioTotal;
    if (total) return total;

    // Cálculo completo incluyendo todos los componentes
    const precioBase = reservaCompletada.precio_base || 0;
    const precioExtras = reservaCompletada.precio_extras || 0;
    const tarifaPolitica = reservaCompletada.tarifa_politica || 0;
    const iva = reservaCompletada.iva || 0;

    return precioBase + precioExtras + tarifaPolitica + iva;
  };

  const getConductorInfo = () => {
    // Intentar obtener datos del usuario principal (backend)
    const nombreUsuario = reservaCompletada.usuario_nombre || '';
    const emailUsuario = reservaCompletada.usuario_email || '';

    if (nombreUsuario || emailUsuario) {
      let infoString = nombreUsuario;
      if (emailUsuario) infoString += ` (${emailUsuario})`;
      return infoString || 'No especificado';
    }

    // Intentar obtener datos de los conductores (backend)
    if (
      reservaCompletada.conductores &&
      Array.isArray(reservaCompletada.conductores)
    ) {
      const conductorPrincipal =
        reservaCompletada.conductores.find((c) => c.rol === 'principal') ||
        reservaCompletada.conductores[0];

      if (conductorPrincipal) {
        const nombre = conductorPrincipal.conductor_nombre || '';
        const email = conductorPrincipal.conductor_email || '';

        let infoString = nombre;
        if (email) infoString += ` (${email})`;
        return infoString || 'No especificado';
      }
    }

    // Métodos alternativos por compatibilidad (desde frontend)
    const conductorData =
      conductor ||
      conductorPrincipal ||
      driver ||
      reservaCompletada.conductorPrincipal ||
      reservaCompletada.driver ||
      reservaCompletada.conductor;

    if (conductorData) {
      const nombre = conductorData.nombre || conductorData.name || '';
      const apellido = conductorData.apellido || conductorData.apellidos || '';
      const email = conductorData.email || '';
      const telefono = conductorData.telefono || conductorData.phone || '';

      let infoString = `${nombre} ${apellido}`.trim();
      if (email) infoString += ` (${email})`;
      if (telefono) infoString += ` - Tel: ${telefono}`;

      return infoString || 'No especificado';
    }

    return 'No especificado';
  };

  const getExtrasInfo = () => {
    // Intentar obtener extras del backend
    if (reservaCompletada.extras && Array.isArray(reservaCompletada.extras)) {
      if (reservaCompletada.extras.length === 0) {
        return <span>No se añadieron extras</span>;
      }

      return (
        <ul className="mb-0">
          {reservaCompletada.extras.map((extra, idx) => {
            const nombre =
              extra.extra_nombre || extra.nombre || `Extra ${idx + 1}`;
            const precio = extra.extra_precio || extra.precio || 0;
            const cantidad = extra.cantidad || 1;
            // Obtener días de la reserva para calcular precio total del extra
            const dias = reservaCompletada.dias_alquiler || 1;
            const precioTotal = precio * cantidad * dias;

            return (
              <li key={idx}>
                {cantidad > 1 ? `${cantidad}x ` : ''}
                {nombre} ({formatCurrency(precio)}/día × {dias} días ={' '}
                {formatCurrency(precioTotal)})
              </li>
            );
          })}
        </ul>
      );
    }

    // Métodos alternativos por compatibilidad (desde frontend)
    const extrasData = extras || extrasSeleccionados || [];

    if (!Array.isArray(extrasData) || extrasData.length === 0) {
      return <span>No se añadieron extras</span>;
    }

    return (
      <ul className="mb-0">
        {extrasData.map((extra, idx) => {
          const nombre = extra.nombre || extra.name || `Extra ${idx + 1}`;
          const precio = extra.precio || extra.price || 0;
          return (
            <li key={idx}>
              {nombre} ({formatCurrency(precio)})
            </li>
          );
        })}
      </ul>
    );
  };

  // Función helper para obtener extras como array (para descarga)
  const getExtrasArray = () => {
    if (reservaCompletada.extras && Array.isArray(reservaCompletada.extras)) {
      return reservaCompletada.extras.map((extra) => ({
        nombre: extra.extra_nombre || extra.nombre || 'Extra',
        precio: extra.extra_precio || extra.precio || 0,
        cantidad: extra.cantidad || 1,
      }));
    }

    const extrasData = extras || extrasSeleccionados || [];
    if (Array.isArray(extrasData)) {
      return extrasData.map((extra) => ({
        nombre: extra.nombre || extra.name || 'Extra',
        precio: extra.precio || extra.price || 0,
        cantidad: 1,
      }));
    }

    return [];
  };

  const getVehicleInfo = () => {
    // Campos del backend ReservaDetailSerializer
    const marca = reservaCompletada.vehiculo_marca || '';
    const modelo = reservaCompletada.vehiculo_modelo || '';
    const matricula = reservaCompletada.vehiculo_matricula || '';

    if (marca || modelo) {
      return `${marca} ${modelo}${matricula ? ` (${matricula})` : ''}`.trim();
    }

    // Métodos alternativos por compatibilidad (desde frontend)
    if (car) {
      const marcaCar = car.marca || car.brand || '';
      const modeloCar = car.modelo || car.model || '';
      const matriculaCar = car.matricula || car.license_plate || '';

      if (marcaCar || modeloCar) {
        return `${marcaCar} ${modeloCar}${
          matriculaCar ? ` (${matriculaCar})` : ''
        }`.trim();
      }
    }

    if (coche) {
      const marcaCoche = coche.marca || coche.brand || '';
      const modeloCoche = coche.modelo || coche.model || '';
      const matriculaCoche = coche.matricula || coche.license_plate || '';

      if (marcaCoche || modeloCoche) {
        return `${marcaCoche} ${modeloCoche}${
          matriculaCoche ? ` (${matriculaCoche})` : ''
        }`.trim();
      }
    }

    return 'No especificado';
  };

  const getPaymentOption = () => {
    // Mostrar información completa de la política
    if (reservaCompletada.politica_pago_titulo) {
      const titulo = reservaCompletada.politica_pago_titulo;
      const deductible = reservaCompletada.politica_pago_deductible || 0;
      const tarifa = reservaCompletada.tarifa_politica || 0;

      let descripcion = titulo;
      if (deductible > 0) {
        descripcion += ` (Franquicia: €${deductible})`;
      } else {
        descripcion += ' (Sin franquicia)';
      }

      if (tarifa > 0) {
        descripcion += ` + €${tarifa}/día`;
      }

      return descripcion;
    }

    // Campos alternativos
    if (reservaCompletada.politica_pago_detail?.titulo) {
      return reservaCompletada.politica_pago_detail.titulo;
    }

    return 'No especificada';
  };

  // Renderizado principal
  return (
    <Container className="reserva-exito-container mt-4 mb-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg">
            <Card.Body>
              <div className="text-center mb-4">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  size="3x"
                  color="#28a745"
                />
                <h2 className="mt-3">¡Reserva completada con éxito!</h2>
                <p className="lead">
                  Tu reserva ha sido procesada correctamente. Te hemos enviado
                  un email con los detalles.
                </p>
              </div>{' '}
              <Table bordered responsive className="mb-4">
                <tbody>
                  <tr>
                    <th>ID Reserva</th>
                    <td>
                      <Badge bg="success">
                        {reservaCompletada.numero_reserva ||
                          reservaCompletada.id ||
                          'N/A'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>Estado</th>
                    <td>
                      <Badge
                        bg={
                          reservaCompletada.estado === 'confirmada'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {reservaCompletada.estado || 'pendiente'}
                      </Badge>
                    </td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faCarSide} /> Vehículo
                    </th>
                    <td>{getVehicleInfo()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faCalendarAlt} /> Fecha de recogida
                    </th>
                    <td>{getFechaRecogida()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faCalendarAlt} /> Fecha de
                      devolución
                    </th>
                    <td>{getFechaDevolucion()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faMapMarkerAlt} /> Lugar de
                      recogida
                    </th>
                    <td>{getLugarRecogida()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faMapMarkerAlt} /> Lugar de
                      devolución
                    </th>
                    <td>{getLugarDevolucion()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faUser} /> Conductor principal
                    </th>
                    <td>{getConductorInfo()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faShieldAlt} /> Política de pago
                    </th>
                    <td>{getPaymentOption()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faClock} /> Método de pago
                    </th>
                    <td>{getPaymentMethod()}</td>
                  </tr>
                  <tr>
                    <th>
                      <FontAwesomeIcon icon={faClock} /> Fecha de creación
                    </th>
                    <td>{fechaPagoFormateada()}</td>
                  </tr>
                  <tr>
                    <th>Extras incluidos</th>
                    <td>{getExtrasInfo()}</td>
                  </tr>

                  {/* Desglose completo de precios */}
                  <tr>
                    <th colSpan="2" className="bg-light">
                      <strong>Desglose de Precios</strong>
                    </th>
                  </tr>

                  <tr>
                    <th>
                      <strong>Precio total del vehículo</strong>
                    </th>
                    <td>
                      <strong>
                        {formatCurrency(reservaCompletada.precio_base || 0)}
                      </strong>
                    </td>
                  </tr>

                  {/* Mostrar tarifa de política si existe */}
                  {reservaCompletada.tarifa_politica > 0 && (
                    <tr>
                      <th>
                        <strong>Tarifa de protección</strong>
                      </th>
                      <td>
                        <strong>
                          {formatCurrency(
                            reservaCompletada.tarifa_politica || 0,
                          )}
                        </strong>
                      </td>
                    </tr>
                  )}

                  {reservaCompletada.precio_extras > 0 && (
                    <tr>
                      <th>
                        <strong>Extras</strong>
                      </th>
                      <td>
                        <strong>
                          {formatCurrency(reservaCompletada.precio_extras || 0)}
                        </strong>
                      </td>
                    </tr>
                  )}

                  <tr>
                    <th>
                      <strong>IVA (incluido)</strong>
                    </th>
                    <td>
                      <strong>
                        {formatCurrency(
                          reservaCompletada.iva_display ||
                            reservaCompletada.iva ||
                            (reservaCompletada.precio_total
                              ? (reservaCompletada.precio_total * 0.1) / 1.1
                              : 0),
                        )}
                      </strong>
                    </td>
                  </tr>

                  <tr className="table-success">
                    <th>
                      <strong>TOTAL DE LA RESERVA</strong>
                    </th>
                    <td>
                      <strong style={{ fontSize: '1.2em' }}>
                        {formatCurrency(reservaCompletada.precio_total || 0)}
                      </strong>
                    </td>
                  </tr>

                  {/* Separador para estado de pagos */}
                  <tr>
                    <th colSpan="2" className="bg-light">
                      <strong>Estado de Pagos</strong>
                    </th>
                  </tr>
                  <tr>
                    <th>Importe pagado inicial</th>
                    <td>
                      {formatCurrency(
                        reservaCompletada.importe_pagado_inicial || 0,
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>Importe pendiente inicial</th>
                    <td>
                      {formatCurrency(
                        reservaCompletada.importe_pendiente_inicial || 0,
                      )}
                    </td>
                  </tr>
                  {(reservaCompletada.importe_pagado_extra > 0 ||
                    reservaCompletada.importe_pendiente_extra > 0) && (
                    <>
                      <tr>
                        <th>Importe pagado extra</th>
                        <td>
                          {formatCurrency(
                            reservaCompletada.importe_pagado_extra || 0,
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th>Importe pendiente extra</th>
                        <td>
                          {formatCurrency(
                            reservaCompletada.importe_pendiente_extra || 0,
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </Table>
              {/* Información adicional */}
              {(reservaCompletada.dias_alquiler ||
                reservaCompletada.observaciones) && (
                <Card className="mb-4 bg-light">
                  <Card.Body>
                    <h6 className="mb-3">
                      <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                      Información adicional
                    </h6>

                    {reservaCompletada.dias_alquiler && (
                      <p className="mb-2">
                        <strong>Duración del alquiler:</strong>{' '}
                        {reservaCompletada.dias_alquiler} días
                      </p>
                    )}

                    {reservaCompletada.observaciones && (
                      <p className="mb-2">
                        <strong>Observaciones:</strong>{' '}
                        {reservaCompletada.observaciones}
                      </p>
                    )}

                    <p className="mb-0 text-muted">
                      <small>
                        Todos los precios incluyen IVA. La tarifa de protección
                        se aplica por día de alquiler.
                      </small>
                    </p>
                  </Card.Body>
                </Card>
              )}
              <div className="d-flex justify-content-between no-print">
                <Button
                  variant="outline-primary"
                  onClick={handleImprimirReserva}
                >
                  <FontAwesomeIcon icon={faPrint} className="me-2" /> Imprimir
                </Button>
                <Button
                  variant="outline-success"
                  onClick={handleDescargarReserva}
                  className="no-print"
                >
                  <FontAwesomeIcon icon={faDownload} className="me-2" />{' '}
                  Descargar
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGestionReservas}
                  className="no-print"
                >
                  Gestionar mis reservas
                </Button>
                <Button
                  variant="primary"
                  onClick={handleVolverInicio}
                  className="no-print"
                >
                  Volver al inicio
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ReservaClienteExito;
