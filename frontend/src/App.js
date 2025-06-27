// Actualización para App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/style.css';

// Importar configuración de axios para CSRF
import './config/axiosConfig';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';

import AlertComponent, { alertStyles } from './context/AlertComponent';
import AppProvider from './context/AppContext';
import { AlertProvider } from './context/AlertContext';

import MyNavbar from './components/MyNavbar';
import Home from './components/Home';
import ContactUs from './components/ContactUs';
import AppFooter from './components/Footer';

import ListadoCoches from './components/ListadoCoches';
import ReservaCliente from './components/ReservaCliente';
import ConsultarReservaCliente from './components/ConsultarReservaCliente';
import DetallesReserva from './components/DetallesReserva';
import PagoDiferenciaReserva from './components/ReservaPasos/PagoDiferenciaReserva';

// Luego, después de todas las importaciones, se ejecuta la configuración
library.add(fas, far, fab);

// Agregar estilos de alertas al documento
const AppStyles = () => {
  useEffect(() => {
    // Crear elemento style para los estilos de alertas
    const styleElement = document.createElement('style');
    styleElement.textContent = alertStyles;
    document.head.appendChild(styleElement);
    
    // Limpieza al desmontar
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  return null;
};

function App() {
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil, para ajustar el diseño
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    // Llamar una vez al inicio para establecer el valor inicial
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <BrowserRouter>
      <AppProvider>
        <AlertProvider>
          <AppStyles />
          <div className='d-flex flex-column min-vh-100 justify-content-start'>
            <MyNavbar isMobile={isMobile} />
            <div className="w-100">
              <AlertComponent />
              <Routes>
                {/* Vistas comúnes */}
                <Route path="/" element={<Home isMobile={isMobile} />} />
                <Route path="/contactus" element={<ContactUs />} />
                <Route path="/coches" element={<ListadoCoches isMobile={isMobile} />} />
                <Route path="/reservation-confirmation/*" element={<ReservaCliente isMobile={isMobile} />} />
                <Route path="/reservations" element={<ConsultarReservaCliente isMobile={isMobile} />} />
                <Route path="/reservations/:reservaId" element={<DetallesReserva isMobile={isMobile}/>} />
                <Route path="/pago-diferencia/:id" element={<PagoDiferenciaReserva />} />
              </Routes>
            </div>
            {/* Pie de página */}
            <AppFooter />
          </div>
        </AlertProvider>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;