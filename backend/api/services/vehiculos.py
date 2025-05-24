# api/services/vehiculos.py
from django.db.models import Q
from django.utils import timezone
from ..models.vehiculos import Vehiculo
from ..models.reservas import Reserva

def buscar_vehiculos_disponibles(fecha_inicio, fecha_fin, lugar_id=None, categoria_id=None, grupo_id=None):
    """
    Busca vehículos disponibles según criterios
    
    Args:
        fecha_inicio: Fecha/hora de recogida
        fecha_fin: Fecha/hora de devolución
        lugar_id: ID del lugar de recogida (opcional)
        categoria_id: ID de categoría (opcional)
        grupo_id: ID de grupo de coche (opcional)
        
    Returns:
        QuerySet con vehículos disponibles
    """
    # Base: vehículos activos
    vehiculos = Vehiculo.objects.filter(activo=True)

    # Filtrar por lugar si se especifica (lugar de recogida)
    if lugar_id:
        vehiculos = vehiculos.filter(lugar_actual_id=lugar_id)

    # Filtrar por categoría si se especifica
    if categoria_id:
        vehiculos = vehiculos.filter(categoria_id=categoria_id)

    # Filtrar por grupo si se especifica
    if grupo_id:
        vehiculos = vehiculos.filter(grupo_id=grupo_id)

    # Excluir vehículos con reservas que se solapen con las fechas
    reservas_solapadas = Reserva.objects.filter(
        vehiculo_id__in=vehiculos.values_list('id', flat=True),
        estado__in=['pendiente', 'confirmada'],
        fecha_recogida__lt=fecha_fin,
        fecha_devolucion__gt=fecha_inicio
    ).values_list('vehiculo_id', flat=True)
    vehiculos = vehiculos.exclude(id__in=reservas_solapadas)

    return vehiculos

def calcular_precio_alquiler(vehiculo_id, fecha_inicio, fecha_fin, extras=None, promocion_id=None):
    """
    Calcula el precio total del alquiler de un vehículo
    
    Args:
        vehiculo_id: ID del vehículo
        fecha_inicio: Fecha/hora de recogida
        fecha_fin: Fecha/hora de devolución
        extras: Lista de IDs de extras (opcional)
        promocion_id: ID de promoción (opcional)
    
    Returns:
        Dict con desglose de precios
    """
    from ..models.vehiculos import Vehiculo
    from ..models.promociones import Promocion
    from dateutil.relativedelta import relativedelta
    from decimal import Decimal
    import math

    vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    dias = (fecha_fin - fecha_inicio).days
    if dias < 1:
        dias = 1
    precio_base = vehiculo.precio_dia * Decimal(dias)

    # Sumar extras
    total_extras = Decimal('0.00')
    if extras:
        for extra in extras:
            total_extras += Decimal(str(extra.get('precio', 0)))

    # Aplicar promoción si corresponde
    descuento = Decimal('0.00')
    if promocion_id:
        try:
            promo = Promocion.objects.get(id=promocion_id, activo=True)
            descuento = (precio_base + total_extras) * (promo.descuento_pct / Decimal('100'))
        except Promocion.DoesNotExist:
            pass

    total = precio_base + total_extras - descuento
    if total < 0:
        total = Decimal('0.00')
    return {
        'precio_base': precio_base,
        'total_extras': total_extras,
        'descuento': descuento,
        'total': total
    }