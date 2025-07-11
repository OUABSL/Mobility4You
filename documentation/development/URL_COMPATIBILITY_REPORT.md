# URL Compatibility Report - Frontend to Backend

## 📊 **URLs Corregidas en el Frontend**

### ✅ **Servicios Actualizados**

#### 1. **searchServices.js**

- ❌ `${API_URL}/vehiculos/lugares/`
- ✅ `${API_URL}/lugares/lugares/`

#### 2. **homeServices.js**

- ❌ `${API_URL}/vehiculos/lugares/` (2 ocurrencias)
- ✅ `${API_URL}/lugares/lugares/`

#### 3. **reservationServices.js**

- ❌ `${API_URL}/reservas/crear/`
- ✅ `${API_URL}/reservas/reservas/`

- ❌ `${API_URL}/reservas/buscar/`
- ✅ `${API_URL}/reservas/reservas/${reservaId}/find/`

- ❌ `${API_URL}/reservas/calcular-precio/`
- ✅ `${API_URL}/reservas/reservas/calculate-price/`

- ❌ `${API_URL}/reservas/${reservaId}/cancelar/`
- ✅ `${API_URL}/reservas/reservas/${reservaId}/cancel/`

- ❌ `${API_URL}/reservas/${reservaId}/`
- ✅ `${API_URL}/reservas/reservas/${reservaId}/`

- ❌ `${API_URL}/vehiculos/extras/` (3 ocurrencias)
- ✅ `${API_URL}/reservas/extras/`

- ❌ `${API_URL}/politicas/`
- ✅ `${API_URL}/politicas/politicas-pago/`

#### 4. **contactService.js**

- ❌ `${API_URL}/comunicacion/contactos/` (2 ocurrencias)
- ✅ `${API_URL}/comunicacion/contacto/`

### ✅ **URLs Ya Correctas (No Necesitaron Cambios)**

#### 1. **carService.js**

- ✅ `${API_URL}/vehiculos/` - Correcto

#### 2. **searchServices.js**

- ✅ `${API_URL}/vehiculos/disponibilidad/` - Correcto

#### 3. **stripePaymentServices.js**

- ✅ `${API_URL}/payments/stripe/config/` - Correcto
- ✅ `${API_URL}/payments/stripe/create-payment-intent/` - Correcto
- ✅ `${API_URL}/payments/stripe/confirm-payment-intent/` - Correcto
- ✅ `${API_URL}/payments/stripe/payment-status/${numeroPedido}/` - Correcto
- ✅ `${API_URL}/payments/stripe/refund/${pagoId}/` - Correcto
- ✅ `${API_URL}/payments/stripe/payment-history/` - Correcto
- ✅ `${API_URL}/payments/process-payment/` - Correcto

#### 4. **homeServices.js**

- ✅ `${API_URL}/comunicacion/contenidos/` - Correcto

## 🎯 **Mapeo Completo Frontend ↔ Backend**

### **Ubicaciones / Lugares**

```
Frontend: ${API_URL}/lugares/lugares/
Backend:  /api/lugares/lugares/
ViewSet:  LugarViewSet en lugares/views.py
```

### **Vehículos**

```
Frontend: ${API_URL}/vehiculos/
Backend:  /api/vehiculos/vehiculos/
ViewSet:  VehiculoViewSet en vehiculos/views.py

Frontend: ${API_URL}/vehiculos/disponibilidad/
Backend:  /api/vehiculos/disponibilidad/
Action:   disponibilidad() en VehiculoViewSet
```

### **Reservas**

```
Frontend: ${API_URL}/reservas/reservas/
Backend:  /api/reservas/reservas/
ViewSet:  ReservaViewSet en reservas/views.py

Frontend: ${API_URL}/reservas/reservas/${id}/
Backend:  /api/reservas/reservas/${id}/
Action:   Detail views (GET, PUT, DELETE)

Frontend: ${API_URL}/reservas/reservas/${id}/find/
Backend:  /api/reservas/reservas/${id}/find/
URL:      Específica en reservas/urls.py

Frontend: ${API_URL}/reservas/reservas/calculate-price/
Backend:  /api/reservas/reservas/calculate-price/
URL:      Específica en reservas/urls.py

Frontend: ${API_URL}/reservas/reservas/${id}/cancel/
Backend:  /api/reservas/reservas/${id}/cancel/
URL:      Específica en reservas/urls.py
```

### **Extras**

```
Frontend: ${API_URL}/reservas/extras/
Backend:  /api/reservas/extras/
ViewSet:  ExtrasViewSet en reservas/views.py
```

### **Políticas**

```
Frontend: ${API_URL}/politicas/politicas-pago/
Backend:  /api/politicas/politicas-pago/
ViewSet:  PoliticaPagoViewSet en politicas/views.py
```

### **Comunicación / Contenidos**

```
Frontend: ${API_URL}/comunicacion/contenidos/
Backend:  /api/comunicacion/contenidos/
ViewSet:  ContenidoViewSet en comunicacion/views.py

Frontend: ${API_URL}/comunicacion/contacto/
Backend:  /api/comunicacion/contacto/
ViewSet:  ContactoViewSet en comunicacion/views.py
```

### **Pagos / Stripe**

```
Frontend: ${API_URL}/payments/stripe/*
Backend:  /api/payments/stripe/*
Views:    Class-based views en payments/views.py
```

## 🔧 **Configuración de URLs**

### **Frontend Environment Variables**

```javascript
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_BACKEND_URL=http://localhost:8000
```

### **Backend URL Configuration**

```python
# config/urls.py
urlpatterns = [
    path("api/usuarios/", include("usuarios.urls")),
    path("api/lugares/", include("lugares.urls")),
    path("api/vehiculos/", include("vehiculos.urls")),
    path("api/reservas/", include("reservas.urls")),
    path("api/politicas/", include("politicas.urls")),
    path("api/facturas-contratos/", include("facturas_contratos.urls")),
    path("api/comunicacion/", include("comunicacion.urls")),
    path("api/payments/", include("payments.urls", namespace="payments")),
]
```

## ✅ **Verificación Completada**

Todos los endpoints del frontend ahora están alineados con la arquitectura modular del backend. Las URLs siguen el patrón consistente:

```
/api/{app_name}/{model_name_or_endpoint}/
```

Los servicios del frontend están listos para funcionar con la nueva estructura modular del backend.

---

**Última actualización**: Junio 2025  
**Estado**: ✅ URLs Compatibles
