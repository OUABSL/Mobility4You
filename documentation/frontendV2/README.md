# 📁 Carpeta de Utilidades (Utils)

Esta carpeta contiene todas las funciones de utilidad organizadas por categorías funcionales, migradas desde diferentes servicios para mejorar la organización del código y reducir la duplicación.

## 🗂️ Estructura de Archivos

### `dataExtractors.js` - Extracción de Datos

Funciones para extraer valores de objetos complejos, campos JSON y navegación por propiedades.

**Funciones principales:**

- `extractFromJsonField()` - Extrae valores de campos JSON de forma segura
- `extractByPath()` - Navega por objetos usando notación de puntos
- `extractFromMultiplePaths()` - Busca valores en múltiples rutas
- `extractProperties()` - Extrae propiedades específicas de objetos
- `deepSearch()` - Búsqueda profunda en objetos anidados
- `flattenObject()` / `unflattenObject()` - Conversión entre objetos planos y anidados

### `dateValidators.js` - Validación de Fechas

Funciones para validar fechas, rangos y formateo de fechas.

**Funciones principales:**

- `isValidDate()` - Valida si una fecha es válida
- `isValidFutureDate()` - Valida fechas futuras
- `validateDateRange()` - Valida rangos de fechas
- `validateReservationDates()` - Validación específica para reservas
- `calculateDaysDifference()` - Calcula diferencia en días
- `formatDateForUI()` / `formatDateForBackend()` - Formateo de fechas

### `financialUtils.js` - Utilidades Financieras

Funciones para formatear monedas, calcular impuestos y manejar valores monetarios.

**Funciones principales:**

- `formatCurrency()` - Formatea valores como moneda
- `calculateTaxAmount()` - Calcula impuestos
- `calculatePriceWithTax()` - Calcula precio con impuestos incluidos
- `roundToDecimals()` - Redondeo preciso de decimales
- `validateMonetaryValue()` - Validación de valores monetarios
- `calculateDiscount()` - Cálculo de descuentos
- `formatPercentage()` - Formateo de porcentajes

### `imageUtils.js` - Gestión de Imágenes

Funciones para procesar URLs de imágenes, generar placeholders y optimizar imágenes.

**Funciones principales:**

- `processImageUrl()` - Procesa URLs de imágenes
- `getPlaceholder()` - Genera placeholders por tipo
- `validateImageUrl()` - Valida URLs de imágenes
- `getImageForExtra()` / `getImageForVehicle()` - Obtiene imágenes con fallbacks
- `generateImageSet()` - Genera conjunto de URLs optimizadas
- `getOptimizedImageUrl()` - URLs optimizadas por contexto

### `generalUtils.js` - Utilidades Generales

Funciones de utilidad general que no encajan en categorías específicas.

**Funciones principales:**

- `withTimeout()` - Añade timeout a promesas
- `debounce()` / `throttle()` - Control de frecuencia de ejecución
- `generateUniqueId()` - Genera IDs únicos
- `capitalize()` / `capitalizeWords()` - Capitalización de texto
- `slugify()` - Limpia texto para URLs
- `isValidEmail()` / `isValidSpanishPhone()` - Validadores
- `debugBackendData()` / `debugSessionStorage()` - Funciones de debug
- `deepClone()` / `shallowEqual()` - Manipulación de objetos

## 📦 Uso de las Utilidades

### Importación Individual

```javascript
import { formatCurrency, calculateTaxAmount } from '../utils/financialUtils';
import { extractByPath, extractFromJsonField } from '../utils/dataExtractors';
import { isValidFutureDate, validateDateRange } from '../utils/dateValidators';
```

### Importación por Categorías

```javascript
import { FinancialUtils, DateValidators } from '../utils';

// Uso
const formattedPrice = FinancialUtils.formatCurrency(100);
const isValid = DateValidators.isValidFutureDate(new Date());
```

### Importación desde el Índice

```javascript
import {
  formatCurrency,
  extractByPath,
  isValidFutureDate,
  processImageUrl,
  withTimeout,
} from '../utils';
```

## 🔄 Migración desde Archivos Anteriores

### Desde `services/func.js`

Las siguientes funciones han sido migradas y marcadas como deprecated:

- `formatCurrency()` → `utils/financialUtils`
- `calculateDisplayTaxAmount()` → `utils/financialUtils`
- `getImageForExtra()` → `utils/imageUtils`
- `debugBackendData()` → `utils/generalUtils`
- `withTimeout()` → `utils/generalUtils`

### Desde `services/universalDataMapper.js`

Las siguientes funciones han sido migradas:

- `extractFromJsonField()` → `utils/dataExtractors`
- `extractByPath()` → `utils/dataExtractors`
- `isValidFutureDate()` → `utils/dateValidators`
- `roundToDecimals()` → `utils/financialUtils`
- `calculateTaxAmount()` → `utils/financialUtils`
- `ImageUtils` clase → `utils/imageUtils`

## ⚠️ Compatibilidad hacia Atrás

Los archivos originales mantienen funciones wrapper marcadas como `@deprecated` que redirigen a las nuevas utilidades. Esto asegura que el código existente continue funcionando mientras se actualiza gradualmente.

### Ejemplo de Migración

```javascript
// ❌ Forma antigua (deprecated)
import { formatCurrency } from '../services/func';

// ✅ Forma nueva (recomendada)
import { formatCurrency } from '../utils/financialUtils';
// o
import { formatCurrency } from '../utils';
```

## 🛠️ Beneficios de la Migración

1. **Organización mejorada**: Funciones agrupadas por responsabilidad
2. **Reducción de duplicación**: Eliminación de código duplicado
3. **Mantenibilidad**: Más fácil encontrar y mantener funciones
4. **Reutilización**: Funciones más fáciles de reutilizar
5. **Testing**: Más fácil de testear funciones individuales
6. **Documentación**: Mejor documentación por categorías

## 🔍 Logging y Debug

Todas las utilidades utilizan el sistema de logging centralizado de `appConfig.js`:

```javascript
import { createServiceLogger, DEBUG_MODE } from '../config/appConfig';
const logger = createServiceLogger('CATEGORY_NAME');
```

El logging se activa automáticamente en modo desarrollo cuando `DEBUG_MODE` está habilitado.

## 📈 Rendimiento

- **Cache inteligente**: Funciones con cache donde es apropiado
- **Validación eficiente**: Validaciones optimizadas sin repetición
- **Timeout automático**: Protección contra operaciones que cuelguen
- **Fallbacks seguros**: Valores por defecto sensatos en caso de error

## 🔮 Futuras Mejoras

- Añadir tests unitarios para cada categoría
- Implementar memoización para funciones costosas
- Añadir más validadores específicos del dominio
- Crear utilidades específicas para formularios
- Implementar utilidades para manejo de estado local
