# 📋 Sistema de Logging - Mobility4You

## 📁 Estructura de Logs

Los logs se almacenan en `backend/logs/` con archivos separados por categoría:

```
backend/logs/
├── 📄 django.log              # Logs generales de Django
├── 📄 errors.log              # Errores críticos y excepciones
├── 📄 api_requests.log        # Requests HTTP y API calls
├── 📄 database.log            # Warnings y errores de base de datos
├── 📄 payments.log            # Transacciones y Stripe
├── 📄 emails.log              # Envío de emails y notificaciones
├── 📄 admin_operations.log    # Operaciones del panel admin
├── 📄 modular_apps.log        # Logs de apps modulares
└── 📄 debug.log               # Debug detallado (solo desarrollo)
```

## 🎯 Tipos de Logs por Categoría

### 📊 **django.log** - General

- Información general del framework Django
- Inicialización de aplicaciones
- Configuración del sistema

### ❌ **errors.log** - Errores Críticos

- Excepciones no manejadas
- Errores 500 del servidor
- Fallos críticos del sistema

### 🌐 **api_requests.log** - API

- Todas las peticiones HTTP
- Respuestas y códigos de estado
- Información de usuarios autenticados
- Tiempos de respuesta

### 🗄️ **database.log** - Base de Datos

- Queries problemáticas
- Errores de conexión
- Warnings de rendimiento

### 💳 **payments.log** - Pagos

- Transacciones de Stripe
- Webhooks de pagos
- Errores de procesamiento
- Intentos de pago

### 📧 **emails.log** - Comunicaciones

- Envío de emails
- Notificaciones SMS
- Errores de envío
- Templates utilizados

### 👨‍💼 **admin_operations.log** - Administración

- Acciones del panel admin
- Cambios de configuración
- Operaciones de usuarios admin

### 🏗️ **modular_apps.log** - Apps Modulares

- vehiculos, usuarios, reservas
- politicas, facturas_contratos
- Operaciones específicas de cada módulo

### 🐛 **debug.log** - Debug (Solo Desarrollo)

- Información detallada de debugging
- Traces de ejecución
- Variables de estado

## ⚙️ Configuración de Logging

### 📝 Formatos de Log

```
[2025-06-20 19:30:15] INFO     | vehiculos            | views.py        | list_vehiculos  | Line 45   | Usuario consultó lista de vehículos
[2025-06-20 19:30:16] ERROR    | payments             | stripe_service  | create_payment  | Line 123  | Error procesando pago: Invalid card
```

### 🔄 Rotación de Archivos

- **Tamaño máximo por archivo**: Variable según importancia
- **Archivos de backup**: 3-10 según el tipo
- **Compresión**: Automática para archivos antiguos

| Archivo          | Tamaño Max | Backups |
| ---------------- | ---------- | ------- |
| django.log       | 10MB       | 5       |
| errors.log       | 10MB       | 10      |
| api_requests.log | 20MB       | 7       |
| payments.log     | 10MB       | 10      |
| debug.log        | 50MB       | 3       |

### 📊 Niveles de Log

```python
DEBUG    # Solo en desarrollo - información muy detallada
INFO     # Información general del flujo normal
WARNING  # Situaciones que requieren atención
ERROR    # Errores que afectan funcionalidad
CRITICAL # Errores críticos que pueden parar el sistema
```

## 🛠️ Uso en el Código

### Ejemplo básico:

```python
import logging

# Obtener logger específico
logger = logging.getLogger('vehiculos')

# Diferentes niveles
logger.info('Usuario consultó lista de vehículos')
logger.warning('Vehículo con stock bajo: ID 123')
logger.error('Error al guardar vehículo: datos inválidos')
```

### Para pagos:

```python
import logging

logger = logging.getLogger('payments')

logger.info(f'Pago iniciado: {payment_intent_id} - Usuario: {user.email}')
logger.error(f'Pago fallido: {error_message} - Intent: {payment_intent_id}')
```

### Para API requests:

```python
import logging

logger = logging.getLogger('api.requests')

logger.info(f'GET /api/vehiculos/ - User: {request.user.username} - Status: 200')
```

## 🔍 Monitoreo y Análisis

### Comandos útiles:

```bash
# Ver logs en tiempo real
tail -f backend/logs/django.log

# Buscar errores recientes
grep "ERROR" backend/logs/errors.log | tail -20

# Analizar requests API
grep "POST.*reservas" backend/logs/api_requests.log

# Ver actividad de pagos
tail -f backend/logs/payments.log

# Monitoring de errores
watch "grep -c ERROR backend/logs/errors.log"
```

### Filtros por fecha:

```bash
# Errores de hoy
grep "$(date +%Y-%m-%d)" backend/logs/errors.log

# Pagos de la última hora
grep "$(date -d '1 hour ago' +%Y-%m-%d\ %H)" backend/logs/payments.log
```

## 📈 Configuración por Entorno

### 🔧 Desarrollo (DEBUG=True)

- Logs en consola + archivos
- Nivel DEBUG habilitado
- Archivo debug.log activo
- Información de queries SQL (opcional)

### 🚀 Producción (DEBUG=False)

- Solo logs en archivos
- Nivel mínimo INFO
- Sin debug.log
- Logs optimizados para rendimiento

## 🧪 Testing del Sistema

Ejecutar script de prueba:

```bash
cd backend/
python test_logging.py
```

Este script:

- ✅ Prueba todos los loggers configurados
- ✅ Verifica la creación de archivos
- ✅ Muestra el tamaño de los logs
- ✅ Confirma que el sistema funciona

## 🚨 Alertas y Monitoreo

### Configuración recomendada:

1. **Monitoreo de errors.log** - Alertas inmediatas
2. **Análisis de payments.log** - Revisar transacciones fallidas
3. **Tamaño de logs** - Rotación automática
4. **Disk space** - Monitorear espacio en /logs

### Integración con herramientas:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana** para dashboards
- **Sentry** para errores en tiempo real
- **Custom scripts** para alertas por email

---

**Última actualización**: Junio 2025  
**Versión del sistema**: Mobility4You v3.0
