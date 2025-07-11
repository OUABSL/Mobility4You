# facturas_contratos/serializers.py
from rest_framework import serializers

# Direct imports - removing lazy imports as per best practices  
from reservas.serializers import ReservaSerializer

from .models import Contrato, Factura


class ContratoSerializer(serializers.ModelSerializer):
    reserva_detail = serializers.SerializerMethodField()

    class Meta:
        model = Contrato
        fields = [
            "id",
            "reserva",
            "reserva_detail",
            "numero_contrato",
            "fecha_firma",
            "condiciones",
            "url_pdf",
            "estado",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_reserva_detail(self, obj):
        """Obtener datos de la reserva si se requiere"""
        if obj.reserva and self.context.get("include_reserva_detail", False):
            return ReservaSerializer(obj.reserva, context=self.context).data
        return None


class FacturaSerializer(serializers.ModelSerializer):
    reserva_detail = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            "id",
            "reserva",
            "reserva_detail",
            "numero_factura",
            "fecha_emision",
            "base_imponible",
            "importe_iva",
            "total",
            "estado",
            "url_pdf",
            "notas",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_reserva_detail(self, obj):
        """Obtener datos de la reserva si se requiere"""
        if obj.reserva and self.context.get("include_reserva_detail", False):
            return ReservaSerializer(obj.reserva, context=self.context).data
        return None
