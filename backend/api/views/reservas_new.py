# api/views/reservas.py
import logging
from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import transaction
from ..models.reservas import Reserva, ReservaConductor, ReservaExtra, Extras
from ..serializers.reservas import (
    ReservaSerializer, ReservaCreateSerializer, 
    ReservaDetailSerializer, ReservaUpdateSerializer,
    ReservaConductorSerializer
)
from ..services.reservas import ReservaService
# from ..permissions import IsOwnerOrAdmin

logger = logging.getLogger(__name__)

class ReservaViewSet(viewsets.ModelViewSet):
    """
    ViewSet mejorado para reservas con logging completo,
    validación robusta y separación clara de responsabilidades
    """
    permission_classes = [permissions.IsAuthenticated]
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

    @action(detail=False, methods=['post'])
    def calcular_precio(self, request):
        """
        Calcula el precio de una reserva SIN crearla
        Este endpoint se usa en los pasos previos al pago
        """
        logger.info(f"Calculando precio de reserva para usuario {request.user.id}")
        
        try:
            # Validar datos de entrada
            required_fields = ['vehiculo_id', 'fecha_recogida', 'fecha_devolucion', 
                             'lugar_recogida_id', 'lugar_devolucion_id', 'politica_pago_id']
            
            for field in required_fields:
                if not request.data.get(field):
                    return Response(
                        {'error': f'Campo {field} requerido'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Calcular precio usando el servicio
            calculo = ReservaService.calcular_precio_reserva(request.data)
            
            logger.info(f"Precio calculado exitosamente: {calculo['total']}€")
            return Response(calculo, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            logger.warning(f"Error de validación en cálculo de precio: {e}")
            return Response(
                {'error': 'Datos de entrada inválidos', 'details': e.message_dict if hasattr(e, 'message_dict') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error calculando precio de reserva: {str(e)}")
            return Response(
                {'error': 'Error interno calculando precio'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def crear_reserva(self, request):
        """
        Crea una nueva reserva completa
        SOLO se debe llamar en el paso de PAGO
        """
        logger.info(f"Creando reserva para usuario {request.user.id}")
        
        try:
            # Crear reserva usando el servicio
            reserva = ReservaService.crear_reserva_completa(request.data, request.user)
            
            # Serializar respuesta
            serializer = ReservaDetailSerializer(reserva)
            
            logger.info(f"Reserva {reserva.id} creada exitosamente")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            logger.warning(f"Error de validación creando reserva: {e}")
            return Response(
                {'error': 'Datos de entrada inválidos', 'details': e.message_dict if hasattr(e, 'message_dict') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error creando reserva: {str(e)}")
            return Response(
                {'error': 'Error interno creando reserva'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def buscar(self, request, pk=None):
        """
        Busca una reserva por ID y email del conductor principal
        Endpoint mejorado con logging y validación
        """
        logger.info(f"Buscando reserva {pk}")
        
        try:
            email = request.data.get('email')
            if not email:
                return Response(
                    {'error': 'Email requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Usar el servicio para buscar
            reserva = ReservaService.buscar_reserva_por_datos(pk, email)
            
            # Serializar respuesta completa
            serializer = ReservaDetailSerializer(reserva)
            
            logger.info(f"Reserva {pk} encontrada exitosamente")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Reserva.DoesNotExist:
            logger.warning(f"Reserva {pk} no encontrada para email {request.data.get('email')}")
            return Response(
                {'error': 'Reserva no encontrada con esos datos'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error buscando reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno buscando reserva'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """
        Cancela una reserva con validación y logging mejorados
        """
        logger.info(f"Iniciando cancelación de reserva {pk}")
        
        try:
            reserva = self.get_object()
            
            # Verificar si se puede cancelar
            from api.services.reservas import puede_cancelar_reserva, cancelar_reserva
            puede, motivo = puede_cancelar_reserva(reserva)
            
            if not puede:
                logger.warning(f"No se puede cancelar reserva {pk}: {motivo}")
                return Response(
                    {'error': motivo}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Cancelar reserva
            reserva_cancelada = cancelar_reserva(reserva)
            serializer = ReservaDetailSerializer(reserva_cancelada)
            
            logger.info(f"Reserva {pk} cancelada exitosamente")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error cancelando reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno cancelando reserva'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['put', 'patch'])
    def actualizar(self, request, pk=None):
        """
        Actualiza una reserva existente con validación mejorada
        """
        logger.info(f"Actualizando reserva {pk}")
        
        try:
            reserva = self.get_object()
            serializer = ReservaUpdateSerializer(reserva, data=request.data, partial=True)
            
            if serializer.is_valid():
                reserva_actualizada = serializer.save()
                response_serializer = ReservaDetailSerializer(reserva_actualizada)
                
                logger.info(f"Reserva {pk} actualizada exitosamente")
                return Response(response_serializer.data, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Datos inválidos actualizando reserva {pk}: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error actualizando reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno actualizando reserva'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def procesar_pago(self, request, pk=None):
        """
        Procesa un pago para una reserva existente
        Endpoint mejorado con logging y validación
        """
        logger.info(f"Procesando pago para reserva {pk}")
        
        try:
            reserva = self.get_object()
            
            # Validar datos de entrada
            if not request.data.get('metodo_pago'):
                return Response(
                    {'error': 'Método de pago requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not request.data.get('importe'):
                return Response(
                    {'error': 'Importe requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Crear instancia del servicio de pagos
            from payments.services import PaymentService
            payment_service = PaymentService()
            
            # Procesar pago
            result = payment_service.process_payment(reserva, request.data)
            
            if result.get('success'):
                # Actualizar estado de la reserva si el pago es exitoso
                from ..services.reservas import actualizar_pago_reserva
                reserva = actualizar_pago_reserva(reserva, {
                    'importe': request.data.get('importe'),
                    'metodo': request.data.get('metodo_pago'),
                    'transaction_id': result.get('transaction_id'),
                    'estado': 'COMPLETADO'
                })
                
                # Serializar respuesta
                serializer = ReservaDetailSerializer(reserva)
                
                logger.info(f"Pago procesado exitosamente para reserva {pk}")
                return Response({
                    **result,
                    'reserva': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Error procesando pago para reserva {pk}: {result.get('error')}")
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            
        except Reserva.DoesNotExist:
            logger.warning(f"Reserva {pk} no encontrada al procesar pago")
            return Response(
                {'error': 'Reserva no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error procesando pago para reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno procesando pago'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def calcular_diferencia_edicion(self, request, pk=None):
        """
        Calcula la diferencia de precio al editar una reserva
        """
        logger.info(f"Calculando diferencia de edición para reserva {pk}")
        
        try:
            # Usar el servicio para calcular diferencia
            from api.services.reservas import calcular_diferencia_edicion
            diferencia = calcular_diferencia_edicion(pk, request.data)
            
            logger.info(f"Diferencia calculada para reserva {pk}: {diferencia['difference']}€")
            return Response(diferencia, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error calculando diferencia para reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error calculando diferencia de precio'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def verificar_disponibilidad(self, request):
        """
        Verifica la disponibilidad de un vehículo en un rango de fechas
        """
        try:
            vehiculo_id = request.query_params.get('vehiculo_id')
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')
            
            if not all([vehiculo_id, fecha_inicio, fecha_fin]):
                return Response(
                    {'error': 'vehiculo_id, fecha_inicio y fecha_fin son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            disponible = ReservaService.verificar_disponibilidad_vehiculo(
                vehiculo_id, fecha_inicio, fecha_fin
            )
            
            return Response(
                {'disponible': disponible},
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error verificando disponibilidad: {str(e)}")
            return Response(
                {'error': 'Error verificando disponibilidad'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
