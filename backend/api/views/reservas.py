# api/views/reservas.py
from rest_framework import viewsets, status, permissions, filters
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
    filter_backends = [filters.SearchFilter]
    search_fields = ['estado', 'usuario__email', 'vehiculo__matricula']
    filterset_fields = ['estado']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Reserva.objects.all()
        return Reserva.objects.filter(usuario=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ReservaCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReservaUpdateSerializer
        elif self.action == 'retrieve':
            return ReservaDetailSerializer
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

    @action(detail=False, methods=['post'])
    def buscar(self, request):
        """Busca una reserva por ID y email del cliente"""
        reserva_id = request.data.get('reserva_id')
        email = request.data.get('email')
        if not reserva_id or not email:
            return Response({'error': 'ID y email requeridos'}, status=400)
        try:
            reserva = Reserva.objects.get(pk=reserva_id, usuario__email=email)
            serializer = self.get_serializer(reserva)
            return Response(serializer.data)
        except Reserva.DoesNotExist:
            return Response({'error': 'Reserva no encontrada'}, status=404)

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
        """Calcula el precio estimado de una reserva editada"""
        # Lógica de cálculo de precio estimado
        data = request.data
        # ... implementar lógica de cálculo ...
        return Response({'originalPrice': 100, 'newPrice': 120, 'difference': 20})

