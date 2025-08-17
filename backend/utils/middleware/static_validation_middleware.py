# utils/middleware/static_validation_middleware.py
"""
Middleware para validación automática de archivos estáticos
Solo se ejecuta en desarrollo para evitar impacto en producción
"""
import logging
import time

from django.conf import settings
from django.http import HttpResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

class StaticValidationMiddleware(MiddlewareMixin):
    """
    Middleware que valida archivos estáticos automáticamente
    Se ejecuta solo en desarrollo y con throttling para evitar sobrecarga
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.last_validation = 0
        self.validation_interval = 300  # 5 minutos entre validaciones
        self.is_development = settings.DEBUG
        super().__init__(get_response)
    
    def process_request(self, request):
        """Valida archivos estáticos si es necesario"""
        
        # Solo ejecutar en desarrollo
        if not self.is_development:
            return None
            
        # Solo para requests del admin
        if not request.path.startswith('/admin/'):
            return None
            
        # Throttling: solo validar cada X minutos
        current_time = time.time()
        if current_time - self.last_validation < self.validation_interval:
            return None
            
        try:
            # Validación rápida
            from utils.smart_static_versioning import validate_static_mappings
            errors = validate_static_mappings()
            
            if errors:
                logger.warning(f"⚠️ Archivos estáticos faltantes detectados: {len(errors)} errores")
                
                # Auto-reparar en background
                from utils.static_hooks import StaticVersioningHooks
                StaticVersioningHooks.run_auto_versioning()
                
            self.last_validation = current_time
            
        except Exception as e:
            logger.error(f"Error en validación de middleware: {e}")
        
        return None
    
    def process_exception(self, request, exception):
        """Maneja excepciones relacionadas con archivos estáticos"""
        
        # Solo manejar errores de archivos estáticos
        if "staticfiles" in str(exception) or "manifest" in str(exception):
            logger.error(f"Error de archivos estáticos detectado: {exception}")
            
            try:
                # Intentar auto-reparar
                from utils.static_hooks import StaticVersioningHooks
                StaticVersioningHooks.run_auto_versioning()
                
                # Si estamos en desarrollo, mostrar error útil
                if self.is_development:
                    error_html = f"""
                    <html>
                        <head><title>Error de Archivos Estáticos</title></head>
                        <body>
                            <h1>🔧 Error de Archivos Estáticos Auto-Reparado</h1>
                            <p><strong>Error:</strong> {exception}</p>
                            <p><strong>Acción:</strong> Se ejecutó auto-reparación. Recarga la página.</p>
                            <p><strong>Consejo:</strong> Ejecuta <code>python manage.py auto_version_static</code> para versionar manualmente.</p>
                            <script>
                                setTimeout(function() {{
                                    location.reload();
                                }}, 3000);
                            </script>
                        </body>
                    </html>
                    """
                    return HttpResponse(error_html, status=500)
                    
            except Exception as repair_error:
                logger.error(f"Error en auto-reparación: {repair_error}")
        
        return None
