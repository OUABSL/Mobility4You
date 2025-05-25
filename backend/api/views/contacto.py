# api/views/contacto.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from ..models.contacto import Contacto
from ..serializers.contacto import ContactoSerializer, ContactoListSerializer, ContactoRespuestaSerializer
from ..services.notifications import enviar_email_contacto
import logging

logger = logging.getLogger(__name__)


class ContactoView(APIView):
    """
    Gestiona mensajes de contacto del formulario web
    """
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación
    
    def post(self, request):
        """
        Crea un nuevo mensaje de contacto
        """
        try:
            # Mapear datos del frontend al formato del serializer
            data = {
                'nombre': request.data.get('name'),
                'email': request.data.get('email'),
                'asunto': request.data.get('subject'),
                'mensaje': request.data.get('message')
            }
            
            serializer = ContactoSerializer(data=data)
            
            if serializer.is_valid():
                # Obtener información adicional de la request
                ip_address = self.get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                
                # Guardar en base de datos
                contacto = serializer.save(
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                # Enviar email de notificación de forma asíncrona
                try:
                    enviar_email_contacto(
                        nombre=contacto.nombre,
                        email=contacto.email,
                        asunto=contacto.asunto,
                        mensaje=contacto.mensaje
                    )
                    logger.info(f"Email de contacto enviado para: {contacto.email}")
                except Exception as e:
                    logger.error(f"Error enviando email de contacto: {str(e)}")
                    # No fallar la respuesta si el email falla
                
                return Response({
                    'success': True, 
                    'message': 'Mensaje enviado correctamente. Te responderemos pronto.',
                    'id': contacto.id
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'success': False,
                'message': 'Datos inválidos',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error procesando mensaje de contacto: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error interno del servidor. Inténtalo de nuevo más tarde.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """
        Lista mensajes de contacto (para administración)
        """
        try:
            mensajes = Contacto.objects.all()
            
            # Filtros opcionales
            estado = request.query_params.get('estado')
            if estado:
                mensajes = mensajes.filter(estado=estado)
                
            fecha_desde = request.query_params.get('fecha_desde')
            if fecha_desde:
                mensajes = mensajes.filter(fecha_creacion__gte=fecha_desde)
                
            fecha_hasta = request.query_params.get('fecha_hasta')
            if fecha_hasta:
                mensajes = mensajes.filter(fecha_creacion__lte=fecha_hasta)
            
            serializer = ContactoListSerializer(mensajes, many=True)
            return Response({
                'success': True,
                'data': serializer.data,
                'count': mensajes.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error listando mensajes de contacto: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error obteniendo mensajes'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """
        Obtiene la IP real del cliente
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ContactoDetailView(APIView):
    """
    Gestiona un mensaje de contacto específico
    """
    
    def get(self, request, pk):
        """
        Obtiene un mensaje de contacto específico
        """
        try:
            contacto = Contacto.objects.get(pk=pk)
            serializer = ContactoListSerializer(contacto)
            return Response({
                'success': True,
                'data': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Contacto.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Mensaje no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error obteniendo mensaje de contacto {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error obteniendo mensaje'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, pk):
        """
        Actualiza el estado o responde a un mensaje de contacto
        """
        try:
            contacto = Contacto.objects.get(pk=pk)
            
            # Actualizar estado si se proporciona
            if 'estado' in request.data:
                contacto.estado = request.data['estado']
                contacto.save()
            
            # Procesar respuesta si se proporciona
            if 'respuesta' in request.data:
                serializer = ContactoRespuestaSerializer(contacto, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                else:
                    return Response({
                        'success': False,
                        'message': 'Datos de respuesta inválidos',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Devolver datos actualizados
            updated_serializer = ContactoListSerializer(contacto)
            return Response({
                'success': True,
                'message': 'Mensaje actualizado correctamente',
                'data': updated_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Contacto.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Mensaje no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error actualizando mensaje de contacto {pk}: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error actualizando mensaje'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)