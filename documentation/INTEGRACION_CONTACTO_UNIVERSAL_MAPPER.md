# INTEGRACIÓN CONTACTO - UNIVERSAL DATA MAPPER

## 📋 RESUMEN DE CAMBIOS

Se ha integrado el sistema de contacto con el `universalDataMapper.js` para mejorar la consistencia, mantenibilidad y robustez del mapeo de datos entre frontend y backend.

## 🔄 CAMBIOS REALIZADOS

### 1. **UniversalDataMapper.js**

#### ✅ Esquema de Mapeo para Contacto

Se agregó el esquema completo de mapeo bidireccional:

```javascript
contact: {
  toBackend: {
    nombre: { sources: ['name', 'nombre'], required: true, ... },
    email: { sources: ['email'], required: true, ... },
    asunto: { sources: ['subject', 'asunto'], required: true, ... },
    mensaje: { sources: ['message', 'mensaje'], required: true, ... },
  },
  fromBackend: {
    id: { sources: ['id'], required: true, ... },
    nombre: { sources: ['nombre'], required: true, ... },
    email: { sources: ['email'], required: true, ... },
    estado: { sources: ['estado'], default: 'pendiente', ... },
    fechaCreacion: { sources: ['fecha_creacion'], ... },
    // ... campos adicionales para administración
  },
}
```

#### ✅ Métodos Específicos

```javascript
// Nuevos métodos agregados
async mapContactToBackend(frontendData)
async mapContactFromBackend(backendData)
```

#### ✅ Exportaciones

```javascript
export const mapContactToBackend = (data) =>
  universalMapper.mapContactToBackend(data);
export const mapContactFromBackend = (data) =>
  universalMapper.mapContactFromBackend(data);
```

#### ✅ Documentación Actualizada

- Lista de tipos de datos soportados actualizada
- Comentarios detallados para cada campo del esquema

### 2. **ContactService.js**

#### ✅ Integración con UniversalDataMapper

```javascript
// Antes (mapeo manual)
const dataToSend = {
  nombre: formData.name.trim(),
  email: formData.email.trim().toLowerCase(),
  asunto: formData.subject.trim(),
  mensaje: formData.message.trim(),
};

// Después (usando universalDataMapper)
const dataToSend = await mapContactToBackend(formData);
```

#### ✅ Nuevos Métodos para Administración

```javascript
async getContacts(params = {})        // Lista contactos con mapeo
async getContactById(contactId)       // Obtiene contacto específico
```

#### ✅ Documentación Mejorada

- Comentarios sobre integración con universalDataMapper
- Explicación de compatibilidad y nuevas funcionalidades

## 🎯 BENEFICIOS

### **1. Consistencia**

- Mapeo unificado para todos los tipos de datos
- Esquemas declarativos fáciles de mantener
- Validación automática de campos

### **2. Mantenibilidad**

- Cambios centralizados en esquemas
- Reutilización de lógica de transformación
- Menos código duplicado

### **3. Robustez**

- Validación robusta con mensajes de error detallados
- Manejo de errores contextual
- Logging automático de operaciones

### **4. Escalabilidad**

- Fácil agregar nuevos campos al esquema
- Soporte para mapeo bidireccional
- Cache inteligente para operaciones repetitivas

## 🔧 USO

### **Frontend - Envío de Contacto**

```javascript
import contactService from "./services/contactService";

const formData = {
  name: "Juan Pérez",
  email: "juan@example.com",
  subject: "Consulta sobre reserva",
  message: "Hola, tengo una pregunta sobre...",
};

const result = await contactService.sendContactForm(formData);
// Usa internamente mapContactToBackend()
```

### **Administración - Obtener Contactos**

```javascript
// Obtener lista de contactos
const contacts = await contactService.getContacts();

// Obtener contacto específico
const contact = await contactService.getContactById(123);
// Usa internamente mapContactFromBackend()
```

### **Uso Directo del Mapper**

```javascript
import {
  mapContactToBackend,
  mapContactFromBackend,
} from "./services/universalDataMapper";

// Mapeo manual si es necesario
const mappedData = await mapContactToBackend(formData);
const frontendData = await mapContactFromBackend(backendResponse);
```

## 📊 CAMPOS MAPEADOS

### **Frontend → Backend (toBackend)**

| Frontend  | Backend   | Validación     | Transformación         |
| --------- | --------- | -------------- | ---------------------- |
| `name`    | `nombre`  | ≥2 caracteres  | `trim()`               |
| `email`   | `email`   | Formato email  | `trim().toLowerCase()` |
| `subject` | `asunto`  | ≥5 caracteres  | `trim()`               |
| `message` | `mensaje` | ≥10 caracteres | `trim()`               |

### **Backend → Frontend (fromBackend)**

| Backend           | Frontend         | Tipo       | Descripción                                   |
| ----------------- | ---------------- | ---------- | --------------------------------------------- |
| `id`              | `id`             | number     | ID único                                      |
| `nombre`          | `nombre`         | string     | Nombre del remitente                          |
| `email`           | `email`          | string     | Email del remitente                           |
| `asunto`          | `asunto`         | string     | Asunto del mensaje                            |
| `mensaje`         | `mensaje`        | string     | Contenido del mensaje                         |
| `estado`          | `estado`         | string     | Estado: pendiente/en_proceso/resuelto/cerrado |
| `fecha_creacion`  | `fechaCreacion`  | ISO string | Fecha de creación                             |
| `fecha_respuesta` | `fechaRespuesta` | ISO string | Fecha de respuesta                            |
| `respuesta`       | `respuesta`      | string     | Contenido de la respuesta                     |
| `respondido_por`  | `respondidoPor`  | string     | Quien respondió                               |
| `es_reciente`     | `esReciente`     | boolean    | Si es reciente (< 24h)                        |

## ✅ COMPATIBILIDAD

### **Backward Compatibility**

- ✅ API pública del `ContactService` sin cambios
- ✅ Componente `ContactUs` funciona sin modificaciones
- ✅ Formularios existentes no requieren cambios

### **Forward Compatibility**

- ✅ Nuevos campos se pueden agregar fácilmente al esquema
- ✅ Validaciones adicionales en el mapper centralizado
- ✅ Extensión para funcionalidades de administración

## 🧪 TESTING

### **Verificación Manual**

```bash
# Verificar sintaxis
cd frontend && node -c src/services/universalDataMapper.js

# Test de importación
node -e "import('./src/services/contactService.js').then(console.log).catch(console.error)"
```

### **Test de Funcionalidad**

```javascript
// En la consola del navegador
const testData = {
  name: "Test User",
  email: "test@example.com",
  subject: "Test Subject",
  message: "This is a test message for validation",
};

contactService.sendContactForm(testData).then(console.log);
```

## 📚 ESTRUCTURA FINAL

```
frontend/src/services/
├── universalDataMapper.js ← Esquema de contacto agregado
├── contactService.js      ← Integración con mapper
└── ...

backend/comunicacion/
├── models.py       ← Modelo Contacto (sin cambios)
├── serializers.py  ← ContactoSerializer (sin cambios)
├── views.py        ← ContactoViewSet (sin cambios)
└── ...
```

## 🎉 RESULTADO

El sistema de contacto ahora está **completamente integrado** con el `universalDataMapper`, proporcionando:

- **Mapeo consistente** y centralizado
- **Validación robusta** automática
- **Mantenibilidad** mejorada
- **Escalabilidad** para futuras funcionalidades
- **Compatibilidad** total con código existente

El contacto funciona perfectamente y ahora sigue los mismos patrones que el resto de la aplicación.
