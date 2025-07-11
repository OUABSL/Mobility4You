# config/placeholders.py
"""
Middleware para generar placeholders de imágenes dinámicamente
Útil para desarrollo y cuando no hay imágenes disponibles
"""

import io
import logging

from django.http import HttpResponse
from django.urls import path
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)


def generate_placeholder_image(width=300, height=200, text="Sin Imagen", bg_color="#f0f0f0", text_color="#666666"):
    """
    Genera una imagen placeholder SVG
    """
    try:
        # Crear SVG simple
        svg_content = f'''
        <svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="{bg_color}"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="{text_color}" 
                  font-family="Arial, sans-serif" font-size="{min(width, height) // 10}">
                {text}
            </text>
        </svg>
        '''
        
        return svg_content.strip()
    except Exception as e:
        logger.error(f"Error generando placeholder: {e}")
        # Fallback básico
        return f'''
        <svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666666" 
                  font-family="Arial, sans-serif" font-size="16">
                Imagen
            </text>
        </svg>
        '''


@require_GET
@cache_page(60 * 60 * 24)  # Cache por 24 horas
def placeholder_view(request, dimensions):
    """
    Vista para generar placeholders dinámicos
    URL: /api/placeholder/{width}x{height}?text=Texto&bg=color&color=textcolor
    """
    try:
        # Parsear dimensiones
        if 'x' in dimensions:
            width_str, height_str = dimensions.split('x')
            width = min(int(width_str), 2000)  # Máximo 2000px
            height = min(int(height_str), 2000)  # Máximo 2000px
        else:
            width = height = min(int(dimensions), 1000)  # Cuadrado

        # Parámetros opcionales
        text = request.GET.get('text', 'Sin Imagen')[:50]  # Máximo 50 caracteres
        bg_color = request.GET.get('bg', 'f0f0f0')
        text_color = request.GET.get('color', '666666')
        
        # Validar colores (formato hex sin #)
        if not bg_color.startswith('#'):
            bg_color = f'#{bg_color}'
        if not text_color.startswith('#'):
            text_color = f'#{text_color}'

        # Generar SVG
        svg_content = generate_placeholder_image(width, height, text, bg_color, text_color)
        
        return HttpResponse(
            svg_content,
            content_type='image/svg+xml',
            headers={
                'Cache-Control': 'public, max-age=86400',  # 24 horas
                'Content-Disposition': f'inline; filename="placeholder_{width}x{height}.svg"'
            }
        )
        
    except (ValueError, TypeError) as e:
        logger.warning(f"Parámetros inválidos para placeholder: {e}")
        # Placeholder por defecto en caso de error
        svg_content = generate_placeholder_image()
        return HttpResponse(svg_content, content_type='image/svg+xml')
    except Exception as e:
        logger.error(f"Error generando placeholder: {e}")
        return HttpResponse(
            '<svg width="300" height="200"><rect width="100%" height="100%" fill="#f0f0f0"/></svg>',
            content_type='image/svg+xml'
        )


# URL patterns para placeholders
placeholder_urlpatterns = [
    path('api/placeholder/<str:dimensions>/', placeholder_view, name='placeholder'),
]
