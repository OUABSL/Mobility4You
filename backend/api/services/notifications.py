# api/services/notificaciones.py
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger('emails')

def enviar_email(destinatario, asunto, template, contexto, 
                remitente=None, cc=None, adjuntos=None):
    """
    Envía un email usando una plantilla HTML
    
    Args:
        destinatario: Email o lista de emails destinatarios
        asunto: Asunto del email
        template: Ruta a la plantilla HTML
        contexto: Dict con variables para la plantilla
        remitente: Email de remitente (opcional)
        cc: Email o lista CC (opcional)
        adjuntos: Lista de adjuntos (opcional)
    
    Returns:
        bool: Éxito del envío
    """
    try:
        # Remitente por defecto
        from_email = remitente or settings.DEFAULT_FROM_EMAIL
        
        # Convertir destinatario a lista si es string
        if isinstance(destinatario, str):
            destinatario = [destinatario]
        
        # Renderizar HTML
        html_content = render_to_string(template, contexto)
        
        # Versión texto plano
        text_content = strip_tags(html_content)
        
        # Crear email
        email = EmailMultiAlternatives(
            subject=asunto,
            body=text_content,
            from_email=from_email,
            to=destinatario,
            cc=cc
        )
        
        # Añadir versión HTML
        email.attach_alternative(html_content, "text/html")
        
        # Añadir adjuntos si hay
        if adjuntos:
            for adjunto in adjuntos:
                nombre = adjunto.get('nombre')
                contenido = adjunto.get('contenido')
                tipo = adjunto.get('tipo', 'application/octet-stream')
                
                email.attach(nombre, contenido, tipo)
        
        # Enviar
        email.send()
        return True
        
    except Exception as e:
        logger.error(f"Error enviando email: {str(e)}")
        return False

def enviar_email_confirmacion_reserva(reserva):
    """
    Envía email de confirmación de reserva
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        bool: Éxito del envío
    """
    try:
        # Obtener datos necesarios
        conductor = reserva.conductores.filter(rol='principal').first()
        
        if not conductor:
            logger.error(f"No se encontró conductor principal para reserva {reserva.id}")
            return False
        
        # Preparar contexto
        contexto = {
            'nombre': conductor.nombre,
            'apellidos': conductor.apellidos,
            'codigo_reserva': reserva.id,
            'fecha_recogida': reserva.fecha_recogida,
            'fecha_devolucion': reserva.fecha_devolucion,
            'vehiculo': f"{reserva.vehiculo.marca} {reserva.vehiculo.modelo}",
            'lugar_recogida': reserva.lugar_recogida.nombre,
            'lugar_devolucion': reserva.lugar_devolucion.nombre,
            'total': reserva.precio_total,
            'politica': reserva.politica_pago.titulo,
            'metodo_pago': reserva.get_metodo_pago_display()
        }
        
        # Enviar email
        return enviar_email(
            destinatario=conductor.email,
            asunto=f"Confirmación de reserva #{reserva.id}",
            template='emails/reserva_confirmada.html',
            contexto=contexto
        )
        
    except Exception as e:
        logger.error(f"Error enviando email de confirmación: {str(e)}")
        return False

def enviar_email_contacto(nombre, email, asunto, mensaje):
    """
    Envía email de contacto al equipo y confirmación al remitente
    
    Args:
        nombre: Nombre del remitente
        email: Email del remitente
        asunto: Asunto del mensaje
        mensaje: Contenido del mensaje
        
    Returns:
        bool: Éxito del envío
    """
    try:
        # Datos para el email interno
        contexto_interno = {
            'nombre': nombre,
            'email': email,
            'asunto': asunto,
            'mensaje': mensaje,
            'fecha': timezone.now()
        }
        
        # Email al equipo
        enviar_email(
            destinatario=settings.CONTACT_EMAIL,
            asunto=f"Nuevo mensaje de contacto: {asunto}",
            template='emails/contacto_interno.html',
            contexto=contexto_interno
        )
        
        # Datos para el email de confirmación
        contexto_cliente = {
            'nombre': nombre,
            'asunto': asunto,
            'mensaje': mensaje
        }
        
        # Email de confirmación al cliente
        return enviar_email(
            destinatario=email,
            asunto=f"Hemos recibido tu mensaje: {asunto}",
            template='emails/contacto_confirmacion.html',
            contexto=contexto_cliente
        )
        
    except Exception as e:
        logger.error(f"Error enviando email de contacto: {str(e)}")
        return False