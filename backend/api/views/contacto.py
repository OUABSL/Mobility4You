# api/views/contacto.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from ..serializers.contacto import ContactoSerializer
from ..services.notificaciones import enviar_email_contacto

class ContactoView(APIView):
    """
    Gestiona mensajes de contacto del formulario web
    """
    def post(self, request):
        serializer = ContactoSerializer(data=request.data)
        
        if serializer.is_valid():
            # Procesar el mensaje de contacto
            data = serializer.validated_data
            
            # Enviar email de notificación
            enviar_email_contacto(
                nombre=data['name'],
                email=data['email'],
                asunto=data['subject'],
                mensaje=data['message']
            )
            
            return Response(
                {'success': True, 'message': 'Mensaje enviado correctamente'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)