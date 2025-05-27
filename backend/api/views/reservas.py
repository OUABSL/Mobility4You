import logging
from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from ..models.reservas import Reserva, Extras
from ..models.usuarios import Usuario
from ..serializers.reservas import ReservaSerializer, ExtrasSerializer
from ..services.reservas import ReservaService
from ..permissions import PublicAccessPermission
from payments.services import StripePaymentService

logger = logging.getLogger(__name__)

# DEBUG_MODE para ignorar procesamiento de pagos en desarrollo
DEBUG_MODE = getattr(settings, 'DEBUG', False)


class ReservaViewSet(viewsets.ModelViewSet):
    """
    ViewSet mejorado para manejo de reservas con logging completo,
    validación robusta y separación clara entre cálculo y creación.
    """
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.reserva_service = ReservaService()
        self.payment_service = StripePaymentService()
        logger.info("ReservaViewSet inicializado con servicios")
    
    def get_queryset(self):
        """Filtra las reservas según el usuario con logging completo"""
        logger.info(f"Usuario {self.request.user.id} solicitando reservas")
        
        user = self.request.user
        queryset = super().get_queryset()
        
        try:
            # Con el modelo Usuario unificado, filtramos directamente por usuario
            filtered_queryset = queryset.filter(usuario=user)
            logger.info(f"Encontradas {filtered_queryset.count()} reservas para usuario {user.id}")
            return filtered_queryset
        except Exception as e:
            logger.error(f"Error al filtrar reservas para usuario {user.id}: {str(e)}")
            return queryset.none()
    
    @action(detail=False, methods=['post'])
    def calcular_precio(self, request):
        """
        Calcula el precio de una reserva sin crearla en la base de datos.
        Endpoint para el frontend durante el flujo de reserva.
        """
        logger.info("=== INICIO CÁLCULO DE PRECIO ===")
        logger.info(f"Usuario: {request.user.id}")
        
        try:
            # Validar datos de entrada
            datos_reserva = request.data
            logger.info(f"Datos recibidos para cálculo: {datos_reserva}")
            
            # Validar campos obligatorios
            campos_obligatorios = ['vehiculo_id', 'fecha_inicio', 'fecha_fin', 'lugar_recogida_id']
            for campo in campos_obligatorios:
                if not datos_reserva.get(campo):
                    logger.error(f"Campo obligatorio faltante: {campo}")
                    return Response(
                        {'error': f'Campo obligatorio: {campo}'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Usar el servicio para calcular precio
            resultado = self.reserva_service.calcular_precio_reserva(datos_reserva)
            
            logger.info(f"Precio calculado exitosamente: {resultado}")
            logger.info("=== FIN CÁLCULO DE PRECIO ===")
            
            return Response(resultado, status=status.HTTP_200_OK)
            
        except ValueError as e:
            logger.error(f"Error de validación en cálculo de precio: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error interno en cálculo de precio: {str(e)}")
            return Response(                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def crear_reserva(self, request):
        """
        Crea una reserva completa en el paso de pago.
        Solo se ejecuta cuando el usuario confirma y paga.
        """
        logger.info("=== INICIO CREACIÓN DE RESERVA ===")
        logger.info(f"Usuario: {request.user.id}")
        
        try:
            with transaction.atomic():
                # Validar y crear reserva
                datos_reserva = request.data
                logger.info(f"Datos recibidos para creación: {datos_reserva}")
                
                # Validar que vengan datos de pago
                if not datos_reserva.get('datos_pago'):
                    logger.error("Faltan datos de pago para crear reserva")
                    return Response(
                        {'error': 'Se requieren datos de pago para crear la reserva'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Crear reserva usando el servicio
                reserva = self.reserva_service.crear_reserva_completa(
                    datos_reserva, 
                    request.user
                )
                
                # Serializar la respuesta
                serializer = self.get_serializer(reserva)
                logger.info(f"Reserva creada exitosamente: ID {reserva.id}")
                logger.info("=== FIN CREACIÓN DE RESERVA ===")
                
                return Response(
                    serializer.data, 
                    status=status.HTTP_201_CREATED
                )
                
        except ValueError as e:
            logger.error(f"Error de validación en creación de reserva: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error interno en creación de reserva: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def procesar_pago(self, request, pk=None):
        """Procesa el pago de una reserva existente"""
        logger.info(f"=== INICIO PROCESAMIENTO PAGO RESERVA {pk} ===")
        
        try:
            reserva = self.get_object()
            logger.info(f"Procesando pago para reserva {reserva.id}, estado: {reserva.estado}")
            
            # Verificar que la reserva esté en estado correcto
            if reserva.estado not in ['pendiente', 'confirmada']:
                logger.warning(f"Intento de pago en reserva {pk} con estado {reserva.estado}")
                return Response(
                    {'error': 'La reserva no está en estado válido para pago'}, 
                    status=status.HTTP_400_BAD_REQUEST                )
            
            # Procesar pago
            datos_pago = request.data
            logger.info(f"Procesando pago por {reserva.precio_total}")
            
            # En DEBUG_MODE, simular pago exitoso sin procesamiento real
            if DEBUG_MODE:
                logger.info("DEBUG_MODE: Simulando pago exitoso sin procesamiento real")
                resultado_pago = {
                    'success': True,
                    'transaction_id': f'DEBUG_{timezone.now().strftime("%Y%m%d%H%M%S")}',
                    'message': 'Pago simulado en modo DEBUG'
                }
            else:
                # Procesamiento real de pago en producción
                resultado_pago = self.payment_service.process_payment(
                    reserva.precio_total, 
                    datos_pago
                )
            
            if resultado_pago.get('success'):
                # Actualizar estado de la reserva
                with transaction.atomic():
                    reserva.estado = 'pagada'
                    reserva.fecha_pago = timezone.now()
                    reserva.metodo_pago = datos_pago.get('metodo_pago', 'tarjeta')
                    reserva.save()
                
                logger.info(f"Pago procesado exitosamente para reserva {pk}")
                logger.info("=== FIN PROCESAMIENTO PAGO ===")
                
                return Response({
                    'message': 'Pago procesado exitosamente',
                    'reserva_id': reserva.id,
                    'estado': reserva.estado,
                    'transaction_id': resultado_pago.get('transaction_id')
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Error en procesamiento de pago para reserva {pk}: {resultado_pago.get('error')}")
                return Response(
                    {'error': f"Error en el pago: {resultado_pago.get('error')}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Error interno en procesamiento de pago para reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """
        Cancela una reserva usando ReservaService
        """
        logger.info(f"=== INICIO CANCELACIÓN RESERVA {pk} ===")
        
        try:
            reserva = self.get_object()
            logger.info(f"Cancelando reserva {reserva.id}, estado actual: {reserva.estado}")
            
            # Usar el servicio para cancelar
            reserva_cancelada = self.reserva_service.cancelar_reserva(reserva)
            
            # Serializar respuesta
            serializer = self.get_serializer(reserva_cancelada)
            
            logger.info(f"Reserva {pk} cancelada exitosamente")
            logger.info("=== FIN CANCELACIÓN RESERVA ===")
            
            return Response(
                {
                    'message': 'Reserva cancelada exitosamente',
                    'reserva': serializer.data
                }, 
                status=status.HTTP_200_OK
            )
            
        except ValueError as e:
            logger.error(f"Error de validación cancelando reserva {pk}: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error interno cancelando reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def buscar(self, request, pk=None):
        """
        Busca una reserva por ID y email del usuario
        """
        logger.info(f"=== INICIO BÚSQUEDA RESERVA {pk} ===")
        
        try:
            email = request.data.get('email')
            if not email:
                return Response(
                    {'error': 'Email es requerido'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Usar el servicio para buscar
            reserva = self.reserva_service.buscar_reserva_por_datos(pk, email)
            
            # Serializar respuesta
            serializer = self.get_serializer(reserva)
            
            logger.info(f"Reserva {pk} encontrada exitosamente")
            logger.info("=== FIN BÚSQUEDA RESERVA ===")
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Reserva.DoesNotExist:
            logger.warning(f"Reserva {pk} no encontrada para email proporcionado")
            return Response(
                {'error': 'Reserva no encontrada con los datos proporcionados'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error interno buscando reserva {pk}: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def create(self, request, *args, **kwargs):
        """Override del create estándar con logging y validaciones"""
        logger.info("=== INICIO CREATE RESERVA (MÉTODO ESTÁNDAR) ===")
        logger.warning("Se está usando el método create estándar. Considere usar crear_reserva")
        
        try:
            response = super().create(request, *args, **kwargs)
            if response.status_code == status.HTTP_201_CREATED:
                logger.info(f"Reserva creada vía método estándar: {response.data.get('id')}")
            return response
        except Exception as e:
            logger.error(f"Error en create estándar: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Actualiza una reserva con validaciones adicionales"""
        logger.info(f"=== INICIO ACTUALIZACIÓN RESERVA {kwargs.get('pk')} ===")
        
        try:
            instance = self.get_object()
            logger.info(f"Actualizando reserva {instance.id}, estado: {instance.estado}")
            
            # Verificar que la reserva se pueda modificar
            if instance.estado in ['pagada', 'completada', 'cancelada']:
                logger.warning(f"Intento de modificación en reserva {instance.id} con estado {instance.estado}")
                return Response(
                    {'error': 'No se puede modificar una reserva en este estado'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Realizar actualización normal
            response = super().update(request, *args, **kwargs)
            
            if response.status_code == status.HTTP_200_OK:
                logger.info(f"Reserva {instance.id} actualizada exitosamente")
                logger.info("=== FIN ACTUALIZACIÓN RESERVA ===")
            
            return response
            
        except Exception as e:
            logger.error(f"Error interno en actualización de reserva: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override del delete con logging"""
        logger.info(f"=== INICIO ELIMINACIÓN RESERVA {kwargs.get('pk')} ===")
        
        try:
            instance = self.get_object()
            logger.warning(f"Eliminando reserva {instance.id} - estado: {instance.estado}")
            
            response = super().destroy(request, *args, **kwargs)
            logger.info(f"Reserva {instance.id} eliminada")
            logger.info("=== FIN ELIMINACIÓN RESERVA ===")
            
            return response
        except Exception as e:
            logger.error(f"Error en eliminación de reserva: {str(e)}")
            return Response(
                {'error': 'Error interno del servidor'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExtrasViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gestionar extras disponibles como parte del módulo de reservas.
    Solo lectura para usuarios públicos, gestión completa vía Django Admin.
    """
    queryset = Extras.objects.all()
    serializer_class = ExtrasSerializer
    permission_classes = [PublicAccessPermission]  # Acceso público para consultas
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering_fields = ['nombre', 'precio']
    ordering = ['nombre']
    
    def get_permissions(self):
        """
        Personalizar permisos: acceso público para listar/ver, admin para modificar
        """
        if self.action in ['list', 'retrieve']:
            return [PublicAccessPermission()]
        else:
            return [PublicAccessPermission()]  # ReadOnly viewset, no necesita admin para estas acciones
    
    def list(self, request, *args, **kwargs):
        """
        Lista todos los extras disponibles con logging
        """
        logger.info("Solicitando lista de extras disponibles")
        
        try:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Devolviendo {len(serializer.data)} extras")
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo extras: {str(e)}")
            return Response(
                {'error': 'Error interno obteniendo extras'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, *args, **kwargs):
        """
        Obtiene detalle de un extra específico
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            
            logger.info(f"Devolviendo detalle del extra {instance.id}: {instance.nombre}")
            return Response({
                'success': True,
                'result': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo detalle del extra: {str(e)}")
            return Response(
                {'error': 'Extra no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """
        Obtiene solo los extras que están disponibles (activos)
        En el futuro se podría agregar un campo 'activo' al modelo
        """
        logger.info("Solicitando extras disponibles")
        
        try:
            # Por ahora, todos los extras en BD están disponibles
            # En el futuro se podría filtrar por un campo 'activo'
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error obteniendo extras disponibles: {str(e)}")
            return Response(
                {'error': 'Error interno obteniendo extras disponibles'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def por_precio(self, request):
        """
        Obtiene extras ordenados por precio (ascendente o descendente)
        Parámetro: orden=asc|desc (por defecto: asc)
        """
        try:
            orden = request.query_params.get('orden', 'asc')
            
            if orden.lower() == 'desc':
                queryset = self.get_queryset().order_by('-precio')
            else:
                queryset = self.get_queryset().order_by('precio')
            
            serializer = self.get_serializer(queryset, many=True)
            
            logger.info(f"Devolviendo extras ordenados por precio ({orden})")
            return Response({
                'success': True,
                'count': len(serializer.data),
                'results': serializer.data,
                'orden': orden
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error ordenando extras por precio: {str(e)}")
            return Response(
                {'error': 'Error interno ordenando extras'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


