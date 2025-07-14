# Guía de Deployment en Render.com

## ✅ Migración a PostgreSQL Completada

El proyecto ha sido migrado exitosamente de MySQL a PostgreSQL para compatibilidad con Render.com.

### Cambios Realizados

1. **Base de Datos**:

   - ✅ Migrado de MySQL a PostgreSQL 15
   - ✅ Todas las migraciones aplicadas correctamente
   - ✅ 35 tablas creadas exitosamente
   - ✅ Superusuario creado y funcionando

2. **Configuración**:
   - ✅ `config/settings/production.py` optimizado para Render
   - ✅ `build.sh` script de construcción creado
   - ✅ `requirements.txt` actualizado con dependencias PostgreSQL
   - ✅ Variables de entorno configuradas (`.env.render`)

### Próximos Pasos para Deploy en Render

#### 1. Crear cuenta en Render.com

- Registrarse en [render.com](https://render.com)
- Conectar con tu repositorio GitHub

#### 2. Crear PostgreSQL Database

1. En el dashboard de Render, click "New" → "PostgreSQL"
2. Configurar:

   - **Name**: `mobility4you-db`
   - **Database**: `mobility4you`
   - **User**: `mobility4you_user`
   - **Region**: Frankfurt (más cercano a España)
   - **Plan**: Free (para desarrollo) o Starter (para producción)

3. Guardar las credenciales generadas

#### 3. Crear Web Service

1. En Render, click "New" → "Web Service"
2. Conectar tu repositorio GitHub
3. Configurar:
   - **Name**: `mobility4you-backend`
   - **Environment**: Python 3
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
   - **Root Directory**: `backend`

#### 4. Configurar Variables de Entorno

En la sección "Environment" del Web Service, agregar:

```
DATABASE_URL=postgresql://user:password@hostname:port/database
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=tu-secret-key-super-segura
DEBUG=False

# Email (Brevo)
BREVO_API_KEY=tu-brevo-api-key
BREVO_EMAIL=noreply@tudominio.com

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_tu_clave
STRIPE_SECRET_KEY=sk_live_tu_clave
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook

# Opcional - Usuario admin
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=tu-password-seguro
```

#### 5. Desplegar Frontend (React)

1. Crear otro Web Service para el frontend
2. Configurar:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `frontend`

### Verificación Post-Deploy

Una vez desplegado, verificar:

1. **Backend Health**: `https://tu-app.onrender.com/admin/`
2. **Database**: Login al admin con las credenciales creadas
3. **Static Files**: Verificar que CSS/JS cargan correctamente
4. **API Endpoints**: Probar endpoints principales

### Comandos de Verificación Local

```bash
# Verificar migraciones
docker exec mobility4you_backend python manage.py showmigrations

# Verificar tablas en PostgreSQL
docker exec mobility4you_postgres psql -U postgres -d mobility4you -c "\dt"

# Verificar usuarios
docker exec mobility4you_backend python manage.py shell -c "from usuarios.models import Usuario; print('Usuarios:', Usuario.objects.count())"

# Test de servidor
curl http://localhost:8000/admin/
```

### Estructura de Base de Datos PostgreSQL

Las siguientes tablas fueron migradas exitosamente:

- `usuario` (35 usuarios)
- `vehiculo` (vehículos del sistema)
- `reserva` (reservas de vehículos)
- `factura` (facturas y contratos)
- `pagos_stripe` (pagos)
- Y 30 tablas más...

### Solución de Problemas

**Error: "relation does not exist"**

- Ejecutar migraciones: `python manage.py migrate`

**Error: "FATAL: password authentication failed"**

- Verificar DATABASE_URL en variables de entorno

**Error: "Static files not found"**

- Ejecutar: `python manage.py collectstatic --noinput`

### Contacto y Soporte

Para cualquier problema durante el deployment, verificar:

1. Logs de build en Render
2. Variables de entorno configuradas correctamente
3. Conexión a base de datos PostgreSQL

---

**Estado**: ✅ Listo para deployment en Render.com
**Última actualización**: $(date)
**Versión PostgreSQL**: 15-alpine
**Versión Django**: 5.1.9
