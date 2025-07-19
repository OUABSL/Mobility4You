# config/middleware.py
"""
Middleware genérico para toda la aplicación
Maneja logging, excepciones, CORS, seguridad y monitoreo de forma centralizada
"""
import json
import logging
import time
from typing import Any, Dict, Optional
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404, HttpResponse, JsonResponse
from django.urls import resolve
from django.utils.deprecation import MiddlewareMixin
from django.utils.encoding import force_str
from rest_framework import status

# Configurar logger principal
logger = logging.getLogger(__name__)
api_logger = logging.getLogger("api.requests")
error_logger = logging.getLogger("errors")


class RequestTrackingMiddleware(MiddlewareMixin):
    """
    Middleware para tracking completo de requests con ID único
    """

    def process_request(self, request):
        """Inicializar tracking del request"""
        # Generar ID único para el request
        request.request_id = str(uuid4())[:8]
        request.start_time = time.time()
        
        # Logging inicial solo para APIs
        if self._is_api_request(request):
            api_logger.info(
                f"[{request.request_id}] INICIO - {request.method} {request.path}",
                extra=self._get_request_extra_data(request)
            )
        
        return None

    def process_response(self, request, response):
        """Log del response y tiempo de procesamiento"""
        if hasattr(request, 'start_time') and self._is_api_request(request):
            duration = time.time() - request.start_time
            status_code = response.status_code
            
            # Agregar headers de tracking para debugging/monitoreo
            response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')
            response['X-Response-Time'] = f"{duration*1000:.2f}ms"
            
            # Determinar nivel de log basado en status
            log_level = (
                logging.ERROR if status_code >= 500 else
                logging.WARNING if status_code >= 400 else
                logging.INFO
            )
            
            api_logger.log(
                log_level,
                f"[{getattr(request, 'request_id', 'unknown')}] FINALIZADO - "
                f"{request.method} {request.path} - {status_code} - {duration:.3f}s",
                extra={
                    **self._get_request_extra_data(request),
                    'response_status': status_code,
                    'duration_seconds': duration,
                    'response_size': len(response.content) if hasattr(response, 'content') else 0
                }
            )
        
        return response

    def _is_api_request(self, request):
        """Verificar si es un request de API"""
        return (
            request.path.startswith('/api/') or
            request.path.startswith('/admin/') and request.path != '/admin/' or
            request.path.startswith('/health/')
        )

    def _get_request_extra_data(self, request):
        """Obtener datos extra del request para logging"""
        return {
            'request_id': getattr(request, 'request_id', 'unknown'),
            'request_path': request.path,
            'request_method': request.method,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'user_email': request.user.email if hasattr(request, 'user') and request.user.is_authenticated else None,
            'remote_addr': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
            'query_params': dict(request.GET) if request.GET else {},
        }

    def _get_client_ip(self, request):
        """Obtener IP real del cliente considerando proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class GlobalExceptionMiddleware(MiddlewareMixin):
    """
    Middleware para manejo centralizado de excepciones
    """

    def process_exception(self, request, exception):
        """Procesar excepciones no manejadas"""
        # Solo manejar requests a API/admin
        if not self._should_handle_exception(request):
            return None

        # Log detallado de la excepción
        request_id = getattr(request, 'request_id', 'unknown')
        error_logger.error(
            f"[{request_id}] EXCEPCIÓN - {request.method} {request.path}: {str(exception)}",
            exc_info=True,
            extra={
                **self._get_exception_extra_data(request, exception),
                'exception_type': exception.__class__.__name__,
                'exception_message': str(exception),
            }
        )

        # Crear respuesta apropiada
        if request.path.startswith('/api/'):
            return self._create_api_error_response(request, exception)
        else:
            return self._create_html_error_response(request, exception)

    def _should_handle_exception(self, request):
        """Determinar si el middleware debe manejar esta excepción"""
        return (
            request.path.startswith('/api/') or
            request.path.startswith('/admin/')
        )

    def _create_api_error_response(self, request, exception):
        """Crear respuesta JSON para errores de API"""
        error_data = {
            "success": False,
            "error": "Error interno del servidor",
            "message": "Ha ocurrido un error inesperado. Por favor, inténtelo más tarde.",
            "request_id": getattr(request, 'request_id', 'unknown'),
            "timestamp": time.time(),
        }

        # Información adicional en desarrollo
        if settings.DEBUG:
            error_data.update({
                "debug": {
                    "exception_type": exception.__class__.__name__,
                    "exception_message": str(exception),
                    "request_path": request.path,
                    "request_method": request.method,
                }
            })

        # Status codes específicos para diferentes tipos de excepción
        status_code = self._get_status_code_for_exception(exception)
        
        return JsonResponse(error_data, status=status_code)

    def _create_html_error_response(self, request, exception):
        """Crear respuesta HTML para errores de admin/web"""
        # Para el admin, devolver None para que Django maneje el error
        return None

    def _get_status_code_for_exception(self, exception):
        """Obtener código de estado HTTP apropiado para la excepción"""
        if isinstance(exception, Http404):
            return 404
        elif isinstance(exception, PermissionDenied):
            return 403
        elif isinstance(exception, ValidationError):
            return 400
        else:
            return 500

    def _get_exception_extra_data(self, request, exception):
        """Obtener datos extra para logging de excepciones"""
        try:
            request_body = request.body.decode('utf-8')[:1000] if hasattr(request, 'body') else ''
        except:
            request_body = 'Error al decodificar body'

        return {
            'request_id': getattr(request, 'request_id', 'unknown'),
            'request_path': request.path,
            'request_method': request.method,
            'user_id': request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None,
            'remote_addr': self._get_client_ip(request),
            'request_body': request_body,
        }

    def _get_client_ip(self, request):
        """Obtener IP real del cliente considerando proxies"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware para agregar headers de seguridad
    """

    def process_response(self, request, response):
        """Agregar headers de seguridad"""
        
        # Headers de seguridad básicos
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        }

        # Headers específicos para producción
        if not settings.DEBUG:
            security_headers.update({
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                'Content-Security-Policy': self._get_csp_header(),
            })

        # Aplicar headers
        for header, value in security_headers.items():
            if header not in response:
                response[header] = value

        return response

    def _get_csp_header(self):
        """Generar Content Security Policy header"""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.stripe.com; "
            "frame-src https://js.stripe.com https://hooks.stripe.com; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )


class CORSMiddleware(MiddlewareMixin):
    """
    Middleware mejorado para manejo de CORS
    """

    def process_request(self, request):
        """Manejar preflight requests OPTIONS"""
        if request.method == 'OPTIONS':
            response = HttpResponse()
            self._add_cors_headers(response, request)
            return response
        return None

    def process_response(self, request, response):
        """Agregar headers CORS a todas las respuestas"""
        self._add_cors_headers(response, request)
        return response

    def _add_cors_headers(self, response, request):
        """Agregar headers CORS apropiados"""
        origin = request.META.get('HTTP_ORIGIN')
        
        # Lista de orígenes permitidos
        allowed_origins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost',
            'http://127.0.0.1',
            'http://localhost:80',
            'http://127.0.0.1:80',
        ]

        # En producción, agregar dominios específicos
        if not settings.DEBUG:
            production_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
            allowed_origins.extend(production_origins)
            # Agregar dominios específicos para Render y dominio personalizado
            allowed_origins.extend([
                'https://mobility4you.es',
                'https://www.mobility4you.es',
                'https://mobility4you.onrender.com',
                'https://mobility4you-ydav.onrender.com',
            ])

        # Configurar headers CORS
        if origin and origin in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        elif settings.DEBUG:
            # En desarrollo, permitir cualquier origen
            response['Access-Control-Allow-Origin'] = origin or '*'
            response['Access-Control-Allow-Credentials'] = 'true'
        
        # Agregar headers CORS siempre para requests OPTIONS
        if request.method == 'OPTIONS' or origin:
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = (
                'Accept, Accept-Encoding, Accept-Language, Authorization, '
                'Content-Type, Content-Language, DNT, Origin, User-Agent, '
                'X-Requested-With, X-CSRFToken, X-Request-ID, '
                'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, '
                'Access-Control-Allow-Headers, Access-Control-Allow-Methods'
            )
            response['Access-Control-Expose-Headers'] = 'Content-Type, X-CSRFToken'
            response['Access-Control-Max-Age'] = '86400'  # 24 horas

        # Log para debugging en producción
        if not settings.DEBUG and origin:
            logger = logging.getLogger(__name__)
            if origin not in allowed_origins:
                logger.warning(f"CORS: Origin no permitido: {origin}")
            else:
                logger.info(f"CORS: Origin permitido: {origin}")


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware para health checks rápidos
    """

    def process_request(self, request):
        """Responder rápidamente a health checks"""
        if request.path in ['/health/', '/health', '/api/health/']:
            return JsonResponse({
                'status': 'healthy',
                'timestamp': time.time(),
                'service': 'mobility4you-backend',
                'environment': getattr(settings, 'DJANGO_ENV', 'unknown'),
                'debug': settings.DEBUG,
            })
        return None


class RequestSizeMiddleware(MiddlewareMixin):
    """
    Middleware para limitar el tamaño de requests
    """
    
    MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10MB por defecto

    def process_request(self, request):
        """Verificar tamaño del request"""
        content_length = request.META.get('CONTENT_LENGTH')
        
        if content_length:
            try:
                content_length = int(content_length)
                if content_length > self.MAX_REQUEST_SIZE:
                    logger.warning(
                        f"Request demasiado grande: {content_length} bytes para {request.path}",
                        extra={'request_id': getattr(request, 'request_id', 'unknown')}
                    )
                    
                    if request.path.startswith('/api/'):
                        return JsonResponse({
                            'success': False,
                            'error': 'Request demasiado grande',
                            'message': f'El tamaño máximo permitido es {self.MAX_REQUEST_SIZE // (1024*1024)}MB',
                        }, status=413)
            except ValueError:
                pass  # Ignorar si no se puede parsear
        
        return None


def custom_exception_handler(exc, context):
    """
    Exception handler personalizado para Django REST Framework
    """
    from rest_framework import status
    from rest_framework.views import exception_handler as drf_exception_handler

    # Obtener la respuesta estándar de DRF
    response = drf_exception_handler(exc, context)
    
    request = context.get('request')
    request_id = getattr(request, 'request_id', 'unknown') if request else 'unknown'
    
    # Si DRF no manejó la excepción, crearla nosotros
    if response is None:
        error_logger.error(
            f"[{request_id}] DRF Unhandled exception: {str(exc)}",
            exc_info=True,
            extra={
                'request_id': request_id,
                'exception_type': exc.__class__.__name__,
                'view': context.get('view').__class__.__name__ if context.get('view') else 'unknown',
            }
        )
        
        # Crear respuesta genérica
        from rest_framework.response import Response
        
        response_data = {
            'success': False,
            'error': 'Error interno del servidor',
            'message': 'Ha ocurrido un error inesperado',
            'request_id': request_id,
            'timestamp': time.time(),
        }
        
        if settings.DEBUG:
            response_data['debug'] = {
                'exception_type': exc.__class__.__name__,
                'exception_message': str(exc),
            }
        
        response = Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    else:
        # Mejorar la respuesta de DRF
        if hasattr(response, 'data') and isinstance(response.data, dict):
            # Agregar información adicional
            response.data.update({
                'success': False,
                'request_id': request_id,
                'timestamp': time.time(),
            })
            
            # Normalizar estructura de error
            if 'detail' in response.data and 'error' not in response.data:
                response.data['error'] = response.data['detail']
                if 'message' not in response.data:
                    response.data['message'] = str(response.data['detail'])
    
    # Log del error manejado
    if response and response.status_code >= 400:
        error_logger.warning(
            f"[{request_id}] DRF Error response: {response.status_code}",
            extra={
                'request_id': request_id,
                'status_code': response.status_code,
                'response_data': response.data if hasattr(response, 'data') else None,
                'view': context.get('view').__class__.__name__ if context.get('view') else 'unknown',
            }
        )
    
    return response
