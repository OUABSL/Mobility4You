# 📋 INFORME COMPLETO DEL SISTEMA MOVILITY FOR YOU

> **Fecha:** 17 de Julio de 2025  
> **Versión:** 1.0  
> **Propósito:** Documentación completa para contexto de GitHub Copilot

## 🎯 RESUMEN EJECUTIVO

**Movility for You** es una aplicación web completa de alquiler de vehículos construida con arquitectura moderna y modular:

- **Backend:** Django 5.1.9 con Django REST Framework
- **Frontend:** React 19.1.0 con Bootstrap 5
- **Base de Datos:** PostgreSQL 16 (migrado desde MariaDB)
- **Infraestructura:** Docker con Docker Compose
- **Despliegue:** Render.com con configuración de producción
- **Pagos:** Integración completa con Stripe
- **Gestión de Email:** Brevo (Sendinblue) para notificaciones

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### 📦 Estructura General del Proyecto

```
Movility-for-you/
├── backend/                    # Django Backend
│   ├── config/                # Configuración Django
│   ├── usuarios/              # App: Gestión de usuarios
│   ├── vehiculos/             # App: Gestión de vehículos
│   ├── lugares/               # App: Gestión de lugares y direcciones
│   ├── reservas/              # App: Gestión de reservas
│   ├── politicas/             # App: Políticas y promociones
│   ├── facturas_contratos/    # App: Facturación y contratos
│   ├── comunicacion/          # App: Comunicación y emails
│   ├── payments/              # App: Procesamiento de pagos
│   ├── utils/                 # Utilidades compartidas
│   ├── templates/             # Plantillas Django
│   ├── staticfiles/           # Archivos estáticos unificados
│   ├── logs/                  # Logs de aplicación
│   └── media/                 # Archivos subidos por usuarios
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── services/          # Servicios API
│   │   ├── context/           # Context API de React
│   │   ├── assets/            # Assets estáticos
│   │   └── utils/             # Utilidades frontend
│   └── public/                # Archivos públicos
├── docker/                    # Configuración Docker
│   ├── docker-compose.yml     # Desarrollo
│   ├── docker-compose.prod.yml # Producción
│   └── nginx/                 # Configuración Nginx
├── documentation/             # Documentación detallada
└── scripts/                   # Scripts de automatización
```

### 🔧 Tecnologías Principales

**Backend:**

- Django 5.1.9 (Framework web)
- Django REST Framework 3.16.0 (API REST)
- PostgreSQL con psycopg2-binary (Base de datos)
- Celery 5.3.0 (Tareas asíncronas)
- Redis 7.x (Cache y broker de Celery)
- Stripe SDK (Procesamiento de pagos)
- Brevo SDK (Gestión de emails)
- Gunicorn (Servidor WSGI)
- Whitenoise (Archivos estáticos)
- Reportlab (Generación de PDFs)

**Frontend:**

- React 19.1.0 (Biblioteca UI)
- React Router DOM 7.4.1 (Enrutamiento)
- Bootstrap 5.3.3 (Framework CSS)
- Axios 1.8.4 (Cliente HTTP)
- Stripe React (Componentes de pago)
- FontAwesome (Iconografía)

**Infraestructura:**

- Docker & Docker Compose (Containerización)
- Nginx (Proxy reverso y archivos estáticos)
- PostgreSQL 16 Alpine (Base de datos)
- Redis 7 Alpine (Cache)

---

## 🗃️ ARQUITECTURA DE BASE DE DATOS

### 📊 Modelo de Datos Modular

La aplicación utiliza una arquitectura modular con 8 aplicaciones Django principales:

#### 1. **usuarios** - Gestión de Usuarios

```python
class Usuario(AbstractUser):
    # Hereda de AbstractUser de Django
    fecha_nacimiento = DateField()
    sexo = CharField(choices=SEXO_CHOICES)
    nacionalidad = CharField()
    tipo_documento = CharField(choices=TIPO_DOCUMENTO_CHOICES)
    numero_documento = CharField()
    telefono = CharField()
    rol = CharField(choices=ROL_CHOICES)
    empresa_nombre = CharField()  # Para usuarios empresa
    verificado = BooleanField()
    activo = BooleanField()
```

#### 2. **lugares** - Gestión de Ubicaciones

```python
class Direccion(Model):
    calle = CharField()
    ciudad = CharField()
    provincia = CharField()
    pais = CharField(default="España")
    codigo_postal = CharField()

class Lugar(Model):
    nombre = CharField()
    direccion = OneToOneField(Direccion)
    latitud = DecimalField()
    longitud = DecimalField()
    telefono = CharField()
    email = EmailField()
    activo = BooleanField()
    popular = BooleanField()
```

#### 3. **vehiculos** - Gestión de Vehículos

```python
class Categoria(Model):
    nombre = CharField()
    descripcion = TextField()

class GrupoCoche(Model):
    nombre = CharField()
    descripcion = TextField()

class Vehiculo(Model):
    categoria = ForeignKey(Categoria)
    grupo = ForeignKey(GrupoCoche)
    marca = CharField()
    modelo = CharField()
    matricula = CharField(unique=True)
    año = IntegerField()
    precio_por_dia = DecimalField()
    disponible = BooleanField()
    combustible = CharField()
    transmision = CharField()
    # + más campos específicos

class ImagenVehiculo(Model):
    vehiculo = ForeignKey(Vehiculo)
    imagen = ImageField()
    principal = BooleanField()
    descripcion = CharField()
```

#### 4. **reservas** - Gestión de Reservas

```python
class Reserva(Model):
    usuario = ForeignKey("usuarios.Usuario")
    vehiculo = ForeignKey("vehiculos.Vehiculo")
    politica_pago = ForeignKey("politicas.PoliticaPago")
    lugar_recogida = ForeignKey("lugares.Lugar")
    lugar_devolucion = ForeignKey("lugares.Lugar")
    fecha_recogida = DateTimeField()
    fecha_devolucion = DateTimeField()
    estado = CharField(choices=ESTADO_CHOICES)
    precio_total = DecimalField()
    metodo_pago = CharField()

class ReservaConductor(Model):
    reserva = ForeignKey(Reserva)
    conductor = ForeignKey("usuarios.Usuario")
    rol = CharField()

class ReservaExtra(Model):
    reserva = ForeignKey(Reserva)
    extra = ForeignKey("vehiculos.Extra")
    cantidad = IntegerField()
```

#### 5. **politicas** - Políticas y Promociones

```python
class PoliticaPago(Model):
    nombre = CharField()
    porcentaje_inicial = DecimalField()
    descripcion = TextField()
    activa = BooleanField()

class Promocion(Model):
    codigo = CharField(unique=True)
    descripcion = TextField()
    descuento_pct = DecimalField()
    fecha_inicio = DateTimeField()
    fecha_fin = DateTimeField()
    activa = BooleanField()
```

#### 6. **payments** - Procesamiento de Pagos

```python
class PagoStripe(Model):
    numero_pedido = CharField(unique=True)
    stripe_payment_intent_id = CharField(unique=True)
    importe = DecimalField()
    estado = CharField(choices=ESTADO_CHOICES)
    tipo_pago = CharField(choices=TIPO_PAGO_CHOICES)
    reserva = ForeignKey("reservas.Reserva")
    usuario = ForeignKey("usuarios.Usuario")
```

### 🔗 Relaciones Entre Modelos

- **Usuario → Reserva**: Un usuario puede tener múltiples reservas (OneToMany)
- **Vehículo → Reserva**: Un vehículo puede tener múltiples reservas (OneToMany)
- **Lugar → Reserva**: Un lugar puede ser origen/destino de múltiples reservas
- **Reserva → PagoStripe**: Una reserva puede tener múltiples pagos
- **Dirección ↔ Lugar**: Relación OneToOne para normalización

---

## ⚙️ CONFIGURACIÓN DEL BACKEND

### 🐍 Django Settings Estructura

**Archivos de Configuración:**

```
backend/config/
├── settings.py           # Configuración principal
├── production.py         # Configuración de producción
├── middleware.py         # Middleware personalizado
├── urls.py              # URLs principales
└── wsgi.py              # Configuración WSGI
```

### 🔧 Configuración Principal (settings.py)

**Aplicaciones Instaladas:**

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
    'config',  # Configuración y admin personalizado
    'usuarios',
    'lugares',
    'vehiculos',
    'reservas',
    'politicas',
    'facturas_contratos',
    'comunicacion',
    'payments',
    'utils',  # Utilidades y comandos de gestión
]
```

**Middleware Stack:**

```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'config.middleware.RequestTrackingMiddleware',  # Tracking con ID único
    'django.contrib.sessions.middleware.SessionMiddleware',
    'config.middleware.CORSMiddleware',  # CORS personalizado
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.SecurityHeadersMiddleware',  # Headers de seguridad
    'config.middleware.RequestSizeMiddleware',  # Limitación de tamaño
    'config.middleware.HealthCheckMiddleware',  # Health checks
    'config.middleware.GlobalExceptionMiddleware',  # Manejo de excepciones
]
```

### 🗄️ Configuración de Base de Datos

**PostgreSQL con soporte para Render.com:**

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'mobility4you'),
        'USER': os.environ.get('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'sslmode': 'prefer',  # Para Render.com
        },
    }
}

# Soporte para DATABASE_URL (Render.com)
database_url = os.environ.get('DATABASE_URL')
if database_url:
    DATABASES['default'] = dj_database_url.parse(database_url)
```

### 📁 Gestión de Archivos Estáticos y Media

**Configuración Unificada:**

```python
# Archivos estáticos
STATIC_URL = '/django-static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Archivos media (unificados en staticfiles)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'staticfiles', 'media')
```

**Backblaze B2 (Producción):**

```python
# Configuración para almacenamiento en la nube
if DJANGO_ENV == 'production':
    DEFAULT_FILE_STORAGE = 'storages.backends.b2.B2Storage'
    B2_ACCOUNT_ID = env('B2_ACCOUNT_ID')
    B2_APPLICATION_KEY = env('B2_APPLICATION_KEY')
    B2_BUCKET_NAME = env('B2_BUCKET_NAME')
```

---

## 📝 SISTEMA DE LOGGING AVANZADO

### 🔍 Configuración de Logging

El sistema implementa un logging completo y estructurado:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'detailed': {
            'format': '[{asctime}] {levelname:<8} | {name:<20} | {module:<15} | {funcName:<15} | Line {lineno:<4} | {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'api_formatter': {
            'format': '[{asctime}] {levelname} | {method} {path} | User: {user} | Status: {status_code} | {message}',
            'style': '{',
        },
    },
    'handlers': {
        'django_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'django.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'formatter': 'detailed',
        },
        'api_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'api_requests.log'),
            'maxBytes': 20 * 1024 * 1024,  # 20MB
            'backupCount': 7,
            'formatter': 'detailed',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOGS_DIR, 'errors.log'),
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 10,
            'formatter': 'detailed',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['django_file', 'console'] if DEBUG else ['django_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'api.requests': {
            'handlers': ['api_file', 'console'] if DEBUG else ['api_file'],
            'level': 'INFO',
            'propagate': False,
        },
        # Loggers específicos por aplicación
        'usuarios': {'handlers': ['modular_apps_file'], 'level': 'INFO'},
        'reservas': {'handlers': ['modular_apps_file'], 'level': 'INFO'},
        'payments': {'handlers': ['payments_file'], 'level': 'INFO'},
    },
}
```

### 📊 Tipos de Logs Generados

1. **django.log** - Logs generales de la aplicación
2. **api_requests.log** - Todas las peticiones API con timing
3. **errors.log** - Errores y excepciones críticas
4. **modular_apps.log** - Logs específicos de aplicaciones modulares
5. **payments.log** - Transacciones y operaciones de pago
6. **email.log** - Envío de emails y comunicaciones

---

## 🎨 CONFIGURACIÓN DEL FRONTEND

### ⚛️ Estructura de React

```
frontend/src/
├── components/              # Componentes React
│   ├── Home.js             # Página principal
│   ├── MyNavbar.js         # Navegación
│   ├── ListadoCoches.js    # Lista de vehículos
│   ├── ReservaCliente.js   # Proceso de reserva
│   ├── ReservaPasos/       # Pasos del proceso de reserva
│   └── ConsultarReservaCliente.js
├── services/               # Servicios API
│   ├── api.js             # Cliente Axios configurado
│   ├── vehiculosService.js # API de vehículos
│   ├── reservasService.js  # API de reservas
│   └── stripeService.js    # Integración con Stripe
├── context/                # Context API
│   ├── AppContext.js       # Estado global de la app
│   ├── AlertContext.js     # Sistema de alertas
│   └── AuthContext.js      # Autenticación
├── hooks/                  # Custom hooks
├── utils/                  # Utilidades
├── assets/                 # Recursos estáticos
└── css/                    # Estilos personalizados
```

### 🔧 Configuración de API (axios)

```javascript
// src/config/axiosConfig.js
import axios from "axios";

// Configuración base de axios
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Interceptor para CSRF token
axios.interceptors.request.use((config) => {
  const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value;
  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken;
  }
  return config;
});

// Interceptor para manejo de errores
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### 🎯 Componentes Principales

**1. Búsqueda y Listado de Vehículos:**

- Filtros por categoría, fechas, ubicación
- Paginación y ordenamiento
- Vista de tarjetas con imágenes

**2. Proceso de Reserva (Multi-paso):**

- Selección de vehículo
- Configuración de fechas y lugares
- Selección de extras
- Datos del conductor
- Resumen y confirmación
- Pago con Stripe

**3. Gestión de Reservas:**

- Consulta de reservas existentes
- Modificación de reservas
- Cancelación con políticas
- Descarga de documentos

---

## 🐳 CONFIGURACIÓN DOCKER

### 📦 Estructura Docker

```
docker/
├── docker-compose.yml        # Desarrollo
├── docker-compose.prod.yml   # Producción
├── nginx/
│   ├── nginx.dev.conf       # Configuración desarrollo
│   └── nginx.prod.conf      # Configuración producción
└── scripts/
    ├── build.sh            # Scripts de construcción
    └── deploy.sh           # Scripts de despliegue
```

### 🔧 Docker Compose para Desarrollo

```yaml
services:
  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: mobility4you_postgres_dev
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend Django
  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: mobility4you_backend
    volumes:
      - ../backend:/app
      - static_volume:/app/staticfiles
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DJANGO_ENV=development
      - DB_ENGINE=django.db.backends.postgresql
      - DB_HOST=db
    ports:
      - "8000:8000"

  # Frontend React
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: mobility4you_frontend
    volumes:
      - ../frontend/src:/usr/app/src
      - /usr/app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
    ports:
      - "3000:3000"

  # Nginx Proxy
  nginx:
    image: nginx:1.21
    container_name: mobility4you_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/conf.d/default.conf
      - static_volume:/usr/share/nginx/static
    depends_on:
      - frontend
      - backend

  # Redis Cache
  redis:
    image: redis:6.2
    container_name: mobility4you_redis
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  static_volume:
  redis_data:

networks:
  mobility4you_network:
    driver: bridge
```

### 🏗️ Dockerfile Backend

```dockerfile
FROM python:3.10-slim-bullseye AS base

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random

# Dependencias del sistema
RUN apt-get update && apt-get install -y \
    pkg-config \
    build-essential \
    libpq-dev \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias Python
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Copiar código de aplicación
COPY . /app/

# Crear directorios necesarios
RUN mkdir -p /app/logs /app/staticfiles /app/media

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## 🚀 CONFIGURACIÓN DE DESPLIEGUE

### 🌐 Render.com Configuration

**docker-compose.render.yml:**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mobility4you_db
      POSTGRES_USER: mobility4you_db_user
      POSTGRES_PASSWORD: superseguro_postgres_render

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.render
    environment:
      - DJANGO_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "8000:8000"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
```

### 🔄 Scripts de Despliegue

**deploy.sh:**

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando despliegue en Render..."

# Build y push de imágenes
docker-compose -f docker-compose.render.yml build

# Ejecutar migraciones
docker-compose -f docker-compose.render.yml run backend python manage.py migrate

# Recopilar archivos estáticos
docker-compose -f docker-compose.render.yml run backend python manage.py collectstatic --noinput

# Iniciar servicios
docker-compose -f docker-compose.render.yml up -d

echo "✅ Despliegue completado"
```

### 🔧 Variables de Entorno (Producción)

```bash
# Django Core
SECRET_KEY=your-secret-key
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Brevo)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password

# File Storage (Backblaze B2)
B2_ACCOUNT_ID=your-account-id
B2_APPLICATION_KEY=your-app-key
B2_BUCKET_NAME=mobility4you-media-prod

# Frontend
REACT_APP_API_URL=https://yourdomain.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 💳 INTEGRACIÓN DE PAGOS (STRIPE)

### 🔧 Configuración Backend

**Modelo de Pagos:**

```python
class PagoStripe(models.Model):
    numero_pedido = models.CharField(max_length=50, unique=True)
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True, null=True)
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES)
    tipo_pago = models.CharField(max_length=20, choices=TIPO_PAGO_CHOICES)
    reserva = models.ForeignKey('reservas.Reserva', on_delete=models.CASCADE)
    usuario = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**API de Pagos:**

```python
# payments/views.py
class CrearPagoInicialView(APIView):
    def post(self, request):
        try:
            reserva_id = request.data.get('reserva_id')
            reserva = Reserva.objects.get(id=reserva_id)

            # Crear Payment Intent en Stripe
            intent = stripe.PaymentIntent.create(
                amount=int(reserva.importe_inicial * 100),  # Centavos
                currency='eur',
                metadata={'reserva_id': reserva_id},
                automatic_payment_methods={'enabled': True},
            )

            # Guardar en base de datos
            pago = PagoStripe.objects.create(
                numero_pedido=f"PAY-{reserva_id}-{timezone.now().strftime('%Y%m%d%H%M%S')}",
                stripe_payment_intent_id=intent.id,
                importe=reserva.importe_inicial,
                estado='PENDIENTE',
                tipo_pago='INICIAL',
                reserva=reserva,
                usuario=request.user
            )

            return Response({
                'client_secret': intent.client_secret,
                'pago_id': pago.id
            })

        except Exception as e:
            logger.error(f"Error creating payment: {e}")
            return Response({'error': str(e)}, status=500)
```

### ⚛️ Integración Frontend

**Componente de Pago:**

```javascript
// components/PagoStripe.js
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const PagoForm = ({ clientSecret, reservaId }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: "Customer Name",
          },
        },
      }
    );

    if (error) {
      console.error("Payment failed:", error);
    } else {
      console.log("Payment succeeded:", paymentIntent);
      // Actualizar estado de la reserva
      await confirmarPago(reservaId, paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Confirmar Pago
      </button>
    </form>
  );
};
```

---

## 📧 SISTEMA DE COMUNICACIONES

### 🔧 Integración con Brevo (Sendinblue)

**Configuración:**

```python
# settings.py
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp-relay.brevo.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')

# Brevo API
BREVO_API_KEY = env('BREVO_API_KEY')
```

**Servicio de Email:**

```python
# comunicacion/services.py
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

class BrevoEmailService:
    def __init__(self):
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = settings.BREVO_API_KEY
        self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )

    def enviar_confirmacion_reserva(self, reserva):
        subject = f"Confirmación de Reserva #{reserva.id}"
        html_content = self._render_template('confirmacion_reserva.html', {
            'reserva': reserva,
            'usuario': reserva.usuario
        })

        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": reserva.usuario.email}],
            subject=subject,
            html_content=html_content,
            sender={"name": "Mobility for You", "email": "noreply@mobility4you.com"}
        )

        try:
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            logger.info(f"Email sent successfully: {api_response}")
            return True
        except ApiException as e:
            logger.error(f"Error sending email: {e}")
            return False
```

---

## 🔒 SEGURIDAD Y MIDDLEWARE

### 🛡️ Middleware Personalizado

**1. RequestTrackingMiddleware:**

- Asigna ID único a cada request
- Logging de timing y rendimiento
- Tracking de usuarios y IPs

**2. GlobalExceptionMiddleware:**

- Manejo centralizado de excepciones
- Logging detallado de errores
- Respuestas JSON estructuradas para APIs

**3. SecurityHeadersMiddleware:**

- Headers de seguridad (HSTS, CSP, etc.)
- Protección contra ataques comunes

**4. CORSMiddleware:**

- Configuración CORS personalizada
- Soporte para múltiples orígenes

### 🔐 Configuración de Seguridad

```python
# Configuración CSRF
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'https://yourdomain.com',
]
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'

# Headers de seguridad
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# En producción
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
```

---

## 🧪 TESTING Y CALIDAD

### 📋 Estructura de Tests

```
backend/tests/
├── test_usuarios.py         # Tests de usuarios
├── test_vehiculos.py        # Tests de vehículos
├── test_reservas.py         # Tests de reservas
├── test_payments.py         # Tests de pagos
└── test_integration.py      # Tests de integración

frontend/src/tests/
├── components/              # Tests de componentes
├── services/               # Tests de servicios
└── utils/                  # Tests de utilidades
```

### 🔧 Configuración de Tests

**Backend (Django):**

```python
# backend/tests/test_reservas.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from reservas.models import Reserva
from vehiculos.models import Vehiculo

class ReservaTestCase(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )

    def test_crear_reserva(self):
        reserva = Reserva.objects.create(
            usuario=self.user,
            vehiculo=self.vehiculo,
            fecha_recogida=timezone.now(),
            fecha_devolucion=timezone.now() + timedelta(days=3)
        )
        self.assertEqual(reserva.usuario, self.user)
```

**Frontend (Jest + React Testing Library):**

```javascript
// frontend/src/tests/components/ListadoCoches.test.js
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ListadoCoches from "../components/ListadoCoches";

test("renders vehicle list", async () => {
  render(
    <BrowserRouter>
      <ListadoCoches />
    </BrowserRouter>
  );

  await waitFor(() => {
    expect(screen.getByText("Vehículos Disponibles")).toBeInTheDocument();
  });
});
```

---

## 📊 MONITOREO Y PERFORMANCE

### 📈 Métricas y Logging

**Health Checks:**

```python
# config/middleware.py
class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == '/health/':
            return JsonResponse({
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
                'version': '1.0.0',
                'database': self._check_database(),
                'redis': self._check_redis(),
            })

        return self.get_response(request)

    def _check_database(self):
        try:
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            return 'connected'
        except:
            return 'disconnected'
```

**Monitoring de Performance:**

- Request timing en logs
- Database query optimization
- Redis caching strategies
- File upload optimization

---

## 🔄 FLUJO DE DESARROLLO

### 🔧 Workflow de Desarrollo

1. **Desarrollo Local:**

   ```bash
   cd docker/
   docker-compose up -d
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   ```

2. **Testing:**

   ```bash
   # Backend tests
   docker-compose exec backend python manage.py test

   # Frontend tests
   cd frontend/
   npm test
   ```

3. **Build para Producción:**

   ```bash
   # Frontend build
   cd frontend/
   npm run build:prod

   # Backend collectstatic
   docker-compose exec backend python manage.py collectstatic
   ```

### 📋 Comandos de Gestión

**Django Management Commands:**

```python
# utils/management/commands/setup_demo_data.py
class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating demo data...')
        # Crear usuarios, vehículos, lugares de ejemplo

# utils/management/commands/cleanup_old_logs.py
class Command(BaseCommand):
    def handle(self, *args, **options):
        # Limpiar logs antiguos
        # Optimizar base de datos
```

---

## 🗂️ BUENAS PRÁCTICAS IMPLEMENTADAS

### 🎯 Arquitectura

1. **Modularidad:** Aplicaciones Django separadas por dominio
2. **Separación de Responsabilidades:** Models, Views, Services separados
3. **DRY Principle:** Utilidades compartidas en `utils/`
4. **Configuration Management:** Variables de entorno para diferentes ambientes

### 🔧 Código

1. **Consistent Naming:** Convenciones claras en español/inglés
2. **Error Handling:** Try/catch blocks y logging apropiado
3. **Validation:** Validaciones en modelos, forms y serializers
4. **Documentation:** Docstrings y comentarios explicativos

### 🗄️ Base de Datos

1. **Normalized Schema:** Relaciones bien definidas
2. **Indexing:** Índices en campos de búsqueda frecuente
3. **Migrations:** Migraciones versionadas y reversibles
4. **Data Integrity:** Constraints y validaciones a nivel DB

### 🔒 Seguridad

1. **Authentication:** Sistema de usuarios robusto
2. **Authorization:** Permisos basados en roles
3. **Input Validation:** Validación en frontend y backend
4. **HTTPS/TLS:** Configuración segura en producción

### 🚀 Performance

1. **Caching:** Redis para sessions y cache
2. **Static Files:** CDN y optimización de assets
3. **Database Optimization:** Select_related, prefetch_related
4. **Frontend Optimization:** Code splitting, lazy loading

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### 📖 Documentación Técnica

La carpeta `documentation/` contiene documentación detallada sobre:

1. **ESTADO_ACTUAL_REFACTORIZACION.md** - Estado de la migración modular
2. **STRIPE_INTEGRATION_GUIDE.md** - Guía de integración de Stripe
3. **DOCKER_MODULAR_SETUP.md** - Configuración Docker detallada
4. **RENDER_CONFIGURATION_COMPLETED.md** - Configuración de Render.com
5. **MEJORAS_LOGGING_UNIFICADO.md** - Sistema de logging implementado

### 🔗 APIs Documentadas

**Endpoints Principales:**

- `/api/usuarios/` - Gestión de usuarios
- `/api/vehiculos/` - Catálogo de vehículos
- `/api/lugares/` - Ubicaciones y direcciones
- `/api/reservas/` - Gestión de reservas
- `/api/payments/` - Procesamiento de pagos
- `/admin/` - Panel de administración Django

### 🛠️ Herramientas de Desarrollo

- **VS Code Extensions:** Python, Django, React, Docker
- **Database Tools:** pgAdmin para PostgreSQL
- **API Testing:** Postman collections disponibles
- **Log Analysis:** Structured logging para análisis

---

## 🔮 PRÓXIMOS PASOS Y MEJORAS

### 🎯 Roadmap Técnico

1. **Performance Optimization:**

   - Implementar GraphQL para queries optimizadas
   - CDN para assets estáticos
   - Database indexing avanzado

2. **Funcionalidades:**

   - Sistema de notificaciones push
   - Chat en tiempo real
   - API mobile para app nativa

3. **DevOps:**

   - CI/CD pipeline automatizado
   - Kubernetes deployment
   - Monitoring avanzado con Prometheus

4. **Testing:**
   - End-to-end testing con Cypress
   - Load testing con Locust
   - Security testing automatizado

---

## 🏁 CONCLUSIÓN

El sistema **Movility for You** es una aplicación web moderna y robusta que implementa las mejores prácticas de desarrollo:

- **Arquitectura modular** que facilita el mantenimiento y escalabilidad
- **Stack tecnológico actualizado** con Django 5.1.9 y React 19.1.0
- **Containerización completa** con Docker para desarrollo y producción
- **Sistema de logging avanzado** para monitoreo y debugging
- **Integración completa de pagos** con Stripe
- **Configuración de seguridad robusta** siguiendo estándares industriales
- **Documentación completa** para facilitar el desarrollo futuro

Este informe proporciona el contexto completo necesario para que GitHub Copilot pueda asistir efectivamente en futuras tareas de desarrollo, mantenimiento y mejora del sistema.

---

> **Nota:** Este documento debe actualizarse periódicamente para reflejar cambios en la arquitectura, nuevas funcionalidades y mejoras implementadas.
