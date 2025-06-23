# vehiculos/exceptions.py
"""
Manejadores de excepciones personalizados para la aplicación de vehículos
"""
import logging

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Manejador de excepciones personalizado que extiende el manejador de DRF
    """
    # Obtener la respuesta estándar de DRF
    response = drf_exception_handler(exc, context)

    # Si DRF no pudo manejar la excepción, la manejamos nosotros
    if response is None:
        return handle_unhandled_exception(exc, context)

    # Personalizar la respuesta de DRF para que sea consistente
    custom_response_data = {
        "success": False,
        "error": get_error_message(exc),
        "message": get_user_friendly_message(exc, response.status_code),
    }

    # Agregar detalles adicionales si están disponibles
    if hasattr(response, "data") and response.data:
        if isinstance(response.data, dict):
            # Mantener información detallada en development
            if (
                hasattr(context.get("request"), "META")
                and context["request"].META.get("HTTP_HOST") == "localhost:8000"
            ):
                custom_response_data["details"] = response.data
        elif isinstance(response.data, list):
            custom_response_data["details"] = response.data

    response.data = custom_response_data

    # Log del error para debugging
    log_exception(exc, context, response.status_code)

    return response


def handle_unhandled_exception(exc, context):
    """
    Maneja excepciones que DRF no pudo procesar
    """
    logger.error(f"Excepción no manejada: {str(exc)}", exc_info=True)

    # Determinar el código de estado apropiado
    if isinstance(exc, Http404):
        status_code = status.HTTP_404_NOT_FOUND
        error_message = "Recurso no encontrado"
        user_message = "El recurso solicitado no existe"
    elif isinstance(exc, PermissionDenied):
        status_code = status.HTTP_403_FORBIDDEN
        error_message = "Acceso denegado"
        user_message = "No tiene permisos para realizar esta acción"
    elif isinstance(exc, ValidationError):
        status_code = status.HTTP_400_BAD_REQUEST
        error_message = "Error de validación"
        user_message = str(exc)
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_message = "Error interno del servidor"
        user_message = (
            "Ha ocurrido un error inesperado. Por favor, inténtelo más tarde."
        )

    return Response(
        {
            "success": False,
            "error": error_message,
            "message": user_message,
        },
        status=status_code,
    )


def get_error_message(exc):
    """
    Obtiene un mensaje de error técnico basado en el tipo de excepción
    """
    if hasattr(exc, "detail"):
        if isinstance(exc.detail, dict):
            # Para errores de validación con múltiples campos
            return "Error de validación en múltiples campos"
        elif isinstance(exc.detail, list):
            return "Múltiples errores de validación"
        else:
            return str(exc.detail)
    elif hasattr(exc, "message"):
        return exc.message
    else:
        return exc.__class__.__name__


def get_user_friendly_message(exc, status_code):
    """
    Obtiene un mensaje amigable para el usuario final
    """
    if status_code == status.HTTP_400_BAD_REQUEST:
        return "Los datos enviados no son válidos. Por favor, revise la información e inténtelo nuevamente."
    elif status_code == status.HTTP_401_UNAUTHORIZED:
        return "Debe iniciar sesión para acceder a este recurso."
    elif status_code == status.HTTP_403_FORBIDDEN:
        return "No tiene permisos para realizar esta acción."
    elif status_code == status.HTTP_404_NOT_FOUND:
        return "El recurso solicitado no fue encontrado."
    elif status_code == status.HTTP_405_METHOD_NOT_ALLOWED:
        return "Método no permitido para este recurso."
    elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return "Ha realizado demasiadas solicitudes. Por favor, espere un momento e inténtelo nuevamente."
    elif status_code >= 500:
        return "Ha ocurrido un error interno. Por favor, inténtelo más tarde."
    else:
        return "Ha ocurrido un error. Por favor, inténtelo nuevamente."


def log_exception(exc, context, status_code):
    """
    Registra la excepción en los logs con la información contextual apropiada
    """
    request = context.get("request")
    view = context.get("view")

    log_data = {
        "exception_type": exc.__class__.__name__,
        "status_code": status_code,
        "view": view.__class__.__name__ if view else "Unknown",
        "method": request.method if request else "Unknown",
        "path": request.path if request else "Unknown",
    }

    if status_code >= 500:
        logger.error(f"Error interno del servidor: {log_data}", exc_info=True)
    elif status_code >= 400:
        logger.warning(f"Error del cliente: {log_data}")
    else:
        logger.info(f"Excepción manejada: {log_data}")


class VehiculoException(Exception):
    """Excepción base para errores relacionados con vehículos"""


class LugarException(Exception):
    """Excepción base para errores relacionados con lugares"""


class TarifaException(Exception):
    """Excepción base para errores relacionados con tarifas"""


class DisponibilidadException(Exception):
    """Excepción para errores de disponibilidad de vehículos"""
