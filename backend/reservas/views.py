# reservas/views.py
import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
# Direct imports - removing lazy imports as per best practices
from usuarios.models import Usuario

from .models import Extras, Reserva
from .serializers import (ExtrasSerializer, ReservaCreateSerializer,
                          ReservaDetailSerializer, ReservaSerializer,
                          ReservaUpdateSerializer)

try:
    from .services import ReservaService
except ImportError:
    # Fallback si no existe el servicio local
    try:
        from api.services.reservas import ReservaService
    except ImportError:
        # Fallback si no existe el servicio (durante pruebas modulares)
        class ReservaService:
            def calcular_precio_reserva(self, data):
                return {"success": True, "precio_total": 100.00}


try:
    from payments.services import StripePaymentService
except ImportError:
    # Fallback si no existe el servicio
    class StripePaymentService:
        pass


# Importar permisos locales
from .permissions import PublicAccessPermission

logger = logging.getLogger(__name__)

# DEBUG_MODE para ignorar procesamiento de pagos en desarrollo
DEBUG_MODE = getattr(settings, "DEBUG", False)


class ExtrasViewSet(viewsets.ModelViewSet):
    """ViewSet para extras de reservas"""

    queryset = Extras.objects.all()
    serializer_class = ExtrasSerializer

    permission_classes = [PublicAccessPermission]


class ReservaViewSet(viewsets.ModelViewSet):
    """
    ViewSet mejorado para manejo de reservas con logging completo,
    validación robusta y separación clara entre cálculo y creación.
    Soporta creación dinámica de usuarios sin sesiones autenticadas.
    """

    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    # Eliminar autenticación requerida para permitir reservas sin login
    permission_classes = []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.reserva_service = ReservaService()
        self.payment_service = StripePaymentService()
        logger.info("ReservaViewSet inicializado con servicios")

    def get_queryset(self):
        """Filtra las reservas según el usuario con logging completo"""
        logger.info(f"Solicitando reservas")

        # Si no hay usuario autenticado, devolver queryset vacío para GET requests
        if not hasattr(self.request, 'user') or not self.request.user.is_authenticated:
            return Reserva.objects.none()

        user = self.request.user
        queryset = super().get_queryset()

        try:
            # Con el modelo Usuario unificado, filtramos directamente por usuario
            if user.is_staff or user.is_superuser:
                # Admins ven todas las reservas
                logger.info(f"Admin {user.id} accediendo a todas las reservas")
                return queryset.select_related(
                    "usuario", "vehiculo", "lugar_recogida", "lugar_devolucion"
                ).prefetch_related("extras", "conductores", "penalizaciones")
            else:
                # Usuarios normales solo ven sus reservas
                user_reservas = (
                    queryset.filter(usuario=user)
                    .select_related(
                        "usuario", "vehiculo", "lugar_recogida", "lugar_devolucion"
                    )
                    .prefetch_related("extras", "conductores", "penalizaciones")
                )

                logger.info(f"Usuario {user.id} tiene {user_reservas.count()} reservas")
                return user_reservas

        except Exception as e:
            logger.error(f"Error filtrando reservas para usuario {user.id}: {str(e)}")
            return queryset.none()

    def get_serializer_class(self):
        """Determinar serializer según la acción"""
        if self.action == "create":
            return ReservaCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return ReservaUpdateSerializer
        elif self.action == "retrieve":
            return ReservaDetailSerializer
        return ReservaSerializer

    @action(detail=False, methods=["post"])
    def calcular_precio(self, request):
        """
        Endpoint para calcular precio de reserva sin crearla.
        Permite al frontend validar y mostrar precios antes de confirmar.
        """
        logger.info(f"Usuario {request.user.id} calculando precio de reserva")

        try:
            # Usar el servicio de reservas para calcular precio
            resultado = self.reserva_service.calcular_precio_reserva(request.data)

            if resultado.get("success", False):
                logger.info(f"Cálculo exitoso: {resultado.get('precio_total', 0)}")
                return Response(resultado, status=status.HTTP_200_OK)
            else:
                logger.warning(
                    f"Error en cálculo: {resultado.get('error', 'Error desconocido')}"
                )
                return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error calculando precio: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        """Cancelar una reserva"""
        reserva = self.get_object()

        if reserva.estado in ["cancelada", "completada"]:
            return Response(
                {
                    "success": False,
                    "error": "No se puede cancelar una reserva que ya está cancelada o completada",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                reserva.estado = "cancelada"
                reserva.save()

                logger.info(
                    f"Reserva {reserva.id} cancelada por usuario {request.user.id}"
                )

                return Response(
                    {"success": True, "message": "Reserva cancelada exitosamente"}
                )

        except Exception as e:
            logger.error(f"Error cancelando reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": "Error cancelando reserva"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def confirmar(self, request, pk=None):
        """Confirmar una reserva pendiente"""
        reserva = self.get_object()

        if reserva.estado != "pendiente":
            return Response(
                {
                    "success": False,
                    "error": "Solo se pueden confirmar reservas pendientes",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                reserva.estado = "confirmada"
                reserva.save()

                logger.info(
                    f"Reserva {reserva.id} confirmada por usuario {request.user.id}"
                )

                return Response(
                    {"success": True, "message": "Reserva confirmada exitosamente"}
                )

        except Exception as e:
            logger.error(f"Error confirmando reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": "Error confirmando reserva"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def resumen(self, request, pk=None):
        """Obtener resumen detallado de una reserva"""
        reserva = self.get_object()

        try:
            serializer = ReservaDetailSerializer(reserva, context={"request": request})

            # Agregar información adicional del resumen
            data = serializer.data
            data.update(
                {
                    "dias_reserva": (
                        reserva.fecha_devolucion - reserva.fecha_recogida
                    ).days,
                    "puede_cancelar": reserva.estado in ["pendiente", "confirmada"]
                    and reserva.fecha_recogida > timezone.now(),
                    "puede_modificar": reserva.estado == "pendiente",
                }
            )

            return Response({"success": True, "reserva": data})

        except Exception as e:
            logger.error(f"Error obteniendo resumen de reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": "Error obteniendo resumen"},                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request, *args, **kwargs):
        """Crear una nueva reserva con validación completa y creación dinámica de usuarios"""
        logger.info(f"Creando nueva reserva sin autenticación de usuario")

        try:
            with transaction.atomic():
                # Hacer una copia mutable de los datos para poder modificarlos
                data = request.data.copy()
                
                # Para reservas sin autenticación, el usuario se crea desde los datos del conductor principal
                # El campo usuario no se asigna aquí, se maneja en el serializer
                if 'usuario' in data and data['usuario'] in [None, "undefined", "null"]:
                    del data['usuario']
                    logger.info("Removiendo campo usuario para creación dinámica")

                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)

                reserva = serializer.save()

                logger.info(f"Reserva {reserva.id} creada exitosamente con usuario {reserva.usuario.id}")

                # Devolver respuesta con la reserva creada
                response_serializer = ReservaDetailSerializer(
                    reserva, context={"request": request}
                )

                return Response(
                    {
                        "success": True,
                        "message": "Reserva creada exitosamente",
                        "reserva": response_serializer.data,
                    },
                    status=status.HTTP_201_CREATED,
                )

        except ValidationError as e:
            logger.warning(f"Error de validación creando reserva: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "Datos de reserva inválidos",
                    "details": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.error(f"Error creando reserva: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
