# archivo: payments/models.py

from django.db import models
from django.core.validators import MinValueValidator
import json

class PagoRedsys(models.Model):
    """Modelo para almacenar información de pagos con Redsys"""
    
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('COMPLETADO', 'Completado'),
        ('FALLIDO', 'Fallido'),
        ('ANULADO', 'Anulado'),
    ]
    
    numero_pedido = models.CharField(
        max_length=50, 
        unique=True,
        help_text="Número de pedido único para Redsys"
    )
    importe = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
        help_text="Importe del pago en euros"
    )
    estado = models.CharField(
        max_length=20, 
        choices=ESTADO_CHOICES, 
        default='PENDIENTE'
    )
    
    # Datos de Redsys
    merchant_parameters = models.TextField(
        blank=True, 
        null=True,
        help_text="Parámetros codificados enviados a Redsys"
    )
    signature = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Firma generada para Redsys"
    )
    codigo_autorizacion = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        help_text="Código de autorización de Redsys"
    )
    codigo_respuesta = models.CharField(
        max_length=10, 
        blank=True, 
        null=True,
        help_text="Código de respuesta de Redsys"
    )
    mensaje_error = models.TextField(
        blank=True, 
        null=True,
        help_text="Mensaje de error en caso de fallo"
    )
    
    # Datos de la reserva (JSON)
    datos_reserva = models.JSONField(
        default=dict,
        help_text="Datos completos de la reserva en formato JSON"
    )
    
    # Fechas
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_pago = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Relación con reserva (se creará tras pago exitoso)
    reserva = models.ForeignKey(
        'api.Reserva',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pagos_redsys'
    )
    
    class Meta:
        db_table = 'pagos_redsys'
        verbose_name = 'Pago Redsys'
        verbose_name_plural = 'Pagos Redsys'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Pago {self.numero_pedido} - {self.estado} - {self.importe}€"
    
    @property
    def datos_conductor(self):
        """Extrae datos del conductor principal del JSON de reserva"""
        try:
            return self.datos_reserva.get('conductorPrincipal', {})
        except (AttributeError, TypeError):
            return {}
    
    @property
    def datos_vehiculo(self):
        """Extrae datos del vehículo del JSON de reserva"""
        try:
            return self.datos_reserva.get('car', {})
        except (AttributeError, TypeError):
            return {}
    
    def es_pago_exitoso(self):
        """Verifica si el pago fue exitoso"""
        return self.estado == 'COMPLETADO' and self.codigo_autorizacion
    
    def obtener_email_cliente(self):
        """Obtiene el email del cliente para envío de confirmación"""
        conductor = self.datos_conductor
        return conductor.get('email', '')


# archivo: payments/serializers.py

from rest_framework import serializers
from .models import PagoRedsys

class RedsysPaymentSerializer(serializers.Serializer):
    """Serializer para preparar pagos con Redsys"""
    
    # Parámetros de Redsys
    redsysParams = serializers.DictField()
    reservaData = serializers.DictField()
    
    def validate_redsysParams(self, value):
        """Valida que los parámetros de Redsys estén completos"""
        required_fields = [
            'DS_MERCHANT_AMOUNT',
            'DS_MERCHANT_ORDER',
            'DS_MERCHANT_MERCHANTCODE',
            'DS_MERCHANT_CURRENCY',
            'DS_MERCHANT_TRANSACTIONTYPE',
            'DS_MERCHANT_TERMINAL'
        ]
        
        for field in required_fields:
            if field not in value:
                raise serializers.ValidationError(f'Campo requerido: {field}')
        
        # Validar importe
        try:
            amount = int(value['DS_MERCHANT_AMOUNT'])
            if amount <= 0:
                raise serializers.ValidationError('El importe debe ser mayor a 0')
        except (ValueError, TypeError):
            raise serializers.ValidationError('Importe inválido')
        
        return value
    
    def validate_reservaData(self, value):
        """Valida que los datos de reserva estén completos"""
        # Validar conductor principal
        conductor = value.get('conductorPrincipal', {})
        if not conductor.get('email'):
            raise serializers.ValidationError('Email del conductor requerido')
        
        # Validar vehículo
        car = value.get('car', {})
        if not car.get('id'):
            raise serializers.ValidationError('ID del vehículo requerido')
        
        return value

class PagoRedsysSerializer(serializers.ModelSerializer):
    """Serializer para el modelo PagoRedsys"""
    
    datos_conductor = serializers.DictField(read_only=True)
    datos_vehiculo = serializers.DictField(read_only=True)
    email_cliente = serializers.CharField(source='obtener_email_cliente', read_only=True)
    
    class Meta:
        model = PagoRedsys
        fields = [
            'id', 'numero_pedido', 'importe', 'estado',
            'codigo_autorizacion', 'codigo_respuesta', 'mensaje_error',
            'fecha_creacion', 'fecha_pago', 'fecha_actualizacion',
            'datos_conductor', 'datos_vehiculo', 'email_cliente'
        ]
        read_only_fields = [
            'fecha_creacion', 'fecha_pago', 'fecha_actualizacion'
        ]


# archivo: payments/admin.py

from django.contrib import admin
from .models import PagoRedsys

@admin.register(PagoRedsys)
class PagoRedsysAdmin(admin.ModelAdmin):
    list_display = [
        'numero_pedido', 'importe', 'estado', 
        'codigo_autorizacion', 'fecha_creacion', 'fecha_pago'
    ]
    list_filter = ['estado', 'fecha_creacion', 'fecha_pago']
    search_fields = ['numero_pedido', 'codigo_autorizacion']
    readonly_fields = [
        'fecha_creacion', 'fecha_pago', 'fecha_actualizacion'
    ]
    
    fieldsets = [
        ('Información del Pago', {
            'fields': ['numero_pedido', 'importe', 'estado']
        }),
        ('Datos de Redsys', {
            'fields': [
                'merchant_parameters', 'signature', 
                'codigo_autorizacion', 'codigo_respuesta', 'mensaje_error'
            ]
        }),
        ('Datos de Reserva', {
            'fields': ['datos_reserva', 'reserva'],
            'classes': ['collapse']
        }),
        ('Fechas', {
            'fields': ['fecha_creacion', 'fecha_pago', 'fecha_actualizacion']
        })
    ]
    
    def has_delete_permission(self, request, obj=None):
        # No permitir eliminar pagos completados
        if obj and obj.estado == 'COMPLETADO':
            return False
        return super().has_delete_permission(request, obj)