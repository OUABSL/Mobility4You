// Crear archivo src/services/reservationServices.js
import axios from 'axios';

// URL base de la API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Función para editar una reserva
export const editReservation = async (reservationId, updateData, token) => {
  try {
    // Versión de prueba, simula la llamada a la API
    console.log('Llamando a editar reserva:', reservationId, updateData);
    // Simulamos una demora de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular una respuesta exitosa
    return {
      ...updateData,
      id: reservationId,
      estado: 'confirmada',
      // Otros campos que podrían actualizarse en el backend
    };
    
    // Versión real para producción
    /*
    const response = await axios.put(
      `${API_URL}/reservations/${reservationId}/`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
    */
  } catch (error) {
    throw error.response?.data || { message: 'Error al actualizar la reserva' };
  }
};

// Función para cancelar una reserva
export const deleteReservation = async (reservationId, token) => {
  try {
    // Versión de prueba, simula la llamada a la API
    console.log('Llamando a cancelar reserva:', reservationId);
    // Simulamos una demora de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simular una respuesta exitosa
    return { success: true, message: 'Reserva cancelada correctamente' };
    
    // Versión real para producción
    /*
    const response = await axios.patch(
      `${API_URL}/reservations/${reservationId}/cancel/`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
    */
  } catch (error) {
    throw error.response?.data || { message: 'Error al cancelar la reserva' };
  }
};

// Función para calcular el precio de una reserva modificada
export const calculateReservationPrice = async (reservationData, token) => {
  try {
    // Versión de prueba, simula la llamada a la API
    console.log('Calculando precio:', reservationData);
    // Simulamos una demora de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulamos cálculos
    const diasOriginales = 4; // De los datos de prueba
    const fechaRecogida = new Date(reservationData.fechaRecogida);
    const fechaDevolucion = new Date(reservationData.fechaDevolucion);
    const diasNuevos = Math.ceil((fechaDevolucion - fechaRecogida) / (1000 * 60 * 60 * 24));
    
    // Precio base por día
    const precioDia = 79;
    
    // Cálculos
    const precioOriginal = 395.16; // Del ejemplo
    const precioNuevoBase = precioDia * diasNuevos;
    const precioExtras = 40; // Simulado
    const precioImpuestos = precioNuevoBase * 0.21 + precioExtras * 0.21;
    const descuentoPromocion = (precioNuevoBase + precioExtras + precioImpuestos) * 0.1;
    const precioNuevoTotal = precioNuevoBase + precioExtras + precioImpuestos - descuentoPromocion;
    
    // Simular una respuesta
    return {
      originalPrice: precioOriginal,
      newPrice: precioNuevoTotal,
      difference: precioNuevoTotal - precioOriginal,
      details: {
        diasOriginales,
        diasNuevos,
        precioDia,
        precioNuevoBase,
        precioExtras,
        precioImpuestos,
        descuentoPromocion
      }
    };
    
    // Versión real para producción
    /*
    const response = await axios.post(
      `${API_URL}/reservations/calculate-price/`,
      reservationData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
    */
  } catch (error) {
    throw error.response?.data || { message: 'Error al calcular el precio' };
  }
};