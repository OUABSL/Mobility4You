// src/services/reservationServices.js - Agregar validaciones previas

/**
 * Valida los datos de reserva antes de enviarlos al backend
 * @param {Object} data - Datos de la reserva a validar
 * @returns {Object} - {isValid, errors}
 */
export const validateReservationData = (data) => {
  const errors = {};
  
  // Validar vehículo
  if (!data.car || !data.car.id) {
    errors.vehiculo = 'Se requiere seleccionar un vehículo';
  }
  
  // Validar fechas
  if (!data.fechas || !data.fechas.pickupDate || !data.fechas.dropoffDate) {
    errors.fechas = 'Se requieren fechas de recogida y devolución';
  } else {
    const now = new Date();
    const pickupDate = new Date(data.fechas.pickupDate);
    const dropoffDate = new Date(data.fechas.dropoffDate);
    
    // Validar que las fechas sean válidas
    if (isNaN(pickupDate.getTime())) {
      errors.fecha_recogida = 'Fecha de recogida inválida';
    } else if (pickupDate < now) {
      errors.fecha_recogida = 'La fecha de recogida debe ser futura';
    }
    
    if (isNaN(dropoffDate.getTime())) {
      errors.fecha_devolucion = 'Fecha de devolución inválida';
    } else if (dropoffDate <= pickupDate) {
      errors.fecha_devolucion = 'La fecha de devolución debe ser posterior a la de recogida';
    }
  }
    // Validar ubicaciones - asegurarse de que existan los IDs
  if (!data.fechas?.pickupLocation?.id && 
      !data.lugarRecogida?.id && 
      !data.lugar_recogida_id) {
    errors.lugar_recogida = 'Se requiere seleccionar un lugar de recogida válido';
  }
  
  if (!data.fechas?.dropoffLocation?.id && 
      !data.lugarDevolucion?.id && 
      !data.lugar_devolucion_id) {
    errors.lugar_devolucion = 'Se requiere seleccionar un lugar de devolución válido';
  }
  
  // Validar política de pago - asegurarse de que exista un ID o una opción válida
  if (!data.paymentOption && 
      !data.politicaPago?.id && 
      !data.politica_pago_id && 
      !data.politica_pago) {
    errors.politica_pago = 'Se requiere seleccionar una política de pago válida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

