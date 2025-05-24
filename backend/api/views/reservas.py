# api/views/reservas.py
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from ..models.reservas import Reserva, ReservaConductor, ReservaExtra, Extras
from ..serializers.reservas import (
    ReservaSerializer, ReservaCreateSerializer, 
    ReservaDetailSerializer, ReservaUpdateSerializer,
    ReservaConductorSerializer
)
# from ..permissions import IsOwnerOrAdmin

class ReservaViewSet(viewsets.ModelViewSet):
    # permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]  # ← COMENTAR
    permission_classes = [permissions.IsAuthenticated]  # ← USAR ESTO TEMPORALMENTE    
    filter_backends = [filters.SearchFilter]
    search_fields = ['estado', 'usuario__email', 'vehiculo__matricula']
    filterset_fields = ['estado']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reserva.objects.all()
        return Reserva.objects.filter(usuario=user)

    def get_serializer_class(self):
        """Usar diferentes serializers según la acción"""
        if self.action == 'create':
            from ..serializers.reservas import ReservaCreateSerializer
            return ReservaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            from ..serializers.reservas import ReservaUpdateSerializer
            return ReservaUpdateSerializer
        elif self.action == 'retrieve':
            from ..serializers.reservas import ReservaDetailSerializer
            return ReservaDetailSerializer
        else:
            from ..serializers.reservas import ReservaSerializer
            return ReservaSerializer
        
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela una reserva"""
        reserva = self.get_object()
        from api.services.reservas import puede_cancelar_reserva, cancelar_reserva
        puede, motivo = puede_cancelar_reserva(reserva)
        if not puede:
            return Response({'error': motivo}, status=status.HTTP_400_BAD_REQUEST)
        cancelar_reserva(reserva)
        serializer = self.get_serializer(reserva)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def buscar(self, request, pk=None):
        """Busca una reserva por ID y email"""
        email = request.data.get('email')
        
        try:
            reserva = self.get_queryset().get(
                pk=pk,
                conductores__conductor__email=email
            )
            serializer = self.get_serializer(reserva)
            return Response(serializer.data)
        except Reserva.DoesNotExist:
            return Response(
                {'error': 'Reserva no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def pagar_diferencia(self, request, pk=None):
        """Registra un pago de diferencia para la reserva"""
        reserva = self.get_object()
        importe = request.data.get('importe')
        if not importe:
            return Response({'error': 'Importe requerido'}, status=400)
        # Aquí iría la lógica de pago
        reserva.importe_pagado_extra += float(importe)
        reserva.save()
        serializer = self.get_serializer(reserva)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def calcular_precio(self, request):
        """Calcula el precio de una reserva antes de crearla"""
        try:
            vehiculo_id = request.data.get('vehiculo_id')
            fecha_recogida = request.data.get('fecha_recogida')
            fecha_devolucion = request.data.get('fecha_devolucion')
            promocion_id = request.data.get('promocion_id')
            extras_ids = request.data.get('extras', [])
            
            # Calcular precio base
            from ..services.vehiculos import calcular_precio_alquiler
            precios = calcular_precio_alquiler(
                vehiculo_id,
                fecha_recogida,
                fecha_devolucion,
                extras_ids,
                promocion_id
            )
            
            return Response(precios, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    

    @action(detail=True, methods=['post'])
    def procesar_pago(self, request, pk=None):
        """Procesa un pago para una reserva"""
        reserva = self.get_object()
        tipo_pago = request.data.get('tipo_pago', 'extra')
        importe = Decimal(str(request.data.get('importe', 0)))
        
        try:
            with transaction.atomic():
                if tipo_pago == 'inicial':
                    reserva.importe_pagado_inicial += importe
                    reserva.importe_pendiente_inicial = max(0, reserva.importe_pendiente_inicial - importe)
                    
                    # Si se paga todo, confirmar reserva
                    if reserva.importe_pendiente_inicial == 0:
                        reserva.estado = 'confirmada'
                else:
                    reserva.importe_pagado_extra = (reserva.importe_pagado_extra or 0) + importe
                    reserva.importe_pendiente_extra = max(0, (reserva.importe_pendiente_extra or 0) - importe)
                
                reserva.save()
                
                return Response({
                    'message': 'Pago procesado correctamente',
                    'importe_pendiente_total': reserva.importe_pendiente_inicial + (reserva.importe_pendiente_extra or 0)
                })
                
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    

