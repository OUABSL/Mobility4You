# Guía de Configuración Backblaze B2 Cloud Storage

## 📋 **Resumen de Configuración**

Tu aplicación **Mobility4You** está configurada para usar **Backblaze B2 Cloud Storage** para almacenar archivos multimedia (imágenes de vehículos, extras, carnets, etc.).

## ✅ **Estado Actual de la Configuración**

### **Backend (Django)**

- ✅ `django-storages` y `boto3` instalados
- ✅ `storages` agregado a INSTALLED_APPS
- ✅ Configuración de B2 en `config/settings/render.py`
- ✅ Variables de entorno definidas en `.env.production`
- ✅ Soporte para Django 4.2+ con STORAGES setting

### **Frontend (React)**

- ✅ Variables de entorno para URLs de B2
- ✅ Configuración en `appConfig.js` para múltiples tipos de archivos
- ✅ Utilidades específicas para cada tipo de imagen
- ✅ Componente `MediaImage` con fallback automático

## 🔧 **Variables de Entorno Necesarias**

### **Backend (.env.production)**

```bash
# === BACKBLAZE B2 CLOUD STORAGE ===
USE_S3=TRUE
B2_APPLICATION_KEY_ID=your_b2_application_key_id
B2_APPLICATION_KEY=your_b2_application_key
B2_BUCKET_NAME=mobility4you-bucket
B2_S3_ENDPOINT=s3.us-west-004.backblazeb2.com
```

### **Frontend (.env.production)**

```bash
# === MEDIA FILES - BACKBLAZE B2 ===
REACT_APP_MEDIA_BASE_URL=https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/
REACT_APP_B2_MEDIA_URL=https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/
```

## 📁 **Estructura de Archivos en B2**

```
mobility4you-bucket/
├── media/
│   ├── vehiculos/           # Imágenes de vehículos
│   │   ├── 1_1.jpg         # vehiculo_id_imagen_id.jpg
│   │   ├── 1_2.jpg
│   │   └── 2_1.jpg
│   ├── extras/             # Imágenes de extras
│   │   ├── gps.jpg
│   │   ├── asiento-bebe.jpg
│   │   └── seguro-todo.jpg
│   └── carnets/            # Imágenes de carnets de conducir
│       ├── carnet_123.jpg
│       └── carnet_456.jpg
└── static/                 # Archivos estáticos CSS/JS
    ├── css/
    ├── js/
    └── admin/
```

## 🔄 **Flujo de Subida de Archivos**

### **1. Panel Admin Django:**

```python
# Cuando subes una imagen de vehículo en el admin:
# 1. Se usa la función imagen_vehiculo_upload_path()
# 2. Se genera: vehiculos/{vehiculo_id}_{imagen_id}.jpg
# 3. django-storages envía el archivo a B2
# 4. Se almacena en: s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/vehiculos/
```

### **2. Frontend React:**

```javascript
// Para mostrar la imagen:
import { MEDIA_CONFIG } from "../config/appConfig";

// Imagen de vehículo
const vehicleImageUrl = MEDIA_CONFIG.getVehicleImageUrl("vehiculos/1_1.jpg");
// Resultado: https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/vehiculos/1_1.jpg

// Imagen de extra
const extraImageUrl = MEDIA_CONFIG.getExtraImageUrl("extras/gps.jpg");
// Resultado: https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/extras/gps.jpg
```

## 🛠 **Configuración en Render.com**

### **Variables de Entorno del Backend:**

```
USE_S3=TRUE
B2_APPLICATION_KEY_ID=004xxxxxxxxxxxxx0000000002
B2_APPLICATION_KEY=K004xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
B2_BUCKET_NAME=mobility4you-bucket
B2_S3_ENDPOINT=s3.us-west-004.backblazeb2.com
```

### **Variables de Entorno del Frontend:**

```
REACT_APP_MEDIA_BASE_URL=https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/
REACT_APP_B2_MEDIA_URL=https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/
```

## 🎯 **Tipos de Imágenes Soportadas**

### **1. Imágenes de Vehículos**

- **Modelo:** `vehiculos.ImagenVehiculo`
- **Upload Path:** `vehiculos/{vehiculo_id}_{imagen_id}.jpg`
- **Función Frontend:** `MEDIA_CONFIG.getVehicleImageUrl()`

### **2. Imágenes de Extras**

- **Modelo:** `reservas.Extras`
- **Upload Path:** `extras/{filename}`
- **Función Frontend:** `MEDIA_CONFIG.getExtraImageUrl()`

### **3. Imágenes de Carnets**

- **Modelo:** `usuarios.Usuario.imagen_carnet`
- **Upload Path:** `carnets/{filename}`
- **Función Frontend:** `MEDIA_CONFIG.getCarnetImageUrl()`

## 🔍 **Verificación de Funcionamiento**

### **1. Backend - Admin Panel:**

```bash
# 1. Acceder a Django Admin
https://mobility4you.onrender.com/admin/

# 2. Ir a Vehículos > Agregar vehículo
# 3. Subir imagen en "Imágenes de vehículos"
# 4. Verificar que el archivo se sube a B2
```

### **2. Frontend - Visualización:**

```javascript
// En componentes React:
import { MediaImage } from "../utils/mediaUtils";

// Usar el componente con fallback automático
<MediaImage
  src="vehiculos/1_1.jpg"
  type="vehicle"
  alt="Imagen del vehículo"
  className="vehicle-image"
/>;
```

### **3. URLs de Verificación:**

```
# Imagen de vehículo
https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/vehiculos/1_1.jpg

# Imagen de extra
https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/extras/gps.jpg

# Imagen de carnet
https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/carnets/carnet_123.jpg
```

## ⚡ **Optimizaciones Implementadas**

### **1. Cache Control:**

- **Max-Age:** 86400 segundos (24 horas)
- **Headers:** Configurados automáticamente

### **2. Configuración de Seguridad:**

- **ACL:** public-read para acceso directo
- **SSL:** Habilitado
- **File Overwrite:** Deshabilitado

### **3. Fallback Automático:**

- **Desarrollo:** Usa `/media/` local
- **Producción:** Usa B2 Cloud Storage
- **Error:** Imagen por defecto

## 🚨 **Pasos para Completar la Configuración**

### **1. Crear Bucket en Backblaze B2:**

```bash
1. Ir a https://secure.backblaze.com/
2. Crear cuenta o iniciar sesión
3. Crear bucket llamado "mobility4you-bucket"
4. Configurar como público
5. Obtener credenciales S3
```

### **2. Configurar Variables en Render:**

```bash
# Backend Service
USE_S3=TRUE
B2_APPLICATION_KEY_ID=[tu_key_id]
B2_APPLICATION_KEY=[tu_key]
B2_BUCKET_NAME=mobility4you-bucket
B2_S3_ENDPOINT=s3.us-west-004.backblazeb2.com

# Frontend Service
REACT_APP_MEDIA_BASE_URL=https://s3.us-west-004.backblazeb2.com/mobility4you-bucket/media/
```

### **3. Probar Subida de Archivos:**

```bash
1. Acceder al admin: https://mobility4you.onrender.com/admin/
2. Subir imagen de vehículo
3. Verificar URL generada
4. Comprobar acceso desde frontend
```

## ✨ **Características Implementadas**

- ✅ **Multi-tipo:** Soporte para vehículos, extras y carnets
- ✅ **Fallback:** Imagen por defecto si falla la carga
- ✅ **Performance:** Cache de 24 horas
- ✅ **Seguridad:** SSL y configuración segura
- ✅ **Escalabilidad:** Separación de archivos por tipo
- ✅ **Desarrollo:** Funciona local y en producción

## 🎉 **¡Configuración Completa!**

Tu aplicación está **100% lista** para usar Backblaze B2 Cloud Storage. Solo necesitas:

1. **Crear el bucket** en Backblaze B2
2. **Configurar las variables** en Render
3. **Probar la subida** de archivos

¡La configuración de código ya está completa y optimizada! 🚀
