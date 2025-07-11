# comunicacion/views.py
import logging

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Contacto, Contenido
from .serializers import (ContactoListSerializer, ContactoRespuestaSerializer,
                          ContactoSerializer, ContenidoSerializer)

# Importar servicio de email
try:
    from utils.email_service import get_email_service
except ImportError:
    get_email_service = None

logger = logging.getLogger(__name__)

# Lazy import de permisos para evitar dependencias
try:
    from .permissions import IsAdminOrReadOnly, PublicAccessPermission
except ImportError:
    from rest_framework.permissions import IsAuthenticated

    class IsAdminOrReadOnly(IsAuthenticated):
        def has_permission(self, request, view):
            if request.method in ["GET", "HEAD", "OPTIONS"]:
                return True
            return request.user and request.user.is_staff

    class PublicAccessPermission:
        def has_permission(self, request, view):
            return True


class ContenidoViewSet(viewsets.ModelViewSet):
    """ViewSet para contenidos del sitio"""

    queryset = Contenido.objects.all()
    serializer_class = ContenidoSerializer

    permission_classes = [
        PublicAccessPermission
    ]  # Acceso público para consultar contenidos

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["tipo", "activo"]
    search_fields = ["titulo", "subtitulo", "cuerpo"]

    def list(self, request, *args, **kwargs):
        """Override del método list para manejar bases de datos vacías"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            # Si no hay contenidos, devolver lista vacía en lugar de error
            if not queryset.exists():
                return Response({
                    "success": True,
                    "count": 0,
                    "results": []
                })
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    "success": True,
                    "results": serializer.data,
                })

            serializer = self.get_serializer(queryset, many=True)
            return Response({
                "success": True,
                "count": queryset.count(),
                "results": serializer.data,
            })
            
        except Exception as e:
            logger.error(f"Error en ContenidoViewSet.list: {str(e)}")
            return Response({
                "success": False,
                "error": "Error obteniendo contenidos",
                "results": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"])
    def activos(self, request):
        """Obtener solo contenidos activos"""
        try:
            contenidos = self.get_queryset().filter(activo=True)
            serializer = self.get_serializer(contenidos, many=True)
            return Response({"success": True, "results": serializer.data})
        except Exception as e:
            logger.error(f"Error en activos: {str(e)}")
            return Response({
                "success": False,
                "error": "Error obteniendo contenidos activos",
                "results": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)    @action(detail=False, methods=["get"])
    def por_tipo(self, request):
        """Obtener contenidos agrupados por tipo"""
        try:
            tipo = request.query_params.get("tipo")
            if not tipo:
                return Response(
                    {"success": False, "error": "Parámetro tipo requerido"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            contenidos = self.get_queryset().filter(tipo=tipo, activo=True)
            serializer = self.get_serializer(contenidos, many=True)
            return Response({"success": True, "tipo": tipo, "results": serializer.data})
        except Exception as e:
            logger.error(f"Error en por_tipo: {str(e)}")
            return Response({
                "success": False,
                "error": "Error obteniendo contenidos por tipo",
                "results": []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactoViewSet(viewsets.ModelViewSet):
    """ViewSet para mensajes de contacto"""

    queryset = Contacto.objects.all()

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["estado", "es_reciente"]
    search_fields = ["nombre", "email", "asunto"]
    ordering_fields = ["fecha_contacto", "estado"]
    ordering = ["-fecha_contacto"]

    def get_permissions(self):
        """Configurar permisos según la acción"""
        if self.action == "create":
            # Cualquiera puede enviar un mensaje de contacto
            return [PublicAccessPermission()]
        else:
            # Solo admins pueden ver/gestionar mensajes
            return [IsAdminOrReadOnly()]

    def get_serializer_class(self):
        """Determinar serializer según la acción"""
        if self.action == "create":
            return ContactoSerializer
        elif self.action == "responder":
            return ContactoRespuestaSerializer
        return ContactoListSerializer

    def create(self, request, *args, **kwargs):
        """Crear nuevo mensaje de contacto"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Guardar el mensaje
        contacto = serializer.save()

        # Enviar emails de notificación y confirmación
        self._send_contact_emails(contacto)

        return Response(
            {
                "success": True,
                "message": "Mensaje enviado exitosamente. Te contactaremos pronto.",
                "id": contacto.id,
            },
            status=status.HTTP_201_CREATED,
        )

    def _send_contact_emails(self, contacto):
        """
        Envía emails de notificación y confirmación para un nuevo contacto
        """
        if not get_email_service:
            logger.warning("Servicio de email no disponible, omitiendo envío")
            return

        try:
            # Preparar datos del contacto
            contacto_data = {
                'nombre': contacto.nombre,
                'email': contacto.email,
                'asunto': contacto.asunto,
                'mensaje': contacto.mensaje,
                'fecha_contacto': contacto.fecha_creacion,
            }

            email_service = get_email_service()

            # Enviar notificación a los administradores
            try:
                result_notification = email_service.send_contact_notification(contacto_data)
                if result_notification.get('success'):
                    logger.info(f"Notificación de contacto enviada exitosamente para mensaje {contacto.id}")
                else:
                    logger.error(f"Error enviando notificación de contacto para mensaje {contacto.id}: {result_notification.get('error')}")
            except Exception as e:
                logger.error(f"Error inesperado enviando notificación de contacto para mensaje {contacto.id}: {str(e)}")

            # Enviar confirmación al usuario
            try:
                result_confirmation = email_service.send_contact_confirmation(contacto_data)
                if result_confirmation.get('success'):
                    logger.info(f"Confirmación de contacto enviada exitosamente para mensaje {contacto.id}")
                else:
                    logger.error(f"Error enviando confirmación de contacto para mensaje {contacto.id}: {result_confirmation.get('error')}")
            except Exception as e:
                logger.error(f"Error inesperado enviando confirmación de contacto para mensaje {contacto.id}: {str(e)}")

        except Exception as e:
            # No queremos que un error en el email impida la creación del contacto
            logger.error(f"Error general enviando emails para contacto {contacto.id}: {str(e)}")

    @action(detail=True, methods=["post"])
    def responder(self, request, pk=None):
        """Responder a un mensaje de contacto"""
        contacto = self.get_object()

        if contacto.estado == "resuelto":
            return Response(
                {"success": False, "error": "Este mensaje ya ha sido resuelto"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(contacto, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"success": True, "message": "Respuesta enviada exitosamente"})

    @action(detail=True, methods=["post"])
    def marcar_pendiente(self, request, pk=None):
        """Marcar mensaje como pendiente"""
        contacto = self.get_object()
        contacto.estado = "pendiente"
        contacto.save()

        return Response({"success": True, "message": "Mensaje marcado como pendiente"})

    @action(detail=True, methods=["post"])
    def marcar_en_proceso(self, request, pk=None):
        """Marcar mensaje como en proceso"""
        contacto = self.get_object()
        contacto.estado = "en_proceso"
        contacto.save()

        return Response({"success": True, "message": "Mensaje marcado como en proceso"})

    @action(detail=False, methods=["get"])
    def estadisticas(self, request):
        """Obtener estadísticas de mensajes de contacto"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"success": False, "error": "Sin permisos para ver estadísticas"},
                status=status.HTTP_403_FORBIDDEN,
            )

        total = self.get_queryset().count()
        pendientes = self.get_queryset().filter(estado="pendiente").count()
        en_proceso = self.get_queryset().filter(estado="en_proceso").count()
        resueltos = self.get_queryset().filter(estado="resuelto").count()
        recientes = self.get_queryset().filter(es_reciente=True).count()

        return Response(
            {
                "success": True,
                "estadisticas": {
                    "total": total,
                    "pendientes": pendientes,
                    "en_proceso": en_proceso,
                    "resueltos": resueltos,
                    "recientes": recientes,
                },
            }
        )
