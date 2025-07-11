# vehiculos/views.py
import json
import logging
from datetime import datetime
from typing import Any, Optional

from django.db.models import Prefetch, Q
from django.http import Http404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .filters import VehiculoFilter
from .models import Categoria, GrupoCoche, Vehiculo
from .pagination import StandardResultsSetPagination
from .permissions import IsAdminOrReadOnly, PublicAccessPermission
from .serializers import (CategoriaSerializer, GrupoCocheSerializer,
                          VehiculoDetailSerializer,
                          VehiculoDisponibleSerializer, VehiculoListSerializer)
from .services import (buscar_vehiculos_disponibles, calcular_precio_alquiler,
                       verificar_disponibilidad_vehiculo)

logger = logging.getLogger(__name__)


class CategoriaViewSet(viewsets.ModelViewSet):
    """ViewSet para categorías de vehículos con manejo robusto de errores"""

    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [PublicAccessPermission]  # Acceso público para consultas

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Listado de categorías con manejo de errores"""
        try:
            queryset = self.get_queryset().order_by("nombre")

            if not queryset.exists():
                logger.warning("No se encontraron categorías de vehículos")
                return Response(
                    {
                        "success": True,
                        "message": "No hay categorías de vehículos disponibles",
                        "count": 0,
                        "results": [],
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = self.get_serializer(queryset, many=True)

            return Response(
                {
                    "success": True,
                    "count": queryset.count(),
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error en listado de categorías: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor al obtener categorías",
                    "message": "No se pudieron cargar las categorías de vehículos",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Obtener una categoría específica"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)

            return Response(
                {"success": True, "result": serializer.data}, status=status.HTTP_200_OK
            )

        except Categoria.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": "Categoría no encontrada",
                    "message": "No existe una categoría con el ID especificado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error(f"Error obteniendo categoría: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor",
                    "message": "No se pudo obtener la información de la categoría",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GrupoCocheViewSet(viewsets.ModelViewSet):
    """ViewSet para grupos de coches con manejo robusto de errores"""

    queryset = GrupoCoche.objects.all()
    serializer_class = GrupoCocheSerializer
    permission_classes = [PublicAccessPermission]  # Acceso público para consultas

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Listado de grupos de coches con manejo de errores"""
        try:
            queryset = self.get_queryset().order_by("nombre")

            if not queryset.exists():
                logger.warning("No se encontraron grupos de coches")
                return Response(
                    {
                        "success": True,
                        "message": "No hay grupos de coches disponibles",
                        "count": 0,
                        "results": [],
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = self.get_serializer(queryset, many=True)

            return Response(
                {
                    "success": True,
                    "count": queryset.count(),
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(
                f"Error en listado de grupos de coches: {str(e)}", exc_info=True
            )
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor al obtener grupos de coches",
                    "message": "No se pudieron cargar los grupos de coches",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, *args, **kwargs):
        """Obtener un grupo de coche específico"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)

            return Response(
                {"success": True, "result": serializer.data}, status=status.HTTP_200_OK
            )

        except GrupoCoche.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "error": "Grupo de coche no encontrado",
                    "message": "No existe un grupo de coche con el ID especificado",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error(f"Error obteniendo grupo de coche: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor",
                    "message": "No se pudo obtener la información del grupo de coche",
                },                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VehiculoViewSet(viewsets.ModelViewSet):
    """ViewSet para vehículos"""

    queryset = (
        Vehiculo.objects.filter(activo=True)
        .select_related("categoria", "grupo")
        .prefetch_related("imagenes", "tarifas")
    )
    serializer_class = VehiculoDetailSerializer
    permission_classes = [IsAdminOrReadOnly]  # Por defecto
    filter_backends = [DjangoFilterBackend]
    filterset_class = VehiculoFilter
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        """Personalizar permisos según la acción"""
        if self.action in [
            "disponibilidad",
            "disponibilidad_fechas",
            "list",
            "retrieve",
        ]:
            # Acceso público para consultas
            return [PublicAccessPermission()]
        else:
            # Solo admin para modificaciones
            return [IsAdminOrReadOnly()]

    def get_serializer_class(self):
        if self.action == "list":
            return VehiculoListSerializer
        elif self.action == "disponibilidad":
            return VehiculoDisponibleSerializer
        return VehiculoDetailSerializer

    def list(self, request, *args, **kwargs):
        """Listado de vehículos con estructura de respuesta estandarizada - CORREGIDO"""
        queryset = self.filter_queryset(self.get_queryset())

        # Agregar precio por defecto a vehículos que tienen tarifa válida
        vehiculos_con_precio = []
        for vehiculo in queryset:
            try:
                # Usar la nueva propiedad precio_dia_actual
                precio_actual = vehiculo.precio_dia_actual

                # Solo incluir vehículos con tarifa válida
                if precio_actual and precio_actual > 0:
                    # Asignar temporalmente para compatibilidad con serializer
                    vehiculo._precio_dia_temp = precio_actual
                    vehiculos_con_precio.append(vehiculo)
                else:
                    logger.warning(
                        f"Vehículo {vehiculo.id} sin tarifa válida, excluido del listado"
                    )

            except Exception as e:
                logger.error(
                    f"Error obteniendo precio para vehículo {vehiculo.id}: {str(e)}"
                )
                continue

        page = self.paginate_queryset(vehiculos_con_precio)
        if page is not None:
            serializer = self.get_serializer(page, many=True)            
            return self.get_paginated_response(
                {
                    "success": True,
                    "results": serializer.data,
                    "filterOptions": self._extract_filter_options(queryset),
                }
            )

        serializer = self.get_serializer(vehiculos_con_precio, many=True)
        return Response(
            {
                "success": True,
                "count": len(vehiculos_con_precio),
                "results": serializer.data,
                "filterOptions": self._extract_filter_options(queryset),
            }
        )
    @method_decorator(csrf_exempt)
    @action(detail=False, methods=["get", "post"])
    def disponibilidad(self, request):
        """Busca vehículos disponibles según criterios usando servicios"""
        try:
            # Extraer parámetros con manejo robusto de diferentes tipos de request
            if request.method == "GET":
                request_data = request.GET.dict()
            else:
                request_data = getattr(request, 'data', {})
                
                # Si no hay data parseada, intentar obtener del body JSON manualmente
                if not request_data and hasattr(request, 'body') and request.body:
                    import json
                    try:
                        request_data = json.loads(request.body.decode('utf-8'))
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        request_data = {}
                
                # También intentar obtener de POST data si no hay JSON
                if not request_data:
                    request_data = request.POST.dict() if hasattr(request, 'POST') else {}            # Extraer parámetros con diferentes nombres posibles
            fecha_recogida = (request_data.get("fecha_recogida") or 
                            request_data.get("pickupDate") or 
                            request_data.get("fecha_inicio"))
            fecha_devolucion = (request_data.get("fecha_devolucion") or 
                              request_data.get("dropoffDate") or 
                              request_data.get("fecha_fin"))
            lugar_recogida_id = request_data.get("lugar_recogida_id") or request_data.get("pickupLocation")
            lugar_devolucion_id = request_data.get("lugar_devolucion_id") or request_data.get("dropoffLocation")
            categoria_id = request_data.get("categoria_id")
            grupo_id = request_data.get("grupo_id")

            # Log para debugging
            logger.info(f"Búsqueda de disponibilidad - Datos recibidos: {request_data}")            # Validar fechas
            if not fecha_recogida or not fecha_devolucion:
                return Response(
                    {
                        "success": False,
                        "error": "Fechas requeridas",
                        "message": "Se requieren fecha_recogida/fecha_inicio y fecha_devolucion/fecha_fin",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
                # Convertir fechas
            try:
                if isinstance(fecha_recogida, str):
                    fecha_recogida = datetime.fromisoformat(
                        fecha_recogida.replace("Z", "+00:00")
                    )
                if isinstance(fecha_devolucion, str):
                    fecha_devolucion = datetime.fromisoformat(
                        fecha_devolucion.replace("Z", "+00:00")
                    )
            except ValueError as e:
                return Response(
                    {"success": False, "error": f"Formato de fecha inválido: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Usar el servicio de búsqueda de vehículos disponibles
            vehiculos_disponibles = buscar_vehiculos_disponibles(
                fecha_inicio=fecha_recogida,
                fecha_fin=fecha_devolucion,
                lugar_id=lugar_recogida_id,
                categoria_id=categoria_id,
                grupo_id=grupo_id
            )            # Obtener vehículos con precio válido para las fechas
            vehiculos_con_precio = []
            for vehiculo in vehiculos_disponibles:
                try:
                    # Usar el nuevo método para obtener precio para fechas específicas
                    precio_dia = vehiculo.get_precio_para_fechas(fecha_recogida)

                    if precio_dia and precio_dia > 0:
                        # Asignar temporalmente para el serializer
                        vehiculo._precio_dia_temp = precio_dia
                        vehiculos_con_precio.append(vehiculo)
                    else:
                        logger.warning(
                            f"Vehículo {vehiculo.id} sin tarifa válida para fechas {fecha_recogida} - {fecha_devolucion}"
                        )

                except Exception as e:
                    logger.error(
                        f"Error obteniendo precio para vehículo {vehiculo.id}: {str(e)}"
                    )
                    continue

            # Serializar resultados
            serializer = self.get_serializer(vehiculos_con_precio, many=True)

            # Generar filterOptions basado en vehículos válidos
            filter_options = self._extract_filter_options(vehiculos_con_precio)

            return Response(
                {
                    "success": True,
                    "count": len(vehiculos_con_precio),
                    "results": serializer.data,
                    "filterOptions": filter_options,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error en búsqueda de disponibilidad: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _extract_filter_options(self, vehiculos):
        """Extrae opciones de filtrado de una lista de vehículos - CORREGIDO"""
        if not vehiculos:
            return {
                "marca": [],
                "modelo": [],
                "combustible": [],
                "orden": [
                    "Precio ascendente",
                    "Precio descendente",
                    "Marca A-Z",
                    "Marca Z-A",
                ],
            }

        try:
            # Convertir QuerySet a lista si es necesario
            if hasattr(vehiculos, "all"):
                vehiculos_list = list(vehiculos)
            else:
                vehiculos_list = vehiculos

            marcas = sorted(list(set(v.marca for v in vehiculos_list if v.marca)))
            modelos = sorted(list(set(v.modelo for v in vehiculos_list if v.modelo)))
            combustibles = sorted(
                list(set(v.combustible for v in vehiculos_list if v.combustible))
            )

            return {
                "marca": marcas,
                "modelo": modelos,
                "combustible": combustibles,
                "orden": [
                    "Precio ascendente",
                    "Precio descendente",
                    "Marca A-Z",
                    "Marca Z-A",
                ],
            }
        except Exception as e:
            logger.error(f"Error extrayendo opciones de filtro: {str(e)}")
            return {
                "marca": [],
                "modelo": [],
                "combustible": [],
                "orden": [
                    "Precio ascendente",
                    "Precio descendente",
                    "Marca A-Z",
                    "Marca Z-A",
                ],            }
    @action(detail=True, methods=["get"])
    def disponibilidad_fechas(self, request, pk=None):
        """Obtiene las fechas en las que un vehículo NO está disponible"""
        vehiculo = self.get_object()

        # Usar el servicio para obtener fechas no disponibles
        from .services import obtener_fechas_no_disponibles
        fechas_no_disponibles = obtener_fechas_no_disponibles(vehiculo.id)

        return Response(
            {"vehiculo_id": vehiculo.id, "fechas_no_disponibles": fechas_no_disponibles}
        )
