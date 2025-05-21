# api/views/reservas.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models.reservas import Reserva, ReservaExtra, ReservaConductor
from ..serializers.reservas import (
    ReservaSerializer, ReservaCreateSerializer, 
    ReservaDetailSerializer, ReservaUpdateSerializer,
    ReservaConductorSerializer, ReservaExtraSerializer
)
from ..permissions import IsOwnerOrAdmin

class ReservaViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    filter_fields = ['estado']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reserva.objects.all()
        return Reserva.objects.filter(usuario=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReservaCreateSerializer
        elif self.action == 'update' or self.action == 'partial_update':
            return ReservaUpdateSerializer
        elif self.action == 'retrieve':
            return ReservaDetailSerializer
        return ReservaSerializer
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela una reserva"""
        reserva = self.get_object()
        
        # Verificar si se puede cancelar
        from api.services.reservas import puede_cancelar_reserva, cancelar_reserva
        
        puede, motivo = puede_cancelar_reserva(reserva)
        if not puede:
            return Response({'error': motivo}, status=status.HTTP_400_BAD_REQUEST)
        
        # Cancelar reserva
        cancelar_reserva(reserva)
        
        serializer = self.get_serializer(reserva)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def buscar(self, request):
        """Busca una reserva por ID y email del cliente"""
        reserva_id = request.data.get('reserva_id')
        email = request.data.get('email')
        
        if not reserva_id or not email:
            return Response(
                {'error': 'Se requiere ID de reserva y email'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Buscar reserva por ID
            reserva = Reserva.objects.get(id=reserva_id)
            
            # Verificar email en conductores
            conductores = ReservaConductor.objects.filter(
                reserva=reserva, 
                email__iexact=email
            )
            
            if not conductores.exists():
                raise Reserva.DoesNotExist
            
            serializer = ReservaDetailSerializer(reserva)
            return Response(serializer.data)
            
        except Reserva.DoesNotExist:
            return Response(
                {'error': 'Reserva no encontrada con esas credenciales'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def pagar_diferencia(self, request, pk=None):
        """Registra un pago de diferencia para la reserva"""
        reserva = self.get_object()
        metodo = request.data.get('metodo_pago')
        importe = request.data.get('importe')
        
        if not metodo or not importe:
            return Response(
                {'error': 'Se requiere método de pago e importe'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            importe = float(importe)
        except ValueError:
            return Response(
                {'error': 'Importe inválido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Actualizar reserva con el pago
        from api.services.reservas import registrar_pago_diferencia
        registrar_pago_diferencia(reserva, importe, metodo)
        
        serializer = ReservaDetailSerializer(reserva)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def calcular_precio(self, request):
        """Calcula el precio estimado de una reserva editada"""
        from api.services.vehiculos import calcular_precio_alquiler
        from rest_framework.exceptions import ValidationError
        import logging
        logger = logging.getLogger(__name__)
        try:
            vehiculo_id = request.data.get('vehiculo_id')
            fecha_inicio = request.data.get('fecha_inicio')
            fecha_fin = request.data.get('fecha_fin')
            extras = request.data.get('extras', None)
            promocion_id = request.data.get('promocion_id', None)
            if not vehiculo_id or not fecha_inicio or not fecha_fin:
                logger.warning("Datos insuficientes para calcular precio")
                raise ValidationError({'error': 'Datos insuficientes'})
            precios = calcular_precio_alquiler(vehiculo_id, fecha_inicio, fecha_fin, extras, promocion_id)
            return Response(precios, status=200)
        except ValidationError as e:
            logger.error(f"Error de validación: {e}")
            return Response({'error': str(e)}, status=400)
        except Exception as e:
            logger.exception("Error inesperado al calcular precio")
            return Response({'error': 'Error interno del servidor'}, status=500)