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
import ModalCalendario from '../ModalCalendario';
// Crear logger para el componente
const logger = createServiceLogger('EDIT_RESERVATION_MODAL');

const EditReservationModal = ({ show, onHide, reservationData, onSave }) => {
  const navigate = useNavigate();

  // Debug: verificar datos de reserva al inicializar
  logger.info('EditReservationModal - reservationData:', reservationData);

  // Debug completo de los datos de entrada
  const initialDebug = debugReservationData.debugReservationData(
    reservationData,
    'modal-initialization',
  );

  logger.info('Initial validation result:', initialDebug);
  logger.info('ID del vehículo disponible:', {
    'reservationData.vehiculo?.id': reservationData.vehiculo?.id,
    'reservationData.vehiculo_id': reservationData.vehiculo_id,
    'reservationData.vehiculo': reservationData.vehiculo,
  });

  // Extraer el vehiculo_id de manera robusta usando la nueva utilidad
  const getVehiculoId = () => {
    const vehiculoId = extractVehiculoId(reservationData);

    logger.info('🚗 Vehicle ID extraction result:', {
      extracted: vehiculoId,
      isValid: !!vehiculoId && !isNaN(vehiculoId),
    });

    if (!vehiculoId || isNaN(vehiculoId)) {
      logger.error('No se pudo extraer vehiculo_id válido de reservationData');
      logger.error('🔍 Full reservation data for debugging:', reservationData);

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
      logger.info('📦 No hay extras en reservationData o no es un array');
      return [];
    }

    logger.info('📦 Procesando extras de reserva:', reservationData.extras);

    const extractedIds = reservationData.extras
      .map((extra) => {
        // PRIORIDAD 1: extra_id - ID de la tabla Extras (correcto)
        if (extra.extra_id) {
          logger.info(
            'Extra ID encontrado en extra_id:',
            extra.extra_id,
            'Nombre:',
            extra.nombre,
          );
          return extra.extra_id;
        }

        // PRIORIDAD 2: Formato anidado del universal mapper
        if (extra.extra && extra.extra.id) {
          logger.info('Extra ID encontrado en extra.extra.id:', extra.extra.id);
          return extra.extra.id;
        }

        // PRIORIDAD 3: Si es un número directo
        if (typeof extra === 'number') {
          logger.info('Extra es un número directo:', extra);
          return extra;
        }

        // ⚠️ ADVERTENCIA: No usar extra.id para mapeo
        logger.warn('⚠️ No se pudo extraer ID válido del extra:', extra);
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
    logger.warn(`⚠️ No se pudo extraer ID de ${fieldName}:`, {
      lugar,
      lugarId,
    });
    return null;
  };

  const vehiculoId = getVehiculoId();
  const selectedExtrasIds = getSelectedExtras();

  const [formData, setFormData] = useState({
    fechaRecogida: new Date(reservationData.fechaRecogida),
    fechaDevolucion: new Date(reservationData.fechaDevolucion),
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
    politicaPago_id:
      reservationData.politicaPago?.id || reservationData.politicaPago_id,
    vehiculo_id: vehiculoId, // Usar el ID extraído y validado
    extras: selectedExtrasIds,
  });

  // Debug del formulario inicializado
  logger.info('📝 FormData inicial configurado:', formData);
  debugEditFormData(formData, reservationData);

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
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const diasAlquiler = calculateDays(
    formData.fechaRecogida,
    formData.fechaDevolucion,
  );

  // Horarios disponibles
  const º = [
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
    '20:30',
    '21:00',
    '21:30',
    '22:00',
  ];

  // Cargar datos necesarios al abrir el modal
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        logger.info('🔄 Cargando datos para edición de reserva...');

        // Debug: Mostrar datos de reserva recibidos
        logger.info('📋 Datos de reserva recibidos:', {
          'reservationData.id': reservationData.id,
          'reservationData.vehiculo': reservationData.vehiculo,
          'reservationData.vehiculo_id': reservationData.vehiculo_id,
          'reservationData.lugarRecogida': reservationData.lugarRecogida,
          'reservationData.lugarRecogida_id': reservationData.lugarRecogida_id,
          'reservationData.lugarDevolucion': reservationData.lugarDevolucion,
          'reservationData.lugarDevolucion_id':
            reservationData.lugarDevolucion_id,
          'reservationData.politicaPago': reservationData.politicaPago,
          'reservationData.politicaPago_id': reservationData.politicaPago_id,
          'reservationData.extras': reservationData.extras,
          'reservationData.extras.length': reservationData.extras?.length || 0,
        });

        // Debug específico para estructura de extras del backend
        if (reservationData.extras && reservationData.extras.length > 0) {
          logger.info('🔍 Estructura de extras desde backend:', {
            ejemplo_extra: reservationData.extras[0],
            campos_disponibles: Object.keys(reservationData.extras[0] || {}),
            esperado_extra_id: reservationData.extras[0]?.extra_id,
            advertencia_id:
              'El campo "id" es de ReservaExtra, usar "extra_id" para mapear',
          });
        }

        // Cargar datos en paralelo desde las APIs reales
        const [locationsData, policiesData, extrasData] = await Promise.all([
          fetchLocations(),
          fetchPoliticasPago(),
          getExtrasDisponibles(),
        ]);

        logger.info('📍 Ubicaciones cargadas:', locationsData?.length || 0);
        logger.info('🛡️ Políticas cargadas:', policiesData?.length || 0);
        logger.info('🧳 Extras cargados:', extrasData?.length || 0);

        // Debug: verificar duplicados
        debugDuplicateKeys(locationsData, 'locations');
        debugDuplicateKeys(policiesData, 'policies');
        debugDuplicateKeys(extrasData, 'extras');

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
        logger.info(
          '🔍 Verificando valores seleccionados contra datos cargados:',
        );

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

        logger.info('📍 Lugar recogida seleccionado:', selectedLugarRecogida);
        logger.info(
          '📍 Lugar devolución seleccionado:',
          selectedLugarDevolucion,
        );
        logger.info('🛡️ Política seleccionada:', selectedPolitica);
        logger.info('🧳 Extras seleccionados:', selectedExtrasObjects);

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

    if (show) {
      fetchData();
    }
  }, [show, reservationData]);

  // Verificar extras seleccionados cuando se cargan los disponibles
  useEffect(() => {
    if (availableExtras.length > 0 && formData.extras.length > 0) {
      logger.info('🔍 Verificando extras seleccionados contra disponibles:');

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
    if (
      !formData.vehiculo_id ||
      !formData.fechaRecogida ||
      !formData.fechaDevolucion
    ) {
      setError(
        'Por favor completa todos los campos requeridos antes de calcular el precio',
      );
      return;
    }

    setCalculating(true);
    setError(null);

    try {
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

      logger.info('📤 Calculando precio con datos:', calculationData);

      // Usar el servicio de cálculo de edición que incluye la diferencia
      const result = await calculateEditReservationPrice(
        reservationData.id,
        calculationData,
      );

      if (result.success) {
        // Estructura del resultado
        const priceData = {
          originalPrice: parseFloat(reservationData.precio_total) || 0,
          newPrice: result.precio_total || 0,
          difference:
            (result.precio_total || 0) -
            (parseFloat(reservationData.precio_total) || 0),
          breakdown: {
            precio_base: result.desglose?.precio_base || 0,
            precio_extras: result.desglose?.precio_extras || 0,
            tarifa_politica: result.desglose?.tarifa_politica || 0,
            subtotal: result.desglose?.subtotal_sin_iva || 0,
            iva: result.desglose?.iva || 0,
            total: result.desglose?.total_con_iva || result.precio_total || 0,
            dias: result.dias_alquiler || diasAlquiler,
          },
        };

        setPriceEstimate(priceData);
        logger.info('Precio calculado exitosamente:', priceData);
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
      logger.info('🔍 Iniciando validación de datos para envío:', {
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
        precio_total: priceEstimate.newPrice,
        precio_base:
          priceEstimate.newPrice - (priceEstimate.breakdown?.extras || 0),
        precio_extras: priceEstimate.breakdown?.extras || 0,
      };

      logger.info('📤 Datos preparados para envío:', editedData);

      // Si hay diferencia positiva, redirigir a pago de diferencia
      if (priceEstimate.difference > 0) {
        logger.info('💰 Diferencia positiva detectada, redirigiendo a pago');

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
            difference: priceEstimate.difference,
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
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  return (
    <>
      <Modal show={show} onHide={onHide} backdrop="static" size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Reserva #{reservationData.id}</Modal.Title>
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
                  <Form.Label>Política de Protección</Form.Label>
                  <Form.Select
                    name="politicaPago_id"
                    value={formData.politicaPago_id || ''}
                    onChange={handleChange}
                  >
                    <option value="">Selecciona una política...</option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.titulo}
                      </option>
                    ))}
                  </Form.Select>
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
                        }).format(priceEstimate.originalPrice)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Nuevo precio:</span>
                      <span>
                        {new Intl.NumberFormat('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(priceEstimate.newPrice)}
                      </span>
                    </div>
                    {/* Mostrar desglose si está disponible */}
                    {priceEstimate.breakdown && (
                      <div className="mt-2">
                        <small className="text-muted">Desglose:</small>
                        <div className="d-flex justify-content-between">
                          <small>
                            Base: {priceEstimate.breakdown.precio_base}€
                          </small>
                          <small>
                            Extras: {priceEstimate.breakdown.precio_extras}€
                          </small>
                        </div>
                        {priceEstimate.breakdown.tarifa_politica > 0 && (
                          <div className="d-flex justify-content-between">
                            <small>
                              Tarifa protección:{' '}
                              {priceEstimate.breakdown.tarifa_politica}€
                            </small>
                          </div>
                        )}
                        <div className="d-flex justify-content-between">
                          <small>
                            Impuestos: {priceEstimate.breakdown.impuestos}€
                          </small>
                        </div>
                      </div>
                    )}
                    {priceEstimate.difference !== 0 && (
                      <div className="d-flex justify-content-between mt-2">
                        <span>
                          Diferencia (
                          {priceEstimate.difference > 0
                            ? 'a pagar'
                            : 'a reembolsar'}
                          ):
                        </span>
                        <span
                          className={
                            priceEstimate.difference > 0
                              ? 'text-danger'
                              : 'text-success'
                          }
                        >
                          {new Intl.NumberFormat('es-ES', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(Math.abs(priceEstimate.difference))}
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

      {/* Modal de Calendario */}
      <ModalCalendario
        openCalendar={showCalendar}
        onHideCalendar={() => setShowCalendar(false)}
        initialValues={{
          pickupDate:
            calendarType === 'pickup'
              ? formData.fechaRecogida
              : formData.fechaRecogida,
          dropoffDate:
            calendarType === 'dropoff'
              ? formData.fechaDevolucion
              : formData.fechaDevolucion,
          pickupTime: format(formData.fechaRecogida, 'HH:mm'),
          dropoffTime: format(formData.fechaDevolucion, 'HH:mm'),
        }}
        availableTimes={availableTimes}
        onSave={(values) => {
          if (calendarType === 'pickup') {
            setFormData((prev) => ({
              ...prev,
              fechaRecogida: values.pickupDate,
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              fechaDevolucion: values.dropoffDate,
            }));
          }
          // Reset price estimate when date changes
          setPriceEstimate(null);
          setShowCalendar(false);
        }}
        isMobile={false}
      />
    </>
  );
};

// Funciones de debug locales (simples implementaciones)
// Funciones utilitarias locales específicas para el modal
const debugExtrasPrice = (extras, priceCalculation) => {
  if (DEBUG_MODE) {
    logger.debug('Extras price calculation:', { extras, priceCalculation });
  }
};

const debugDuplicateKeys = (data, context) => {
  if (DEBUG_MODE && Array.isArray(data)) {
    const ids = data.map((item) => item.id || item.ID);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      logger.warn(`Duplicate keys found in ${context}:`, duplicates);
    }
  }
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

// Funciones utilitarias locales
const debugReservationData = {
  debugReservationData: (data, context) => {
    if (DEBUG_MODE) {
      logger.debug(`Reservation data (${context}):`, data);
    }
    return { isValid: true, errors: [], warnings: [] };
  },
};

const debugEditFormData = (formData, reservationData) => {
  if (DEBUG_MODE) {
    logger.debug('Edit form data:', { formData, reservationData });
  }
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
