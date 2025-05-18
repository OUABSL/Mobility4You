// src/components/ReservaPasos/ReservaCliente.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ReservaClienteExtras from './ReservaPasos/ReservaClienteExtras';
import ReservaClienteConfirmar from './ReservaPasos/ReservaClienteConfirmar';
import ReservaClientePago from './ReservaPasos/ReservaClientePago';
import ReservaClienteExito from './ReservaPasos/ReservaClienteExito';
import ReservaClienteError from './ReservaPasos/ReservaClienteError';

/**
 * Componente contenedor para gestionar el flujo de reserva
 * 
 * Este componente orquesta las rutas anidadas para cada paso del proceso de reserva:
 * 1. /reservation-confirmation (ReservaClienteExtras) - Selección de extras
 * 2. /reservation-confirmation/datos (ReservaClienteConfirmar) - Datos del conductor
 * 3. /reservation-confirmation/pago (ReservaClientePago) - Procesamiento del pago
 * 4. /reservation-confirmation/exito (ReservaClienteExito) - Confirmación final
 * 5. /reservation-confirmation/error (ReservaClienteError) - Manejo de errores
 */
const ReservaCliente = () => {
  return (
    <Routes>
      {/* Ruta principal redirige a Extras */}
      <Route index element={<ReservaClienteExtras />} />
      
      {/* Rutas para cada paso */}
      <Route path="datos" element={<ReservaClienteConfirmar />} />
      <Route path="pago" element={<ReservaClientePago />} />
      <Route path="exito" element={<ReservaClienteExito />} />
      <Route path="error" element={<ReservaClienteError />} />
      
      {/* Ruta fallback por si se accede a una URL no existente */}
      <Route path="*" element={<Navigate to="/reservation-confirmation" replace />} />
    </Routes>
  );
};

export default ReservaCliente;