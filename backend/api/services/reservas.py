# api/services/reservas.py
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from ..models.reservas import Reserva, ReservaExtra, ReservaConductor, Penalizacion
from ..models.vehiculos import Vehiculo
from payments.models import PagoRedsys

@transaction.atomic
def crear_reserva(datos_reserva):
    """
    Crea una nueva reserva con todos sus componentes
    
    Args:
        datos_reserva: Dict con todos los datos de la reserva
        
    Returns:
        Reserva creada
    """
    # Extraer datos principales
    vehiculo_id = datos_reserva.get('vehiculo_id')
    lugar_recogida_id = datos_reserva.get('lugar_recogida_id')
    lugar_devolucion_id = datos_reserva.get('lugar_devolucion_id')
    fecha_recogida = datos_reserva.get('fecha_recogida')
    fecha_devolucion = datos_reserva.get('fecha_devolucion')
    politica_pago_id = datos_reserva.get('politica_pago_id')
    promocion_id = datos_reserva.get('promocion_id')
    metodo_pago = datos_reserva.get('metodo_pago', 'tarjeta')
    usuario = datos_reserva.get('usuario')
    
    # Validar disponibilidad
    vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    if not vehiculo.disponibilidad(fecha_recogida, fecha_devolucion):
        raise ValueError("El vehículo no está disponible en esas fechas")
    
    # Calcular precio actual
    from .vehiculos import calcular_precio_alquiler
    precios = calcular_precio_alquiler(
        vehiculo_id, 
        fecha_recogida, 
        fecha_devolucion,
        datos_reserva.get('extras', []),
        promocion_id
    )
    
    # Crear reserva
    reserva = Reserva(
        usuario=usuario,
        vehiculo_id=vehiculo_id,
        lugar_recogida_id=lugar_recogida_id,
        lugar_devolucion_id=lugar_devolucion_id,
        fecha_recogida=fecha_recogida,
        fecha_devolucion=fecha_devolucion,
        politica_pago_id=politica_pago_id,
        promocion_id=promocion_id,
        precio_dia=precios['precio_dia'],
        precio_base=precios['precio_base'],
        precio_extras=precios['precio_extras'],
        precio_impuestos=precios['impuestos'],
        descuento_promocion=precios['descuento'],
        precio_total=precios['total'],
        metodo_pago=metodo_pago,
        estado='pendiente'
    )
    
    # Configurar importes según método de pago
    if metodo_pago in ['tarjeta', 'paypal']:
        reserva.importe_pagado_inicial = Decimal(str(precios['total']))
        reserva.importe_pendiente_inicial = Decimal('0.00')
    else:  # efectivo
        reserva.importe_pagado_inicial = Decimal('0.00')
        reserva.importe_pendiente_inicial = Decimal(str(precios['total']))
    
    reserva.save()
    # Crear extras
    extras_data = datos_reserva.get('extras', [])
    for extra in extras_data:
        ReservaExtra.objects.create(
            reserva=reserva,
            extra_id=extra['extra_id'],
            cantidad=extra.get('cantidad', 1)
        )
    
    # Crear conductores
    conductores_data = datos_reserva.get('conductores', [])
    for conductor_data in conductores_data:
        ReservaConductor.objects.create(
            reserva=reserva,
            **conductor_data
        )
    
    return reserva

@transaction.atomic
def cancelar_reserva(reserva):
    """
    Cancela una reserva y aplica penalizaciones si corresponde
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        Reserva actualizada
    """
    from django.utils import timezone
    
    # Verificar si se puede cancelar
    puede, _ = puede_cancelar_reserva(reserva)
    if not puede:
        raise ValueError("No se puede cancelar esta reserva")
    
    # Cambiar estado
    reserva.estado = 'cancelada'
    reserva.save()
    
    # Verificar si aplica penalización
    horas_faltantes = calcular_horas_hasta_recogida(reserva)
    
    # Buscar política de penalización aplicable
    penalizaciones = reserva.politica_pago.penalizaciones.filter(
        tipo_penalizacion__nombre='cancelación',
        horas_previas__gte=horas_faltantes
    ).order_by('horas_previas').first()
    
    if penalizaciones:
        tipo_penalizacion = penalizaciones.tipo_penalizacion
        
        # Calcular importe según tipo
        if tipo_penalizacion.tipo_tarifa == 'porcentaje':
            importe = (reserva.precio_total * tipo_penalizacion.valor_tarifa) / 100
        elif tipo_penalizacion.tipo_tarifa == 'fijo':
            importe = tipo_penalizacion.valor_tarifa
        elif tipo_penalizacion.tipo_tarifa == 'importe_dia':
            importe = tipo_penalizacion.valor_tarifa * reserva.dias_alquiler()
        
        # Crear registro de penalización
        Penalizacion.objects.create(
            reserva=reserva,
            tipo_penalizacion=tipo_penalizacion,
            importe=importe,
            fecha=timezone.now(),
            descripcion=f"Cancelación con {horas_faltantes} horas de antelación"
        )
    
    # Devolver reserva actualizada
    return reserva

def puede_cancelar_reserva(reserva):
    """
    Verifica si una reserva puede ser cancelada
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        (bool, str): Puede cancelarse y motivo
    """
    # No se puede cancelar si ya está cancelada
    if reserva.estado == 'cancelada':
        return False, "La reserva ya está cancelada"
    
    # Verificar si la recogida ya pasó
    if timezone.now() > reserva.fecha_recogida:
        return False, "No se puede cancelar una reserva cuya fecha de recogida ya pasó"
    
    return True, ""

def calcular_horas_hasta_recogida(reserva):
    """
    Calcula las horas que faltan hasta la recogida
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        float: Horas hasta recogida
    """
    from django.utils import timezone
    
    ahora = timezone.now()
    delta = reserva.fecha_recogida - ahora
    
    return delta.total_seconds() / 3600

@transaction.atomic
def registrar_pago_diferencia(reserva, importe, metodo):
    """
    Registra un pago de diferencia para una reserva
    
    Args:
        reserva: Objeto Reserva
        importe: Importe pagado
        metodo: Método de pago
        
    Returns:
        Reserva actualizada
    """
    # Validar que hay importe pendiente
    importe_decimal = Decimal(str(importe))
    if reserva.importe_pendiente_extra < importe_decimal:
        raise ValueError("El importe pagado es mayor que el pendiente")
    
    # Actualizar importes
    reserva.importe_pagado_extra += importe_decimal
    reserva.importe_pendiente_extra -= importe_decimal
    
    # Guardar método de pago
    if metodo in ['tarjeta', 'paypal', 'efectivo']:
        reserva.metodo_pago_extra = metodo
    
    reserva.save()
    return reserva

@transaction.atomic
def actualizar_pago_reserva(reserva, pago):
    """
    Actualiza una reserva con los datos de un pago procesado
    
    Args:
        reserva: Objeto Reserva
        pago: Objeto PagoRedsys
        
    Returns:
        Reserva actualizada
    """
    # Verificar que el pago está completado
    if pago.estado != 'COMPLETADO':
        return reserva
    
    # Determinar si es pago inicial o extra
    if reserva.importe_pendiente_inicial > 0:
        # Es pago inicial
        reserva.importe_pagado_inicial += Decimal(str(pago.importe))
        reserva.importe_pendiente_inicial -= Decimal(str(pago.importe))
        
        # Si se ha pagado todo, confirmar reserva
        if reserva.importe_pendiente_inicial <= 0:
            reserva.estado = 'confirmada'
    else:
        # Es pago de diferencia
        reserva.importe_pagado_extra += Decimal(str(pago.importe))
        reserva.importe_pendiente_extra -= Decimal(str(pago.importe))
    
    reserva.save()
    return reserva

def calcular_diferencia_edicion(reserva_id, datos_nuevos):
    """
    Calcula la diferencia de precio al editar una reserva
    
    Args:
        reserva_id: ID de la reserva a editar
        datos_nuevos: Dict con nuevos datos
        
    Returns:
        Dict con precios originales y nuevos
    """
    try:
        # Obtener reserva actual
        reserva = Reserva.objects.get(id=reserva_id)
        
        # Obtener fechas nuevas
        fecha_recogida = datos_nuevos.get('fecha_recogida', reserva.fecha_recogida)
        fecha_devolucion = datos_nuevos.get('fecha_devolucion', reserva.fecha_devolucion)
        
        # Calcular precio nuevo
        from .vehiculos import calcular_precio_alquiler
        nuevos_precios = calcular_precio_alquiler(
            reserva.vehiculo_id,
            fecha_recogida,
            fecha_devolucion,
            datos_nuevos.get('extras', []),
            datos_nuevos.get('promocion_id', reserva.promocion_id)
        )
        
        # Calcular diferencia
        diferencia = nuevos_precios['total'] - float(reserva.precio_total)
        
        return {
            'original_price': float(reserva.precio_total),
            'new_price': nuevos_precios['total'],
            'difference': diferencia
        }
        
    except Reserva.DoesNotExist:
        raise ValueError("Reserva no encontrada")
    except Exception as e:
        raise ValueError(f"Error al calcular diferencia: {str(e)}")