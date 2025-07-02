# utils/email_service.py
"""
Servicio de email integrado con Brevo (ex SendinBlue)
Maneja el envío de correos transaccionales para reservas y contacto
"""
import logging
from datetime import datetime
from typing import Dict, List, Optional

import sib_api_v3_sdk
from django.conf import settings
from django.template.loader import render_to_string
from sib_api_v3_sdk.rest import ApiException

logger = logging.getLogger(__name__)


class BrevoEmailService:
    """
    Servicio para el envío de correos electrónicos mediante Brevo API
    """

    def __init__(self):
        """
        Inicializa el servicio con las credenciales de Brevo
        """
        self.api_key = getattr(settings, 'BREVO_API_KEY', None)
        self.sender_email = getattr(settings, 'BREVO_EMAIL', None)
        self.sender_name = getattr(settings, 'BREVO_SENDER_NAME', 'Mobility4You')
        self.admin_email = getattr(settings, 'ADMIN_EMAIL', 'ouael999@gmail.com')
        
        if not self.api_key or not self.sender_email:
            logger.error("BREVO_API_KEY o BREVO_EMAIL no configurados en settings")
            raise ValueError("Credenciales de Brevo no configuradas")
        
        # Configurar la API con el nuevo método
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = self.api_key
        
        self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )
        
        logger.info(f"BrevoEmailService inicializado con email: {self.sender_email}, admin: {self.admin_email}")

    def send_email(self, 
                   to_email: str, 
                   to_name: str, 
                   subject: str, 
                   html_content: str, 
                   text_content: Optional[str] = None,
                   template_params: Optional[Dict] = None) -> Dict:
        """
        Envía un email transaccional
        
        Args:
            to_email: Email del destinatario
            to_name: Nombre del destinatario
            subject: Asunto del email
            html_content: Contenido HTML del email
            text_content: Contenido en texto plano (opcional)
            template_params: Parámetros para plantillas (opcional)
            
        Returns:
            Dict con el resultado del envío
        """
        try:
            # Configurar el email con los nombres correctos de parámetros
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name}],
                sender={"name": self.sender_name, "email": self.sender_email},
                subject=subject,
                html_content=html_content,
                text_content=text_content
            )

            # Enviar el email
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            
            logger.info(f"Email enviado exitosamente a {to_email}. Message ID: {api_response.message_id}")
            
            return {
                'success': True,
                'message_id': api_response.message_id,
                'email': to_email
            }
            
        except ApiException as e:
            logger.error(f"Error de API Brevo: Status: {e.status}, Reason: {e.reason}, Body: {e.body}")
            return {
                'success': False,
                'error': f"Error API Brevo: {e.reason}",
                'status': e.status,
                'details': str(e.body) if e.body else None
            }
        except Exception as e:
            logger.error(f"Error inesperado enviando email: {str(e)}")
            return {
                'success': False,
                'error': f"Error inesperado: {str(e)}"
            }

    def send_reservation_confirmation(self, reserva_data: Dict) -> Dict:
        """
        Envía email de confirmación de reserva
        
        Args:
            reserva_data: Datos de la reserva
            
        Returns:
            Dict con el resultado del envío
        """
        try:
            # Extraer datos de la reserva
            usuario_email = reserva_data.get('usuario_email')
            usuario_nombre = reserva_data.get('usuario_nombre', 'Cliente')
            reserva_id = reserva_data.get('id')
            vehiculo_nombre = reserva_data.get('vehiculo_nombre', 'Vehículo')
            fecha_recogida = reserva_data.get('fecha_recogida')
            fecha_devolucion = reserva_data.get('fecha_devolucion')
            precio_total = reserva_data.get('precio_total', 0)
            lugar_recogida = reserva_data.get('lugar_recogida', 'Por determinar')
            lugar_devolucion = reserva_data.get('lugar_devolucion', 'Por determinar')

            # Formatear fechas
            try:
                if isinstance(fecha_recogida, str):
                    fecha_recogida = datetime.fromisoformat(fecha_recogida.replace('Z', '+00:00'))
                if isinstance(fecha_devolucion, str):
                    fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace('Z', '+00:00'))
                
                fecha_recogida_str = fecha_recogida.strftime('%d/%m/%Y %H:%M') if fecha_recogida else 'Por determinar'
                fecha_devolucion_str = fecha_devolucion.strftime('%d/%m/%Y %H:%M') if fecha_devolucion else 'Por determinar'
            except:
                fecha_recogida_str = str(fecha_recogida) if fecha_recogida else 'Por determinar'
                fecha_devolucion_str = str(fecha_devolucion) if fecha_devolucion else 'Por determinar'

            # Crear contenido HTML
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Confirmación de Reserva - Mobility4You</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .reservation-details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .detail-row {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }}
                    .detail-label {{ font-weight: bold; color: #555; }}
                    .price {{ font-size: 1.2em; font-weight: bold; color: #007bff; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Reserva Confirmada!</h1>
                        <p>Mobility4You</p>
                    </div>
                    
                    <div class="content">
                        <p>Estimado/a {usuario_nombre},</p>
                        
                        <p>Su reserva ha sido confirmada exitosamente. A continuación encontrará los detalles:</p>
                        
                        <div class="reservation-details">
                            <h3>Detalles de la Reserva</h3>
                            
                            <div class="detail-row">
                                <span class="detail-label">ID de Reserva:</span> #{reserva_id}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Vehículo:</span> {vehiculo_nombre}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Fecha de Recogida:</span> {fecha_recogida_str}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Fecha de Devolución:</span> {fecha_devolucion_str}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Lugar de Recogida:</span> {lugar_recogida}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Lugar de Devolución:</span> {lugar_devolucion}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Precio Total:</span> 
                                <span class="price">€{precio_total}</span>
                            </div>
                        </div>
                        
                        <p><strong>¿Qué sigue?</strong></p>
                        <ul>
                            <li>Recibirá instrucciones adicionales por email antes de la fecha de recogida</li>
                            <li>Asegúrese de tener su documentación al día</li>
                            <li>En caso de dudas, no dude en contactarnos</li>
                        </ul>
                        
                        <p>¡Gracias por elegir Mobility4You!</p>
                    </div>
                    
                    <div class="footer">
                        <p>Este es un email automático, por favor no responda a esta dirección.</p>
                        <p>© 2025 Mobility4You. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Contenido en texto plano
            text_content = f"""
            ¡Reserva Confirmada! - Mobility4You
            
            Estimado/a {usuario_nombre},
            
            Su reserva ha sido confirmada exitosamente.
            
            DETALLES DE LA RESERVA:
            - ID de Reserva: #{reserva_id}
            - Vehículo: {vehiculo_nombre}
            - Fecha de Recogida: {fecha_recogida_str}
            - Fecha de Devolución: {fecha_devolucion_str}
            - Lugar de Recogida: {lugar_recogida}
            - Lugar de Devolución: {lugar_devolucion}
            - Precio Total: €{precio_total}
            
            ¡Gracias por elegir Mobility4You!
            
            Este es un email automático, por favor no responda a esta dirección.
            © 2025 Mobility4You. Todos los derechos reservados.
            """

            return self.send_email(
                to_email=usuario_email,
                to_name=usuario_nombre,
                subject=f"Confirmación de Reserva #{reserva_id} - Mobility4You",
                html_content=html_content,
                text_content=text_content
            )

        except Exception as e:
            logger.error(f"Error enviando email de confirmación de reserva: {str(e)}")
            return {
                'success': False,
                'error': f"Error enviando confirmación: {str(e)}"
            }

    def send_contact_notification(self, contacto_data: Dict) -> Dict:
        """
        Envía notificación de nuevo mensaje de contacto a los administradores
        
        Args:
            contacto_data: Datos del contacto
            
        Returns:
            Dict con el resultado del envío
        """
        try:
            # Extraer datos del contacto
            nombre = contacto_data.get('nombre', 'Usuario')
            email = contacto_data.get('email', 'No especificado')
            asunto = contacto_data.get('asunto', 'Sin asunto')
            mensaje = contacto_data.get('mensaje', 'Sin mensaje')
            fecha_contacto = contacto_data.get('fecha_contacto', datetime.now())
            
            # Formatear fecha
            try:
                if isinstance(fecha_contacto, str):
                    fecha_contacto = datetime.fromisoformat(fecha_contacto.replace('Z', '+00:00'))
                fecha_str = fecha_contacto.strftime('%d/%m/%Y %H:%M')
            except:
                fecha_str = str(fecha_contacto)

            # Crear contenido HTML
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Nuevo Mensaje de Contacto - Mobility4You</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .message-details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .detail-row {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }}
                    .detail-label {{ font-weight: bold; color: #555; }}
                    .message-content {{ background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 15px 0; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Nuevo Mensaje de Contacto</h1>
                        <p>Mobility4You - Administración</p>
                    </div>
                    
                    <div class="content">
                        <p>Se ha recibido un nuevo mensaje de contacto a través del sitio web.</p>
                        
                        <div class="message-details">
                            <h3>Detalles del Contacto</h3>
                            
                            <div class="detail-row">
                                <span class="detail-label">Nombre:</span> {nombre}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Email:</span> {email}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Asunto:</span> {asunto}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Fecha:</span> {fecha_str}
                            </div>
                        </div>
                        
                        <div class="message-content">
                            <h4>Mensaje:</h4>
                            <p>{mensaje}</p>
                        </div>
                        
                        <p><strong>Acción requerida:</strong></p>
                        <ul>
                            <li>Revisar el mensaje en el panel de administración</li>
                            <li>Responder al cliente si es necesario</li>
                            <li>Marcar como procesado una vez atendido</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>Panel de Administración - Mobility4You</p>
                        <p>© 2025 Mobility4You. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Contenido en texto plano
            text_content = f"""
            Nuevo Mensaje de Contacto - Mobility4You
            
            Se ha recibido un nuevo mensaje de contacto:
            
            DETALLES:
            - Nombre: {nombre}
            - Email: {email}
            - Asunto: {asunto}
            - Fecha: {fecha_str}
            
            MENSAJE:
            {mensaje}
            
            Por favor, revisar y responder según corresponda.
            
            Panel de Administración - Mobility4You
            © 2025 Mobility4You. Todos los derechos reservados.
            """

            return self.send_email(
                to_email=self.admin_email,  # Enviamos al administrador
                to_name="Administración Mobility4You",
                subject=f"Nuevo Contacto: {asunto}",
                html_content=html_content,
                text_content=text_content
            )

        except Exception as e:
            logger.error(f"Error enviando notificación de contacto: {str(e)}")
            return {
                'success': False,
                'error': f"Error enviando notificación: {str(e)}"
            }

    def send_contact_confirmation(self, contacto_data: Dict) -> Dict:
        """
        Envía email de confirmación al usuario que envió el mensaje de contacto
        
        Args:
            contacto_data: Datos del contacto
            
        Returns:
            Dict con el resultado del envío
        """
        try:
            # Extraer datos del contacto
            nombre = contacto_data.get('nombre', 'Usuario')
            email = contacto_data.get('email')
            asunto = contacto_data.get('asunto', 'Su consulta')
            
            if not email:
                return {
                    'success': False,
                    'error': 'Email del usuario no proporcionado'
                }

            # Crear contenido HTML
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Confirmación de Mensaje - Mobility4You</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .info-box {{ background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #007bff; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>¡Mensaje Recibido!</h1>
                        <p>Mobility4You</p>
                    </div>
                    
                    <div class="content">
                        <p>Estimado/a {nombre},</p>
                        
                        <p>Hemos recibido su mensaje con el asunto "<strong>{asunto}</strong>" y queremos confirmarle que lo hemos registrado correctamente.</p>
                        
                        <div class="info-box">
                            <h3>¿Qué sigue?</h3>
                            <ul>
                                <li>Nuestro equipo revisará su consulta a la brevedad</li>
                                <li>Le responderemos en un plazo máximo de 24-48 horas</li>
                                <li>Si su consulta es urgente, puede contactarnos directamente</li>
                            </ul>
                        </div>
                        
                        <p>Mientras tanto, puede:</p>
                        <ul>
                            <li>Explorar nuestras <strong>preguntas frecuentes</strong> en el sitio web</li>
                            <li>Revisar las <strong>políticas</strong> de nuestros servicios</li>
                            <li>Seguirnos en nuestras redes sociales para las últimas novedades</li>
                        </ul>
                        
                        <p>¡Gracias por contactarnos y por su interés en Mobility4You!</p>
                        
                        <p>Atentamente,<br>
                        El equipo de Mobility4You</p>
                    </div>
                    
                    <div class="footer">
                        <p>Este es un email automático, por favor no responda a esta dirección.</p>
                        <p>© 2025 Mobility4You. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Contenido en texto plano
            text_content = f"""
            ¡Mensaje Recibido! - Mobility4You
            
            Estimado/a {nombre},
            
            Hemos recibido su mensaje con el asunto "{asunto}" y queremos confirmarle que lo hemos registrado correctamente.
            
            ¿QUÉ SIGUE?
            - Nuestro equipo revisará su consulta a la brevedad
            - Le responderemos en un plazo máximo de 24-48 horas
            - Si su consulta es urgente, puede contactarnos directamente
            
            ¡Gracias por contactarnos y por su interés en Mobility4You!
            
            Atentamente,
            El equipo de Mobility4You
            
            Este es un email automático, por favor no responda a esta dirección.
            © 2025 Mobility4You. Todos los derechos reservados.
            """

            return self.send_email(
                to_email=email,
                to_name=nombre,
                subject="Confirmación de Mensaje Recibido - Mobility4You",
                html_content=html_content,
                text_content=text_content
            )

        except Exception as e:
            logger.error(f"Error enviando confirmación de contacto: {str(e)}")
            return {
                'success': False,
                'error': f"Error enviando confirmación: {str(e)}"
            }

    def send_reservation_notification(self, reserva_data: Dict) -> Dict:
        """
        Envía notificación de nueva reserva al administrador
        
        Args:
            reserva_data: Datos de la reserva
            
        Returns:
            Dict con el resultado del envío
        """
        try:
            # Extraer datos de la reserva
            usuario_email = reserva_data.get('usuario_email')
            usuario_nombre = reserva_data.get('usuario_nombre', 'Cliente')
            reserva_id = reserva_data.get('id')
            vehiculo_nombre = reserva_data.get('vehiculo_nombre', 'Vehículo')
            fecha_recogida = reserva_data.get('fecha_recogida')
            fecha_devolucion = reserva_data.get('fecha_devolucion')
            precio_total = reserva_data.get('precio_total', 0)
            lugar_recogida = reserva_data.get('lugar_recogida', 'Por determinar')
            lugar_devolucion = reserva_data.get('lugar_devolucion', 'Por determinar')

            # Formatear fechas
            try:
                if isinstance(fecha_recogida, str):
                    fecha_recogida = datetime.fromisoformat(fecha_recogida.replace('Z', '+00:00'))
                if isinstance(fecha_devolucion, str):
                    fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace('Z', '+00:00'))
                
                fecha_recogida_str = fecha_recogida.strftime('%d/%m/%Y %H:%M') if fecha_recogida else 'Por determinar'
                fecha_devolucion_str = fecha_devolucion.strftime('%d/%m/%Y %H:%M') if fecha_devolucion else 'Por determinar'
            except:
                fecha_recogida_str = str(fecha_recogida) if fecha_recogida else 'Por determinar'
                fecha_devolucion_str = str(fecha_devolucion) if fecha_devolucion else 'Por determinar'

            # Crear contenido HTML para el administrador
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Nueva Reserva Realizada - Mobility4You</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #28a745; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .reservation-details {{ background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                    .detail-row {{ margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }}
                    .detail-label {{ font-weight: bold; color: #555; }}
                    .price {{ font-size: 1.2em; font-weight: bold; color: #28a745; }}
                    .alert {{ background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }}
                    .footer {{ text-align: center; padding: 20px; color: #666; font-size: 0.9em; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚗 Nueva Reserva Realizada</h1>
                        <p>Mobility4You - Administración</p>
                    </div>
                    
                    <div class="content">
                        <p>Se ha realizado una nueva reserva en el sistema.</p>
                        
                        <div class="reservation-details">
                            <h3>Detalles de la Reserva</h3>
                            
                            <div class="detail-row">
                                <span class="detail-label">ID de Reserva:</span> #{reserva_id}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Cliente:</span> {usuario_nombre}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Email del Cliente:</span> {usuario_email}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Vehículo:</span> {vehiculo_nombre}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Fecha de Recogida:</span> {fecha_recogida_str}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Fecha de Devolución:</span> {fecha_devolucion_str}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Lugar de Recogida:</span> {lugar_recogida}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Lugar de Devolución:</span> {lugar_devolucion}
                            </div>
                            
                            <div class="detail-row">
                                <span class="detail-label">Precio Total:</span> 
                                <span class="price">€{precio_total}</span>
                            </div>
                        </div>
                        
                        <div class="alert">
                            <h4>📋 Acciones requeridas:</h4>
                            <ul>
                                <li>Revisar la reserva en el panel de administración</li>
                                <li>Confirmar disponibilidad del vehículo</li>
                                <li>Preparar documentación necesaria</li>
                                <li>Contactar al cliente si es necesario</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Panel de Administración - Mobility4You</p>
                        <p>© 2025 Mobility4You. Todos los derechos reservados.</p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Contenido en texto plano
            text_content = f"""
            Nueva Reserva Realizada - Mobility4You
            
            Se ha realizado una nueva reserva:
            
            DETALLES DE LA RESERVA:
            - ID de Reserva: #{reserva_id}
            - Cliente: {usuario_nombre}
            - Email del Cliente: {usuario_email}
            - Vehículo: {vehiculo_nombre}
            - Fecha de Recogida: {fecha_recogida_str}
            - Fecha de Devolución: {fecha_devolucion_str}
            - Lugar de Recogida: {lugar_recogida}
            - Lugar de Devolución: {lugar_devolucion}
            - Precio Total: €{precio_total}
            
            Por favor, revisar y gestionar la reserva según corresponda.
            
            Panel de Administración - Mobility4You
            © 2025 Mobility4You. Todos los derechos reservados.
            """

            return self.send_email(
                to_email=self.admin_email,  # Enviamos al administrador
                to_name="Administración Mobility4You",
                subject=f"Nueva Reserva #{reserva_id} - {usuario_nombre}",
                html_content=html_content,
                text_content=text_content
            )

        except Exception as e:
            logger.error(f"Error enviando notificación de reserva: {str(e)}")
            return {
                'success': False,
                'error': f"Error enviando notificación: {str(e)}"
            }

    # ...existing code...


# Instancia singleton del servicio
try:
    brevo_service = BrevoEmailService()
except Exception as e:
    logger.error(f"Error inicializando BrevoEmailService: {str(e)}")
    brevo_service = None


def get_email_service():
    """
    Obtiene la instancia del servicio de email
    """
    global brevo_service
    if brevo_service is None:
        try:
            brevo_service = BrevoEmailService()
        except Exception as e:
            logger.error(f"Error creando BrevoEmailService: {str(e)}")
            raise
    return brevo_service
