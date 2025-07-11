# 🚀 Guía de Despliegue en Render - Mobility4You

## 📋 Preparación Previa

### 1. Configurar Backblaze B2

1. **Crear cuenta en Backblaze B2**
2. **Crear un bucket** para almacenar archivos media
3. **Obtener credenciales:**
   - Application Key ID
   - Application Key
   - Bucket Name
   - S3 Endpoint (ej: `s3.us-west-004.backblazeb2.com`)

### 2. Preparar Variables de Entorno

Copia el archivo `.env.render` y configura todas las variables necesarias.

## 🔧 Configuración en Render

### **PASO 1: Backend (Web Service)**

1. **Crear nuevo Web Service**

   - Repository: Tu repositorio de GitHub
   - Branch: `main` o `ouael-dev`
   - Root Directory: `backend`

2. **Configuración del Build:**

   - Build Command: `./build.sh`
   - Start Command: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 4`

3. **Variables de Entorno:**

   ```bash
   DJANGO_ENV=production
   SECRET_KEY=tu-clave-secreta-super-segura
   DEBUG=False

   # Database (Render proporciona automáticamente)
   # DATABASE_URL se configura automáticamente

   # Frontend URL
   FRONTEND_URL=https://tu-frontend.onrender.com

   # Backblaze B2
   USE_S3=TRUE
   B2_APPLICATION_KEY_ID=tu-key-id
   B2_APPLICATION_KEY=tu-application-key
   B2_BUCKET_NAME=tu-bucket-name
   B2_S3_ENDPOINT=s3.us-west-004.backblazeb2.com

   # Stripe
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Email
   EMAIL_HOST_USER=tu-email@gmail.com
   EMAIL_HOST_PASSWORD=tu-app-password

   # Brevo
   BREVO_API_KEY=tu-brevo-api-key
   BREVO_EMAIL=tu-sender-email

   # Superuser (opcional)
   CREATE_SUPERUSER=True
   DJANGO_SUPERUSER_PASSWORD=tu-password-admin
   ```

4. **Configurar Base de Datos:**
   - Crear PostgreSQL Database en Render
   - La variable `DATABASE_URL` se configura automáticamente

### **PASO 2: Frontend (Static Site)**

1. **Crear nuevo Static Site**

   - Repository: Tu repositorio de GitHub
   - Branch: `main` o `ouael-dev`
   - Root Directory: `frontend`

2. **Configuración del Build:**

   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

3. **Variables de Entorno:**
   ```bash
   NODE_ENV=production
   REACT_APP_BACKEND_URL=https://tu-backend.onrender.com
   REACT_APP_API_URL=https://tu-backend.onrender.com/api
   REACT_APP_FRONTEND_URL=https://tu-frontend.onrender.com
   REACT_APP_MEDIA_BASE_URL=https://s3.us-west-004.backblazeb2.com/tu-bucket/media/
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
   GENERATE_SOURCEMAP=false
   ```

### **PASO 3: Configuración de Dominios Personalizados (Opcional)**

1. **Backend:**

   - Agregar dominio personalizado: `api.tudominio.com`
   - Configurar DNS CNAME apuntando a tu servicio de Render

2. **Frontend:**
   - Agregar dominio personalizado: `tudominio.com`
   - Configurar DNS CNAME apuntando a tu static site de Render

## ✅ Verificación del Despliegue

### 1. **Backend Health Check**

```bash
curl https://tu-backend.onrender.com/health/
# Debería retornar: {"status": "healthy", "service": "mobility4you-backend"}
```

### 2. **Frontend Access**

- Visita: `https://tu-frontend.onrender.com`
- Verifica que la página carga correctamente
- Verifica que las imágenes se cargan desde Backblaze B2

### 3. **Admin Panel**

- Visita: `https://tu-backend.onrender.com/admin/`
- Login con las credenciales del superuser
- Verifica que los archivos estáticos se cargan correctamente

### 4. **API Endpoints**

```bash
# Verificar API de vehículos
curl https://tu-backend.onrender.com/api/vehiculos/vehiculos/

# Verificar API de lugares
curl https://tu-backend.onrender.com/api/lugares/lugares/
```

## 🔍 Solución de Problemas

### **Error: Build Failed**

1. Verificar que todas las dependencias están en `requirements.txt`
2. Verificar que `build.sh` tiene permisos de ejecución
3. Revisar logs de build en Render

### **Error: Database Connection**

1. Verificar que la base de datos PostgreSQL está creada
2. Verificar que `DATABASE_URL` está configurada automáticamente
3. Verificar migraciones en los logs

### **Error: Static Files 404**

1. Verificar configuración de Backblaze B2
2. Verificar que `USE_S3=TRUE`
3. Verificar credenciales de B2

### **Error: CORS**

1. Verificar que `FRONTEND_URL` está configurada correctamente
2. Verificar que `CORS_ALLOWED_ORIGINS` incluye la URL del frontend
3. Verificar que `CSRF_TRUSTED_ORIGINS` está configurada

## 📊 Monitoreo y Mantenimiento

### **Logs de Aplicación**

- Backend: Panel de Render > Tu servicio > Logs
- Frontend: Panel de Render > Tu static site > Logs

### **Backups de Base de Datos**

- Configurar backups automáticos en Render
- Exportar datos periódicamente

### **Actualizaciones**

- Las actualizaciones se despliegan automáticamente al hacer push a la branch configurada
- Verificar que los builds se completan exitosamente

## 🛡️ Seguridad

### **Variables de Entorno**

- Nunca hardcodear credenciales en el código
- Usar variables de entorno para toda información sensible
- Rotar claves periódicamente

### **HTTPS**

- Render proporciona HTTPS automáticamente
- Verificar que `SECURE_SSL_REDIRECT=True` en producción

### **Headers de Seguridad**

- HSTS está habilitado automáticamente
- CSP está configurado en el middleware
