# facturas_contratos/serializers.py
# Direct imports - removing lazy imports as per best practices  
from reservas.serializers import ReservaSerializer
from rest_framework import serializers

from .models import Contrato, Factura


class ContratoSerializer(serializers.ModelSerializer):
    reserva_detail = serializers.SerializerMethodField()
    archivo_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Contrato
        fields = [
            "id",
            "reserva",
            "reserva_detail",
            "numero_contrato",
            "fecha_firma",
            "condiciones",
            "archivo_pdf",
            "archivo_pdf_url",
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

    def get_archivo_pdf_url(self, obj):
        """Obtener URL del archivo PDF si existe"""
        if obj.archivo_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_pdf.url)
            return obj.archivo_pdf.url
        return obj.url_pdf


class FacturaSerializer(serializers.ModelSerializer):
    reserva_detail = serializers.SerializerMethodField()
    archivo_pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Factura
        fields = [
            "id",
            "reserva",
            "reserva_detail",
            "numero_factura",
            "fecha_emision",
            "base_imponible",
            "iva",
            "total",
            "archivo_pdf",
            "archivo_pdf_url",
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

    def get_archivo_pdf_url(self, obj):
        """Obtener URL del archivo PDF si existe"""
        if obj.archivo_pdf:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo_pdf.url)
            return obj.archivo_pdf.url
        return obj.url_pdf
