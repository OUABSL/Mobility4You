# 📋 GUÍA DEFINITIVA DE ARCHIVOS DE CONFIGURACIÓN

## ✅ ESTRUCTURA FINAL LIMPIA

### 🗂️ **ARCHIVOS .ENV (FINALES)**

#### **Backend (.env files)**

- **`backend/.env`** - **Desarrollo local**

  - Variables para desarrollo en local/Docker
  - PostgreSQL local, claves de test, debug habilitado
  - **Uso**: Desarrollo diario local

- **`backend/.env.production`** - **Producción/Render**
  - Variables para deployment en Render
  - PostgreSQL managed, claves LIVE, debug deshabilitado
  - **Uso**: Copiar estas variables al panel de Render Environment

#### **Frontend (.env files)**

- **`frontend/.env`** - **Desarrollo local**

  - URLs locales (localhost:8000, localhost:3000)
  - Claves de test de Stripe
  - **Uso**: Desarrollo diario local

- **`frontend/.env.production`** - **Producción general**

  - URLs de producción personalizadas
  - **Uso**: Deployment en servidores propios

- **`frontend/.env.render`** - **Producción específica Render**
  - URLs específicas de Render (.onrender.com)
  - Optimizado para deployment en Render
  - **Uso**: Variables específicas para Render frontend

### 🐳 **ARCHIVOS DOCKER Y DEPLOYMENT**

#### **Raíz del proyecto**

- **`docker-compose.render.yml`** - **Para testing Render localmente**

  - Simula el entorno de Render en local
  - Usa PostgreSQL 16 y configuración compatible
  - **Uso**: Testing antes de deploy a Render

- **`deploy.sh`** - **Script de deployment unificado**
  - Maneja dev/prod/build/stop/logs/status
  - **Uso**: `./deploy.sh dev|prod|build|stop|logs|status`

#### **Backend**

- **`backend/Dockerfile`** - **Desarrollo local**

  - Optimizado para desarrollo local con hot reload
  - **Uso**: Docker Compose desarrollo

- **`backend/Dockerfile.prod`** - **Producción local**

  - Multi-stage build optimizado para producción
  - **Uso**: Docker Compose producción local

- **`backend/Dockerfile.render`** - **Específico Render**

  - Optimizado específicamente para Render deployment
  - PostgreSQL, health checks, build optimizado
  - **Uso**: Solo para deployment en Render

- **`backend/entrypoint.sh`** - **Desarrollo/Producción local**

  - Entrypoint para contenedores Docker locales
  - Migraciones, static files, Gunicorn
  - **Uso**: Docker local dev/prod

- **`backend/entrypoint.render.sh`** - **Específico Render**

  - Entrypoint optimizado para Render
  - Variables mapping, PostgreSQL wait, superuser creation
  - **Uso**: Solo en Render deployment

- **`backend/build.sh`** - **Script build Render**

  - Ejecutado por Render durante deployment
  - Instala deps, migra, collect static
  - **Uso**: Render Build Command

- **`backend/database_procedures.sql`** - **Funciones PostgreSQL**
  - Funciones y triggers para PostgreSQL
  - **Uso**: Manual cuando se necesiten funciones específicas

## 🎯 **CUÁNDO SE USA CADA ARCHIVO**

### **Desarrollo Local**

```bash
# Usar estos archivos:
backend/.env
frontend/.env
docker/docker-compose.yml (desarrollo)
backend/Dockerfile
backend/entrypoint.sh
```

### **Testing Render Localmente**

```bash
# Usar estos archivos:
docker-compose.render.yml
backend/.env.production
frontend/.env.render
backend/Dockerfile.render
backend/entrypoint.render.sh
```

### **Deployment en Render**

```bash
# Render usa automáticamente:
backend/Dockerfile.render
backend/entrypoint.render.sh
backend/build.sh

# Variables copiadas de:
backend/.env.production → Render Environment Panel
frontend/.env.render → Render Frontend Environment Panel
```

### **Producción Local (Sin Render)**

```bash
# Usar estos archivos:
backend/.env.production
frontend/.env.production
docker/docker-compose.prod.yml
backend/Dockerfile.prod
```

## 🚀 **PRÓXIMOS PASOS PARA RENDER**

1. **Configurar Variables en Render**: Copiar de `backend/.env.production`
2. **PostgreSQL Database**: Crear en Render (DATABASE_URL se configura automáticamente)
3. **Deploy Backend**: Render usará automáticamente los archivos `.render`
4. **Deploy Frontend**: Usar variables de `frontend/.env.render`

## ❌ **ARCHIVOS ELIMINADOS (DUPLICADOS)**

- ~~`.env.render`~~ (raíz) - Duplicado innecesario
- ~~`backend/.env.postgres.render`~~ - Obsoleto
- ~~`frontend/.env.production.render`~~ - Duplicado
- ~~`backend/database_procedures_postgresql.sql`~~ - Copia exacta

## ✅ **ESTRUCTURA FINAL OPTIMIZADA**

```
proyecto/
├── .env files organizados por propósito específico
├── Docker files separados por entorno (local/render/prod)
├── Scripts de deployment unificados
└── Sin duplicados ni archivos obsoletos
```

**🎉 Configuración completamente limpia y organizada!**
