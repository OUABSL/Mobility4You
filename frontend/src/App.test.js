import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AlertProvider from './context/AlertContext';
import AppProvider from './context/AppContext';

// Mock de componentes que pueden causar problemas en testing
jest.mock('./config/axiosConfig', () => ({
  defaults: {},
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}));

// Wrapper para proveedores de contexto
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AppProvider>
      <AlertProvider>{children}</AlertProvider>
    </AppProvider>
  </BrowserRouter>
);

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>,
    );

    // Verificar que la aplicación se renderiza
    expect(document.body).toBeInTheDocument();
  });

  test('has proper meta tags', () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>,
    );

    // Verificar viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    expect(viewportMeta).toBeTruthy();
  });
});
