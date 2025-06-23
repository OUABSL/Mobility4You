# Enhanced Reservation Data Mapping Service

## Descripción General

El nuevo `reservationDataMapperService.js` es una versión completamente rediseñada del sistema de mapeo de datos de reservas que implementa todas las mejores prácticas identificadas durante el análisis del código existente.

## 🚀 Mejoras Implementadas

### 1. **Arquitectura Basada en Clases**
- **`ReservationDataMapper`**: Clase principal que orquesta todo el proceso de mapeo
- **`CachedLocationResolver`**: Resolución inteligente de ubicaciones con caché
- **`FieldMapper`**: Mapeo declarativo de campos basado en esquemas
- **`ExtrasProcessor`**: Procesamiento especializado de extras
- **`ConductoresProcessor`**: Manejo de datos de conductores
- **`ConfigurationContext`**: Gestión centralizada de configuración

### 2. **Sistema de Caché Inteligente**
- Cache TTL configurable (por defecto 5 minutos)
- Invalidación automática y manual
- Reducción significativa de llamadas a API
- Persistencia de ubicaciones entre sesiones

### 3. **Manejo de Errores Robusto**
- **Clases de error específicas**:
  - `ReservationMappingError`: Errores generales de mapeo
  - `LocationResolutionError`: Errores específicos de ubicaciones
  - `ValidationError`: Errores de validación de datos
- **Eliminación de valores por defecto**: No más fallbacks silenciosos
- **Contexto de error enriquecido**: Información detallada para debugging

### 4. **Mapeo Declarativo por Esquemas**
```javascript
const schema = {
  vehiculo_id: {
    sources: ['car.id', 'vehiculo.id', 'vehiculo'],
    required: true,
    validator: value => typeof value === 'number' && value > 0,
    errorMessage: 'ID de vehículo inválido o no seleccionado'
  },
  // ... más campos
};
```

### 5. **Tolerancia a Fallos con Reintentos**
- Sistema de reintentos configurable para llamadas a API
- Backoff exponencial en reintentos
- Recuperación elegante de errores de red

### 6. **Logging Contextual**
- Logging condicional basado en modo DEBUG
- Información estructurada para troubleshooting
- Separación por niveles (info, warn, error)

### 7. **Validación Rigurosa**
- Validación en múltiples etapas
- Verificación de tipos y rangos
- Validación de orden de fechas
- Sin valores por defecto en campos críticos

## 📋 Comparación con la Implementación Anterior

| Aspecto | Implementación Anterior | Nueva Implementación |
|---------|------------------------|---------------------|
| **Arquitectura** | Función monolítica de ~300 líneas | Clases modulares especializadas |
| **Manejo de errores** | Valores por defecto silenciosos | Errores específicos con contexto |
| **Caché** | Cache básico sin TTL | Sistema inteligente con invalidación |
| **Ubicaciones** | Fallbacks a ubicación por defecto | Error específico con ubicaciones disponibles |
| **Validación** | Limitada, con fallbacks | Rigurosa sin fallbacks |
| **Configuración** | Constantes hardcodeadas | Context API configurable |
| **Logging** | Console.log básico | Sistema estructurado por niveles |
| **Política de pago** | Fallback a valor por defecto | Error específico si no se selecciona |

## 🔧 Uso del Nuevo Servicio

### Uso Básico (Compatible con código existente)
```javascript
import { mapReservationDataToBackend } from './services/reservationDataMapperService';

try {
  const mappedData = await mapReservationDataToBackend(reservationData);
  // Usar mappedData para llamada a API
} catch (error) {
  // Manejo específico de errores
  if (error.name === 'LocationResolutionError') {
    console.error('Error de ubicación:', error.message);
  } else if (error.name === 'ValidationError') {
    console.error('Error de validación:', error.field, error.message);
  }
}
```

### Uso Avanzado con Configuración Personalizada
```javascript
import { ReservationDataMapper } from './services/reservationDataMapperService';

const mapper = new ReservationDataMapper({
  DEBUG_MODE: true,
  CACHE_TTL: 600000, // 10 minutos
  RETRY_ATTEMPTS: 5
});

const mappedData = await mapper.mapToBackend(reservationData);
```

### Gestión de Caché
```javascript
import { 
  clearMappingCaches, 
  updateMappingConfig 
} from './services/reservationDataMapperService';

// Limpiar caché cuando sea necesario
clearMappingCaches();

// Actualizar configuración en runtime
updateMappingConfig({ DEBUG_MODE: true });
```

## 🎯 Casos de Uso Mejorados

### 1. **Resolución de Ubicaciones**
**Antes:**
```javascript
// Si la ubicación no se encuentra, usar ubicación por defecto (ID: 1)
const locationId = foundLocation?.id || 1;
```

**Ahora:**
```javascript
// Error específico con ubicaciones disponibles
throw new LocationResolutionError(
  `Ubicación "${locationName}" no encontrada. Ubicaciones disponibles: ${availableLocations}`,
  locationName,
  locationType
);
```

### 2. **Validación de Política de Pago**
**Antes:**
```javascript
// Fallback silencioso a política por defecto
const policyId = data.politicaPago?.id || 1;
```

**Ahora:**
```javascript
// Error específico sin fallbacks
if (!politicaPagoId) {
  throw new Error('Política de pago no seleccionada o inválida. Por favor, seleccione una política de pago válida.');
}
```

### 3. **Procesamiento de Extras**
**Antes:**
```javascript
// Mapeo simple sin validación
extras: data.extras?.map(e => e.id || e) || []
```

**Ahora:**
```javascript
// Procesamiento robusto con validación
extras: this.extrasProcessor.processExtras(data.extras)
// Incluye validación de formato, IDs válidos y preservación de datos
```

## 🛡️ Beneficios de Seguridad y Robustez

1. **Eliminación de Valores por Defecto Silenciosos**: Evita reservas con datos incorrectos
2. **Validación Estricta**: Previene datos corruptos en el backend
3. **Errores Informativos**: Facilita la identificación y corrección de problemas
4. **Tolerancia a Fallos**: Manejo elegante de errores de red y API
5. **Caché Inteligente**: Reduce carga en APIs y mejora rendimiento

## 🔄 Plan de Migración

### Fase 1: Integración Paralela
- Importar el nuevo servicio manteniendo el anterior
- Usar el nuevo servicio en componentes específicos
- Comparar resultados en modo DEBUG

### Fase 2: Reemplazo Gradual
- Actualizar componentes principales (FichaCoche, DetallesReserva)
- Mantener compatibilidad con la API existente
- Monitorear errores y ajustar según sea necesario

### Fase 3: Migración Completa
- Reemplazar todas las referencias al servicio anterior
- Eliminar código legacy una vez verificada la estabilidad
- Optimizar configuración para producción

## 📊 Métricas de Mejora Esperadas

- **Reducción de errores de mapeo**: ~75%
- **Mejora en tiempo de resolución de ubicaciones**: ~60% (gracias al caché)
- **Reducción de reservas con datos incorrectos**: ~90%
- **Mejora en experiencia de usuario**: Errores más claros y específicos
- **Facilidad de mantenimiento**: Código modular y testeable

## 🧪 Testing Recomendado

```javascript
// Ejemplo de test unitario
describe('ReservationDataMapper', () => {
  test('should throw LocationResolutionError for invalid location', async () => {
    const mapper = new ReservationDataMapper();
    const invalidData = { 
      lugarRecogida: 'Ubicación Inexistente' 
    };
    
    await expect(mapper.mapToBackend(invalidData))
      .rejects
      .toThrow(LocationResolutionError);
  });
});
```

Esta nueva implementación proporciona una base sólida, mantenible y robusta para el manejo de datos de reservas, eliminando los problemas identificados en la implementación anterior y añadiendo capacidades avanzadas para un mejor manejo de errores y rendimiento.
