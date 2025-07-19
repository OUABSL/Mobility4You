# lugares/services.py
"""
Servicios para la gestión de lugares y direcciones
"""
import logging
from decimal import Decimal
from typing import List, Optional, Tuple

from django.db.models import Q, QuerySet

from .models import Direccion, Lugar

logger = logging.getLogger(__name__)


class LugarService:
    """Servicio para operaciones con lugares"""

    @staticmethod
    def buscar_lugares_activos() -> QuerySet[Lugar]:
        """Obtener todos los lugares activos"""
        return Lugar.objects.filter(activo=True).select_related("direccion")

    @staticmethod
    def buscar_lugares_populares() -> QuerySet[Lugar]:
        """Obtener lugares populares y activos"""
        return (
            Lugar.objects.filter(activo=True, popular=True)
            .select_related("direccion")
            .order_by("nombre")
        )

    @staticmethod
    def buscar_destinos_disponibles() -> QuerySet[Lugar]:
        """Obtener lugares que pueden ser destinos (con coordenadas)"""
        return (
            Lugar.objects.filter(
                activo=True,
                latitud__isnull=False,
                longitud__isnull=False,
            )
            .select_related("direccion")
            .order_by("nombre")
        )

    @staticmethod
    def buscar_por_ciudad(ciudad: str) -> QuerySet[Lugar]:
        """Buscar lugares por ciudad"""
        return (
            Lugar.objects.filter(
                activo=True,
                direccion__ciudad__icontains=ciudad
            )
            .select_related("direccion")
            .order_by("nombre")
        )

    @staticmethod
    def buscar_por_provincia(provincia: str) -> QuerySet[Lugar]:
        """Buscar lugares por provincia"""
        return (
            Lugar.objects.filter(
                activo=True,
                direccion__provincia__icontains=provincia
            )
            .select_related("direccion")
            .order_by("nombre")
        )

    @staticmethod
    def buscar_cercanos(latitud: Decimal, longitud: Decimal, radio_km: float = 50) -> QuerySet[Lugar]:
        """
        Buscar lugares cercanos a unas coordenadas
        
        Args:
            latitud: Latitud de referencia
            longitud: Longitud de referencia
            radio_km: Radio de búsqueda en kilómetros
        
        Returns:
            QuerySet de lugares cercanos
        """
        # Aproximación simple usando diferencias de coordenadas
        # Para mayor precisión se podría usar la fórmula de Haversine
        delta_lat = Decimal(radio_km / 111)  # Aproximadamente 111 km por grado de latitud
        delta_lon = Decimal(radio_km / (111 * float(latitud.cos()) if hasattr(latitud, 'cos') else 111))
        
        return (
            Lugar.objects.filter(
                activo=True,
                latitud__range=(latitud - delta_lat, latitud + delta_lat),
                longitud__range=(longitud - delta_lon, longitud + delta_lon),
            )
            .select_related("direccion")
            .order_by("nombre")
        )

    @staticmethod
    def obtener_estadisticas_lugares() -> dict:
        """Obtener estadísticas de lugares"""
        total = Lugar.objects.count()
        activos = Lugar.objects.filter(activo=True).count()
        populares = Lugar.objects.filter(activo=True, popular=True).count()
        con_coordenadas = Lugar.objects.filter(
            activo=True,
            latitud__isnull=False,
            longitud__isnull=False,
        ).count()

        return {
            "total": total,
            "activos": activos,
            "populares": populares,
            "con_coordenadas": con_coordenadas,
            "inactivos": total - activos,
        }

    @staticmethod
    def crear_lugar_con_direccion(lugar_data: dict, direccion_data: dict) -> Lugar:
        """
        Crear un lugar con su dirección de manera atómica y segura
        
        Args:
            lugar_data: Datos del lugar (nombre, teléfono, email, etc.)
            direccion_data: Datos de la dirección (calle, ciudad, provincia, etc.)
        
        Returns:
            Lugar creado con su dirección asociada
        
        Raises:
            ValueError: Si los datos son inválidos
            Exception: Si hay error en la creación
        """
        from django.db import transaction
        
        # Validaciones previas
        if not direccion_data.get('ciudad'):
            raise ValueError("La ciudad es obligatoria para crear un lugar")
        
        if not direccion_data.get('codigo_postal'):
            raise ValueError("El código postal es obligatorio para crear un lugar")
        
        if not lugar_data.get('nombre'):
            raise ValueError("El nombre del lugar es obligatorio")
        
        # Normalizar datos de dirección
        direccion_normalizada = DireccionService.normalizar_direccion(direccion_data)
        
        try:
            with transaction.atomic():
                # PASO 1: Crear y guardar la dirección
                direccion = Direccion.objects.create(
                    calle=direccion_normalizada.get('calle', ''),
                    ciudad=direccion_normalizada.get('ciudad', ''),
                    provincia=direccion_normalizada.get('provincia', ''),
                    pais=direccion_normalizada.get('pais', 'España'),
                    codigo_postal=direccion_normalizada.get('codigo_postal', '')
                )
                
                logger.info(f"Dirección creada exitosamente con ID: {direccion.pk}")
                
                # PASO 2: Crear el lugar con la dirección asociada
                lugar = Lugar.objects.create(
                    nombre=lugar_data['nombre'],
                    direccion=direccion,
                    latitud=lugar_data.get('latitud'),
                    longitud=lugar_data.get('longitud'),
                    telefono=lugar_data.get('telefono', ''),
                    email=lugar_data.get('email', ''),
                    icono_url=lugar_data.get('icono_url', ''),
                    info_adicional=lugar_data.get('info_adicional', ''),
                    activo=lugar_data.get('activo', True),
                    popular=lugar_data.get('popular', False)
                )
                
                logger.info(f"Lugar '{lugar.nombre}' creado exitosamente con dirección ID: {direccion.pk}")
                
                return lugar
                
        except Exception as e:
            logger.error(f"Error al crear lugar con dirección: {str(e)}")
            raise Exception(f"Error al crear lugar: {str(e)}")

    @staticmethod
    def actualizar_lugar_con_direccion(lugar: Lugar, lugar_data: dict, direccion_data: dict) -> Lugar:
        """
        Actualizar un lugar y su dirección de manera atómica
        
        Args:
            lugar: Instancia del lugar a actualizar
            lugar_data: Nuevos datos del lugar
            direccion_data: Nuevos datos de la dirección
        
        Returns:
            Lugar actualizado
        """
        from django.db import transaction
        
        try:
            with transaction.atomic():
                # Actualizar dirección
                if lugar.direccion:
                    direccion = lugar.direccion
                    direccion_normalizada = DireccionService.normalizar_direccion(direccion_data)
                    
                    direccion.calle = direccion_normalizada.get('calle', direccion.calle)
                    direccion.ciudad = direccion_normalizada.get('ciudad', direccion.ciudad)
                    direccion.provincia = direccion_normalizada.get('provincia', direccion.provincia)
                    direccion.pais = direccion_normalizada.get('pais', direccion.pais)
                    direccion.codigo_postal = direccion_normalizada.get('codigo_postal', direccion.codigo_postal)
                    direccion.save()
                    
                    logger.info(f"Dirección {direccion.pk} actualizada exitosamente")
                
                # Actualizar lugar
                for field, value in lugar_data.items():
                    if hasattr(lugar, field) and field != 'direccion':
                        setattr(lugar, field, value)
                
                lugar.save()
                logger.info(f"Lugar '{lugar.nombre}' actualizado exitosamente")
                
                return lugar
                
        except Exception as e:
            logger.error(f"Error al actualizar lugar: {str(e)}")
            raise Exception(f"Error al actualizar lugar: {str(e)}")


class DireccionService:
    """Servicio para operaciones con direcciones"""

    @staticmethod
    def normalizar_direccion(direccion_data: dict) -> dict:
        """Normalizar datos de dirección"""
        normalized = direccion_data.copy()
        
        if "ciudad" in normalized and normalized["ciudad"]:
            normalized["ciudad"] = normalized["ciudad"].strip().title()
        
        if "provincia" in normalized and normalized["provincia"]:
            normalized["provincia"] = normalized["provincia"].strip().title()
        
        if "pais" in normalized and normalized["pais"]:
            normalized["pais"] = normalized["pais"].strip().title()
        
        if "codigo_postal" in normalized and normalized["codigo_postal"]:
            normalized["codigo_postal"] = normalized["codigo_postal"].strip()
        
        return normalized

    @staticmethod
    def buscar_por_codigo_postal(codigo_postal: str) -> QuerySet[Direccion]:
        """Buscar direcciones por código postal"""
        return Direccion.objects.filter(codigo_postal=codigo_postal)

    @staticmethod
    def obtener_ciudades_disponibles() -> List[str]:
        """Obtener lista de ciudades con lugares activos"""
        ciudades = (
            Direccion.objects.filter(lugar__activo=True)
            .values_list("ciudad", flat=True)
            .distinct()
            .order_by("ciudad")
        )
        return [ciudad for ciudad in ciudades if ciudad]

    @staticmethod
    def obtener_provincias_disponibles() -> List[str]:
        """Obtener lista de provincias con lugares activos"""
        provincias = (
            Direccion.objects.filter(lugar__activo=True)
            .values_list("provincia", flat=True)
            .distinct()
            .order_by("provincia")
        )
        return [provincia for provincia in provincias if provincia]


def calcular_distancia_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcular distancia entre dos puntos usando la fórmula de Haversine
    
    Args:
        lat1, lon1: Coordenadas del primer punto
        lat2, lon2: Coordenadas del segundo punto
    
    Returns:
        Distancia en kilómetros
    """
    import math

    # Convertir grados a radianes
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Diferencias
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    # Fórmula de Haversine
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))
    
    # Radio de la Tierra en kilómetros
    r = 6371
    
    return c * r


def validar_coordenadas(latitud: Optional[float], longitud: Optional[float]) -> Tuple[bool, str]:
    """
    Validar que las coordenadas sean válidas
    
    Args:
        latitud: Latitud a validar
        longitud: Longitud a validar
    
    Returns:
        Tupla (es_valido, mensaje_error)
    """
    if latitud is None or longitud is None:
        return True, ""  # Coordenadas opcionales
    
    if not (-90 <= latitud <= 90):
        return False, "La latitud debe estar entre -90 y 90 grados"
    
    if not (-180 <= longitud <= 180):
        return False, "La longitud debe estar entre -180 y 180 grados"
    
    return True, ""
