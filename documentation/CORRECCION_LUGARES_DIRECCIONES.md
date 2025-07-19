# RESUMEN DE CORRECCIONES PARA LUGARES Y DIRECCIONES

## Problema Original
- Error al crear lugares: `null value in column "direccion_id" violates not-null constraint`
- Los lugares no tenían dirección asociada al momento de la creación
- Faltaba lógica para asegurar que la dirección se cree antes que el lugar

## Soluciones Implementadas

### 1. Servicio Especializado (`lugares/services.py`)
- **Nuevo método `crear_lugar_con_direccion()`**:
  - Crea la dirección PRIMERO usando transacciones atómicas
  - Luego crea el lugar con la dirección ya existente
  - Manejo robusto de errores con rollback automático
  - Validaciones previas antes de la creación

- **Nuevo método `actualizar_lugar_con_direccion()`**:
  - Actualiza lugar y dirección de manera atómica
  - Preserva la integridad referencial

### 2. Formulario Mejorado (`lugares/forms.py`)
- **Validaciones robustas**:
  - Ciudad y código postal obligatorios
  - Validación de coordenadas (latitud/longitud)
  - Validación de formato de teléfono y email
  - Manejo seguro de valores None

- **Método `save()` mejorado**:
  - Usa el servicio especializado para garantizar creación correcta
  - Diferencia entre creación y actualización
  - Manejo específico de errores de validación

### 3. Modelo Lugar (`lugares/models.py`)
- **Validación en el método `save()`**:
  - Verifica que siempre exista `direccion_id` antes de guardar
  - Previene la creación de lugares sin dirección

### 4. Admin Mejorado (`lugares/admin.py`)
- **Método `save_model()` corregido**:
  - Usa el formulario personalizado que maneja la lógica correcta
  - Manejo específico de errores de validación
  - Logging detallado para debug

### 5. Tests Comprehensivos (`lugares/tests.py`)
- Tests para el servicio de creación
- Tests para validaciones del formulario
- Tests para casos de error (ciudad/código postal faltantes)
- Verificación de integridad de datos

### 6. Comando de Verificación
- **`verificar_lugares_direcciones.py`**:
  - Detecta lugares sin dirección
  - Identifica direcciones huérfanas
  - Opción de corrección automática
  - Modo dry-run para análisis

## Flujo de Creación Corregido

### Antes (problemático):
1. Se crea instancia de Lugar
2. Se intenta guardar Lugar sin dirección → ❌ ERROR

### Después (correcto):
1. **Validaciones previas** (ciudad, código postal, nombre)
2. **Crear Dirección** y guardarla en BD
3. **Crear Lugar** con `direccion_id` válido
4. **Transacción atómica** - si algo falla, se hace rollback

## Funciones de Seguridad Implementadas

### Validaciones Obligatorias:
- ✅ Ciudad no puede estar vacía
- ✅ Código postal obligatorio
- ✅ Nombre del lugar obligatorio
- ✅ País por defecto "España"

### Validaciones de Formato:
- ✅ Código postal: 4-10 dígitos
- ✅ Coordenadas: rango válido (-90/90 lat, -180/180 lng)
- ✅ Teléfono: formato internacional
- ✅ Email: formato RFC válido

### Manejo de Errores:
- ✅ Rollback automático en caso de error
- ✅ Limpieza de direcciones huérfanas
- ✅ Mensajes de error descriptivos
- ✅ Logging detallado para debug

## Uso en Producción

### Para crear un lugar:
```python
from lugares.services import LugarService

lugar_data = {
    'nombre': 'Aeropuerto de Málaga',
    'telefono': '+34952048484',
    'activo': True,
    'popular': True
}

direccion_data = {
    'calle': 'Avenida del Comandante García Morato',
    'ciudad': 'Málaga',
    'provincia': 'Málaga',
    'pais': 'España',
    'codigo_postal': '29004'
}

lugar = LugarService.crear_lugar_con_direccion(lugar_data, direccion_data)
```

### Para verificar integridad:
```bash
python manage.py verificar_lugares_direcciones --dry-run
python manage.py verificar_lugares_direcciones --fix
```

## Resultado
- ✅ **Error original resuelto** - No más violaciones de constraint
- ✅ **Creación atómica** - Dirección + Lugar en una transacción
- ✅ **Validaciones robustas** - Prevención de datos incorrectos
- ✅ **Manejo de errores** - Rollback automático
- ✅ **Tests comprehensivos** - Cobertura completa
- ✅ **Herramientas de verificación** - Mantenimiento proactivo
