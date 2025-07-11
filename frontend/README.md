# 🚗 Movility for You - Frontend

Sistema de alquiler de vehículos con interfaz de usuario moderna y optimizada.

![React](https://img.shields.io/badge/React-19.1.0-blue)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.3-purple)
![Node](https://img.shields.io/badge/Node-≥18.0.0-green)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)

## 📋 Tabla de Contenidos

- [🚀 Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [⚙️ Instalación](#️-instalación)
- [🛠️ Scripts Disponibles](#️-scripts-disponibles)
- [🔧 Configuración](#-configuración)
- [🎨 Estructura del Proyecto](#-estructura-del-proyecto)
- [📚 Documentación](#-documentación)
- [🚀 Despliegue](#-despliegue)
- [🔒 Seguridad](#-seguridad)
- [🎯 Performance](#-performance)

## 🚀 Características

### Características Principales

- ✅ **Búsqueda de vehículos** con filtros avanzados
- ✅ **Sistema de reservas** completo con timer automático
- ✅ **Integración con Stripe** para pagos seguros
- ✅ **Gestión de extras** y conductores adicionales
- ✅ **Consulta de reservas** existentes
- ✅ **Responsive design** optimizado para móviles

### Características Técnicas

- ✅ **Lazy loading** para optimización de rendimiento
- ✅ **Cache inteligente** con TTL configurable
- ✅ **Logging centralizado** con niveles configurables
- ✅ **Validación robusta** de datos de entrada
- ✅ **Error boundaries** para manejo de errores
- ✅ **Configuración por entornos** (dev/prod)

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: React 19.1.0 + React Router DOM
- **UI Framework**: Bootstrap 5.3.3 + React Bootstrap
- **HTTP Client**: Axios con interceptores personalizados
- **Pagos**: Stripe React Components
- **Iconos**: Font Awesome + React Icons
- **Fechas**: date-fns + react-date-range
- **Testing**: Jest + React Testing Library

### Patrones de Diseño

- **Separación de responsabilidades** con servicios especializados
- **Configuración centralizada** en `src/config/`
- **Utilidades modulares** en `src/utils/`
- **Mapeo universal de datos** con cache inteligente
- **Context API** para estado global
- **Custom hooks** para lógica reutilizable

## ⚙️ Instalación

### Prerrequisitos

- Node.js ≥ 18.0.0
- npm ≥ 8.0.0

### Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/movility-for-you.git
cd movility-for-you/frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Iniciar en modo desarrollo
npm start
```

### Instalación con Docker

```bash
# Construcción para desarrollo
docker build -t movility-frontend:dev .

# Construcción para producción
docker build -f Dockerfile.prod -t movility-frontend:prod .

# Ejecutar contenedor
docker run -p 3000:3000 movility-frontend:dev
```

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm start                    # Servidor de desarrollo (puerto 3000)
npm run build               # Build para producción
npm run build:prod          # Build optimizado para producción

# Testing
npm test                    # Tests en modo watch
npm run test:ci             # Tests para CI/CD
npm run test:coverage       # Tests con coverage

# Utilidades
npm run analyze             # Analizar bundle size
npm run clean               # Limpiar cache y build
npm run lint                # Linting (cuando esté configurado)
```

## 🔧 Configuración

### Variables de Entorno

#### Desarrollo (`.env`)

```env
REACT_APP_BACKEND_URL=http://localhost/api
REACT_APP_API_URL=http://localhost/api
REACT_APP_FRONTEND_URL=http://localhost:3000
REACT_APP_DEBUG_MODE=false
REACT_APP_STRIPE_ENABLED=false
```

#### Producción (`.env.production`)

```env
REACT_APP_BACKEND_URL=https://api.movilityforyou.com/api
REACT_APP_API_URL=https://api.movilityforyou.com/api
REACT_APP_FRONTEND_URL=https://movilityforyou.com
REACT_APP_DEBUG_MODE=false
REACT_APP_STRIPE_ENABLED=true
REACT_APP_ENABLE_ANALYTICS=true
```

### Configuración de Características

- **Debug Mode**: Habilita logging detallado y datos de testing
- **Stripe**: Integración de pagos (dev/prod)
- **Analytics**: Google Analytics y métricas de rendimiento
- **Error Reporting**: Seguimiento de errores en producción

## 🎨 Estructura del Proyecto

```
src/
├── components/           # Componentes React
│   ├── common/          # Componentes reutilizables
│   ├── Modals/          # Componentes modal
│   ├── ReservaPasos/    # Flujo de reserva paso a paso
│   └── StripePayment/   # Componentes de pago
├── config/              # Configuración centralizada
│   ├── appConfig.js     # Configuración principal
│   ├── axiosConfig.js   # Configuración HTTP
│   ├── lazyLoadingConfig.js # Lazy loading
│   ├── optimizationConfig.js # Optimización
│   └── securityConfig.js # Seguridad
├── context/             # Context API providers
├── hooks/               # Custom hooks
├── services/            # Servicios de datos
├── utils/               # Utilidades modulares
├── validations/         # Validaciones
└── assets/             # Recursos estáticos
```

## 📚 Documentación

### Servicios Principales

- **`reservationServices.js`**: Gestión completa de reservas
- **`universalDataMapper.js`**: Mapeo bidireccional de datos
- **`stripePaymentServices.js`**: Integración con Stripe
- **`cacheService.js`**: Sistema de cache inteligente

### Configuración

- **`appConfig.js`**: Configuración central de la aplicación
- **`securityConfig.js`**: Medidas de seguridad (CSP, validaciones)
- **`optimizationConfig.js`**: Optimizaciones de rendimiento

### Utilidades

- **`utils/`**: Conjunto modular de utilidades:
  - `financialUtils.js`: Cálculos monetarios
  - `dateValidators.js`: Validación de fechas
  - `imageUtils.js`: Gestión de imágenes
  - `generalUtils.js`: Utilidades generales

## 🚀 Despliegue

### Construcción para Producción

```bash
# Build optimizado
npm run build:prod

# Verificar build
npm run analyze
```

### Docker Producción

```bash
# Construir imagen de producción
docker build -f Dockerfile.prod \
  --build-arg REACT_APP_API_URL=https://api.tudominio.com/api \
  --build-arg REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_... \
  -t movility-frontend:prod .

# Ejecutar en producción
docker run -p 80:80 movility-frontend:prod
```

### Nginx (Configuración incluida)

El proyecto incluye configuración optimizada de Nginx con:

- Headers de seguridad
- Compresión gzip
- Cache de archivos estáticos
- Soporte para React Router (SPA)

## 🔒 Seguridad

### Medidas Implementadas

- ✅ **Content Security Policy** configurado
- ✅ **Headers de seguridad** (X-Frame-Options, X-XSS-Protection, etc.)
- ✅ **Validación de entrada** con sanitización
- ✅ **CSRF Protection** mediante tokens
- ✅ **Rate limiting** en formularios
- ✅ **Cookies seguras** en producción

### Validaciones

- Validación de emails y teléfonos
- Sanitización de inputs HTML
- Límites de longitud de texto
- Detección de caracteres maliciosos

## 🎯 Performance

### Optimizaciones Implementadas

- ✅ **Code splitting** automático por rutas
- ✅ **Lazy loading** de componentes grandes
- ✅ **Cache inteligente** con TTL
- ✅ **Compresión gzip** en producción
- ✅ **Optimización de imágenes** con placeholders
- ✅ **Bundle size analysis** disponible

### Métricas de Rendimiento

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Bundle size**: Optimizado por chunks

## 🤝 Contribución

### Guidelines

1. Seguir la estructura de carpetas establecida
2. Usar el sistema de logging centralizado
3. Implementar tests para nuevas funcionalidades
4. Documentar cambios significativos
5. Mantener la configuración por entornos

### Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Ejecutar tests
npm test

# Build de verificación
npm run build
```

## 📄 Licencia

MIT License - Ver archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**OUAEL BOUSSIALI**

- Arquitectura y desarrollo del frontend
- Optimización de rendimiento
- Configuración de seguridad
- Integración con servicios

---

**🚗 Movility for You** - Sistema de alquiler de vehículos moderno y optimizado.

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
