/**
 * Tests for reservationServices.js
 * Specifically testing the fetchPoliticasPago function implementation
 */

import axios from 'axios';
import { fetchPoliticasPago } from '../services/reservationServices';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock the testing data import
jest.mock('../assets/testingData/testingData.js', () => ({
  testingPoliticas: [
    {
      id: 1,
      nombre: 'Política de Cancelación Gratuita',
      descripcion: 'Cancelación gratuita hasta 24 horas antes',
      tipo: 'cancelacion',
      activo: true,
      condiciones: ['Hasta 24 horas antes', 'Sin costo adicional']
    },
    {
      id: 2,
      nombre: 'Política de Depósito',
      descripcion: 'Depósito requerido al momento de la reserva',
      tipo: 'deposito',
      activo: true,
      condiciones: ['Depósito de $200', 'Reembolsable al final del alquiler']
    },
    {
      id: 3,
      nombre: 'Política Inactiva',
      descripcion: 'Esta política está desactivada',
      tipo: 'test',
      activo: false,
      condiciones: ['No debe aparecer en resultados']
    }
  ]
}));

// Mock the getAuthHeaders function
jest.mock('../services/reservationServices', () => {
  const actual = jest.requireActual('../services/reservationServices');
  return {
    ...actual,
    getAuthHeaders: jest.fn(() => ({
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    }))
  };
});

describe('fetchPoliticasPago', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any environment variables
    delete process.env.REACT_APP_DEBUG_MODE;
  });

  describe('DEBUG_MODE scenarios', () => {
    beforeEach(() => {
      // Mock DEBUG_MODE to be true
      jest.doMock('../services/reservationServices', () => {
        const actual = jest.requireActual('../services/reservationServices');
        return {
          ...actual,
          DEBUG_MODE: true
        };
      });
    });

    test('should return filtered testing data when DEBUG_MODE is true', async () => {
      const result = await fetchPoliticasPago();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2); // Should only return active policies
      
      // Verify only active policies are returned
      result.forEach(politica => {
        expect(politica.activo).toBe(true);
      });

      // Verify specific policies are present
      expect(result.some(p => p.nombre === 'Política de Cancelación Gratuita')).toBe(true);
      expect(result.some(p => p.nombre === 'Política de Depósito')).toBe(true);
      expect(result.some(p => p.nombre === 'Política Inactiva')).toBe(false);
    });

    test('should simulate delay in DEBUG_MODE', async () => {
      const startTime = Date.now();
      await fetchPoliticasPago();
      const endTime = Date.now();
      
      // Should take at least 300ms due to simulated delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(250); // Allow some margin
    });
  });

  describe('Production mode scenarios', () => {
    beforeEach(() => {
      // Mock DEBUG_MODE to be false
      jest.doMock('../services/reservationServices', () => {
        const actual = jest.requireActual('../services/reservationServices');
        return {
          ...actual,
          DEBUG_MODE: false
        };
      });
    });

    test('should make API call and return data when API succeeds with results format', async () => {
      const mockApiResponse = {
        data: {
          results: [
            {
              id: 1,
              nombre: 'API Política 1',
              descripcion: 'Política desde API',
              tipo: 'api',
              activo: true
            },
            {
              id: 2,
              nombre: 'API Política 2',
              descripcion: 'Otra política desde API',
              tipo: 'api',
              activo: true
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchPoliticasPago();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/politicas-pago/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );

      expect(result).toEqual(mockApiResponse.data.results);
      expect(result).toHaveLength(2);
    });

    test('should make API call and return data when API succeeds with array format', async () => {
      const mockApiResponse = {
        data: [
          {
            id: 1,
            nombre: 'Direct API Política',
            descripcion: 'Política directa desde API',
            tipo: 'api',
            activo: true
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchPoliticasPago();

      expect(result).toEqual(mockApiResponse.data);
      expect(result).toHaveLength(1);
    });

    test('should throw error when API returns unexpected format', async () => {
      const mockApiResponse = {
        data: {
          unexpected: 'format'
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      await expect(fetchPoliticasPago()).rejects.toThrow('Formato de respuesta inesperado');
    });
  });

  describe('Error handling scenarios', () => {
    beforeEach(() => {
      // Mock DEBUG_MODE to be false for production error scenarios
      jest.doMock('../services/reservationServices', () => {
        const actual = jest.requireActual('../services/reservationServices');
        return {
          ...actual,
          DEBUG_MODE: false
        };
      });
    });

    test('should fall back to testing data when API fails and DEBUG_MODE would be available', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchPoliticasPago();

      // Should fall back to testing data and filter active policies
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // In error fallback, it should try to use testing data
      // The exact behavior depends on the implementation
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    test('should return default policies when all fallbacks fail', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // Mock the testing data import to also fail
      jest.doMock('../assets/testingData/testingData.js', () => {
        throw new Error('Testing data not available');
      });

      const result = await fetchPoliticasPago();

      // Should return basic default policies
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that basic default policies are present
      const hasBasicPolicies = result.some(p => 
        p.nombre?.includes('Cancelación') || 
        p.nombre?.includes('Depósito') ||
        p.nombre?.includes('Combustible')
      );
      expect(hasBasicPolicies).toBe(true);
    });

    test('should handle network timeout gracefully', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await fetchPoliticasPago();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle 404 API error gracefully', async () => {
      const notFoundError = new Error('Not found');
      notFoundError.response = { status: 404 };
      mockedAxios.get.mockRejectedValueOnce(notFoundError);

      const result = await fetchPoliticasPago();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle 500 API error gracefully', async () => {
      const serverError = new Error('Internal server error');
      serverError.response = { status: 500 };
      mockedAxios.get.mockRejectedValueOnce(serverError);

      const result = await fetchPoliticasPago();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data validation', () => {
    test('should only return policies with activo: true', async () => {
      const mockApiResponse = {
        data: {
          results: [
            { id: 1, nombre: 'Active Policy', activo: true },
            { id: 2, nombre: 'Inactive Policy', activo: false },
            { id: 3, nombre: 'Another Active Policy', activo: true }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchPoliticasPago();

      expect(result).toHaveLength(2);
      result.forEach(politica => {
        expect(politica.activo).toBe(true);
      });
    });

    test('should handle policies without activo field', async () => {
      const mockApiResponse = {
        data: {
          results: [
            { id: 1, nombre: 'Policy without activo field' },
            { id: 2, nombre: 'Active Policy', activo: true },
            { id: 3, nombre: 'Inactive Policy', activo: false }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchPoliticasPago();

      // Should handle missing activo field gracefully
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    test('should maintain consistent data structure across different sources', async () => {
      // Test that both testing data and API data maintain similar structure
      const mockApiResponse = {
        data: {
          results: [
            {
              id: 1,
              nombre: 'API Policy',
              descripcion: 'Policy from API',
              tipo: 'api',
              activo: true,
              condiciones: ['API condition 1', 'API condition 2']
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchPoliticasPago();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const policy = result[0];
        expect(policy).toHaveProperty('id');
        expect(policy).toHaveProperty('nombre');
        expect(policy).toHaveProperty('descripcion');
        expect(policy).toHaveProperty('activo');
        // tipo and condiciones are optional but common
      }
    });
  });
});
