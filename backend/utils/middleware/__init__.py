# utils/middleware/__init__.py
"""
Middleware personalizado para el sistema
"""

from .static_validation_middleware import StaticValidationMiddleware

__all__ = ['StaticValidationMiddleware']
