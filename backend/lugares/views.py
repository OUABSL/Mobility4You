# lugares/views.py
import logging
from typing import Any

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Direccion, Lugar
from .permissions import IsAdminOrReadOnly, PublicAccessPermission
from .serializers import (DireccionSerializer, LugarCreateSerializer,
                          LugarListSerializer, LugarSerializer)

logger = logging.getLogger(__name__)


class DireccionViewSet(viewsets.ModelViewSet):
    """ViewSet para direcciones"""

    queryset = Direccion.objects.all()
    serializer_class = DireccionSerializer
    permission_classes = [IsAdminOrReadOnly]

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """Listado de direcciones con manejo de errores"""
        try:
            queryset = self.get_queryset().order_by("ciudad", "provincia")

            if not queryset.exists():
                logger.warning("No se encontraron direcciones")
                return Response(
                    {
                        "success": True,
                        "message": "No hay direcciones disponibles",
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
            logger.error(f"Error en listado de direcciones: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor al obtener direcciones",
                    "message": "No se pudieron cargar las direcciones",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LugarViewSet(viewsets.ModelViewSet):
    """ViewSet para lugares con manejo robusto de errores"""

    queryset = Lugar.objects.select_related("direccion")
    permission_classes = [PublicAccessPermission]

    def get_serializer_class(self):
        """Seleccionar serializer según la acción"""
        if self.action == "list":
            return LugarListSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return LugarCreateSerializer
        return LugarSerializer

    def list(self, request, *args, **kwargs):
        """Listado de lugares con manejo de errores"""
        try:
            queryset = self.get_queryset().filter(activo=True).order_by("nombre")

            if not queryset.exists():
                logger.warning("No se encontraron lugares activos")
                return Response(
                    {
                        "success": True,
                        "message": "No hay lugares disponibles",
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
            logger.error(f"Error en listado de lugares: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor al obtener lugares",
                    "message": "No se pudieron cargar los lugares",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, *args, **kwargs):
        """Obtener un lugar específico"""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)

            return Response(
                {
                    "success": True,
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al obtener lugar: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Lugar no encontrado",
                    "message": "El lugar solicitado no existe o no está disponible",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def populares(self, request):
        """Obtener lugares populares"""
        try:
            lugares = self.get_queryset().filter(activo=True, popular=True).order_by("nombre")
            
            if not lugares.exists():
                return Response(
                    {
                        "success": True,
                        "message": "No hay lugares populares disponibles",
                        "count": 0,
                        "results": [],
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = LugarListSerializer(lugares, many=True)
            
            return Response(
                {
                    "success": True,
                    "count": lugares.count(),
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al obtener lugares populares: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error al obtener lugares populares",
                    "message": "No se pudieron cargar los lugares populares",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def activos(self, request):
        """Obtener solo lugares activos"""
        try:
            lugares = self.get_queryset().filter(activo=True).order_by("nombre")
            
            if not lugares.exists():
                return Response(
                    {
                        "success": True,
                        "message": "No hay lugares activos disponibles",
                        "count": 0,
                        "results": [],
                    },
                    status=status.HTTP_200_OK,
                )

            serializer = LugarListSerializer(lugares, many=True)
            
            return Response(
                {
                    "success": True,
                    "count": lugares.count(),
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al obtener lugares activos: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error al obtener lugares activos",
                    "message": "No se pudieron cargar los lugares activos",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def destinos(self, request):
        """Obtener destinos disponibles (lugares con coordenadas)"""
        try:
            # Filtrar lugares que tengan coordenadas y estén activos
            destinos = (
                self.get_queryset()
                .filter(
                    activo=True,
                    latitud__isnull=False,
                    longitud__isnull=False,
                )
                .order_by("nombre")
            )

            if not destinos.exists():
                logger.warning("No se encontraron destinos disponibles")
                return Response(
                    {
                        "success": True,
                        "message": "No hay destinos disponibles",
                        "count": 0,
                        "results": [],
                    },
                    status=status.HTTP_200_OK,
                )

            # Usar un serializer que incluya las coordenadas
            serializer = LugarSerializer(destinos, many=True)

            logger.info(f"Destinos encontrados: {destinos.count()}")

            return Response(
                {
                    "success": True,
                    "count": destinos.count(),
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error al obtener destinos: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error interno del servidor al obtener destinos",
                    "message": "No se pudieron cargar los destinos",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def vehiculos_disponibles(self, request, pk=None):
        """Obtener vehículos disponibles en este lugar"""
        try:
            lugar = self.get_object()
            
            # Lazy import para evitar dependencias circulares
            try:
                from vehiculos.models import Vehiculo
                vehiculos = Vehiculo.objects.filter(
                    activo=True,
                    disponible=True,
                    # Aquí podrías agregar lógica para filtrar por lugar
                    # lugar_recogida=lugar
                )
                
                from vehiculos.serializers import VehiculoListSerializer
                serializer = VehiculoListSerializer(vehiculos, many=True)
                
                return Response(
                    {
                        "success": True,
                        "lugar": lugar.nombre,
                        "count": vehiculos.count(),
                        "vehiculos": serializer.data,
                    },
                    status=status.HTTP_200_OK,
                )
                
            except ImportError:
                logger.warning("No se pudo importar el modelo Vehiculo")
                return Response(
                    {
                        "success": True,
                        "lugar": lugar.nombre,
                        "count": 0,
                        "vehiculos": [],
                        "message": "Módulo de vehículos no disponible",
                    },
                    status=status.HTTP_200_OK,
                )

        except Exception as e:
            logger.error(f"Error al obtener vehículos por lugar: {str(e)}", exc_info=True)
            return Response(
                {
                    "success": False,
                    "error": "Error al obtener vehículos disponibles",
                    "message": "No se pudieron cargar los vehículos para este lugar",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def handle_exception(self, exc):
        """Manejo centralizado de excepciones"""
        logger.error(f"Excepción en LugarViewSet: {str(exc)}", exc_info=True)
        
        response_data = {
            "success": False,
            "error": "Error interno del servidor",
            "message": "Ha ocurrido un error inesperado. Por favor, inténtelo más tarde.",
        }
        
        return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
