# vehiculos/services.py
"""
Servicios para la gestión de vehículos y disponibilidad
Migrado desde api/services/vehiculos.py
"""
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from django.db.models import Q, QuerySet
from django.utils import timezone

# Direct imports - removing lazy imports as per best practices
from reservas.models import Reserva

from .models import Categoria, GrupoCoche, Vehiculo

logger = logging.getLogger(__name__)


def buscar_vehiculos_disponibles(
    fecha_inicio: datetime,
    fecha_fin: datetime,
    lugar_id: Optional[int] = None,
    categoria_id: Optional[int] = None,
    grupo_id: Optional[int] = None
) -> QuerySet[Vehiculo]:
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
    logger.info(f"Búsqueda de vehículos disponibles: {fecha_inicio} - {fecha_fin}")
    
    # Base: vehículos activos y disponibles
    vehiculos = Vehiculo.objects.filter(activo=True, disponible=True)    # Filtrar por lugar si se especifica (lugar de recogida)
    if lugar_id:
        # Nota: Filtrado por lugar deshabilitado hasta que se implemente el modelo Lugar
        logger.info(f"Filtrado por lugar {lugar_id} solicitado pero no implementado")
        pass

    # Filtrar por categoría si se especifica
    if categoria_id:
        try:
            categoria = Categoria.objects.get(id=categoria_id)
            vehiculos = vehiculos.filter(categoria_id=categoria_id)
            logger.info(f"Filtrado por categoría: {categoria.nombre}")
        except Categoria.DoesNotExist:
            logger.warning(f"Categoría {categoria_id} no encontrada")
            return Vehiculo.objects.none()

    # Filtrar por grupo si se especifica
    if grupo_id:
        try:
            grupo = GrupoCoche.objects.get(id=grupo_id)
            vehiculos = vehiculos.filter(grupo_id=grupo_id)
            logger.info(f"Filtrado por grupo: {grupo.nombre}")
        except GrupoCoche.DoesNotExist:
            logger.warning(f"Grupo {grupo_id} no encontrado")
            return Vehiculo.objects.none()    # Excluir vehículos con reservas que se solapen con las fechas
    try:
        reservas_solapadas = Reserva.objects.filter(
            vehiculo_id__in=vehiculos.values_list("id", flat=True),
            estado__in=["pendiente", "confirmada", "pagada"],
            fecha_recogida__lt=fecha_fin,
            fecha_devolucion__gt=fecha_inicio,
        ).values_list("vehiculo_id", flat=True)
        
        vehiculos = vehiculos.exclude(id__in=reservas_solapadas)
        logger.info(f"Excluidos {len(reservas_solapadas)} vehículos con reservas solapadas")
        
    except Exception as e:
        logger.error(f"Error filtrando reservas solapadas: {str(e)}")
        # Continuar sin filtrar si hay error en reservas

    vehiculos_count = vehiculos.count()
    logger.info(f"Vehículos disponibles encontrados: {vehiculos_count}")
    
    return vehiculos


def calcular_precio_alquiler(
    vehiculo_id: int,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    extras: Optional[list] = None,
    promocion_id: Optional[int] = None
) -> dict:
    """
    Calcula el precio total de alquiler para un vehículo

    Args:
        vehiculo_id: ID del vehículo
        fecha_inicio: Fecha/hora de recogida
        fecha_fin: Fecha/hora de devolución
        extras: Lista de extras opcionales
        promocion_id: ID de promoción a aplicar (opcional)

    Returns:
        Dict con desglose de precios
    """
    logger.info(f"Calculando precio para vehículo {vehiculo_id}: {fecha_inicio} - {fecha_fin}")
    
    try:
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    except Vehiculo.DoesNotExist:
        logger.error(f"Vehículo {vehiculo_id} no encontrado")
        raise ValueError(f"Vehículo {vehiculo_id} no encontrado")

    # Calcular días de alquiler
    dias = (fecha_fin - fecha_inicio).days
    if dias <= 0:
        dias = 1  # Mínimo 1 día

    # Obtener precio por día del vehículo
    precio_dia = vehiculo.get_precio_para_fechas(fecha_inicio)
    if not precio_dia or precio_dia <= 0:
        logger.error(f"No hay tarifa válida para vehículo {vehiculo_id} en las fechas especificadas")
        raise ValueError("No hay tarifa válida para las fechas especificadas")

    # Precio base
    precio_base = precio_dia * dias
    
    # Calcular extras
    precio_extras = Decimal('0.00')
    extras_detalle = []
    
    if extras:
        try:
            # Lazy import de Extras
            from reservas.models import Extras as ExtrasModel
            
            for extra_id in extras:
                try:
                    extra = ExtrasModel.objects.get(id=extra_id)
                    precio_extra = extra.precio * dias  # Extras por día
                    precio_extras += precio_extra
                    extras_detalle.append({
                        'id': extra.id,
                        'nombre': extra.nombre,
                        'precio_por_dia': float(extra.precio),
                        'dias': dias,
                        'precio_total': float(precio_extra)
                    })
                    logger.info(f"Extra agregado: {extra.nombre} - ${precio_extra}")
                except ExtrasModel.DoesNotExist:
                    logger.warning(f"Extra {extra_id} no encontrado")
                    
        except ImportError:
            logger.warning("Modelo Extras no disponible, saltando cálculo de extras")

    # Precio antes de descuentos
    precio_antes_descuento = precio_base + precio_extras
    
    # Aplicar promoción/descuento
    descuento = Decimal('0.00')
    promocion_aplicada = None
    
    if promocion_id:
        try:
            # Lazy import de Promocion
            from politicas.models import Promocion
            
            promocion = Promocion.objects.get(
                id=promocion_id,
                activo=True,
                fecha_inicio__lte=fecha_inicio.date(),
                fecha_fin__gte=fecha_fin.date()
            )
            
            if promocion.tipo_descuento == 'porcentaje':
                descuento = precio_antes_descuento * (promocion.valor_descuento / 100)
            elif promocion.tipo_descuento == 'fijo':
                descuento = promocion.valor_descuento
                
            # Aplicar descuento máximo si existe
            if promocion.descuento_maximo and descuento > promocion.descuento_maximo:
                descuento = promocion.descuento_maximo
                
            promocion_aplicada = {
                'id': promocion.id,
                'nombre': promocion.nombre,
                'tipo': promocion.tipo_descuento,
                'valor': float(promocion.valor_descuento),
                'descuento_aplicado': float(descuento)
            }
            
            logger.info(f"Promoción aplicada: {promocion.nombre} - Descuento: ${descuento}")
            
        except ImportError:
            logger.warning("Modelo Promocion no disponible")
        except Exception as e:
            logger.warning(f"Error aplicando promoción {promocion_id}: {str(e)}")

    # Precio final
    precio_total = precio_antes_descuento - descuento
    
    # Asegurar que el precio no sea negativo
    if precio_total < 0:
        precio_total = Decimal('0.00')

    resultado = {
        'vehiculo_id': vehiculo_id,
        'vehiculo_info': {
            'marca': vehiculo.marca,
            'modelo': vehiculo.modelo,
            'categoria': vehiculo.categoria.nombre if vehiculo.categoria else None,
        },
        'periodo': {
            'fecha_inicio': fecha_inicio.isoformat(),
            'fecha_fin': fecha_fin.isoformat(),
            'dias': dias
        },
        'precios': {
            'precio_por_dia': float(precio_dia),
            'precio_base': float(precio_base),
            'precio_extras': float(precio_extras),
            'precio_antes_descuento': float(precio_antes_descuento),
            'descuento': float(descuento),
            'precio_total': float(precio_total)
        },
        'extras': extras_detalle,
        'promocion': promocion_aplicada
    }
    
    logger.info(f"Precio calculado: ${precio_total} para {dias} días")
    
    return resultado


def obtener_vehiculos_por_categoria(categoria_id: int) -> QuerySet[Vehiculo]:
    """
    Obtiene vehículos activos de una categoría específica
    
    Args:
        categoria_id: ID de la categoría
        
    Returns:
        QuerySet de vehículos
    """
    try:
        categoria = Categoria.objects.get(id=categoria_id)
        vehiculos = Vehiculo.objects.filter(
            categoria=categoria,
            activo=True,
            disponible=True
        ).select_related('categoria', 'grupo').prefetch_related('imagenes', 'tarifas')
        
        logger.info(f"Encontrados {vehiculos.count()} vehículos en categoría {categoria.nombre}")
        return vehiculos
        
    except Categoria.DoesNotExist:
        logger.error(f"Categoría {categoria_id} no encontrada")
        return Vehiculo.objects.none()


def obtener_vehiculos_por_grupo(grupo_id: int) -> QuerySet[Vehiculo]:
    """
    Obtiene vehículos activos de un grupo específico
    
    Args:
        grupo_id: ID del grupo
        
    Returns:
        QuerySet de vehículos
    """
    try:
        grupo = GrupoCoche.objects.get(id=grupo_id)
        vehiculos = Vehiculo.objects.filter(
            grupo=grupo,
            activo=True,
            disponible=True
        ).select_related('categoria', 'grupo').prefetch_related('imagenes', 'tarifas')
        
        logger.info(f"Encontrados {vehiculos.count()} vehículos en grupo {grupo.nombre}")
        return vehiculos
        
    except GrupoCoche.DoesNotExist:
        logger.error(f"Grupo {grupo_id} no encontrado")
        return Vehiculo.objects.none()


def verificar_disponibilidad_vehiculo(
    vehiculo_id: int,
    fecha_inicio: datetime,
    fecha_fin: datetime,
    excluir_reserva_id: Optional[int] = None
) -> bool:
    """
    Verifica si un vehículo específico está disponible en un período
    
    Args:
        vehiculo_id: ID del vehículo
        fecha_inicio: Fecha/hora de inicio
        fecha_fin: Fecha/hora de fin
        excluir_reserva_id: ID de reserva a excluir de la verificación (para ediciones)
        
    Returns:
        True si está disponible, False en caso contrario
    """
    try:
        vehiculo = Vehiculo.objects.get(id=vehiculo_id)
        
        if not vehiculo.activo or not vehiculo.disponible:
            logger.info(f"Vehículo {vehiculo_id} no está activo o disponible")
            return False
              # Verificar solapamientos con reservas existentes
        conflictos = Reserva.objects.filter(
            vehiculo_id=vehiculo_id,
            estado__in=["pendiente", "confirmada", "pagada"],
            fecha_recogida__lt=fecha_fin,
            fecha_devolucion__gt=fecha_inicio,
        )
        
        # Excluir una reserva específica si se proporciona (para ediciones)
        if excluir_reserva_id:
            conflictos = conflictos.exclude(id=excluir_reserva_id)
            
        tiene_conflictos = conflictos.exists()
        
        if tiene_conflictos:
            logger.info(f"Vehículo {vehiculo_id} tiene conflictos de reserva")
            return False
            
        logger.info(f"Vehículo {vehiculo_id} disponible para el período solicitado")
        return True
        
    except Vehiculo.DoesNotExist:
        logger.error(f"Vehículo {vehiculo_id} no encontrado")
        return False
    except Exception as e:
        logger.error(f"Error verificando disponibilidad de vehículo {vehiculo_id}: {str(e)}")
        return False


def obtener_fechas_no_disponibles(vehiculo_id: int) -> List[dict]:
    """
    Obtiene las fechas en las que un vehículo NO está disponible
    
    Args:
        vehiculo_id: ID del vehículo
          Returns:
        Lista de diccionarios con fechas de inicio y fin no disponibles
    """
    try:
        # Obtener reservas confirmadas futuras
        reservas = Reserva.objects.filter(
            vehiculo_id=vehiculo_id, 
            estado="confirmada", 
            fecha_devolucion__gte=timezone.now()
        ).values("fecha_recogida", "fecha_devolucion")

        fechas_no_disponibles = []
        for reserva in reservas:
            fechas_no_disponibles.append({
                "inicio": reserva["fecha_recogida"],
                "fin": reserva["fecha_devolucion"],
            })

        return fechas_no_disponibles
        
    except Exception as e:
        logger.error(f"Error obteniendo fechas no disponibles para vehículo {vehiculo_id}: {str(e)}")
        return []
