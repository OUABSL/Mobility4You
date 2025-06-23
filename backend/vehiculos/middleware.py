# vehiculos/middleware.py
"""
Middleware personalizado para el manejo de errores y logging
"""
import logging

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class GlobalExceptionMiddleware(MiddlewareMixin):
    """
    Middleware para capturar excepciones no manejadas y devolver respuestas JSON consistentes
    """

    def process_exception(self, request, exception):
        """
        Procesa excepciones no manejadas por las vistas
        """
        # Solo manejar requests a API (que esperan JSON)
        if not request.path.startswith("/api/"):
            return None

        # Log de la excepción
        logger.error(
            f"Excepción no manejada en {request.method} {request.path}: {str(exception)}",
            exc_info=True,
            extra={
                "request_path": request.path,
                "request_method": request.method,
                "user": getattr(request, "user", None),
                "request_data": getattr(request, "body", b"").decode("utf-8")[
                    :500
                ],  # Primeros 500 chars
            },
        )

        # Crear respuesta de error consistente
        error_response = {
            "success": False,
            "error": "Error interno del servidor",
            "message": "Ha ocurrido un error inesperado. Por favor, inténtelo más tarde.",
        }

        # En development, agregar más detalles
        if hasattr(request, "META") and request.META.get("HTTP_HOST") in [
            "localhost:8000",
            "127.0.0.1:8000",
        ]:
            error_response["debug"] = {
                "exception_type": exception.__class__.__name__,
                "exception_message": str(exception),
            }

        return JsonResponse(error_response, status=500)


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware para logging de requests a endpoints de API
    """

    def process_request(self, request):
        """
        Log de requests entrantes
        """
        if request.path.startswith("/api/"):
            logger.info(
                f"API Request: {request.method} {request.path}",
                extra={
                    "request_path": request.path,
                    "request_method": request.method,
                    "user": getattr(request, "user", None),
                    "query_params": dict(request.GET),
                },
            )
        return None

    def process_response(self, request, response):
        """
        Log de responses de API
        """
        if request.path.startswith("/api/"):
            status_code = response.status_code
            log_level = logging.WARNING if status_code >= 400 else logging.INFO

            logger.log(
                log_level,
                f"API Response: {request.method} {request.path} - Status {status_code}",
                extra={
                    "request_path": request.path,
                    "request_method": request.method,
                    "response_status": status_code,
                    "user": getattr(request, "user", None),
                },
            )
        return response


class CORSMiddleware(MiddlewareMixin):
    """
    Middleware para manejar CORS de manera más granular
    """

    def process_response(self, request, response):
        """
        Agregar headers CORS a las respuestas
        """
        # Solo para requests de API
        if request.path.startswith("/api/"):
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With"
            )
            response["Access-Control-Max-Age"] = "86400"

        return response

    def process_request(self, request):
        """
        Manejar preflight requests
        """
        if request.method == "OPTIONS" and request.path.startswith("/api/"):
            response = JsonResponse({})
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Requested-With"
            )
            response["Access-Control-Max-Age"] = "86400"
            return response

        return None
