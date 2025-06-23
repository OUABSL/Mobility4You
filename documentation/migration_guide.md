# migration_guide.md
# Guía de Migración: Refactorización Modular de Mobility-for-you

## 📋 Resumen de Cambios

Se ha realizado una refactorización completa de la aplicación Django para crear una arquitectura modular con las siguientes aplicaciones:

### 🔄 Aplicaciones Modulares Creadas

| Aplicación | Responsabilidad | Modelos Incluidos |
|------------|----------------|-------------------|
| **usuarios** | Gestión de usuarios y perfiles | Usuario |
| **vehiculos** | Vehículos, categorías y ubicaciones | Vehiculo, Categoria, GrupoCoche, ImagenVehiculo, TarifaVehiculo, Mantenimiento, Direccion, Lugar |
| **reservas** | Sistema de reservas | Reserva, ReservaConductor, Penalizacion, Extras, ReservaExtra |
| **politicas** | Políticas y promociones | PoliticaPago, PoliticaIncluye, TipoPenalizacion, PoliticaPenalizacion, Promocion |
| **facturas_contratos** | Facturación y contratos | Contrato, Factura |
| **comunicacion** | Contenidos y contacto | Contenido, Contacto |
| **payments** | Sistema de pagos (existente) | Mantenida sin cambios |

## ⚠️ Cambios Críticos

### 1. Modelo de Usuario Personalizado
```python
# Antes
AUTH_USER_MODEL = 'api.Usuario'

# Después  
AUTH_USER_MODEL = 'usuarios.Usuario'
```

### 2. Referencias entre Modelos
Los modelos ahora usan referencias con el formato `'app.Model'`:
```python
# Ejemplo en reservas/models.py
usuario = models.ForeignKey(
    'usuarios.Usuario',  # Nueva referencia
    related_name="reservas",
    on_delete=models.SET(-1)
)
```

### 3. INSTALLED_APPS Actualizado
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    
    # Aplicaciones modulares
    'usuarios',
    'vehiculos', 
    'reservas',
    'politicas',
    'facturas_contratos',
    'comunicacion',
    'payments',
    
    # Aplicación original (mantener durante migración)
    'api',
]
```

## 🚀 Pasos de Migración

### Paso 1: Verificar la Estructura
```bash
# Verificar que todas las aplicaciones están creadas
ls backend/usuarios backend/vehiculos backend/reservas backend/politicas backend/facturas_contratos backend/comunicacion
```

### Paso 2: Crear Migraciones Iniciales
```bash
cd backend
python manage.py makemigrations usuarios
python manage.py makemigrations vehiculos  
python manage.py makemigrations reservas
python manage.py makemigrations politicas
python manage.py makemigrations facturas_contratos
python manage.py makemigrations comunicacion
```

### Paso 3: Aplicar Migraciones
```bash
python manage.py migrate
```

### Paso 4: Verificar Panel de Administración
```bash
python manage.py runserver
# Acceder a http://localhost:8000/admin/
```

## 📊 Panel de Administración Mejorado

### Agrupación por Funcionalidad
- **👥 Gestión de Usuarios**: usuarios
- **🚗 Vehículos y Ubicaciones**: vehiculos  
- **📅 Sistema de Reservas**: reservas
- **📋 Políticas y Promociones**: politicas
- **💰 Facturación y Contratos**: facturas_contratos
- **📢 Comunicación**: comunicacion
- **💳 Pagos**: payments

### Funcionalidades Avanzadas
- Filtros inteligentes por fecha, estado, etc.
- Búsqueda optimizada en campos relevantes
- Inlines para modelos relacionados
- Fieldsets organizados por categorías
- Acciones masivas personalizadas

## 🔧 Beneficios de la Refactorización

### 1. **Modularidad**
- Cada aplicación tiene una responsabilidad específica
- Fácil mantenimiento y extensión
- Desarrollo en paralelo por equipos

### 2. **Organización del Admin**
- Panel agrupado por funcionalidad
- Navegación intuitiva
- Mejor experiencia de usuario

### 3. **Escalabilidad**
- Estructura preparada para crecimiento
- Fácil adición de nuevas funcionalidades
- Separación clara de responsabilidades

### 4. **Mantenibilidad**
- Código más limpio y organizado
- Dependencias claras entre módulos
- Mejor testabilidad

## ⚡ Próximos Pasos

### 1. Migración de Vistas y Serializers
- [ ] Migrar serializers de `api/serializers/` a cada aplicación
- [ ] Migrar views de `api/views/` a cada aplicación
- [ ] Actualizar URLs principales

### 2. Pruebas
- [ ] Verificar todas las funcionalidades existentes
- [ ] Ejecutar tests unitarios
- [ ] Probar panel de administración

### 3. Optimización
- [ ] Configurar logging por aplicación
- [ ] Optimizar consultas con select_related
- [ ] Implementar cache donde sea necesario

## 🚨 Notas Importantes

1. **Mantener aplicación `api` temporalmente** durante la transición
2. **Verificar todas las importaciones** en el código existente
3. **Probar el sistema completo** antes de eliminar código antiguo
4. **Hacer backup de la base de datos** antes de las migraciones

## 📞 Soporte

En caso de problemas durante la migración:
1. Revisar logs de Django
2. Verificar configuración de `settings.py`
3. Comprobar que todas las dependencias están instaladas
4. Consultar documentación oficial de Django sobre aplicaciones modulares
