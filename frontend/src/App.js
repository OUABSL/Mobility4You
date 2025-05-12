// Todas las importaciones al inicio
import React from 'react';
import { useState, useEffect } from 'react';
// Removed unused API_URL import
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/style.css';


import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';


import MyNavbar from './components/MyNavbar';
import Home from './components/Home';
import ContactUs from './components/ContactUs';
import ListadoCoches from './components/ListadoCoches';
import ReservaCliente from './components/ReservaCliente';
import DetallesReserva from './components/DetallesReserva';
import AppFooter from './components/Footer';
// import CarDetail from './components/CarDetail';
// import UserProfile from './components/UserProfile';
// import AdminPanel from './components/AdminPanel';
// import AppProvider from './context/AppProvider';
// import { AlertProvider, AlertContext } from './context/AlertProvider';


// Luego, después de todas las importaciones, se ejecuta la configuración
library.add(fas, far, fab);


function App() {

  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil, para ajustar el diseño
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    }, []);

  return (
  <BrowserRouter>
    {/* Ensure all components using useNavigate are within this Router */}
    {/* <AppProvider>
    <AlertProvider> */}
      <div className='d-flex flex-column min-vh-100 justify-content-start'>
      <MyNavbar />
        <div className="w-100">
          {/* <AlertContext.Consumer>
          {context => {
            const { alert, setAlert } = context;
            return alert.show && 
            <Alert
              className="d-flex justify-content-center mb-2 mx-auto"
              variant={alert.variant}
              onClose={() => setAlert({ ...alert, show: false })}
              dismissible
            >
              {alert.message}
            </Alert>
          }}
          </AlertContext.Consumer> */}
          <Routes>
          {/* Vistas comúnes */}
          <Route path="/" element={<Home isMobile={isMobile} />} />
          <Route path="/contactus" element={<ContactUs />} />
          <Route path="/coches" element={<ListadoCoches isMobile={isMobile} />} />
          <Route path="/reservations" element={<ReservaCliente isMobile={isMobile} />} />
          <Route path="/reservations/:reservaId" element={<DetallesReserva isMobile={isMobile}/>}
/>

                {/*  <Route path="/cars/:id" element={<CarDetail />} />
                {/* Portal de Usuario */}
                {/* <Route path="/user/profile" element={<UserProfile />} /> */}
                {/* Panel de Administración */}
                {/* <Route path="/admin" element={<AdminPanel />} /> */}
          </Routes>
          </div>
            {/* Pie de página */}
            <AppFooter />
          </div>
        {/* </AlertProvider>
      </AppProvider> */}
    </BrowserRouter>
  );
}

export default App;
