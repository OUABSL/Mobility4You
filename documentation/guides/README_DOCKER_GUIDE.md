# 📋 GUÍA DE ARCHIVOS DOCKER - ARQUITECTURA MODULAR

## 📁 Estructura de Archivos

```
docker/
├── .env                           # ✅ Variables de entorno (desarrollo)
├── .env.development.template      # ✅ Template para desarrollo
├── .env.production.template       # ✅ Template para producción
├── docker-compose.yml             # ✅ Configuración desarrollo
├── docker-compose.prod.yml        # ✅ Configuración producción
├── docker_operations.ps1          # ✅ Script PowerShell principal
├── docker_daily_operations.sh     # ✅ Script Bash (legacy)
├── docker_health_check.sh         # ✅ Verificación de salud
├── entrypoint.sh                  # ✅ Script de inicio del backend (ACTUALIZADO)
├── mariadb-init.sh               # ✅ Inicialización de MariaDB
├── quick_start.ps1               # ✅ Script de inicio rápido
└── nginx/                        # ✅ Configuración Nginx
    ├── nginx.dev.conf
    ├── nginx.prod.conf
    └── ssl/

backend/
├── Dockerfile                    # ✅ Dockerfile para desarrollo
├── Dockerfile.prod              # ✅ Dockerfile optimizado para producción
└── requirements.txt
```

## 🔧 CAMBIOS IMPORTANTES EN ARQUITECTURA

### Entrypoint Centralizado

- **Ubicación**: `docker/entrypoint.sh` (antes estaba en `backend/`)
- **Función**: Inicialización modular del backend Django
- **Apps soportadas**: usuarios, vehiculos, reservas, politicas, facturas_contratos, comunicacion

### Dockerfiles Optimizados

- **Desarrollo**: `backend/Dockerfile` - Optimizado para desarrollo rápido
- **Producción**: `backend/Dockerfile.prod` - Multi-stage build con seguridad mejorada

## 🚀 COMANDOS PRINCIPALES (PowerShell)

### Desarrollo diario

```powershell
# Navegar al directorio
cd "C:\Users\Work\Documents\GitHub\Movility-for-you\docker"

# Ejecutar script principal (RECOMENDADO)
.\docker_operations.ps1

# O comandos manuales:
docker-compose up -d              # Iniciar desarrollo
docker-compose down               # Detener contenedores
docker-compose logs -f backend    # Ver logs backend
docker-compose restart backend    # Reiniciar backend
```

### Producción

```powershell
# Iniciar producción
docker-compose -f docker-compose.prod.yml up -d

# Detener producción
docker-compose -f docker-compose.prod.yml down
```

## 📋 UTILIDAD DE CADA ARCHIVO

### ✅ ARCHIVOS ÚTILES

#### **docker_operations.ps1**

- **Qué hace**: Script principal de PowerShell con menú interactivo
- **Cuándo usar**: Para todas las operaciones diarias de desarrollo
- **Comando**: `.\docker_operations.ps1`
- **Características**:
  - Menú interactivo con 12 opciones
  - Compatible con PowerShell nativo
  - Colores y emojis para mejor UX
  - Manejo de errores integrado

#### **docker-compose.yml**

- **Qué hace**: Configuración principal para desarrollo
- **Cuándo usar**: Desarrollo local diario
- **Comando**: `docker-compose up -d`
- **Servicios**: db, backend, frontend, nginx, redis

#### **docker-compose.prod.yml**

- **Qué hace**: Configuración optimizada para producción
- **Cuándo usar**: Despliegue en servidor de producción
- **Comando**: `docker-compose -f docker-compose.prod.yml up -d`
- **Características**:
  - SSL configurado
  - Optimizaciones de seguridad
  - Health checks mejorados
  - Límites de recursos

#### **.env**

- **Qué hace**: Variables de entorno actuales
- **Cuándo usar**: Configuración activa del sistema
- **Importante**: ⚠️ NO commitear con claves reales

#### **entrypoint.sh**

- **Qué hace**: Script de inicialización del backend Django (CENTRALIZADO)
- **Ubicación**: `docker/entrypoint.sh` (movido desde backend/)
- **Cuándo usar**: Automático al iniciar contenedor backend
- **Características**:
  - Verifica conexión DB con health checks
  - Ejecuta migraciones modulares automáticamente
  - Valida las 6 apps modulares
  - Carga datos iniciales si es necesario
  - Configura procedimientos almacenados
  - Health checks mejorados

#### **backend/Dockerfile**

- **Qué hace**: Imagen Docker para desarrollo
- **Cuándo usar**: Desarrollo local diario
- **Características**:
  - Optimizado para reconstrucción rápida
  - Health check integrado
  - Soporte para hot-reload
  - Limpieza automática de migraciones

#### **backend/Dockerfile.prod**

- **Qué hace**: Imagen Docker optimizada para producción
- **Cuándo usar**: Despliegue en servidor
- **Características**:
  - Multi-stage build para menor tamaño
  - Usuario no-root para seguridad
  - Configuración Gunicorn optimizada
  - Health checks de producción

#### **docker_health_check.sh**

- **Qué hace**: Verificación completa del sistema
- **Cuándo usar**: Diagnóstico de problemas
- **Comando**: `./docker_health_check.sh`

#### **mariadb-init.sh**

- **Qué hace**: Inicializa base de datos MariaDB
- **Cuándo usar**: Automático en primer arranque de DB

#### **nginx/nginx.dev.conf y nginx.prod.conf**

- **Qué hace**: Configuración proxy inverso
- **Cuándo usar**: Automático según entorno

### 📋 TEMPLATES DE CONFIGURACIÓN

#### **.env.development.template**

- **Qué hace**: Plantilla para variables de desarrollo
- **Cuándo usar**: Configurar nuevo entorno de desarrollo
- **Comando**: `Copy-Item .env.development.template .env`

#### **.env.production.template**

- **Qué hace**: Plantilla para variables de producción
- **Cuándo usar**: Configurar servidor de producción
- **Comando**: `Copy-Item .env.production.template .env`

## 🔧 FLUJOS DE TRABAJO

### 💻 Desarrollo Diario

```powershell
# 1. Navegar al directorio
cd "C:\Users\Work\Documents\GitHub\Movility-for-you\docker"

# 2. Ejecutar script principal
.\docker_operations.ps1

# 3. Seleccionar opción 1 (Iniciar desarrollo)
# 4. Acceder a:
#    - Frontend: http://localhost:3000
#    - Backend: http://localhost:8000
#    - Nginx: http://localhost
```

### 🌟 Primera Configuración

```powershell
# 1. Copiar template de configuración
Copy-Item .env.development.template .env

# 2. Editar .env con tus claves reales
notepad .env

# 3. Iniciar por primera vez
.\docker_operations.ps1
```

### 🚀 Despliegue Producción

```powershell
# 1. Copiar template de producción
Copy-Item .env.production.template .env

# 2. Configurar variables reales de producción
# 3. Ejecutar script
.\docker_operations.ps1

# 4. Seleccionar opción 2 (Iniciar producción)
```

### 🔍 Debugging

```powershell
# Ver logs en tiempo real
docker-compose logs -f backend

# Shell del backend
docker-compose exec backend python manage.py shell

# Verificar salud
.\docker_operations.ps1  # Opción 8

# Estado detallado
.\docker_operations.ps1  # Opción 12
```

## ⚠️ NOTAS IMPORTANTES

1. **PowerShell vs Bash**: Usa `docker_operations.ps1` para PowerShell, `docker_daily_operations.sh` para Bash
2. **Separador de comandos**: PowerShell usa `;` en lugar de `&&`
3. **Variables de entorno**: Siempre verifica que `.env` tenga las claves correctas
4. **Arquitectura modular**: Backend tiene 6 apps: usuarios, vehiculos, reservas, politicas, facturas_contratos, comunicacion
5. **Redis**: Necesario para caché y sesiones
6. **SSL**: Solo en producción, configurar certificados en `nginx/ssl/`

## 🆘 SOLUCIÓN DE PROBLEMAS

### Backend no inicia

```powershell
# Ver logs específicos
docker-compose logs backend

# Reconstruir imagen
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Base de datos no conecta

```powershell
# Verificar estado DB
docker-compose ps db

# Logs de base de datos
docker-compose logs db

# Conectar manualmente
docker-compose exec db mysql -u mobility -p mobility4you
```

### Frontend no carga

```powershell
# Verificar puertos
netstat -an | findstr ":3000"

# Reconstruir frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

## 📞 CONTACTO Y SOPORTE

Para problemas específicos, revisa:

1. Logs del contenedor problemático
2. Estado de red `mobility4you_network`
3. Espacio en disco y memoria
4. Variables de entorno en `.env`
