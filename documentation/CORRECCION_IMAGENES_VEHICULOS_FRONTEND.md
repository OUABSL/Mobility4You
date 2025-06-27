# CORRECCIÓN DE REFERENCIAS DE IMÁGENES DE VEHÍCULOS - FRONTEND

## Problema Identificado

El frontend aún estaba usando referencias obsoletas para las imágenes de vehículos (`imagenPrincipal?.original`) en lugar de usar el nuevo campo `imagen_principal` que devuelve el backend con URLs absolutas.

## Archivos Corregidos

### 1. `frontend/src/components/ListadoCoches.js`

**Líneas 536-545**: Corregido para usar `car.imagen_principal` como primera opción

```javascript
// ANTES
src={
  car.imagenPrincipal?.original ||
  car.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/300x200/e3f2fd/1976d2.png?text=Vehículo'
}

// DESPUÉS
src={
  car.imagen_principal ||
  car.imagenPrincipal?.original ||
  car.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/300x200/e3f2fd/1976d2.png?text=Vehículo'
}
```

### 2. `frontend/src/components/FichaCoche.js`

**Líneas múltiples**: Corregido carrusel de imágenes y imagen principal

```javascript
// Carrusel - imágenes individuales
src={imagen.imagen_url || imagen.imagen || imagen.url || car.imagen_principal || car.imagenPrincipal?.placeholder}

// Imagen principal única
src={
  car.imagen_principal ||
  car.imagenPrincipal?.original ||
  car.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/600x400/e3f2fd/1976d2.png?text=Vehículo'
}

// Datos de reserva
imagen: car.imagen_principal || car.imagenPrincipal?.original || car.imagenPrincipal?.placeholder,
```

### 3. `frontend/src/components/DetallesReserva.js`

**Líneas 489-492**: Corregido ImageManager para usar `imagen_principal`

```javascript
// ANTES
src={
  datos.vehiculo?.imagenPrincipal?.original ||
  datos.vehiculo?.imagenPrincipal?.placeholder
}

// DESPUÉS
src={
  datos.vehiculo?.imagen_principal ||
  datos.vehiculo?.imagenPrincipal?.original ||
  datos.vehiculo?.imagenPrincipal?.placeholder
}
```

### 4. `frontend/src/components/ReservaPasos/ReservaClienteConfirmar.js`

**Líneas 944-951**: Corregido resumen de reserva

```javascript
// ANTES
src={
  car?.imagen ||
  car?.imagenPrincipal?.original ||
  car?.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}

// DESPUÉS
src={
  car?.imagen_principal ||
  car?.imagen ||
  car?.imagenPrincipal?.original ||
  car?.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}
```

### 5. `frontend/src/components/ReservaPasos/ReservaClienteExtras.js`

**Líneas 628-635**: Corregido imagen en resumen de reserva

```javascript
// ANTES
src={
  car.imagenPrincipal?.original ||
  car.imagenPrincipal?.placeholder ||
  car.imagen ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}

// DESPUÉS
src={
  car.imagen_principal ||
  car.imagenPrincipal?.original ||
  car.imagenPrincipal?.placeholder ||
  car.imagen ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}
```

### 6. `frontend/src/components/ReservaPasos/ReservaClientePago.js`

**Líneas 741-748**: Corregido imagen en resumen de pago

```javascript
// ANTES
src={
  car?.imagen ||
  car?.imagenPrincipal?.original ||
  car?.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}

// DESPUÉS
src={
  car?.imagen_principal ||
  car?.imagen ||
  car?.imagenPrincipal?.original ||
  car?.imagenPrincipal?.placeholder ||
  'https://via.placeholder.com/150x100/e3f2fd/1976d2.png?text=Vehículo'
}
```

## Jerarquía de Fallback Implementada

Para todos los componentes, ahora se sigue esta jerarquía de prioridad:

1. **`car.imagen_principal`** - URL absoluta del backend (NUEVA PRIORIDAD)
2. **`car.imagen`** - Campo compatibilidad
3. **`car.imagenPrincipal?.original`** - Formato anterior (compatibilidad)
4. **`car.imagenPrincipal?.placeholder`** - Fallback anterior
5. **URL de placeholder externa** - Fallback final

## Backend Ya Corregido

El backend ya estaba devolviendo las URLs correctas según la respuesta proporcionada:

```json
{
  "imagenes": [
    {
      "imagen": "http://localhost/media/vehiculos/2_30.jpg",
      "imagen_url": "http://localhost/media/vehiculos/2_30.jpg",
      "portada": true
    }
  ],
  "imagen_principal": "http://localhost/media/vehiculos/2_30.jpg"
}
```

## Componentes NO Modificados

Los siguientes componentes ya estaban usando las referencias correctas o no muestran imágenes:

- `universalDataMapper.js` - Ya configurado correctamente
- `ReservaClienteExito.js` - No muestra imágenes de vehículos
- `ImageManager.js` - Ya tiene lógica robusta de fallback
- Archivos de testing data - Mantienen compatibilidad

## Resultado

Ahora todas las imágenes de vehículos deben mostrarse correctamente usando las URLs absolutas devueltas por el backend en el campo `imagen_principal` y `imagen_url` de cada imagen individual.

## Verificación

Para verificar que todo funciona:

1. Las imágenes en listado de vehículos deben mostrarse
2. Las imágenes en fichas de vehículos y carruseles deben mostrarse
3. Las imágenes en todos los pasos de reserva deben mostrarse
4. Las imágenes en detalles de reserva deben mostrarse

## Fecha de Corrección

27 de junio de 2025
