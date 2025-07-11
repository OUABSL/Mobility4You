/**
 * 🚀 CONFIGURACIÓN DE LAZY LOADING
 *
 * Configuración para carga diferida de componentes grandes
 * con optimización de rendimiento para producción.
 *
 * @author OUAEL BOUSSIALI
 * @version 1.0.0
 * @created 2025-07-01
 */

import { lazy, Suspense } from 'react';
import { Spinner } from 'react-bootstrap';

// ========================================
// COMPONENTES CON LAZY LOADING
// ========================================

// Componentes principales (carga diferida para optimizar)
export const LazyHome = lazy(() => import('../components/Home'));
export const LazyListadoCoches = lazy(() =>
  import('../components/ListadoCoches'),
);
export const LazyFichaCoche = lazy(() => import('../components/FichaCoche'));
export const LazyReservaCliente = lazy(() =>
  import('../components/ReservaCliente'),
);
export const LazyConsultarReservaCliente = lazy(() =>
  import('../components/ConsultarReservaCliente'),
);
export const LazyDetallesReserva = lazy(() =>
  import('../components/DetallesReserva'),
);
export const LazyContactUs = lazy(() => import('../components/ContactUs'));

// Componentes de reserva (paso a paso)
export const LazyReservaClienteExtras = lazy(() =>
  import('../components/ReservaPasos/ReservaClienteExtras'),
);
export const LazyReservaClienteConfirmar = lazy(() =>
  import('../components/ReservaPasos/ReservaClienteConfirmar'),
);
export const LazyReservaClientePago = lazy(() =>
  import('../components/ReservaPasos/ReservaClientePago'),
);
export const LazyReservaClienteExito = lazy(() =>
  import('../components/ReservaPasos/ReservaClienteExito'),
);
export const LazyReservaClienteError = lazy(() =>
  import('../components/ReservaPasos/ReservaClienteError'),
);
export const LazyPagoDiferenciaReserva = lazy(() =>
  import('../components/ReservaPasos/PagoDiferenciaReserva'),
);

// Modales (carga diferida)
export const LazyEditReservationModal = lazy(() =>
  import('../components/Modals/EditReservationModal'),
);
export const LazyDeleteReservationModal = lazy(() =>
  import('../components/Modals/DeleteReservationModal'),
);

// Componentes de Stripe (carga diferida)
export const LazyStripePaymentForm = lazy(() =>
  import('../components/StripePayment/StripePaymentForm'),
);

// ========================================
// COMPONENTES DE FALLBACK
// ========================================

/**
 * Spinner de carga por defecto
 */
const DefaultLoadingSpinner = () => (
  <div
    className="d-flex justify-content-center align-items-center"
    style={{ minHeight: '200px' }}
  >
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Cargando...</span>
    </Spinner>
  </div>
);

/**
 * Spinner de carga para páginas completas
 */
const PageLoadingSpinner = () => (
  <div
    className="d-flex justify-content-center align-items-center"
    style={{ minHeight: '60vh' }}
  >
    <div className="text-center">
      <Spinner animation="border" role="status" size="lg">
        <span className="visually-hidden">Cargando página...</span>
      </Spinner>
      <div className="mt-3">
        <p className="text-muted">Cargando contenido...</p>
      </div>
    </div>
  </div>
);

/**
 * Spinner de carga para modales
 */
const ModalLoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center p-4">
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Cargando modal...</span>
    </Spinner>
  </div>
);

/**
 * Spinner de carga para componentes pequeños
 */
const CompactLoadingSpinner = () => (
  <div className="d-flex justify-content-center p-2">
    <Spinner animation="border" role="status" size="sm">
      <span className="visually-hidden">Cargando...</span>
    </Spinner>
  </div>
);

// ========================================
// WRAPPERS CON SUSPENSE
// ========================================

/**
 * Wrapper genérico con Suspense
 */
export const withSuspense = (
  Component,
  fallback = <DefaultLoadingSpinner />,
) => {
  return (props) => (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Wrapper para páginas con Suspense
 */
export const withPageSuspense = (Component) => {
  return withSuspense(Component, <PageLoadingSpinner />);
};

/**
 * Wrapper para modales con Suspense
 */
export const withModalSuspense = (Component) => {
  return withSuspense(Component, <ModalLoadingSpinner />);
};

/**
 * Wrapper para componentes compactos con Suspense
 */
export const withCompactSuspense = (Component) => {
  return withSuspense(Component, <CompactLoadingSpinner />);
};

// ========================================
// COMPONENTES PREPARADOS PARA USO
// ========================================

// Componentes principales con Suspense
export const SuspendedHome = withPageSuspense(LazyHome);
export const SuspendedListadoCoches = withPageSuspense(LazyListadoCoches);
export const SuspendedFichaCoche = withPageSuspense(LazyFichaCoche);
export const SuspendedReservaCliente = withPageSuspense(LazyReservaCliente);
export const SuspendedConsultarReservaCliente = withPageSuspense(
  LazyConsultarReservaCliente,
);
export const SuspendedDetallesReserva = withPageSuspense(LazyDetallesReserva);
export const SuspendedContactUs = withPageSuspense(LazyContactUs);

// Componentes de reserva con Suspense
export const SuspendedReservaClienteExtras = withSuspense(
  LazyReservaClienteExtras,
);
export const SuspendedReservaClienteConfirmar = withSuspense(
  LazyReservaClienteConfirmar,
);
export const SuspendedReservaClientePago = withSuspense(LazyReservaClientePago);
export const SuspendedReservaClienteExito = withSuspense(
  LazyReservaClienteExito,
);
export const SuspendedReservaClienteError = withSuspense(
  LazyReservaClienteError,
);
export const SuspendedPagoDiferenciaReserva = withSuspense(
  LazyPagoDiferenciaReserva,
);

// Modales con Suspense
export const SuspendedEditReservationModal = withModalSuspense(
  LazyEditReservationModal,
);
export const SuspendedDeleteReservationModal = withModalSuspense(
  LazyDeleteReservationModal,
);

// Componentes de Stripe con Suspense
export const SuspendedStripePaymentForm = withCompactSuspense(
  LazyStripePaymentForm,
);

// ========================================
// EXPORTACIONES
// ========================================

export const LoadingSpinners = {
  Default: DefaultLoadingSpinner,
  Page: PageLoadingSpinner,
  Modal: ModalLoadingSpinner,
  Compact: CompactLoadingSpinner,
};

export default {
  // Componentes lazy
  LazyHome,
  LazyListadoCoches,
  LazyFichaCoche,
  LazyReservaCliente,
  LazyConsultarReservaCliente,
  LazyDetallesReserva,
  LazyContactUs,

  // Componentes con Suspense listos para usar
  SuspendedHome,
  SuspendedListadoCoches,
  SuspendedFichaCoche,
  SuspendedReservaCliente,
  SuspendedConsultarReservaCliente,
  SuspendedDetallesReserva,
  SuspendedContactUs,

  // Wrappers de Suspense
  withSuspense,
  withPageSuspense,
  withModalSuspense,
  withCompactSuspense,

  // Spinners
  LoadingSpinners,
};
