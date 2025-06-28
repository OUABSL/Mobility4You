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
        logger.info("Calculando precio de reserva")

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
        logger.info(f"Iniciando cancelación de reserva {pk}")
        
        try:
            reserva = self.get_object()
            logger.info(f"Reserva encontrada - Estado actual: {reserva.estado}")
            
            # Verificar usuario autenticado o permitir cancelación pública
            if request.user.is_authenticated:
                # Usuario autenticado - verificar permisos
                if not (reserva.usuario == request.user or request.user.is_staff):
                    logger.warning(f"Usuario {request.user.id} intentó cancelar reserva de otro usuario")
                    return Response(
                        {
                            "success": False,
                            "error": "No tienes permisos para cancelar esta reserva",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            
            # Verificar estado actual
            if reserva.estado in ["cancelada", "completada"]:
                logger.warning(f"Intento de cancelar reserva en estado: {reserva.estado}")
                return Response(
                    {
                        "success": False,
                        "error": "No se puede cancelar una reserva que ya está cancelada o completada",
                        "current_state": reserva.estado,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                reserva.estado = "cancelada"
                reserva.save()

                logger.info(f"Reserva {reserva.id} cancelada exitosamente")

                return Response(
                    {
                        "success": True, 
                        "message": "Reserva cancelada exitosamente",
                        "reserva_id": reserva.id,
                        "nuevo_estado": reserva.estado,
                    },
                    status=status.HTTP_200_OK,
                )

        except Reserva.DoesNotExist:
            logger.error(f"Reserva {pk} no encontrada")
            return Response(
                {"success": False, "error": "Reserva no encontrada"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            logger.error(f"Error cancelando reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
    
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Alias para cancelar (compatibilidad frontend)"""
        return self.cancelar(request, pk)

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

    @action(detail=True, methods=["post"])
    def buscar(self, request, pk=None):
        """
        Buscar una reserva específica por ID y email.
        Endpoint público para consulta de reservas sin autenticación.
        """
        try:
            # Obtener datos del request (compatibilidad con diferentes tipos de request)
            if hasattr(request, 'data') and request.data:
                email = request.data.get('email', '').strip().lower()
            else:
                # Fallback para requests que no tienen data
                import json
                try:
                    data = json.loads(request.body) if request.body else {}
                    email = data.get('email', '').strip().lower()
                except (json.JSONDecodeError, AttributeError):
                    email = ''
            
            reserva_id = pk  # El ID viene de la URL
            
            if not email:
                return Response(
                    {"success": False, "error": "Email es requerido"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            logger.info(f"Buscando reserva {reserva_id} para email {email}")
            
            # Buscar la reserva por ID y verificar que el email coincida
            # Optimizar consulta con select_related y prefetch_related
            try:
                reserva = Reserva.objects.select_related(
                    "usuario", "vehiculo", "vehiculo__categoria", "vehiculo__grupo",
                    "lugar_recogida", "lugar_devolucion", 
                    "politica_pago", "promocion"
                ).prefetch_related(
                    "extras__extra",
                    "conductores__conductor",
                    "penalizaciones__tipo_penalizacion",
                    "vehiculo__imagenes"  # Añadir las imágenes del vehículo
                ).get(id=reserva_id)
                
                # Verificar que el email del usuario coincida
                if reserva.usuario.email.lower() != email:
                    logger.warning(f"Email {email} no coincide para reserva {reserva_id}")
                    return Response(
                        {"success": False, "error": "Reserva no encontrada o email incorrecto"},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                
                # Serializar la reserva con detalles completos
                serializer = ReservaDetailSerializer(reserva, context={"request": request})
                
                logger.info(f"Reserva {reserva_id} encontrada exitosamente")
                return Response(
                    {
                        "success": True,
                        "message": "Reserva encontrada",
                        "reserva": serializer.data,
                    },
                    status=status.HTTP_200_OK,
                )
                
            except Reserva.DoesNotExist:
                logger.warning(f"Reserva {reserva_id} no encontrada")
                return Response(
                    {"success": False, "error": "Reserva no encontrada"},
                    status=status.HTTP_404_NOT_FOUND,
                )
                
        except Exception as e:
            logger.error(f"Error buscando reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def crear_reserva(self, request):
        """
        Alias para el método create para mantener compatibilidad con URLs legacy.
        """
        return self.create(request)

    def _normalizar_fecha(self, fecha):
        """
        Normalizar fecha al formato YYYY-MM-DD para comparaciones
        """
        from datetime import date, datetime
        
        if fecha is None:
            return None
            
        # Si ya es un objeto date o datetime
        if isinstance(fecha, (date, datetime)):
            return fecha.strftime('%Y-%m-%d')
        
        # Si es string, intentar parsearlo y normalizarlo
        if isinstance(fecha, str):
            fecha = fecha.strip()
            
            # Formatos comunes que pueden venir del frontend
            formatos = [
                '%Y-%m-%d',      # 2024-01-15
                '%d/%m/%Y',      # 15/01/2024
                '%m/%d/%Y',      # 01/15/2024
                '%d-%m-%Y',      # 15-01-2024
                '%Y/%m/%d',      # 2024/01/15
                '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO format con timezone
                '%Y-%m-%dT%H:%M:%SZ',     # ISO format sin microseconds
                '%Y-%m-%dT%H:%M:%S',      # ISO format sin timezone
            ]
            
            for formato in formatos:
                try:
                    parsed_date = datetime.strptime(fecha, formato)
                    return parsed_date.strftime('%Y-%m-%d')
                except ValueError:
                    continue
        
        # Si no se pudo parsear, devolver string tal como está
        logger.warning(f"No se pudo normalizar la fecha: {fecha}")
        return str(fecha)

    @action(detail=True, methods=["post"])
    def calcular_precio_edicion(self, request, pk=None):
        """
        Calcular el precio de una reserva editada y la diferencia con el precio original
        """
        logger.info(f"Calculando precio de edición para reserva {pk}")
        logger.info(f"Datos recibidos: {request.data}")
        
        try:
            reserva = self.get_object()
            
            # Extraer el vehiculo_id - priorizar el del request pero usar el de la reserva como fallback
            vehiculo_id_nuevo = (
                request.data.get("vehiculo_id") or 
                request.data.get("vehiculo") or 
                reserva.vehiculo.id
            )
            
            logger.info(f"ID de vehículo para cálculo: {vehiculo_id_nuevo}")
            
            # Preparar datos para cálculo incluyendo los nuevos valores
            data_calculo = {
                "vehiculo_id": vehiculo_id_nuevo,
                "fecha_recogida": request.data.get("fechaRecogida") or request.data.get("fecha_recogida"),
                "fecha_devolucion": request.data.get("fechaDevolucion") or request.data.get("fecha_devolucion"),
                "lugar_recogida_id": request.data.get("lugarRecogida_id") or request.data.get("lugar_recogida_id"),
                "lugar_devolucion_id": request.data.get("lugarDevolucion_id") or request.data.get("lugar_devolucion_id"),
                "extras": request.data.get("extras", [])
            }
            
            logger.info(f"Datos para cálculo preparados: {data_calculo}")
            
            # Normalizar fechas para comparación consistente
            fecha_recogida_bd = self._normalizar_fecha(reserva.fecha_recogida)
            fecha_devolucion_bd = self._normalizar_fecha(reserva.fecha_devolucion)
            fecha_recogida_nueva = self._normalizar_fecha(data_calculo["fecha_recogida"])
            fecha_devolucion_nueva = self._normalizar_fecha(data_calculo["fecha_devolucion"])
            
            logger.info(f"Fechas normalizadas - BD: recogida={fecha_recogida_bd}, devolucion={fecha_devolucion_bd}")
            logger.info(f"Fechas normalizadas - Nuevas: recogida={fecha_recogida_nueva}, devolucion={fecha_devolucion_nueva}")
            
            # Verificar si no hay cambios reales en la reserva
            fechas_cambiadas = (
                fecha_recogida_bd != fecha_recogida_nueva or
                fecha_devolucion_bd != fecha_devolucion_nueva
            )
            
            # Obtener extras actuales de la reserva
            extras_actuales = set(reserva.extras.values_list('extra_id', flat=True))
            extras_nuevos = set(extra.get('extra_id') if isinstance(extra, dict) else extra 
                              for extra in data_calculo["extras"])
            extras_cambiados = extras_actuales != extras_nuevos
            
            vehiculo_cambiado = reserva.vehiculo.id != vehiculo_id_nuevo
            
            logger.info(f"Análisis de cambios - Fechas: {fechas_cambiadas}, "
                       f"Extras: {extras_cambiados}, Vehículo: {vehiculo_cambiado}")
            logger.info(f"Extras actuales: {extras_actuales}, Extras nuevos: {extras_nuevos}")
            
            # Si no hay cambios reales, la diferencia debe ser 0
            if not (fechas_cambiadas or extras_cambiados or vehiculo_cambiado):
                precio_original = float(reserva.precio_total)
                logger.info(f"No hay cambios detectados - manteniendo precio original: {precio_original}")
                
                response_data = {
                    "success": True,
                    "originalPrice": precio_original,
                    "newPrice": precio_original,
                    "difference": 0.0,
                    "breakdown": {
                        "precio_base": precio_original,
                        "precio_extras": 0.0,
                        "subtotal": precio_original,
                        "impuestos": 0.0,
                        "total": precio_original,
                    },
                    "dias_alquiler": (reserva.fecha_devolucion - reserva.fecha_recogida).days,
                    "message": "No se detectaron cambios en la reserva"
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Calcular nuevo precio
            resultado_nuevo = self.reserva_service.calcular_precio_reserva(data_calculo)
            
            if not resultado_nuevo.get("success", False):
                logger.warning(f"Error en cálculo de precio: {resultado_nuevo}")
                return Response(resultado_nuevo, status=status.HTTP_400_BAD_REQUEST)
            
            nuevo_precio = resultado_nuevo.get("precio_total", 0)
            precio_original = float(reserva.precio_total)
            diferencia = nuevo_precio - precio_original
            
            # Preparar respuesta con formato esperado por el frontend
            response_data = {
                "success": True,
                "originalPrice": precio_original,
                "newPrice": nuevo_precio,
                "difference": diferencia,
                "breakdown": resultado_nuevo.get("desglose", {}),
                "desglose": resultado_nuevo.get("desglose", {}),  # Compatibilidad
                "dias_alquiler": resultado_nuevo.get("dias_alquiler", 1),
            }
            
            logger.info(f"Cálculo de edición exitoso - Original: {precio_original}, "
                       f"Nuevo: {nuevo_precio}, Diferencia: {diferencia}")
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error calculando precio de edición para reserva {pk}: {str(e)}")
            return Response(
                {"success": False, "error": f"Error calculando precio de edición: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        """Actualizar una reserva existente con validación optimizada"""
        logger.info(f"Actualizando reserva {kwargs.get('pk')}")
        
        try:
            with transaction.atomic():
                # Obtener la reserva actual
                instance = self.get_object()
                
                # Verificar que la reserva se puede editar
                if instance.estado not in ["pendiente", "confirmada"]:
                    return Response(
                        {"success": False, "error": "No se puede editar una reserva cancelada o completada"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                
                # Usar el serializer de actualización
                serializer = self.get_serializer(instance, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                
                # Guardar la reserva actualizada
                reserva_actualizada = serializer.save()
                
                logger.info(f"Reserva {reserva_actualizada.id} actualizada exitosamente")
                
                # Devolver respuesta con datos completos
                response_serializer = ReservaDetailSerializer(
                    reserva_actualizada, context={"request": request}
                )
                
                return Response(
                    {
                        "success": True,
                        "message": "Reserva actualizada exitosamente",
                        "reserva": response_serializer.data,
                    },
                    status=status.HTTP_200_OK,
                )
                
        except ValidationError as e:
            logger.warning(f"Error de validación actualizando reserva: {str(e)}")
            return Response(
                {
                    "success": False,
                    "error": "Datos de reserva inválidos",
                    "details": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error actualizando reserva: {str(e)}")
            return Response(
                {"success": False, "error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
