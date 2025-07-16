# facturas_contratos/views.py
from django.shortcuts import get_object_or_404
# Direct imports - removing lazy imports as per best practices
from reservas.models import Reserva
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contrato, Factura
from .serializers import ContratoSerializer, FacturaSerializer

try:
    from .permissions import IsAdminOrReadOnly
except ImportError:
    from rest_framework.permissions import IsAuthenticated

    class IsAdminOrReadOnly(IsAuthenticated):
        def has_permission(self, request, view):
            if request.method in ["GET", "HEAD", "OPTIONS"]:
                return True
            return request.user and request.user.is_staff


class ContratoViewSet(viewsets.ModelViewSet):
    """ViewSet para contratos"""

    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer

    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        """Filtrar contratos según el usuario"""
        queryset = super().get_queryset()

        # Si el usuario no está autenticado, devolver queryset vacío
        if not self.request.user.is_authenticated:
            return queryset.none()

        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset.select_related("reserva")
        else:
            # Solo ver contratos de sus propias reservas
            return queryset.filter(reserva__usuario=self.request.user).select_related(
                "reserva"
            )

    @action(detail=True, methods=["get"])
    def descargar_pdf(self, request, pk=None):
        """Descargar PDF del contrato"""
        contrato = self.get_object()

        if contrato.archivo_pdf:
            return Response({"success": True, "pdf_url": contrato.archivo_pdf.url})
        elif contrato.url_pdf:
            return Response({"success": True, "pdf_url": contrato.url_pdf})
        else:
            return Response(
                {"success": False, "error": "PDF no disponible"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=["post"])
    def generar_pdf(self, request, pk=None):
        """Generar PDF del contrato"""
        contrato = self.get_object()
        
        # Verificar permisos
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"success": False, "error": "Sin permisos para generar PDF"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        try:
            from .utils import generar_contrato_pdf
            pdf_path = generar_contrato_pdf(contrato)
            
            if pdf_path:
                # Actualizar el objeto contrato
                contrato.refresh_from_db()
                serializer = self.get_serializer(contrato)
                return Response({
                    "success": True,
                    "message": "PDF generado exitosamente",
                    "contrato": serializer.data,
                    "pdf_url": contrato.archivo_pdf.url if contrato.archivo_pdf else contrato.url_pdf
                })
            else:
                return Response(
                    {"success": False, "error": "Error generando PDF"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {"success": False, "error": f"Error generando PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )    @action(detail=False, methods=["post"])
    def generar_desde_reserva(self, request):
        """Generar contrato desde una reserva"""
        reserva_id = request.data.get("reserva_id")
        if not reserva_id:
            return Response(
                {"success": False, "error": "ID de reserva requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reserva = get_object_or_404(Reserva, id=reserva_id)

            # Verificar que el usuario pueda generar el contrato
            if not (
                request.user.is_staff
                or request.user.is_superuser
                or reserva.usuario == request.user
            ):
                return Response(
                    {
                        "success": False,
                        "error": "Sin permisos para generar este contrato",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Verificar si ya existe un contrato
            contrato_existente = Contrato.objects.filter(reserva=reserva).first()
            if contrato_existente:
                return Response(
                    {
                        "success": False,
                        "error": "Ya existe un contrato para esta reserva",
                        "contrato_id": contrato_existente.id,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Crear nuevo contrato
            contrato = Contrato.objects.create(
                reserva=reserva,
                condiciones=request.data.get("condiciones", "Condiciones estándar"),
                estado="borrador",
            )

            serializer = self.get_serializer(contrato)
            return Response(
                {
                    "success": True,
                    "message": "Contrato generado exitosamente",
                    "contrato": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"success": False, "error": f"Error generando contrato: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FacturaViewSet(viewsets.ModelViewSet):
    """ViewSet para facturas"""

    queryset = Factura.objects.all()
    serializer_class = FacturaSerializer

    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        """Filtrar facturas según el usuario"""
        queryset = super().get_queryset()

        # Si el usuario no está autenticado, devolver queryset vacío
        if not self.request.user.is_authenticated:
            return queryset.none()

        if self.request.user.is_staff or self.request.user.is_superuser:
            return queryset.select_related("reserva")
        else:
            # Solo ver facturas de sus propias reservas
            return queryset.filter(reserva__usuario=self.request.user).select_related(
                "reserva"
            )

    @action(detail=True, methods=["get"])
    def descargar_pdf(self, request, pk=None):
        """Descargar PDF de la factura"""
        factura = self.get_object()

        if factura.archivo_pdf:
            return Response({"success": True, "pdf_url": factura.archivo_pdf.url})
        elif factura.url_pdf:
            return Response({"success": True, "pdf_url": factura.url_pdf})
        else:
            return Response(
                {"success": False, "error": "PDF no disponible"},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=True, methods=["post"])
    def generar_pdf(self, request, pk=None):
        """Generar PDF de la factura"""
        factura = self.get_object()
        
        # Verificar permisos
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"success": False, "error": "Sin permisos para generar PDF"},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        try:
            from .utils import generar_factura_pdf
            pdf_path = generar_factura_pdf(factura)
            
            if pdf_path:
                # Actualizar el objeto factura
                factura.refresh_from_db()
                serializer = self.get_serializer(factura)
                return Response({
                    "success": True,
                    "message": "PDF generado exitosamente",
                    "factura": serializer.data,
                    "pdf_url": factura.archivo_pdf.url if factura.archivo_pdf else factura.url_pdf
                })
            else:
                return Response(
                    {"success": False, "error": "Error generando PDF"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception as e:
            return Response(
                {"success": False, "error": f"Error generando PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )    @action(detail=False, methods=["post"])
    def generar_desde_reserva(self, request):
        """Generar factura desde una reserva"""
        reserva_id = request.data.get("reserva_id")
        if not reserva_id:
            return Response(
                {"success": False, "error": "ID de reserva requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reserva = get_object_or_404(Reserva, id=reserva_id)

            # Verificar que el usuario pueda generar la factura
            if not (
                request.user.is_staff
                or request.user.is_superuser
                or reserva.usuario == request.user
            ):
                return Response(
                    {
                        "success": False,
                        "error": "Sin permisos para generar esta factura",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Verificar si ya existe una factura
            factura_existente = Factura.objects.filter(reserva=reserva).first()
            if factura_existente:
                return Response(
                    {
                        "success": False,
                        "error": "Ya existe una factura para esta reserva",
                        "factura_id": factura_existente.id,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Calcular importes
            base_imponible = reserva.precio_total or 0
            iva = base_imponible * 0.21  # 21% IVA
            total = base_imponible + iva

            # Crear nueva factura
            factura = Factura.objects.create(
                reserva=reserva,
                base_imponible=base_imponible,
                iva=iva,
                total=total,
                estado="emitida",
            )

            serializer = self.get_serializer(factura)
            return Response(
                {
                    "success": True,
                    "message": "Factura generada exitosamente",
                    "factura": serializer.data,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            return Response(
                {"success": False, "error": f"Error generando factura: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
