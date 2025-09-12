// src/components/modals/EditReservationModal.js
import {
  faCalculator,
  faCalendarAlt,
  faExclamationTriangle,
  faSave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createServiceLogger, DEBUG_MODE } from '../../config/appConfig';
import {
  calculateEditReservationPrice,
  editReservation,
  fetchPoliticasPago,
  getExtrasDisponibles,
} from '../../services/reservationServices';
import { fetchLocations } from '../../services/searchServices';
import { debugBackendData, debugSessionStorage } from '../../utils';
import { validateReservationDates } from '../../utils/dateValidators';
import ModalCalendario from '../ModalCalendario';
import { is } from 'date-fns/locale';
// Crear logger para el componente
const logger = createServiceLogger('EDIT_RESERVATION_MODAL');

const EditReservationModal = ({ show, onHide, reservationData, onSave, isMobile }) => {
  const navigate = useNavigate();
  logger.info(
    'EditReservationModal inicializado para reserva:',
    reservationData?.id,
  );

  // Extraer el vehiculo_id de manera robusta usando la nueva utilidad
  const getVehiculoId = () => {
    const vehiculoId = extractVehiculoId(reservationData);

    logger.info('🚗 Vehicle ID extraction result:', {
      extracted: vehiculoId,
      isValid: !!vehiculoId && !isNaN(vehiculoId),
    });

    if (!vehiculoId || isNaN(vehiculoId)) {
      logger.error('No se pudo extraer vehiculo_id válido de reservationData');
      logger.error('Full reservation data for debugging:', reservationData);

      // Intentar extraer desde el URL o fallback
      const fallbackId = reservationData.id; // usar ID de la reserva como fallback temporal
      logger.warn('⚠️ Usando fallback ID:', fallbackId);
      return fallbackId;
    }

    return vehiculoId;
  };

  // Función para extraer extras seleccionados
  const getSelectedExtras = () => {
    if (!reservationData?.extras || !Array.isArray(reservationData.extras)) {
      return [];
    }

    const extractedIds = reservationData.extras
      .map((extra) => {
        // PRIORIDAD 1: extra_id - ID de la tabla Extras (correcto)
        if (extra.extra_id) {
          return extra.extra_id;
        }

        // PRIORIDAD 2: Formato anidado del universal mapper
        if (extra.extra && extra.extra.id) {
          return extra.extra.id;
        }

        // PRIORIDAD 3: Si es un número directo
        if (typeof extra === 'number') {
          return extra;
        }

        // ⚠️ ADVERTENCIA: No usar extra.id para mapeo
        console.warn('⚠️ No se pudo extraer ID válido del extra:', extra);
        return null;
      })
      .filter(Boolean);

    logger.info('📦 IDs de extras extraídos (tabla Extras):', extractedIds);
    return extractedIds;
  };

  // Función mejorada para extraer IDs de lugares
  const getLugarId = (lugar, lugarId, fieldName) => {
    if (lugar && lugar.id) {
      return lugar.id;
    } else if (lugarId) {
      return lugarId;
    }
    console.warn(`⚠️ No se pudo extraer ID de ${fieldName}:`, lugar, lugarId);
    return null;
  };

  const vehiculoId = getVehiculoId();
  const selectedExtrasIds = getSelectedExtras();

  const [formData, setFormData] = useState({
    fechaRecogida: null,
    fechaDevolucion: null,
    lugarRecogida_id: null,
    lugarDevolucion_id: null,
    politicaPago_id: null,
    vehiculo_id: null,
    extras: [],
  });

  // Actualizar formData cuando cambien los reservationData
  useEffect(() => {
    if (reservationData && reservationData.id) {
      // Validar y parsear fechas de manera segura
      let fechaRecogida = null;
      let fechaDevolucion = null;

      try {
        if (reservationData.fechaRecogida) {
          fechaRecogida = new Date(reservationData.fechaRecogida);
          if (isNaN(fechaRecogida.getTime())) {
            logger.error(
              'Fecha de recogida inválida:',
              reservationData.fechaRecogida,
            );
            fechaRecogida = null;
          }
        }

        if (reservationData.fechaDevolucion) {
          fechaDevolucion = new Date(reservationData.fechaDevolucion);
          if (isNaN(fechaDevolucion.getTime())) {
            logger.error(
              'Fecha de devolución inválida:',
              reservationData.fechaDevolucion,
            );
            fechaDevolucion = null;
          }
        }
      } catch (error) {
        logger.error('Error parseando fechas de reserva:', error);
      }

      // Extraer política de pago de manera más robusta
      const getPoliticaId = () => {
        // Intentar extraer desde diferentes estructuras posibles
        if (reservationData.politicaPago?.id)
          return reservationData.politicaPago.id;
        if (reservationData.politicaPago?.ID)
          return reservationData.politicaPago.ID;
        if (reservationData.politicaPago_id)
          return reservationData.politicaPago_id;
        if (reservationData.politica_pago?.id)
          return reservationData.politica_pago.id;
        if (reservationData.policy?.id) return reservationData.policy.id;

        logger.warn(
          '⚠️ No se pudo extraer politica_pago_id de:',
          reservationData,
        );
        return null;
      };

      const newFormData = {
        fechaRecogida: fechaRecogida,
        fechaDevolucion: fechaDevolucion,
        lugarRecogida_id: getLugarId(
          reservationData.lugarRecogida,
          reservationData.lugarRecogida_id,
          'lugarRecogida',
        ),
        lugarDevolucion_id: getLugarId(
          reservationData.lugarDevolucion,
          reservationData.lugarDevolucion_id,
          'lugarDevolucion',
        ),
        politicaPago_id: getPoliticaId(),
        vehiculo_id: getVehiculoId(),
        extras: getSelectedExtras(),
      };

      setFormData(newFormData);
    }
  }, [reservationData]);

  const [locations, setLocations] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [availableExtras, setAvailableExtras] = useState([]);

  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);
  const [priceEstimate, setPriceEstimate] = useState(null);

  // Estados para el calendario
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState('pickup'); // pickup o dropoff

  // Horarios disponibles para el calendario (definir horarios comunes)
  const availableTimes = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];

  // Calcular días de alquiler
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    } catch (error) {
      logger.warn('Error calculando días:', error);
      return 0;
    }
  };

  const diasAlquiler = calculateDays(
    formData.fechaRecogida,
    formData.fechaDevolucion,
  );

  // Cargar datos necesarios al abrir el modal
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Limpiar errores previos

        // Validar que tenemos datos de reserva
        if (!reservationData || !reservationData.id) {
          throw new Error('No se proporcionaron datos de reserva válidos');
        }

        logger.info(
          '📦 Iniciando carga de datos para edición de reserva:',
          reservationData.id,
        );

        // Cargar datos en paralelo desde las APIs reales
        const [locationsData, policiesData, extrasData] = await Promise.all([
          fetchLocations().catch((err) => {
            logger.warn('Error cargando ubicaciones:', err);
            return [];
          }),
          fetchPoliticasPago().catch((err) => {
            logger.warn('Error cargando políticas:', err);
            return [];
          }),
          getExtrasDisponibles().catch((err) => {
            logger.warn('Error cargando extras:', err);
            return [];
          }),
        ]);

        // Transformar políticas al formato esperado por el modal
        const transformedPolicies =
          policiesData?.map((policy) => ({
            id: policy.originalData?.id || policy.id,
            titulo: policy.title || policy.titulo,
            descripcion: policy.descripcion,
            deductible: policy.deductible,
            tarifa: policy.tarifa,
            originalData: policy.originalData,
          })) || [];

        setLocations(locationsData || []);
        setPolicies(transformedPolicies);
        setAvailableExtras(extrasData || []);

        // Debug: Verificar si los valores seleccionados están en las listas cargadas
        logger.info('Verificando valores seleccionados contra datos cargados:');

        const selectedLugarRecogida = locationsData?.find(
          (loc) => loc.id === formData.lugarRecogida_id,
        );
        const selectedLugarDevolucion = locationsData?.find(
          (loc) => loc.id === formData.lugarDevolucion_id,
        );
        const selectedPolitica = transformedPolicies.find(
          (pol) => pol.id === formData.politicaPago_id,
        );
        const selectedExtrasObjects =
          extrasData?.filter((extra) => formData.extras.includes(extra.id)) ||
          [];

        // Logging detallado para debugging política de pago
        logger.info('🛡️ DEBUG política de pago:', {
          'formData.politicaPago_id': formData.politicaPago_id,
          'reservationData.politicaPago': reservationData.politicaPago,
          'reservationData.politicaPago_id': reservationData.politicaPago_id,
          'transformedPolicies disponibles': transformedPolicies.map((p) => ({
            id: p.id,
            titulo: p.titulo,
          })),
          selectedPolitica: selectedPolitica,
        });

        // Advertencias si no se encuentran los valores
        if (!selectedLugarRecogida) {
          logger.warn(
            '⚠️ Lugar de recogida no encontrado in ubicaciones cargadas',
          );
        }
        if (!selectedLugarDevolucion) {
          logger.warn(
            '⚠️ Lugar de devolución no encontrado en ubicaciones cargadas',
          );
        }
        if (!selectedPolitica) {
          logger.warn(
            '⚠️ Política de pago no encontrada en políticas cargadas',
          );
          logger.warn(
            '🛡️ Política de pago ID buscado:',
            formData.politicaPago_id,
          );
          logger.warn('🛡️ Políticas disponibles:', transformedPolicies);
        }
        if (selectedExtrasObjects.length !== formData.extras.length) {
          logger.warn(
            '⚠️ Algunos extras seleccionados no se encontraron en extras disponibles',
          );
        }

        logger.info('Todos los datos cargados correctamente');
      } catch (err) {
        logger.error('Error al cargar datos para edición:', err);
        setError('Error al cargar los datos necesarios para la edición');
      } finally {
        setLoading(false);
      }
    };

    if (show && reservationData && reservationData.id) {
      fetchData();
    } else if (show && (!reservationData || !reservationData.id)) {
      setError('No se proporcionaron datos válidos de reserva para editar');
      setLoading(false);
    }
  }, [show, reservationData]);

  // Verificar extras seleccionados cuando se cargan los disponibles
  useEffect(() => {
    if (availableExtras.length > 0 && formData.extras.length > 0) {
      logger.info('Verificando extras seleccionados contra disponibles:');

      const selectedExtrasDetails = availableExtras.filter((extra) =>
        formData.extras.includes(extra.id),
      );

      logger.info('Extras que deberían estar marcados:', selectedExtrasDetails);

      // Verificar en el DOM si están marcados
      setTimeout(() => {
        formData.extras.forEach((extraId) => {
          const checkbox = document.getElementById(`extra-${extraId}`);
          if (checkbox) {
            logger.info(
              `📋 Checkbox extra-${extraId} está marcado:`,
              checkbox.checked,
            );
          } else {
            logger.warn(`⚠️ No se encontró checkbox para extra-${extraId}`);
          }
        });
      }, 100); // Pequeño delay para asegurar que el DOM esté renderizado
    }
  }, [availableExtras, formData.extras]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset price estimate when form changes
    setPriceEstimate(null);
  };

  // Manejar cambios en los extras
  const handleExtraChange = (extraId, isChecked) => {
    if (isChecked) {
      setFormData((prev) => ({
        ...prev,
        extras: [...prev.extras, extraId],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        extras: prev.extras.filter((id) => id !== extraId),
      }));
    }

    // Reset price estimate when extras change
    setPriceEstimate(null);
  };

  // Calcular precio estimado
  const handleCalculatePrice = async () => {
    // Validación de campos requeridos
    if (!formData.vehiculo_id) {
      setError('Debe seleccionar un vehículo antes de calcular el precio');
      return;
    }

    if (!formData.fechaRecogida || !formData.fechaDevolucion) {
      setError(
        'Debe seleccionar fechas de recogida y devolución antes de calcular el precio',
      );
      return;
    }

    if (!formData.politicaPago_id) {
      setError(
        'Debe seleccionar una política de protección antes de calcular el precio',
      );
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      // VALIDAR FECHAS antes de proceder
      const dateValidation = validateReservationDates(
        formData.fechaRecogida,
        formData.fechaDevolucion,
        'edit', // Contexto de edición
      );

      if (!dateValidation.isValid) {
        const errorMessage = dateValidation.errors.join('. ');
        setError(`Error en las fechas: ${errorMessage}`);
        return;
      }

      // VALIDAR datos necesarios para cálculo de edición
      if (
        !formData.vehiculo_id ||
        !formData.fechaRecogida ||
        !formData.fechaDevolucion ||
        !formData.politicaPago_id
      ) {
        setError(
          'Faltan datos esenciales: vehículo, fechas y política de pago son requeridos',
        );
        return;
      }

      // Mapear los datos necesarios
      const calculationData = {
        vehiculo_id: formData.vehiculo_id,
        fecha_recogida: formData.fechaRecogida.toISOString(),
        fecha_devolucion: formData.fechaDevolucion.toISOString(),
        lugar_recogida_id: formData.lugarRecogida_id,
        lugar_devolucion_id: formData.lugarDevolucion_id,
        politica_pago_id: formData.politicaPago_id, // INCLUIR para cálculo de tarifa
        extras: formData.extras.map((extraId) => ({
          extra_id: extraId,
          cantidad: 1,
        })),
      };

      // Usar el servicio de cálculo de edición que incluye la diferencia
      const result = await calculateEditReservationPrice(
        reservationData.id,
        calculationData,
      );

      if (result.success) {
        // Usar las claves homogéneas del backend
        const priceData = {
          precio_original:
            result.precio_original ||
            parseFloat(reservationData.precio_total) ||
            0,
          precio_nuevo: result.precio_nuevo || 0,
          diferencia: result.diferencia || 0,
          desglose: {
            precio_base: result.desglose?.precio_base || 0,
            precio_extras: result.desglose?.precio_extras || 0,
            tarifa_politica: result.desglose?.tarifa_politica || 0,
            precio_sin_iva: result.desglose?.precio_sin_iva || 0,
            iva_simbolico: result.desglose?.iva_simbolico || 0,
            total: result.desglose?.total || result.precio_nuevo || 0,
            dias: result.dias_alquiler || diasAlquiler,
          },
        };

        setPriceEstimate(priceData);
      } else {
        throw new Error(result.error || 'Error calculando precio');
      }
    } catch (error) {
      logger.error('Error calculando precio:', error);
      setError(`Error calculando precio: ${error.message}`);
    } finally {
      setCalculating(false);
    }
  };

  // Guardar cambios
  const handleSubmit = async () => {
    if (!priceEstimate) {
      setError('Por favor calcule el precio antes de guardar los cambios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validar que tenemos los datos necesarios antes de proceder
      logger.info('Iniciando validación de datos para envío:', {
        formData,
        reservationData,
        priceEstimate,
      });

      // Obtener el ID del vehículo con múltiples fallbacks
      const vehiculoIdFromForm = formData.vehiculo_id;
      const vehiculoIdFromReservation =
        reservationData.vehiculo_id ||
        reservationData.vehiculo?.id ||
        (typeof reservationData.vehiculo === 'number'
          ? reservationData.vehiculo
          : null);
      const vehiculoIdFinal = vehiculoIdFromForm || vehiculoIdFromReservation;

      logger.info('🚗 Validación de ID de vehículo:', {
        'formData.vehiculo_id': vehiculoIdFromForm,
        'reservationData.vehiculo_id': reservationData.vehiculo_id,
        'reservationData.vehiculo?.id': reservationData.vehiculo?.id,
        'typeof reservationData.vehiculo': typeof reservationData.vehiculo,
        'reservationData.vehiculo': reservationData.vehiculo,
        'vehiculoId final': vehiculoIdFinal,
      });

      if (!vehiculoIdFinal || isNaN(vehiculoIdFinal)) {
        const errorMsg =
          'ID de vehículo inválido o no seleccionado. No se puede guardar la reserva.';
        logger.error('Error de validación:', errorMsg);
        throw new Error(errorMsg);
      }

      // Validar política de pago
      if (!formData.politicaPago_id) {
        const errorMsg =
          'Debe seleccionar una política de pago. No se puede guardar la reserva.';
        logger.error('Error de validación:', errorMsg);
        throw new Error(errorMsg);
      }

      // Validar datos del formulario
      const validation = validateReservationEditData(formData, reservationData);
      if (!validation.isValid) {
        const errorMsg = `Datos inválidos: ${validation.errors.join(', ')}`;
        logger.error('Error de validación del formulario:', errorMsg);
        throw new Error(errorMsg);
      }

      // Preparar datos para envío con mapeo correcto
      const editedData = {
        vehiculo_id: vehiculoIdFinal,
        fecha_recogida: formData.fechaRecogida.toISOString(),
        fecha_devolucion: formData.fechaDevolucion.toISOString(),
        lugar_recogida_id: formData.lugarRecogida_id,
        lugar_devolucion_id: formData.lugarDevolucion_id,
        politica_pago_id: formData.politicaPago_id,
        // Transformar extras al formato esperado por el backend
        extras: formData.extras.map((extraId) => ({
          extra_id: extraId,
          cantidad: 1,
        })),
        // Incluir datos de precio para validación backend
        precio_total: priceEstimate.precio_nuevo,
        precio_base:
          priceEstimate.precio_nuevo -
          (priceEstimate.desglose?.precio_extras || 0),
        precio_extras: priceEstimate.desglose?.precio_extras || 0,
      };

      logger.info('Datos preparados para envío:', editedData);

      // Si hay diferencia positiva, redirigir a pago de diferencia
      if (priceEstimate.diferencia > 0) {
        logger.info('Diferencia positiva detectada, redirigiendo a pago');

        // Debug: estado actual del sessionStorage
        debugSessionStorage();

        // Preparar datos completos para el pago de diferencia
        const editDataForPayment = {
          id: reservationData.id,
          formData: editedData,
          priceEstimate,
          vehiculo: reservationData.vehiculo || { id: vehiculoIdFinal },
          originalReservation: reservationData,
        };

        // Guardar datos temporales para el pago de diferencia
        sessionStorage.setItem(
          'editReservaData',
          JSON.stringify(editDataForPayment),
        );

        // Obtener email del sessionStorage para pasarlo al componente de pago
        const email =
          sessionStorage.getItem('reservaEmail') ||
          reservationData.conductor?.email ||
          '';
        if (email) {
          sessionStorage.setItem('reservaEmail', email);
        }

        // Debug: datos guardados
        debugBackendData(
          editDataForPayment,
          'datos guardados para pago diferencia',
        );

        // Cerrar modal y redirigir a la pantalla de pago de diferencia
        onHide();
        navigate(`/pago-diferencia/${reservationData.id}`, {
          state: {
            email,
            difference: priceEstimate.diferencia,
            fromEdit: true,
          },
        });
        return;
      }

      // Si no hay diferencia positiva, guardar normalmente
      const updateData = {
        vehiculo_id: vehiculoIdFinal, // Usar el ID validado
        fecha_recogida: formData.fechaRecogida.toISOString(),
        fecha_devolucion: formData.fechaDevolucion.toISOString(),
        lugar_recogida_id: formData.lugarRecogida_id,
        lugar_devolucion_id: formData.lugarDevolucion_id,
        politica_pago_id: formData.politicaPago_id,
        // Transformar extras al formato esperado por el backend
        extras: formData.extras.map((extraId) => ({
          extra_id: extraId,
          cantidad: 1,
        })),
      };

      debugBackendData(updateData, 'actualización directa de reserva');

      const updatedData = await editReservation(reservationData.id, updateData);

      logger.info('Reserva actualizada exitosamente:', updatedData);
      onSave(updatedData);
    } catch (err) {
      logger.error('Error al actualizar reserva:', err);
      setError(
        'Error al actualizar la reserva: ' +
          (err.message || 'Intente nuevamente'),
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear la fecha para mostrar
  const formatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      return format(dateObj, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      logger.warn('Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} backdrop="static" size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Editar Reserva #{reservationData?.numero_reserva}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
              {error}
            </Alert>
          )}

          <Form>
            {/* Fechas de reserva */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha de Recogida</Form.Label>
                  <div
                    className="form-control d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // Validar que tenemos fechas válidas antes de abrir el calendario
                      if (
                        !formData.fechaRecogida ||
                        !formData.fechaDevolucion
                      ) {
                        logger.warn(
                          'No se puede abrir calendario: fechas no disponibles',
                        );
                        setError(
                          'Datos de fechas no disponibles. Recarga la página.',
                        );
                        return;
                      }

                      setCalendarType('pickup');
                      setShowCalendar(true);
                    }}
                  >
                    <span>{formatDate(formData.fechaRecogida)}</span>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Fecha de Devolución</Form.Label>
                  <div
                    className="form-control d-flex justify-content-between align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      // Validar que tenemos fechas válidas antes de abrir el calendario
                      if (
                        !formData.fechaRecogida ||
                        !formData.fechaDevolucion
                      ) {
                        logger.warn(
                          'No se puede abrir calendario: fechas no disponibles',
                        );
                        setError(
                          'Datos de fechas no disponibles. Recarga la página.',
                        );
                        return;
                      }

                      setCalendarType('dropoff');
                      setShowCalendar(true);
                    }}
                  >
                    <span>{formatDate(formData.fechaDevolucion)}</span>
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                </Form.Group>
              </Col>
            </Row>

            {/* Lugares de recogida y devolución */}
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lugar de Recogida</Form.Label>
                  <Form.Select
                    name="lugarRecogida_id"
                    value={formData.lugarRecogida_id || ''}
                    onChange={handleChange}
                  >
                    <option value="">Selecciona un lugar...</option>
                    {locations.map((location) => (
                      <option key={`pickup-${location.id}`} value={location.id}>
                        {location.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lugar de Devolución</Form.Label>
                  <Form.Select
                    name="lugarDevolucion_id"
                    value={formData.lugarDevolucion_id || ''}
                    onChange={handleChange}
                  >
                    <option value="">Selecciona un lugar...</option>
                    {locations.map((location) => (
                      <option
                        key={`dropoff-${location.id}`}
                        value={location.id}
                      >
                        {location.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Política de Pago */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Política de Protección{' '}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    name="politicaPago_id"
                    value={formData.politicaPago_id || ''}
                    onChange={handleChange}
                    required
                    isInvalid={
                      !formData.politicaPago_id &&
                      error &&
                      error.includes('política')
                    }
                  >
                    <option value="">Selecciona una política...</option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.titulo}
                      </option>
                    ))}
                  </Form.Select>
                  {!formData.politicaPago_id &&
                    error &&
                    error.includes('política') && (
                      <Form.Control.Feedback type="invalid">
                        Debe seleccionar una política de protección
                      </Form.Control.Feedback>
                    )}
                </Form.Group>
              </Col>
            </Row>

            {/* Extras */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Extras</Form.Label>
                  <div className="p-3 border rounded">
                    {availableExtras.map((extra) => (
                      <Form.Check
                        key={extra.id}
                        type="checkbox"
                        id={`extra-${extra.id}`}
                        label={`${extra.nombre} (${new Intl.NumberFormat(
                          'es-ES',
                          {
                            style: 'currency',
                            currency: 'EUR',
                          },
                        ).format(
                          extra.precio,
                        )}/día × ${diasAlquiler} días = ${new Intl.NumberFormat(
                          'es-ES',
                          {
                            style: 'currency',
                            currency: 'EUR',
                          },
                        ).format(extra.precio * diasAlquiler)})`}
                        checked={formData.extras.includes(extra.id)}
                        onChange={(e) =>
                          handleExtraChange(extra.id, e.target.checked)
                        }
                        className="mb-2"
                      />
                    ))}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            {/* Cálculo de precio */}
            <Row className="mb-3">
              <Col md={12} className="d-flex justify-content-center">
                <Button
                  variant="outline-primary"
                  onClick={handleCalculatePrice}
                  disabled={calculating}
                >
                  {calculating ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                      />
                      <span className="ms-2">Calculando...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCalculator} className="me-2" />
                      Calcular Precio
                    </>
                  )}
                </Button>
              </Col>
            </Row>

            {/* Mostrar estimación de precio */}
            {priceEstimate && (
              <Row className="mb-3">
                <Col md={12}>
                  <div className="price-estimate p-3 bg-light rounded">
                    <h5 className="mb-3">Estimación de Precio</h5>
                    <div className="d-flex justify-content-between">
                      <span>Precio original:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(priceEstimate.precio_original)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Nuevo precio:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(priceEstimate.precio_nuevo)}
                      </span>
                    </div>
                    {/* Mostrar desglose si está disponible */}
                    {priceEstimate.desglose && (
                      <div className="mt-2">
                        <small className="text-muted">Desglose:</small>
                        <div className="d-flex justify-content-between">
                          <small>
                            Base: {priceEstimate.desglose.precio_base}€
                          </small>
                          <small>
                            Extras: {priceEstimate.desglose.precio_extras}€
                          </small>
                        </div>
                        {priceEstimate.desglose.tarifa_politica > 0 && (
                          <div className="d-flex justify-content-between">
                            <small>
                              Tarifa protección:{' '}
                              {priceEstimate.desglose.tarifa_politica}€
                            </small>
                          </div>
                        )}
                        <div className="d-flex justify-content-between">
                          <small>
                            IVA Incluida: {priceEstimate.desglose.iva_simbolico}
                            €
                          </small>
                        </div>
                      </div>
                    )}
                    {priceEstimate.difference !== 0 && (
                      <div className="d-flex justify-content-between mt-2">
                        <span>
                          Diferencia (
                          {priceEstimate.diferencia > 0
                            ? 'a pagar'
                            : 'a reembolsar'}
                          ):
                        </span>
                        <span
                          className={
                            priceEstimate.diferencia > 0
                              ? 'text-danger'
                              : 'text-success'
                          }
                        >
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(Math.abs(priceEstimate.diferencia))}
                        </span>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            )}
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            <FontAwesomeIcon icon={faTimes} className="me-1" /> Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !priceEstimate}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                <span className="ms-2">Guardando...</span>
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="me-1" /> Guardar
                Cambios
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Calendario - Solo mostrar si tenemos fechas válidas */}
      {showCalendar && formData.fechaRecogida && formData.fechaDevolucion && (
        <ModalCalendario
          openCalendar={showCalendar}
          onHideCalendar={() => setShowCalendar(false)}
          initialValues={(() => {
            try {
              // NUNCA establecer valores por defecto para datos reales de usuarios
              if (!formData.fechaRecogida || !formData.fechaDevolucion) {
                logger.warn(
                  '📅 Fechas no disponibles en formData - no abriendo calendario',
                );
                return null; // Retornar null para que el modal no se abra
              }

              // Validar que las fechas sean objetos Date válidos
              const pickupDate =
                formData.fechaRecogida instanceof Date
                  ? formData.fechaRecogida
                  : new Date(formData.fechaRecogida);

              const dropoffDate =
                formData.fechaDevolucion instanceof Date
                  ? formData.fechaDevolucion
                  : new Date(formData.fechaDevolucion);

              // Verificar que las fechas creadas sean válidas
              if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
                logger.error('📅 FATAL: Fechas inválidas detectadas:', {
                  fechaRecogida: formData.fechaRecogida,
                  fechaDevolucion: formData.fechaDevolucion,
                  pickupDateValid: !isNaN(pickupDate.getTime()),
                  dropoffDateValid: !isNaN(dropoffDate.getTime()),
                });
                return null;
              }

              const initialValues = {
                pickupDate: pickupDate,
                dropoffDate: dropoffDate,
                pickupTime: format(pickupDate, 'HH:mm'),
                dropoffTime: format(dropoffDate, 'HH:mm'),
              };

              logger.info(
                '📅 EditReservationModal - initialValues para ModalCalendario:',
                initialValues,
              );

              return initialValues;
            } catch (error) {
              logger.error(
                '📅 FATAL: Error preparando initialValues para datos reales:',
                error,
              );
              return null; // NO proporcionar valores por defecto para datos reales
            }
          })()}
          availableTimes={availableTimes}
          onSave={(values) => {
            logger.info(
              '📅 Calendar Save - Valores recibidos en EditReservationModal:',
              values,
            );
            logger.info('📅 Calendar Save - Tipo de calendario:', calendarType);
            logger.info('📅 Calendar Save - FormData anterior:', {
              fechaRecogida: formData.fechaRecogida,
              fechaDevolucion: formData.fechaDevolucion,
            });

            // Actualizar ambas fechas siempre - el usuario puede haber cambiado cualquiera
            setFormData((prev) => ({
              ...prev,
              fechaRecogida: values.pickupDate,
              fechaDevolucion: values.dropoffDate,
            }));

            logger.info('📅 Calendar Save - Fechas que se van a guardar:', {
              nuevaFechaRecogida: values.pickupDate,
              nuevaFechaDevolucion: values.dropoffDate,
            });

            // Reset price estimate when date changes
            setPriceEstimate(null);
            setShowCalendar(false);
          }}
          isMobile={isMobile}
          useAsEditor={true}
          resetOnShow={true}
        />
      )}
    </>
  );
};



const validateReservationEditData = (formData, reservationData) => {
  // Validación básica
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  if (!formData) {
    validation.isValid = false;
    validation.errors.push('Datos de formulario requeridos');
  }

  if (!reservationData) {
    validation.isValid = false;
    validation.errors.push('Datos de reserva requeridos');
  }

  return validation;
};


const extractVehiculoId = (reservationData) => {
  if (!reservationData) return null;

  // Intentar extraer el ID del vehículo de diferentes posibles estructuras
  if (reservationData.vehiculo?.id) return reservationData.vehiculo.id;
  if (reservationData.vehiculo?.ID) return reservationData.vehiculo.ID;
  if (reservationData.vehiculo_id) return reservationData.vehiculo_id;
  if (reservationData.vehicle?.id) return reservationData.vehicle.id;
  if (reservationData.vehicle?.ID) return reservationData.vehicle.ID;

  logger.warn('No se pudo extraer vehiculo ID de:', reservationData);
  return null;
};

export default EditReservationModal;
