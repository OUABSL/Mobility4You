# api/services/vehiculos.py
from django.db.models import Q
from django.utils import timezone
from ..models.vehiculos import Vehiculo
from ..models.reservas import Reserva

def buscar_vehiculos_disponibles(fecha_inicio, fecha_fin, lugar_id=None, 
                                 categoria_id=None, grupo_id=None):
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

    # Filtrar por lugar si se especifica
    if lugar_id:
        vehiculos = vehiculos.filter(lugar_id=lugar_id)

    # Filtrar por categoría si se especifica
    if categoria_id:
        vehiculos = vehiculos.filter(categoria_id=categoria_id)

    # Filtrar por grupo si se especifica
    if grupo_id:
        vehiculos = vehiculos.filter(grupo_id=grupo_id)

    # Excluir vehículos con reservas que se solapen con las fechas
    reservas = Reserva.objects.filter(
        Q(fecha_recogida__lt=fecha_fin) & Q(fecha_devolucion__gt=fecha_inicio)
    )
    vehiculos_ocupados = reservas.values_list('vehiculo_id', flat=True)
    vehiculos = vehiculos.exclude(id__in=vehiculos_ocupados)

    return vehiculos

def calcular_precio_alquiler(vehiculo_id, fecha_inicio, fecha_fin, extras=None, 
                              promocion_id=None):
    """
    Calcula el precio para un alquiler con todos los componentes
    
    Args:
        vehiculo_id: ID del vehículo
        fecha_inicio: Fecha/hora de recogida
        fecha_fin: Fecha/hora de devolución
        extras: Lista de IDs de extras (opcional)
        promocion_id: ID de promoción (opcional)
    
    Returns:
        Dict con desglose de precios
    """
    from decimal import Decimal
    from django.utils import timezone
    from datetime import datetime
    import math
    from ..models.promociones import Promocion
    
    try:
        # Obtener vehículo
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        
        # Calcular días de alquiler
        if isinstance(fecha_inicio, str):
            fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
        if isinstance(fecha_fin, str):
            fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
            
        delta = fecha_fin - fecha_inicio
        dias = math.ceil(delta.total_seconds() / (24 * 3600))
        
        # Obtener precio por día vigente
        tarifa = vehiculo.tarifas.filter(
            fecha_inicio__lte=fecha_inicio.date(),
            fecha_fin__gte=fecha_fin.date()
        ).order_by('-fecha_inicio').first()
        
        precio_dia = tarifa.precio_dia if tarifa else vehiculo.precio_base
        
        # Calcular precio base
        precio_base = Decimal(str(precio_dia)) * Decimal(str(dias))
        
        # Calcular precio de extras
        precio_extras = Decimal('0.00')
        if extras:
            # Aquí se implementaría la lógica para calcular el costo de extras
            # según los extras seleccionados
            pass
        
        # Calcular impuestos (21% IVA)
        subtotal = precio_base + precio_extras
        impuestos = subtotal * Decimal('0.21')
        
        # Aplicar descuento de promoción si aplica
        descuento = Decimal('0.00')
        if promocion_id:
            try:
                promocion = Promocion.objects.get(
                    id=promocion_id,
                    activo=True,
                    fecha_inicio__lte=timezone.now().date(),
                    fecha_fin__gte=timezone.now().date()
                )
                
                porcentaje_descuento = promocion.descuento_pct / Decimal('100.00')
                descuento = subtotal * porcentaje_descuento
            except Promocion.DoesNotExist:
                pass
        
        # Calcular total
        total = subtotal + impuestos - descuento
        
        return {
            'vehiculo_id': vehiculo.id,
            'dias_alquiler': dias,
            'precio_dia': float(precio_dia),
            'precio_base': float(precio_base),
            'precio_extras': float(precio_extras),
            'subtotal': float(subtotal),
            'impuestos': float(impuestos),
            'descuento': float(descuento),
            'total': float(total)
        }
    
    except Vehiculo.DoesNotExist:
        raise ValueError("Vehículo no encontrado")
    except Exception as e:
        raise ValueError(f"Error al calcular precio: {str(e)}")