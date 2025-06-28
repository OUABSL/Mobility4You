# MEJORAS EN CONSULTA Y EDICIÓN DE RESERVAS

## Resumen de Cambios

Este documento describe las mejoras implementadas en el sistema de consulta y edición/cancelación de reservas para optimizar el rendimiento, corregir errores y mejorar la experiencia del usuario.

## 🔧 Problemas Resueltos

### 1. Error "Método no permitido" en cálculo de precio de edición

**Problema**: Al pulsar "Calcular precio" en edición de reserva aparecía el error "Método no permitido para este recurso."

**Solución**:

- Agregado endpoint específico para cálculo de precio de edición: `/reservas/<id>/calcular-precio-edicion/`
- Creado método `calcular_precio_edicion` en `ReservaViewSet`
- Agregada función `calculateEditReservationPrice` en el frontend

### 2. Datos incompletos de conductores en consulta de reservas

**Problema**: En el array de conductores del backend solo se devolvían campos básicos (nombre, email) sin datos completos del usuario.

**Solución**:

- Mejorado `ReservaConductorSerializer` para incluir datos completos del usuario relacionado
- Agregados campos: `telefono`, `fecha_nacimiento`, `sexo`, `nacionalidad`, `tipo_documento`, `numero_documento`, `direccion`
- Mantenida compatibilidad con frontend existente mediante campos alias

## 🚀 Optimizaciones Implementadas

### Backend (Django)

#### 1. Serializers Optimizados

```python
# reservas/serializers.py

class ReservaConductorSerializer(serializers.ModelSerializer):
    # Datos completos del conductor desde el usuario relacionado
    conductor = serializers.SerializerMethodField()

    def get_conductor(self, obj):
        """Obtener datos completos del conductor desde el usuario relacionado"""
        # Retorna datos completos: nombre, apellido, email, telefono, documento, etc.
```

#### 2. Endpoints Mejorados

```python
# reservas/views.py

@action(detail=True, methods=["post"])
def calcular_precio_edicion(self, request, pk=None):
    """Calcular precio de reserva editada con diferencia"""

@action(detail=True, methods=["post"])
def buscar(self, request, pk=None):
    """Búsqueda optimizada con select_related y prefetch_related"""
```

#### 3. URLs Actualizadas

```python
# reservas/urls.py
urlpatterns = [
    # Endpoints de cálculo de precio (compatibilidad)
    path("reservas/calcular-precio/", ...),
    path("reservas/calculate-price/", ...),

    # Nuevo endpoint para edición
    path("reservas/<int:pk>/calcular-precio-edicion/", ...),
]
```

#### 4. Servicio de Cálculo Mejorado

```python
# reservas/services.py

def calcular_precio_reserva(self, data):
    """
    Soporte para múltiples formatos de entrada:
    - fecha_recogida / fecha_inicio / fechaRecogida
    - fecha_devolucion / fecha_fin / fechaDevolucion
    - extras como array de IDs o objetos
    """
```

### Frontend (React)

#### 1. Función de Cálculo de Precio Unificada

```javascript
// reservationServices.js

export const calculateReservationPrice = async (data) => {
  // Si hay ID de reserva, usar endpoint de edición
  if (data.id) {
    return await calculateEditReservationPrice(data.id, data);
  }
  // Sino, usar endpoint estándar
};

export const calculateEditReservationPrice = async (reservaId, editData) => {
  // Endpoint específico para edición con cálculo de diferencia
};
```

#### 2. Mapeo de Datos Optimizado

- Soporte para múltiples formatos de fechas
- Manejo inteligente de extras (IDs y objetos)
- Validación de datos antes del envío

## 📊 Datos de Conductores Optimizados

### Estructura de Respuesta Actual

```json
{
  "conductores": [
    {
      "id": 1,
      "conductor": {
        "id": 123,
        "nombre": "Juan",
        "apellido": "Pérez",
        "apellidos": "Pérez",
        "email": "juan@example.com",
        "telefono": "+34666555444",
        "fecha_nacimiento": "1985-06-15",
        "sexo": "masculino",
        "nacionalidad": "Española",
        "tipo_documento": "dni",
        "numero_documento": "12345678A",
        "documento": "12345678A",
        "rol_usuario": "cliente",
        "direccion": {
          "calle": "Calle Principal 123",
          "ciudad": "Málaga",
          "provincia": "Málaga",
          "codigo_postal": "29001",
          "pais": "España"
        }
      },
      "rol": "principal"
    }
  ]
}
```

### Compatibilidad con Frontend

- Mantenidos campos legacy (`apellidos`, `documento`)
- Agregados campos nuevos con nombres estándar
- Datos de dirección incluidos cuando están disponibles

## 🔍 Consulta de Reservas Optimizada

### Mejoras en Performance

1. **Select Related**: Optimiza consultas de relaciones ForeignKey
2. **Prefetch Related**: Optimiza consultas de relaciones ManyToMany y reverse ForeignKey
3. **Índices de Base de Datos**: Mejoran velocidad de búsqueda

### Estructura de Consulta

```python
reserva = Reserva.objects.select_related(
    "usuario", "vehiculo", "vehiculo__categoria", "vehiculo__grupo_coche",
    "lugar_recogida", "lugar_devolucion",
    "politica_pago", "promocion"
).prefetch_related(
    "extras__extra",
    "conductores__conductor",
    "penalizaciones__tipo_penalizacion"
).get(id=reserva_id)
```

## 📋 Validaciones y Error Handling

### Backend

- Validación de datos requeridos en cálculo de precio
- Manejo de formatos de fecha flexibles
- Logs detallados para debugging
- Respuestas de error estandarizadas

### Frontend

- Validación de datos antes del envío
- Manejo de errores con mensajes descriptivos
- Fallbacks para modo DEBUG_MODE
- Timeout y retry logic

## 🧪 Testing

### Tests Automatizados

- Test de cálculo de precio básico
- Test de cálculo con extras
- Test de creación de reserva optimizada
- Test de búsqueda de reserva
- Test de datos completos de conductor

### Archivo de Test

```bash
backend/tests/test_reservas_optimization.py
```

## 🔄 Flujo de Edición de Reserva

### 1. Frontend Solicita Cálculo

```javascript
const priceData = await calculateReservationPrice({
  id: reservationData.id, // Esto activa el modo edición
  fechaRecogida: newStartDate,
  fechaDevolucion: newEndDate,
  extras: selectedExtras,
});
```

### 2. Backend Calcula Diferencia

```python
def calcular_precio_edicion(self, request, pk=None):
    # Obtiene reserva actual
    # Calcula nuevo precio
    # Retorna diferencia
    return {
        "originalPrice": precio_original,
        "newPrice": nuevo_precio,
        "difference": diferencia
    }
```

### 3. Frontend Maneja Respuesta

- Si diferencia > 0: Redirige a pago de diferencia
- Si diferencia <= 0: Procede con actualización directa

## 📝 Próximos Pasos

1. **Monitoreo**: Implementar métricas de rendimiento
2. **Cache**: Añadir cache para cálculos de precio frecuentes
3. **Optimización de Imágenes**: Lazy loading para imágenes de vehículos y extras
4. **Logs Avanzados**: Structured logging para análisis
5. **API Rate Limiting**: Protección contra abuso de endpoints públicos

## 🛠️ Comandos de Prueba

```bash
# Backend - Ejecutar tests
python manage.py test tests.test_reservas_optimization

# Frontend - Probar cálculo de precio
# En el modal de edición, cambiar fechas o extras y pulsar "Calcular precio"

# Verificar logs
tail -f backend/logs/modular_apps.log
```

## 📋 Checklist de Verificación

- [x] Error "Método no permitido" corregido
- [x] Datos completos de conductores implementados
- [x] Optimización de consultas de BD
- [x] Endpoint de cálculo de precio de edición
- [x] Compatibilidad con frontend existente
- [x] Tests automatizados creados
- [x] Documentación actualizada
- [x] Logging mejorado
- [x] Manejo de errores optimizado
- [x] Validaciones de datos mejoradas

## 🔗 Archivos Modificados

### Backend

- `backend/reservas/serializers.py` - Serializers optimizados
- `backend/reservas/views.py` - Views con nuevos endpoints
- `backend/reservas/urls.py` - URLs actualizadas
- `backend/reservas/services.py` - Servicio de cálculo mejorado
- `backend/tests/test_reservas_optimization.py` - Tests nuevos

### Frontend

- `frontend/src/services/reservationServices.js` - Funciones de cálculo actualizadas
- Compatibilidad mantenida con componentes existentes

Este conjunto de mejoras proporciona una base sólida y optimizada para el sistema de gestión de reservas, con mejor rendimiento, manejo de errores y experiencia de usuario.
