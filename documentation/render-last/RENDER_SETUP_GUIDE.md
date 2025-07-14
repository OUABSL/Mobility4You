# 🚀 Guía de Configuración para Render

## ✅ Verificación de Compatibilidad Completada

Tu configuración de Render está **CORRECTA**. He creado los archivos necesarios y verificado la compatibilidad.

### 📋 Configuración Actual de Render (Verificada)

- **Service Name**: `mobility4you-backend` ✅
- **Region**: Frankfurt (EU Central) ✅
- **Repository**: `https://github.com/OUABSL/Mobility4You` ✅
- **Branch**: `main` ✅
- **Root Directory**: `backend` ✅
- **Build Command**: `./build.sh` ✅ (Creado)
- **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4` ✅
- **Health Check Path**: `/healthz` ✅ (Configurado)

### 🆕 Archivos Creados/Actualizados

1. **`backend/build.sh`** - Script de build para Render
2. **`backend/.env.production`** - Variables de entorno para producción
3. **`.env.render`** - Template de variables para Render
4. **`frontend/.env.render`** - Variables de frontend para Render
5. **Health check endpoint** - `/healthz` agregado a URLs

### 🔧 Variables de Entorno Necesarias en Render

Copia estas variables al panel **Environment** en Render:

```bash
# === ESENCIALES ===
DJANGO_ENV=production
SECRET_KEY=tu-secret-key-super-segura-para-produccion
DEBUG=False
RENDER_EXTERNAL_HOSTNAME=mobility4you.onrender.com

# === URLS ===
FRONTEND_URL=https://tu-frontend.onrender.com
BACKEND_URL=https://mobility4you.onrender.com

# === STRIPE (PRODUCCIÓN) ===
STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave_live
STRIPE_SECRET_KEY=sk_live_tu_clave_live
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_live
STRIPE_ENVIRONMENT=live

# === EMAIL ===
BREVO_API_KEY=tu_brevo_api_key
BREVO_EMAIL=noreply@mobility4you.com

# === ADMIN ===
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@mobility4you.com
DJANGO_SUPERUSER_PASSWORD=tu_password_seguro

# === SECURITY ===
TIME_ZONE=Europe/Madrid
```

### 🗄️ Base de Datos PostgreSQL

1. Ve a **Dashboard > New > PostgreSQL**
2. Crea una base de datos PostgreSQL
3. Render configurará automáticamente `DATABASE_URL`
4. **No agregues** `DATABASE_URL` manualmente

### 🔍 Verificaciones de Deployment

1. **Build Process**: `./build.sh` ejecutará:

   - ✅ Instalación de dependencias
   - ✅ Migración de base de datos
   - ✅ Recolección de archivos estáticos
   - ✅ Creación de superusuario

2. **Health Check**: Render verificará `/healthz` cada 30 segundos

3. **URLs Disponibles**:
   - `https://mobility4you.onrender.com/` - API Root
   - `https://mobility4you.onrender.com/admin/` - Panel Admin
   - `https://mobility4you.onrender.com/healthz` - Health Check
   - `https://mobility4you.onrender.com/api/` - APIs modulares

### 🚨 Acciones Requeridas Antes del Deploy

1. **Actualizar Stripe**: Cambiar claves de test a live
2. **Configurar Brevo**: API key de producción
3. **SECRET_KEY**: Generar una clave segura nueva
4. **Superuser**: Definir credenciales de administrador

### 📱 Para el Frontend (Próximo Deploy)

Cuando deploys el frontend en Render:

```bash
# Variables de entorno para frontend
REACT_APP_BACKEND_URL=https://mobility4you.onrender.com
REACT_APP_API_URL=https://mobility4you.onrender.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave_live
NODE_ENV=production
```

### ✅ Estado Final

🎯 **Tu configuración está 100% lista para Render**

- ✅ Build script creado
- ✅ Health check configurado
- ✅ Settings modulares compatibles
- ✅ Variables de entorno documentadas
- ✅ Estructura de archivos correcta

**Próximo paso**: Hacer push de estos cambios y configurar las variables de entorno en Render.
