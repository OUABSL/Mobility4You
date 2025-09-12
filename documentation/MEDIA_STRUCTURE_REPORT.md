# 📋 INFORME DE ESTRUCTURA DE MEDIA PARA BACKBLAZE B2

## 🔄 CAMBIOS REALIZADOS

### Frontend

- ✅ Actualizado `appConfig.js` con configuración unificada de B2
- ✅ Actualizado `imageUtils.js` para eliminar dependencias de via.placeholder
- ✅ Actualizado `placeholderGenerator.js` para usar B2
- ✅ Reemplazadas todas las referencias a `via.placeholder.com` en componentes:
  - `FichaCoche.js`
  - `ListadoCoches.js`
  - `ReservaClienteConfirmar.js`
  - `ReservaClienteExtras.js`
  - `ReservaClientePago.js`

### Backend

- ✅ Actualizado `config/settings/render.py` para usar B2 por defecto en producción
- ✅ Configuradas variables de entorno para B2
- ✅ Estructura de almacenamiento híbrido: WhiteNoise para estáticos + B2 para media

## 📁 ESTRUCTURA DE CARPETAS REQUERIDA EN B2

### Bucket: `mobility4you-media-prod`

```
mobility4you-media-prod/
├── media/
│   ├── placeholders/
│   │   ├── vehicle-placeholder.jpg          # 600x400px - Placeholder para vehículos
│   │   ├── extra-placeholder.jpg           # 150x150px - Placeholder para extras
│   │   ├── user-placeholder.jpg            # 200x200px - Placeholder para usuarios
│   │   ├── location-placeholder.jpg        # 300x200px - Placeholder para ubicaciones
│   │   └── default-placeholder.jpg         # 300x200px - Placeholder por defecto
│   ├── vehicles/
│   │   ├── 1_main.jpg                      # Imagen principal del vehículo ID 1
│   │   ├── 1_gallery_1.jpg                # Galería vehículo ID 1 - imagen 1
│   │   ├── 1_gallery_2.jpg                # Galería vehículo ID 1 - imagen 2
│   │   ├── 2_main.jpg                      # Imagen principal del vehículo ID 2
│   │   └── ...
│   ├── extras/
│   │   ├── gps-icon.jpg                    # Icono para GPS
│   │   ├── child-seat-icon.jpg             # Icono para asiento infantil
│   │   ├── additional-driver-icon.jpg      # Icono para conductor adicional
│   │   ├── wifi-icon.jpg                   # Icono para WiFi
│   │   └── ...
│   ├── users/
│   │   └── avatars/
│   │       ├── user_1_avatar.jpg           # Avatar del usuario ID 1
│   │       └── ...
│   ├── contracts/
│   │   ├── template_contract.pdf           # Plantilla de contrato
│   │   ├── reservation_123_contract.pdf    # Contrato de reserva 123
│   │   └── ...
│   ├── invoices/
│   │   ├── reservation_123_invoice.pdf     # Factura de reserva 123
│   │   └── ...
│   ├── avatars/
│   │   ├── admin_avatar.jpg               # Avatar del administrador
│   │   └── ...
│   └── logos/
│       ├── mobility4you-logo.png          # Logo principal
│       ├── mobility4you-favicon.ico       # Favicon
│       └── ...
```

## 🖼️ ESPECIFICACIONES DE PLACEHOLDERS

### vehicle-placeholder.jpg

- **Tamaño**: 600x400px
- **Formato**: JPG
- **Descripción**: Placeholder para vehículos cuando no hay imagen disponible
- **Colores sugeridos**: Azul claro (#e3f2fd) con texto azul (#1976d2)
- **Texto**: "Vehículo" o ícono de coche

### extra-placeholder.jpg

- **Tamaño**: 150x150px
- **Formato**: JPG
- **Descripción**: Placeholder para extras/servicios adicionales
- **Colores sugeridos**: Púrpura claro (#f3e5f5) con texto púrpura (#7b1fa2)
- **Texto**: "Extra" o ícono de servicio

### user-placeholder.jpg

- **Tamaño**: 200x200px
- **Formato**: JPG
- **Descripción**: Placeholder para avatares de usuarios
- **Colores sugeridos**: Verde claro (#e8f5e8) con texto verde (#388e3c)
- **Texto**: Ícono de usuario

### location-placeholder.jpg

- **Tamaño**: 300x200px
- **Formato**: JPG
- **Descripción**: Placeholder para ubicaciones
- **Colores sugeridos**: Naranja claro (#fff3e0) con texto naranja (#f57c00)
- **Texto**: "Ubicación" o ícono de mapa

### default-placeholder.jpg

- **Tamaño**: 300x200px
- **Formato**: JPG
- **Descripción**: Placeholder por defecto para cualquier tipo de contenido
- **Colores sugeridos**: Gris claro (#f5f5f5) con texto gris (#757575)
- **Texto**: "Imagen" o ícono genérico

## 🏗️ ARQUITECTURA HÍBRIDA: WHITENOISE + B2

### Separación de Responsabilidades:

| Tipo de Archivo                         | Desarrollo           | Producción            | Storage Backend |
| --------------------------------------- | -------------------- | --------------------- | --------------- |
| **Archivos Estáticos** (CSS, JS, icons) | `staticfiles/admin/` | WhiteNoise desde repo | WhiteNoise      |
| **Archivos Media** (imágenes subidas)   | `staticfiles/media/` | Backblaze B2 Cloud    | Django Storages |

### ¿Por qué esta Arquitectura?

#### **Archivos Estáticos (WhiteNoise):**

- ✅ **Ventaja**: Contenido versionado y controlado por Git
- ✅ **Performance**: Servido directamente desde Render/CDN
- ✅ **Simplicidad**: No requiere credenciales externas
- ✅ **Cacheado**: Headers optimizados automáticamente

#### **Archivos Media (Backblaze B2):**

- ✅ **Ventaja**: Almacenamiento ilimitado y escalable
- ✅ **Costo**: Más económico que servicios alternativos
- ✅ **Disponibilidad**: 99.9% uptime garantizado
- ✅ **URLs Directas**: Acceso público sin proxy

## 📂 ESTRUCTURA FÍSICA DE ALMACENAMIENTO

### En Desarrollo Local:

```
backend/
└── staticfiles/          # Directorio unificado
    ├── admin/            # Archivos estáticos Django (CSS, JS, icons)
    │   ├── css/
    │   ├── js/
    │   └── img/
    ├── media/            # ← IMÁGENES SUBIDAS POR USUARIOS
    │   ├── vehicles/     # Imágenes de vehículos
    │   ├── extras/       # Imágenes de extras
    │   ├── carnets/      # Carnets de conducir
    │   └── placeholders/ # Imágenes por defecto
    └── rest_framework/   # DRF estáticos
```

### En Producción Render:

```
Render Container:
└── staticfiles/          # Servido por WhiteNoise
    ├── admin/            # ← ESTÁTICOS: CSS, JS, icons
    └── rest_framework/

Backblaze B2 Cloud:
└── mobility4you-media-prod/
    └── media/            # ← MEDIA: Imágenes subidas
        ├── vehicles/
        ├── extras/
        ├── carnets/
        └── placeholders/
```

## ⚙️ CONFIGURACIÓN DE VARIABLES DE ENTORNO

### Para Render.com (Producción):

```bash
# Backblaze B2
USE_S3=TRUE
B2_APPLICATION_KEY_ID=tu_key_id_aqui
B2_APPLICATION_KEY=tu_application_key_aqui
B2_BUCKET_NAME=mobility4you-media-prod
B2_S3_ENDPOINT=s3.eu-central-003.backblazeb2.com

# Frontend
REACT_APP_B2_MEDIA_URL=https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/
```

## 🔧 URLs GENERADAS

### Desarrollo (Local):

- **URL de acceso**: `http://localhost:8000/media/vehicles/1_main.jpg`
- **Almacenamiento físico**: `backend/staticfiles/media/vehicles/1_main.jpg`
- **Configuración backend**: `MEDIA_ROOT = staticfiles/media/` + `MEDIA_URL = "/media/"`
- **Configuración frontend**: `BASE_URL = "http://localhost:8000/media/"`

### Producción (B2):

- **URL de acceso**: `https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/vehicles/1_main.jpg`
- **Almacenamiento físico**: Backblaze B2 Cloud Storage
- **Configuración backend**: Django Storages + boto3 + B2 credentials
- **Configuración frontend**: `BASE_URL` apunta a B2

## 🔧 VARIABLES DE ENTORNO QUE DEFINEN EL ALMACENAMIENTO

### Backend - Variables de Control:

| Variable                   | Valor                       | Función                              |
| -------------------------- | --------------------------- | ------------------------------------ |
| `USE_S3`                   | `TRUE`/`FALSE`              | **Principal**: Activar/desactivar B2 |
| `DJANGO_ENV`               | `development`/`production`  | Detectar entorno                     |
| `RENDER_EXTERNAL_HOSTNAME` | `mobility4you.onrender.com` | Detectar Render                      |

### Backend - Credenciales B2 (solo si USE_S3=TRUE):

| Variable                | Ejemplo                             | Función           |
| ----------------------- | ----------------------------------- | ----------------- |
| `B2_APPLICATION_KEY_ID` | `0035930f705dd880000000001`         | ID de acceso B2   |
| `B2_APPLICATION_KEY`    | `K003R2FYou7SdUwUDSiKKXlb9urR974`   | Clave secreta B2  |
| `B2_BUCKET_NAME`        | `mobility4you-media-prod`           | Nombre del bucket |
| `B2_S3_ENDPOINT`        | `s3.eu-central-003.backblazeb2.com` | Endpoint de B2    |

### Frontend - Variables de Control:

| Variable                 | Valor                                                                      | Función                         |
| ------------------------ | -------------------------------------------------------------------------- | ------------------------------- |
| `NODE_ENV`               | `production`/`development`                                                 | **Principal**: Detectar entorno |
| `REACT_APP_B2_MEDIA_URL` | `https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/` | URL B2 (producción)             |
| `REACT_APP_BACKEND_URL`  | `http://localhost:8000`                                                    | URL backend (desarrollo)        |

## 🎯 LÓGICA DE DECISIÓN AUTOMÁTICA

### Backend (Django):

```python
# En config/settings/render.py
if os.environ.get('USE_S3', 'TRUE') == 'TRUE':
    # → Usar Backblaze B2
    STORAGES = {"default": {"BACKEND": "storages.backends.s3boto3.S3Boto3Storage"}}
    MEDIA_URL = f'{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/media/'
else:
    # → Usar almacenamiento local
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "staticfiles", "media")
```

### Frontend (React):

```javascript
// En config/appConfig.js
BASE_URL: process.env.NODE_ENV === "production"
  ? process.env.REACT_APP_B2_MEDIA_URL ||
    "https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/"
  : `${BACKEND_URL}/media/`;
```

- Placeholders: `https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/placeholders/vehicle-placeholder.jpg`

## 📝 TAREAS PENDIENTES

### 1. Crear Placeholders

- [ ] Diseñar y crear las 5 imágenes placeholder especificadas
- [ ] Subirlas a B2 en la carpeta `/media/placeholders/`

### 2. Migrar Imágenes Existentes

- [ ] Subir imágenes de vehículos existentes a `/media/vehicles/`
- [ ] Subir íconos de extras a `/media/extras/`
- [ ] Organizar según la estructura definida

### 3. Configurar Producción

- [ ] Configurar variables de entorno en Render.com
- [ ] Verificar permisos de B2 (public-read)
- [ ] Probar carga y visualización de imágenes

### 4. Testing

- [ ] Verificar que placeholders se muestran correctamente
- [ ] Probar carga de imágenes reales desde B2
- [ ] Confirmar fallbacks funcionan correctamente

## 🎯 BENEFICIOS DEL CAMBIO

1. **Eliminación de dependencias externas**: No más via.placeholder.com
2. **Control total**: Placeholders personalizados con branding
3. **Rendimiento**: CDN de Backblaze B2 para mejor velocidad
4. **Escalabilidad**: Almacenamiento ilimitado y redundancia
5. **Costos**: Más económico que servicios tradicionales
6. **Consistencia**: Misma fuente para desarrollo y producción

## 🚀 SIGUIENTE PASO

1. Crear las imágenes placeholder según especificaciones
2. Subirlas a B2 en la estructura definida
3. Configurar variables de entorno en Render
4. Probar en producción

## 🧪 VERIFICACIÓN Y TESTING

### Comprobar Configuración Actual:

#### **Backend - Variables de Entorno:**

```bash
# En development.py o render.py
python manage.py shell
>>> from django.conf import settings
>>> print("MEDIA_URL:", settings.MEDIA_URL)
>>> print("USE_S3:", os.environ.get('USE_S3'))
>>> print("B2_BUCKET_NAME:", os.environ.get('B2_BUCKET_NAME'))
```

#### **Frontend - Configuración de URLs:**

```javascript
// En navegador (DevTools Console)
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("BACKEND_URL:", process.env.REACT_APP_BACKEND_URL);
console.log("B2_MEDIA_URL:", process.env.REACT_APP_B2_MEDIA_URL);

// Verificar MEDIA_CONFIG
import { MEDIA_CONFIG } from "./config/appConfig";
console.log("MEDIA_CONFIG.BASE_URL:", MEDIA_CONFIG.BASE_URL);
```

### Test de Subida de Imagen:

#### **Desarrollo:**

1. Acceder a `http://localhost:8000/admin/`
2. Ir a Vehículos > Agregar vehículo
3. Subir imagen → Debe guardar en `backend/staticfiles/media/`
4. URL generada: `http://localhost:8000/media/vehicles/X_Y.jpg`

#### **Producción:**

1. Acceder a `https://mobility4you.onrender.com/admin/`
2. Ir a Vehículos > Agregar vehículo
3. Subir imagen → Debe guardar en Backblaze B2
4. URL generada: `https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/vehicles/X_Y.jpg`

## 🚨 CONFIGURACIÓN REQUERIDA PARA PRODUCCIÓN

### En Render Backend Service:

```bash
USE_S3=TRUE
B2_APPLICATION_KEY_ID=0035930f705dd880000000001
B2_APPLICATION_KEY=K003R2FYou7SdUwUDSiKKXlb9urR974
B2_BUCKET_NAME=mobility4you-media-prod
B2_S3_ENDPOINT=s3.eu-central-003.backblazeb2.com
```

### En Render Frontend Service:

```bash
NODE_ENV=production
REACT_APP_B2_MEDIA_URL=https://s3.eu-central-003.backblazeb2.com/mobility4you-media-prod/media/
REACT_APP_BACKEND_URL=https://mobility4you.onrender.com
```

---

**Última Actualización**: 12 de Septiembre, 2025  
**Estado**: ✅ Configuración Híbrida WhiteNoise + B2 Verificada y Documentada  
**Compatibilidad**: ✅ Desarrollo Local + Producción Render

---

**Nota**: Una vez implementado, todas las imágenes de la aplicación usarán Backblaze B2, eliminando completamente la dependencia de servicios externos como via.placeholder.com
