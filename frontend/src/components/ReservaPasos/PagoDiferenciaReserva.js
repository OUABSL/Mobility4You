// src/components/ReservaPasos/PagoDiferenciaReserva.js
import {
  faCalculator,
  faCalendarAlt,
  faCarSide,
  faCheckCircle,
  faChevronLeft,
  faCircleNotch,
  faCreditCard,
  faExclamationTriangle,
  faHome,
  faLock,
  faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createServiceLogger, DEBUG_MODE } from '../../config/appConfig';
import '../../css/PagoDiferenciaReserva.css';
import {
  debugBackendData,
  debugSessionStorage,
  formatTaxRate,
} from '../../services/func';
import {
  editReservation,
  findReservation,
  processPayment,
} from '../../services/reservationServices';
import ReservaClientePago from './ReservaClientePago';

// Crear logger para el componente
const logger = createServiceLogger('PAGO_DIFERENCIA_RESERVA');

// Función auxiliar para obtener información del vehículo
const getVehiculoInfo = (reservaData) => {
  if (!reservaData) return null;

  // Priorizar vehiculo_detail si existe (nueva estructura del backend)
  if (reservaData.vehiculo_detail) {
    return {
      id: reservaData.vehiculo_detail.id,
      marca: reservaData.vehiculo_detail.marca,
      modelo: reservaData.vehiculo_detail.modelo,
      matricula: reservaData.vehiculo_detail.matricula,
      imagen_principal: reservaData.vehiculo_detail.imagen_principal,
      ...reservaData.vehiculo_detail,
    };
  }

  // Fallback a estructura anterior
  return (
    reservaData.vehiculo || {
      id: reservaData.vehiculo_id,
      marca: reservaData.vehiculo_marca,
      modelo: reservaData.vehiculo_modelo,
      matricula: reservaData.vehiculo_matricula,
      imagen_principal: reservaData.vehiculo_imagen_principal,
    }
  );
};

// Función auxiliar para obtener ID del vehículo
const getVehiculoId = (reservaData) => {
  if (!reservaData) return null;

  return (
    reservaData.vehiculo_id ||
    reservaData.vehiculo?.id ||
    reservaData.vehiculo_detail?.id ||
    reservaData.vehiculo
  );
};

// Función auxiliar para obtener conductor principal
const getConductorPrincipal = (reservaData) => {
  if (!reservaData) return null;

  // Nuevo formato con array de conductores
  if (reservaData.conductores && Array.isArray(reservaData.conductores)) {
    const principal = reservaData.conductores.find(
      (c) => c.rol === 'principal',
    );
    return principal?.conductor || null;
  }

  // Formato anterior
  return reservaData.conductor || null;
};

const PagoDiferenciaReserva = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reservaData, setReservaData] = useState(null);
  const [success, setSuccess] = useState(false);
  const [diferencia, setDiferencia] = useState(location.state?.difference || 0);
  const [paymentMethod, setPaymentMethod] = useState('tarjeta'); // 'tarjeta' o 'efectivo'
  const [showCardPayment, setShowCardPayment] = useState(false);

  // Debug inicial
  logger.info('PagoDiferenciaReserva iniciado:', {
    id,
    'location.state': location.state,
    'diferencia inicial': diferencia,
    'location.state.difference': location.state?.difference,
  });

  // Cargar datos de reserva
  useEffect(() => {
    const fetchReserva = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;

        // Debug: estado inicial del sessionStorage
        debugSessionStorage();

        if (DEBUG_MODE) {
          // Si venimos de edición, usar los datos temporales
          const editData = sessionStorage.getItem('editReservaData');
          if (editData) {
            const parsed = JSON.parse(editData);
            logger.info('🔍 Datos de edición encontrados:', parsed);

            // Validar que tenemos un precio de diferencia válido
            if (
              parsed.priceEstimate &&
              parsed.priceEstimate.difference !== undefined
            ) {
              const newDifference = Number(parsed.priceEstimate.difference);
              logger.info(
                `💰 Diferencia encontrada en priceEstimate: €${newDifference}`,
              );
              setDiferencia(newDifference);
            } else {
              logger.warn(
                '⚠️ No se encontró diferencia de precio válida en priceEstimate',
              );
              const fallbackDifference =
                Number(location.state?.difference) || 0;
              logger.info(
                `💰 Usando diferencia del location.state: €${fallbackDifference}`,
              );
              setDiferencia(fallbackDifference);
            }

            // Asegurar que tenemos el ID del vehículo
            const vehiculoId =
              parsed.formData?.vehiculo_id ||
              parsed.vehiculo?.id ||
              parsed.originalReservation?.vehiculo?.id ||
              parsed.originalReservation?.vehiculo_id;

            logger.info('🚗 Validando ID de vehículo:', {
              'parsed.formData?.vehiculo_id': parsed.formData?.vehiculo_id,
              'parsed.vehiculo?.id': parsed.vehiculo?.id,
              'parsed.originalReservation?.vehiculo?.id':
                parsed.originalReservation?.vehiculo?.id,
              'vehiculoId final': vehiculoId,
            });

            // Combinar datos originales con formData editado
            data = {
              ...parsed.formData,
              id: parsed.id,
              vehiculo: parsed.vehiculo ||
                parsed.originalReservation?.vehiculo || { id: vehiculoId },
              vehiculo_id: vehiculoId, // Usar el vehiculoId extraído y validado
              conductor: parsed.originalReservation?.conductor,
              conductores: parsed.originalReservation?.conductores, // Agregar soporte para array de conductores
              // Mantener información original importante
              ...parsed.originalReservation,
              // Sobrescribir con datos editados (excepto vehiculo_id que ya está asignado arriba)
              ...(({ vehiculo_id, ...rest }) => rest)(parsed.formData),
            };

            logger.info('🎯 Datos de reserva construidos:', data);
          } else {
            logger.info('📦 Usando datos de sessionStorage estándar');
            data = JSON.parse(sessionStorage.getItem('reservaData'));
          }
        } else {
          // Obtener email del sessionStorage de la reserva original o de location.state
          const originalEmail =
            location.state?.email ||
            sessionStorage.getItem('reservaEmail') ||
            '';
          if (!originalEmail) {
            throw new Error('Email requerido para consultar la reserva');
          }
          data = await findReservation(id, originalEmail);
        }

        // Extraer datos de reserva si vienen en formato del backend
        if (data && data.reserva) {
          logger.info(
            '🔄 Datos recibidos del backend, extrayendo reserva:',
            data,
          );
          data = data.reserva;
        }

        // Validar datos antes de continuar
        if (data) {
          const vehiculoId = getVehiculoId(data);
          if (!vehiculoId) {
            logger.error('❌ ID de vehículo faltante en datos de reserva');
            logger.error('📋 Datos completos de reserva:', data);
            throw new Error('ID de vehículo inválido o no seleccionado');
          }
          logger.info('✅ ID de vehículo validado:', vehiculoId);
        }

        setReservaData(data);
      } catch (err) {
        logger.error('❌ Error cargando reserva:', err);
        setError(err.message || 'No se pudo cargar la reserva.');
      } finally {
        setLoading(false);
      }
    };
    fetchReserva();
  }, [id, location.state?.email, location.state?.difference]);

  // Manejar selección de método de pago
  const handleSelectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setShowCardPayment(false);
  };
  // Procesa el pago de la diferencia
  const handlePagar = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!reservaData) throw new Error('No hay datos de reserva.');

      logger.info('💳 Iniciando proceso de pago de diferencia');
      logger.info('📊 Datos de reserva:', reservaData);
      logger.info('💰 Diferencia a pagar:', diferencia);
      logger.info('🎯 Método de pago:', paymentMethod);

      // Validar que tenemos el ID del vehículo
      const vehiculoId = getVehiculoId(reservaData);
      if (!vehiculoId) {
        throw new Error('ID de vehículo inválido o no seleccionado');
      }

      logger.info('✅ ID de vehículo validado:', vehiculoId);

      // Obtener datos del conductor principal
      const conductorPrincipal = getConductorPrincipal(reservaData);

      if (!conductorPrincipal) {
        logger.warn('⚠️ No se encontró conductor principal en los datos');
      }

      // Si es pago con tarjeta, usar el procesamiento de pago
      if (paymentMethod === 'tarjeta') {
        // Preparar datos para el pago
        const paymentData = {
          metodo_pago: 'tarjeta',
          importe: diferencia,
          vehiculo_id: vehiculoId, // Incluir ID del vehículo
          datos_pago: {
            titular:
              conductorPrincipal?.nombre && conductorPrincipal?.apellidos
                ? `${conductorPrincipal.nombre} ${conductorPrincipal.apellidos}`
                : conductorPrincipal?.nombre && conductorPrincipal?.apellido
                ? `${conductorPrincipal.nombre} ${conductorPrincipal.apellido}`
                : '',
            email: conductorPrincipal?.email || reservaData.usuario_email || '',
            modoDiferencia: true,
          },
        };

        debugBackendData(paymentData, 'proceso de pago con tarjeta');

        // Procesar pago usando el nuevo servicio
        const paymentResult = await processPayment(reservaData.id, paymentData);

        // Si el pago no es exitoso, lanzar error
        if (!paymentResult || !paymentResult.success) {
          throw new Error(
            paymentResult?.error || 'Error al procesar el pago con tarjeta',
          );
        }

        logger.info('✅ Pago con tarjeta procesado exitosamente');
      } else {
        logger.info('💵 Confirmando pago en efectivo');
      }

      // Actualizar campos de pago extra con cálculos seguros
      const currentImportePagadoExtra =
        parseFloat(reservaData.importe_pagado_extra) || 0;
      const diferenciaNumerica = parseFloat(diferencia) || 0;
      const nuevoImportePagadoExtra = Number(
        (currentImportePagadoExtra + diferenciaNumerica).toFixed(2),
      );

      logger.info('🧮 Cálculo de importes:', {
        currentImportePagadoExtra,
        diferenciaNumerica,
        nuevoImportePagadoExtra,
      });

      const updatedReserva = {
        ...reservaData,
        vehiculo_id: vehiculoId, // Asegurar que se mantenga el ID del vehículo
        importe_pagado_extra: nuevoImportePagadoExtra,
        importe_pendiente_extra: 0,
        metodo_pago_extra: paymentMethod,
        diferenciaPagada: true,
        metodoPagoDiferencia: paymentMethod,
      };

      debugBackendData(
        updatedReserva,
        'actualización de reserva con pago diferencia',
      );

      await editReservation(reservaData.id, updatedReserva);

      logger.info('✅ Reserva actualizada exitosamente');

      // Limpiar datos temporales
      sessionStorage.removeItem('editReservaData');

      setSuccess(true);
    } catch (err) {
      logger.error('❌ Error en proceso de pago:', err);
      setError(err.message || 'Error al procesar el pago de la diferencia.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !reservaData) {
    return (
      <Container className="pago-diferencia-container my-5">
        <div className="loader-container">
          <Spinner animation="border" className="loader-spinner" />
          <p className="mt-3">Cargando datos de la reserva...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="pago-diferencia-container my-5">
        <div className="error-container">
          <Alert variant="danger" className="error-alert">
            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
            {error}
          </Alert>
          <Button
            variant="primary"
            className="btn-details"
            onClick={() => navigate('/')}
          >
            <FontAwesomeIcon icon={faHome} className="me-2" />
            Volver al inicio
          </Button>
        </div>
      </Container>
    );
  }

  if (success) {
    return (
      <Container className="pago-diferencia-container my-5">
        <Card className="pago-diferencia-card">
          <Card.Body>
            <div className="success-container">
              <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
              <h3 className="success-title">¡Pago realizado con éxito!</h3>{' '}
              <p className="success-message">
                La diferencia de {(Number(diferencia) || 0).toFixed(2)}€ ha sido
                abonada correctamente.
                {paymentMethod === 'efectivo' &&
                  ' Recuerda realizar el pago en efectivo cuando llegues a nuestras oficinas.'}
              </p>
              <Button
                variant="primary"
                className="btn-details"
                onClick={() => navigate(`/reservations/${id}`)}
              >
                Ver Detalles de la Reserva
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  if (showCardPayment) {
    // Redirigir a componente de pago con tarjeta (Redsys)
    return (
      <ReservaClientePago
        diferencia={diferencia}
        reservaId={id}
        modoDiferencia
      />
    );
  }

  return (
    <Container className="pago-diferencia-container my-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="pago-diferencia-card">
            <Card.Header>
              <FontAwesomeIcon icon={faCarSide} />
              <span className="ms-2">Pago de Diferencia de Reserva</span>
              {reservaData &&
                (() => {
                  const vehiculo = getVehiculoInfo(reservaData);
                  return vehiculo ? (
                    <div className="text-muted small mt-1">
                      {vehiculo.marca} {vehiculo.modelo} - {vehiculo.matricula}
                    </div>
                  ) : null;
                })()}
            </Card.Header>
            <Card.Body>
              <h5 className="mb-4">
                {diferencia === 0
                  ? 'Tu modificación no requiere pago adicional'
                  : diferencia < 0
                  ? 'Tu modificación resulta en un descuento'
                  : 'Debes abonar la diferencia para completar la modificación de tu reserva'}
              </h5>

              {/* Información de la reserva */}
              {reservaData && (
                <div className="reservation-info mb-4 p-3 border rounded bg-light">
                  <h6 className="mb-3">
                    <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                    Información de la Reserva
                  </h6>

                  <div className="row small">
                    {reservaData.fecha_recogida &&
                      reservaData.fecha_devolucion && (
                        <>
                          <div className="col-md-6 mb-2">
                            <strong>Período:</strong>{' '}
                            {new Date(
                              reservaData.fecha_recogida,
                            ).toLocaleDateString('es-ES')}{' '}
                            -{' '}
                            {new Date(
                              reservaData.fecha_devolucion,
                            ).toLocaleDateString('es-ES')}
                          </div>
                          <div className="col-md-6 mb-2">
                            <strong>Duración:</strong>{' '}
                            {Math.ceil(
                              (new Date(reservaData.fecha_devolucion) -
                                new Date(reservaData.fecha_recogida)) /
                                (1000 * 60 * 60 * 24),
                            )}{' '}
                            días
                          </div>
                        </>
                      )}

                    {(reservaData.lugar_recogida_nombre ||
                      reservaData.lugar_recogida_detail?.nombre) && (
                      <div className="col-md-6 mb-2">
                        <strong>Recogida:</strong>{' '}
                        {reservaData.lugar_recogida_nombre ||
                          reservaData.lugar_recogida_detail?.nombre}
                      </div>
                    )}

                    {(reservaData.lugar_devolucion_nombre ||
                      reservaData.lugar_devolucion_detail?.nombre) && (
                      <div className="col-md-6 mb-2">
                        <strong>Devolución:</strong>{' '}
                        {reservaData.lugar_devolucion_nombre ||
                          reservaData.lugar_devolucion_detail?.nombre}
                      </div>
                    )}

                    {reservaData.estado && (
                      <div className="col-md-6 mb-2">
                        <strong>Estado:</strong>{' '}
                        <span
                          className={`badge ${
                            reservaData.estado === 'confirmada'
                              ? 'bg-success'
                              : reservaData.estado === 'pendiente'
                              ? 'bg-warning'
                              : 'bg-secondary'
                          }`}
                        >
                          {reservaData.estado.charAt(0).toUpperCase() +
                            reservaData.estado.slice(1)}
                        </span>
                      </div>
                    )}

                    {(reservaData.politica_pago_titulo ||
                      reservaData.politica_pago_detail?.titulo) && (
                      <div className="col-md-6 mb-2">
                        <strong>Política:</strong>{' '}
                        {reservaData.politica_pago_titulo ||
                          reservaData.politica_pago_detail?.titulo}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mostrar detalles del precio si están disponibles */}
              {reservaData && (
                <div className="price-breakdown mb-4 p-3 border rounded bg-light">
                  <h6 className="mb-3">
                    <FontAwesomeIcon icon={faCalculator} className="me-2" />
                    Estimación de Precio
                  </h6>

                  {/* Obtener datos de sessionStorage para mostrar desglose */}
                  {(() => {
                    try {
                      const editData = JSON.parse(
                        sessionStorage.getItem('editReservaData') || '{}',
                      );
                      const priceEstimate = editData.priceEstimate;

                      if (priceEstimate && priceEstimate.breakdown) {
                        return (
                          <>
                            <div className="row">
                              <div className="col-6">
                                <strong>Precio original:</strong>
                              </div>
                              <div className="col-6 text-end">
                                €{(priceEstimate.originalPrice || 0).toFixed(2)}
                              </div>
                            </div>

                            {priceEstimate.breakdown.precio_base && (
                              <div className="row text-muted small">
                                <div className="col-6">• Precio base:</div>
                                <div className="col-6 text-end">
                                  €
                                  {priceEstimate.breakdown.precio_base.toFixed(
                                    2,
                                  )}
                                </div>
                              </div>
                            )}

                            {priceEstimate.breakdown.precio_extras &&
                              priceEstimate.breakdown.precio_extras > 0 && (
                                <div className="row text-muted small">
                                  <div className="col-6">
                                    • Extras originales:
                                  </div>
                                  <div className="col-6 text-end">
                                    €
                                    {priceEstimate.breakdown.precio_extras.toFixed(
                                      2,
                                    )}
                                  </div>
                                </div>
                              )}

                            <hr className="my-2" />

                            <div className="row">
                              <div className="col-6">
                                <strong>Nuevo precio:</strong>
                              </div>
                              <div className="col-6 text-end">
                                <strong>
                                  €{(priceEstimate.newPrice || 0).toFixed(2)}
                                </strong>
                              </div>
                            </div>

                            {priceEstimate.breakdown.subtotal && (
                              <div className="row text-muted small">
                                <div className="col-6">• Subtotal:</div>
                                <div className="col-6 text-end">
                                  €{priceEstimate.breakdown.subtotal.toFixed(2)}
                                </div>
                              </div>
                            )}

                            {priceEstimate.breakdown.impuestos &&
                              priceEstimate.breakdown.impuestos > 0 && (
                                <div className="row text-muted small">
                                  <div className="col-6">
                                    • IVA
                                    {formatTaxRate(
                                      priceEstimate.breakdown.tasa_impuesto,
                                    )}
                                    :
                                  </div>
                                  <div className="col-6 text-end">
                                    €
                                    {priceEstimate.breakdown.impuestos.toFixed(
                                      2,
                                    )}
                                  </div>
                                </div>
                              )}

                            <hr className="my-2" />

                            <div className="row">
                              <div className="col-6">
                                <strong
                                  className={
                                    diferencia >= 0
                                      ? 'text-success'
                                      : 'text-danger'
                                  }
                                >
                                  Diferencia (
                                  {diferencia >= 0 ? 'a pagar' : 'a favor'}):
                                </strong>
                              </div>
                              <div className="col-6 text-end">
                                <strong
                                  className={
                                    diferencia >= 0
                                      ? 'text-success'
                                      : 'text-danger'
                                  }
                                >
                                  {diferencia >= 0 ? '+' : ''}€
                                  {diferencia.toFixed(2)}
                                </strong>
                              </div>
                            </div>

                            {priceEstimate.diasAlquiler && (
                              <div className="row text-muted small mt-2">
                                <div className="col-12">
                                  <small>
                                    <FontAwesomeIcon
                                      icon={faCalendarAlt}
                                      className="me-1"
                                    />
                                    Duración: {priceEstimate.diasAlquiler} día
                                    {priceEstimate.diasAlquiler !== 1
                                      ? 's'
                                      : ''}
                                  </small>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }
                    } catch (e) {
                      logger.warn(
                        'No se pudo obtener desglose de precio del sessionStorage',
                      );
                    }

                    // Fallback si no hay datos de desglose
                    return (
                      <>
                        <div className="row">
                          <div className="col-6">
                            <strong>Precio original:</strong>
                          </div>
                          <div className="col-6 text-end">
                            €
                            {(
                              parseFloat(reservaData.precio_total) || 0
                            ).toFixed(2)}
                          </div>
                        </div>

                        {/* Mostrar extras si están disponibles */}
                        {reservaData.extras &&
                          reservaData.extras.length > 0 && (
                            <>
                              <hr className="my-2" />
                              <div className="text-muted small mb-2">
                                <strong>Extras incluidos:</strong>
                              </div>
                              {reservaData.extras.map((extra, index) => (
                                <div
                                  key={index}
                                  className="row text-muted small"
                                >
                                  <div className="col-8">
                                    • {extra.extra_nombre}{' '}
                                    {extra.cantidad > 1 &&
                                      `(x${extra.cantidad})`}
                                  </div>
                                  <div className="col-4 text-end">
                                    €
                                    {(
                                      parseFloat(extra.extra_precio) *
                                      extra.cantidad
                                    ).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                        <hr className="my-2" />

                        <div className="row">
                          <div className="col-6">
                            <strong
                              className={
                                diferencia >= 0 ? 'text-success' : 'text-danger'
                              }
                            >
                              Diferencia (
                              {diferencia >= 0 ? 'a pagar' : 'a favor'}):
                            </strong>
                          </div>
                          <div className="col-6 text-end">
                            <strong
                              className={
                                diferencia >= 0 ? 'text-success' : 'text-danger'
                              }
                            >
                              {diferencia >= 0 ? '+' : ''}€
                              {diferencia.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        <div className="row text-muted small mt-2">
                          <div className="col-12">
                            <small>
                              <FontAwesomeIcon
                                icon={faExclamationTriangle}
                                className="me-1"
                              />
                              Para ver el desglose detallado, recalcula el
                              precio en la página de edición
                            </small>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div
                className={`importe-container ${
                  diferencia === 0
                    ? 'diferencia-cero'
                    : diferencia < 0
                    ? 'diferencia-negativa'
                    : ''
                }`}
              >
                <span className="importe-label">
                  {diferencia === 0
                    ? 'Sin diferencia de precio'
                    : diferencia < 0
                    ? 'Diferencia a tu favor:'
                    : 'Importe a pagar:'}
                </span>
                <span className="importe-value">
                  {diferencia === 0
                    ? '€0.00'
                    : `${diferencia < 0 ? '' : '+'}€${Math.abs(
                        diferencia,
                      ).toFixed(2)}`}
                </span>
              </div>

              <div className="secure-payment-info">
                <FontAwesomeIcon icon={faLock} />
                <span className="secure-payment-text">
                  {diferencia === 0
                    ? 'No se requiere pago adicional'
                    : diferencia < 0
                    ? 'Se aplicará descuento en tu próximo alquiler'
                    : `Pago seguro y encriptado ${
                        DEBUG_MODE ? '(simulado en modo desarrollo)' : ''
                      }`}
                </span>
              </div>

              {diferencia > 0 && (
                <div className="payment-methods-container">
                  <h6 className="method-title">Selecciona un método de pago</h6>

                  <div
                    className={`payment-method-option ${
                      paymentMethod === 'tarjeta' ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectPaymentMethod('tarjeta')}
                  >
                    <Form.Check
                      type="radio"
                      id="pago-tarjeta"
                      name="metodoPago"
                      checked={paymentMethod === 'tarjeta'}
                      onChange={() => handleSelectPaymentMethod('tarjeta')}
                      className="payment-method-radio"
                    />
                    <div className="payment-method-content">
                      <span className="payment-method-name">
                        <FontAwesomeIcon icon={faCreditCard} className="me-2" />
                        Tarjeta de crédito/débito
                      </span>
                      <span className="payment-method-description">
                        Pago seguro con Redsys. Se aceptan Visa, Mastercard y
                        American Express
                      </span>
                    </div>
                  </div>

                  <div
                    className={`payment-method-option ${
                      paymentMethod === 'efectivo' ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectPaymentMethod('efectivo')}
                  >
                    <Form.Check
                      type="radio"
                      id="pago-efectivo"
                      name="metodoPago"
                      checked={paymentMethod === 'efectivo'}
                      onChange={() => handleSelectPaymentMethod('efectivo')}
                      className="payment-method-radio"
                    />
                    <div className="payment-method-content">
                      <span className="payment-method-name">
                        <FontAwesomeIcon
                          icon={faMoneyBillWave}
                          className="me-2"
                        />
                        Efectivo en oficina
                      </span>
                      <span className="payment-method-description">
                        Reserva ahora y paga la diferencia cuando recojas el
                        vehículo
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {diferencia === 0 && (
                <div className="alert alert-success" role="alert">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  <strong>¡Perfecto!</strong> No hay diferencia de precio en tu
                  modificación. Puedes confirmar los cambios sin pago adicional.
                </div>
              )}

              {diferencia < 0 && (
                <div className="alert alert-info" role="alert">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                  <strong>¡Genial!</strong> Tu modificación resulta en un
                  descuento de €{Math.abs(diferencia).toFixed(2)}. Se aplicará
                  automáticamente.
                </div>
              )}

              <div className="action-buttons d-flex justify-content-between">
                <Button
                  variant={diferencia > 0 ? 'success' : 'primary'}
                  className="btn-pagar"
                  onClick={handlePagar}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon
                        icon={faCircleNotch}
                        spin
                        className="me-2"
                      />
                      Procesando...
                    </>
                  ) : diferencia === 0 ? (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Confirmar cambios
                    </>
                  ) : diferencia < 0 ? (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                      Aplicar descuento
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon
                        className="me-1"
                        icon={
                          paymentMethod === 'tarjeta'
                            ? faCreditCard
                            : faMoneyBillWave
                        }
                      />
                      {paymentMethod === 'tarjeta'
                        ? 'Pagar con tarjeta'
                        : 'Confirmar pago en oficina'}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline-secondary"
                  className="btn-volver"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Volver
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

// Funciones de debug locales (simples implementaciones)
export default PagoDiferenciaReserva;
