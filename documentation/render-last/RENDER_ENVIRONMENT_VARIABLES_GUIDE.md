# 🚀 CONFIGURACIÓN COMPLETA PARA RENDER.COM

## 🔧 **BACKEND ENVIRONMENT VARIABLES**

### Variables de entorno que debes configurar en el panel de Render para el **BACKEND**:

```bash
# === DJANGO CONFIGURATION ===
DJANGO_SETTINGS_MODULE=config.settings.render
DEBUG=False
SECRET_KEY=tu_secret_key_aqui

# === DATABASE ===
DATABASE_URL=postgresql://user:password@host:port/database
# (Esta se configura automáticamente si usas Render PostgreSQL)

# === FRONTEND URL (IMPORTANTE PARA CORS) ===
FRONTEND_URL=https://mobility4you-ydav.onrender.com

# === EMAIL CONFIGURATION ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_email@gmail.com
EMAIL_HOST_PASSWORD=tu_app_password

# === STRIPE ===
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === REDIS (OPCIONAL) ===
REDIS_URL=redis://localhost:6379/0

# === RENDER SPECIFIC ===
RENDER_EXTERNAL_HOSTNAME=mobility4you.onrender.com
```

---

## 🌐 **FRONTEND ENVIRONMENT VARIABLES**

### Variables de entorno que debes configurar en el panel de Render para el **FRONTEND**:

```bash
# === BASIC CONFIGURATION ===
NODE_ENV=production
GENERATE_SOURCEMAP=false

# === API URLS ===
REACT_APP_BACKEND_URL=https://mobility4you.onrender.com
REACT_APP_API_URL=https://mobility4you.onrender.com/api
REACT_APP_FRONTEND_URL=https://mobility4you-ydav.onrender.com

# === STRIPE ===
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51RU9X8IzmhVfLDlXZjXdeFtxx83YIFwTJjrGKEhnMBCTItLEkshgYrCepmrjHAcNO6rvzblYEPOrzUPeM0KIbPol00GOVuxqWU
REACT_APP_STRIPE_ENABLED=true

# === FEATURES ===
REACT_APP_DEBUG_MODE=false
REACT_APP_ENABLE_CONSOLE_LOGS=false
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_REPORTING=true
REACT_APP_SECURE_COOKIES=true
```

---

## 📋 **PASOS PARA CONFIGURAR EN RENDER**

### **🔹 Para el BACKEND:**

1. Ve a tu servicio backend en Render
2. Settings → Environment
3. Agrega las variables del bloque "BACKEND ENVIRONMENT VARIABLES"
4. **IMPORTANTE**: Asegúrate de que `FRONTEND_URL=https://mobility4you-ydav.onrender.com`

### **🔹 Para el FRONTEND:**

1. Ve a tu servicio frontend en Render
2. Settings → Environment
3. Agrega las variables del bloque "FRONTEND ENVIRONMENT VARIABLES"
4. **IMPORTANTE**: Asegúrate de que `REACT_APP_BACKEND_URL=https://mobility4you.onrender.com`

### **🔹 Después de configurar:**

1. Redeploy el backend (para que tome las nuevas variables CORS)
2. Redeploy el frontend (para que tome las nuevas URLs)
3. Verifica que no hay errores de CORS

---

## 🔍 **VERIFICACIÓN**

### Para verificar que CORS está funcionando:

1. Abre las Developer Tools en tu frontend
2. Ve a la pestaña Network
3. Busca requests a tu backend
4. Verifica que los headers incluyen:
   - `Access-Control-Allow-Origin: https://mobility4you-ydav.onrender.com`
   - `Access-Control-Allow-Credentials: true`

### Si sigues teniendo problemas:

1. Verifica que las URLs están exactamente correctas (sin trailing slashes extra)
2. Confirma que el backend se redeployó después de cambiar las variables de entorno
3. Revisa los logs del backend en Render para errores CORS

---

## ⚠️ **NOTAS IMPORTANTES**

1. **URLs exactas**: Las URLs deben coincidir exactamente entre frontend y backend
2. **Redeploy obligatorio**: Después de cambiar variables de entorno, siempre redeploy
3. **HTTPS obligatorio**: En producción siempre usar HTTPS
4. **Trailing slashes**: Evitar slashes extra al final de las URLs
