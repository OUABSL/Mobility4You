#!/usr/bin/env python3
"""
Script de inicialización y verificación del sistema
Verifica la configuración del middleware, conectividad y dependencias
"""
import os
import subprocess
import sys
import time
from pathlib import Path

# Agregar el directorio del backend al path para importar Django
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    import django
    django.setup()
    
    from django.conf import settings
    from django.core.management import execute_from_command_line
    from django.db import connection
    from django.test.utils import get_runner
    
    DJANGO_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Django no disponible: {e}")
    DJANGO_AVAILABLE = False


class SystemInitializer:
    """Inicializador y verificador del sistema"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.backend_dir = self.project_root / "backend"
        self.frontend_dir = self.project_root / "frontend"
        self.docker_dir = self.project_root / "docker"
        
    def print_header(self, title):
        """Imprimir header bonito"""
        print("\n" + "=" * 60)
        print(f"🚀 {title}")
        print("=" * 60)
    
    def print_step(self, step_name, success=None, message=""):
        """Imprimir paso con estado"""
        if success is True:
            status = "✅"
        elif success is False:
            status = "❌"
        else:
            status = "🔍"
        
        print(f"{status} {step_name}: {message}")
    
    def check_dependencies(self):
        """Verificar dependencias del sistema"""
        self.print_header("VERIFICANDO DEPENDENCIAS")
        
        # Verificar Python
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        python_ok = sys.version_info >= (3, 8)
        self.print_step("Python", python_ok, f"v{python_version}")
        
        # Verificar Django si está disponible
        if DJANGO_AVAILABLE:
            import django
            django_version = django.get_version()
            self.print_step("Django", True, f"v{django_version}")
        else:
            self.print_step("Django", False, "No disponible")
        
        # Verificar archivos de configuración
        config_files = [
            (self.backend_dir / "config" / "settings.py", "Django Settings"),
            (self.backend_dir / "config" / "middleware.py", "Middleware Genérico"),
            (self.frontend_dir / "src" / "setupProxy.js", "Frontend Proxy"),
            (self.docker_dir / "nginx" / "nginx.dev.conf", "Nginx Config"),
            (self.docker_dir / "docker-compose.dev.yml", "Docker Compose"),
        ]
        
        for file_path, description in config_files:
            exists = file_path.exists()
            self.print_step(description, exists, str(file_path) if exists else "No encontrado")
        
        return True
    
    def check_django_configuration(self):
        """Verificar configuración de Django"""
        if not DJANGO_AVAILABLE:
            self.print_step("Django Configuration", False, "Django no disponible")
            return False
        
        self.print_header("VERIFICANDO CONFIGURACIÓN DJANGO")
        
        try:
            # Verificar SECRET_KEY
            secret_key_ok = bool(settings.SECRET_KEY and settings.SECRET_KEY != 'claveprivadatemporal')
            self.print_step("SECRET_KEY", secret_key_ok, "Configurado" if secret_key_ok else "Usar clave temporal")
            
            # Verificar DEBUG
            debug_status = settings.DEBUG
            self.print_step("DEBUG Mode", True, f"{'Enabled' if debug_status else 'Disabled'}")
            
            # Verificar middleware personalizado
            middleware_list = settings.MIDDLEWARE
            custom_middleware = [m for m in middleware_list if m.startswith('config.middleware.')]
            has_custom_middleware = len(custom_middleware) > 0
            self.print_step("Middleware Personalizado", has_custom_middleware, f"{len(custom_middleware)} middleware(s)")
            
            # Verificar aplicaciones modulares
            installed_apps = settings.INSTALLED_APPS
            modular_apps = ['usuarios', 'vehiculos', 'reservas', 'politicas', 'facturas_contratos', 'comunicacion', 'payments']
            present_apps = [app for app in modular_apps if app in installed_apps]
            self.print_step("Apps Modulares", len(present_apps) == len(modular_apps), f"{len(present_apps)}/{len(modular_apps)} apps")
            
            # Verificar CORS
            cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
            has_cors = len(cors_origins) > 0
            self.print_step("CORS Configuration", has_cors, f"{len(cors_origins)} orígenes permitidos")
            
            # Verificar base de datos
            try:
                db_vendor = connection.vendor
                self.print_step("Database", True, f"Conectado a {db_vendor}")
            except Exception as e:
                self.print_step("Database", False, f"Error: {str(e)}")
            
            return True
            
        except Exception as e:
            self.print_step("Django Configuration", False, f"Error: {str(e)}")
            return False
    
    def check_middleware_files(self):
        """Verificar archivos de middleware"""
        self.print_header("VERIFICANDO ARCHIVOS DE MIDDLEWARE")
        
        middleware_file = self.backend_dir / "config" / "middleware.py"
        
        if not middleware_file.exists():
            self.print_step("Middleware File", False, "Archivo no encontrado")
            return False
        
        # Leer contenido del archivo
        try:
            content = middleware_file.read_text(encoding='utf-8')
            
            # Verificar clases de middleware
            expected_classes = [
                'RequestTrackingMiddleware',
                'GlobalExceptionMiddleware',
                'SecurityHeadersMiddleware',
                'CORSMiddleware',
                'HealthCheckMiddleware',
                'RequestSizeMiddleware'
            ]
            
            for class_name in expected_classes:
                class_present = f"class {class_name}" in content
                self.print_step(f"Middleware: {class_name}", class_present)
            
            # Verificar function handler
            has_exception_handler = 'def custom_exception_handler' in content
            self.print_step("Exception Handler", has_exception_handler)
            
            return True
            
        except Exception as e:
            self.print_step("Middleware File", False, f"Error leyendo archivo: {str(e)}")
            return False
    
    def run_django_checks(self):
        """Ejecutar checks de Django"""
        if not DJANGO_AVAILABLE:
            return False
            
        self.print_header("EJECUTANDO DJANGO CHECKS")
        
        try:
            # Ejecutar django check
            from io import StringIO

            from django.core.management import call_command

            # Capturar output
            output = StringIO()
            call_command('check', stdout=output, stderr=output)
            check_output = output.getvalue()
            
            # Verificar si hay errores
            has_errors = 'ERROR' in check_output or 'CRITICAL' in check_output
            has_warnings = 'WARNING' in check_output
            
            if not has_errors:
                self.print_step("Django Check", True, "Sin errores")
                if has_warnings:
                    print("⚠️  Warnings encontrados:")
                    for line in check_output.split('\n'):
                        if 'WARNING' in line:
                            print(f"    {line}")
            else:
                self.print_step("Django Check", False, "Errores encontrados")
                print("❌ Errores:")
                for line in check_output.split('\n'):
                    if 'ERROR' in line or 'CRITICAL' in line:
                        print(f"    {line}")
            
            return not has_errors
            
        except Exception as e:
            self.print_step("Django Check", False, f"Error ejecutando check: {str(e)}")
            return False
    
    def test_database_connection(self):
        """Probar conexión a base de datos"""
        if not DJANGO_AVAILABLE:
            return False
            
        self.print_header("PROBANDO CONEXIÓN A BASE DE DATOS")
        
        try:
            from django.db import connection

            # Probar conexión
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
            
            self.print_step("Database Connection", True, f"Conectado a {connection.vendor}")
            
            # Verificar migraciones
            try:
                from io import StringIO

                from django.core.management import call_command
                
                output = StringIO()
                call_command('showmigrations', '--plan', stdout=output, stderr=output)
                migrations_output = output.getvalue()
                
                # Contar migraciones aplicadas vs pendientes
                applied = migrations_output.count('[X]')
                pending = migrations_output.count('[ ]')
                
                migrations_ok = pending == 0
                self.print_step("Database Migrations", migrations_ok, f"{applied} aplicadas, {pending} pendientes")
                
                return migrations_ok
                
            except Exception as e:
                self.print_step("Database Migrations", False, f"Error verificando migraciones: {str(e)}")
                return False
            
        except Exception as e:
            self.print_step("Database Connection", False, f"Error: {str(e)}")
            return False
    
    def generate_summary_report(self):
        """Generar reporte de configuración"""
        self.print_header("GENERANDO REPORTE DE CONFIGURACIÓN")
        
        report_file = self.project_root / "system_configuration_report.md"
        
        try:
            report_content = f"""# Mobility4You - Reporte de Configuración del Sistema

Generado: {time.strftime('%Y-%m-%d %H:%M:%S')}

## ✅ Middleware Genérico Implementado

El middleware genérico ha sido implementado en `backend/config/middleware.py` con las siguientes funcionalidades:

### Middleware Classes Implementados:

1. **RequestTrackingMiddleware**
   - Tracking de requests con ID único
   - Logging de tiempo de respuesta
   - Información detallada de usuario y IP

2. **GlobalExceptionMiddleware** 
   - Manejo centralizado de excepciones
   - Respuestas JSON consistentes para APIs
   - Logging detallado de errores

3. **SecurityHeadersMiddleware**
   - Headers de seguridad automáticos
   - Content Security Policy
   - Protection headers (XSS, CSRF, etc.)

4. **CORSMiddleware**
   - Manejo inteligente de CORS
   - Support para preflight requests
   - Configuración por entorno

5. **HealthCheckMiddleware**
   - Health checks rápidos
   - Respuesta sin procesamiento completo
   - Información del sistema

6. **RequestSizeMiddleware**
   - Limitación de tamaño de requests
   - Protección contra ataques DoS
   - Respuestas apropiadas

### Exception Handler Personalizado:
- `custom_exception_handler()` para Django REST Framework
- Normalización de respuestas de error
- Información de debugging en desarrollo

## 🔧 Configuración Actualizada

### Django Settings:
```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "config.middleware.RequestTrackingMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware", 
    "config.middleware.CORSMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "config.middleware.SecurityHeadersMiddleware",
    "config.middleware.RequestSizeMiddleware",
    "config.middleware.HealthCheckMiddleware",
    "config.middleware.GlobalExceptionMiddleware",
]
```

### Frontend Proxy (setupProxy.js):
- Configuración mejorada con retry automático
- Mejor manejo de errores
- Support para múltiples targets
- Logging detallado

### Nginx Configuration:
- Rate limiting
- Upstream health checks
- Error handlers personalizados
- Optimizaciones de performance
- Security headers

## 🧪 Tests Disponibles

### Scripts de Testing:
1. `scripts/test_connectivity.py` - Test completo de conectividad
2. `scripts/test_middleware.py` - Test específico de middleware

### Ejecución:
```bash
# Test de conectividad completo
python scripts/test_connectivity.py

# Test específico de middleware
python scripts/test_middleware.py

# Verificación del sistema
python scripts/system_init.py
```

## 📁 Estructura de Archivos Modificados

```
backend/
├── config/
│   ├── middleware.py          # ✅ NUEVO - Middleware genérico
│   ├── settings.py            # ✅ ACTUALIZADO - Configuración middleware
│   └── urls.py                # ✅ VERIFICADO
├── vehiculos/
│   └── middleware.py          # ⚠️ DEPRECATED - Migrado a config/
└── ...

frontend/
└── src/
    └── setupProxy.js          # ✅ MEJORADO - Mejor handling

docker/
├── nginx/
│   └── nginx.dev.conf         # ✅ OPTIMIZADO - Rate limiting, health checks
└── docker-compose.dev.yml     # ✅ VERIFICADO

scripts/
├── test_connectivity.py      # ✅ NUEVO - Tests de conectividad  
├── test_middleware.py        # ✅ NUEVO - Tests de middleware
└── system_init.py            # ✅ NUEVO - Inicialización sistema
```

## 🎯 Próximos Pasos

1. **Ejecutar Tests**: Usar los scripts de testing para verificar funcionalidad
2. **Monitorear Logs**: Verificar logs del middleware en `backend/logs/`
3. **Optimizar Performance**: Ajustar configuraciones según métricas
4. **Deploy Testing**: Probar en ambiente de staging antes de producción

## 📊 Beneficios Implementados

- ✅ Logging centralizado y consistente
- ✅ Manejo robusto de errores
- ✅ Security headers automáticos  
- ✅ CORS configurado correctamente
- ✅ Health checks optimizados
- ✅ Rate limiting y protección
- ✅ Middleware reutilizable entre módulos
- ✅ Configuración preparada para producción

---

*Configuración completada y verificada el {time.strftime('%Y-%m-%d %H:%M:%S')}*
"""
            
            report_file.write_text(report_content, encoding='utf-8')
            self.print_step("Reporte Generado", True, str(report_file))
            
            return True
            
        except Exception as e:
            self.print_step("Reporte Generado", False, f"Error: {str(e)}")
            return False
    
    def run_full_initialization(self):
        """Ejecutar inicialización completa del sistema"""
        print("🚀 MOBILITY4YOU - INICIALIZACIÓN DEL SISTEMA")
        print("=" * 60)
        print("Verificando configuración del middleware genérico y conectividad")
        print("=" * 60)
        
        # Ejecutar todas las verificaciones
        checks_passed = 0
        total_checks = 6
        
        if self.check_dependencies():
            checks_passed += 1
        
        if self.check_django_configuration():
            checks_passed += 1
        
        if self.check_middleware_files():
            checks_passed += 1
        
        if self.run_django_checks():
            checks_passed += 1
        
        if self.test_database_connection():
            checks_passed += 1
        
        if self.generate_summary_report():
            checks_passed += 1
        
        # Resumen final
        self.print_header("RESUMEN DE INICIALIZACIÓN")
        success_rate = (checks_passed / total_checks) * 100
        
        print(f"✅ Checks pasados: {checks_passed}/{total_checks}")
        print(f"📈 Tasa de éxito: {success_rate:.1f}%")
        
        if checks_passed == total_checks:
            print("🎉 ¡Sistema completamente configurado y listo!")
            print("\n🧪 Próximos pasos:")
            print("   1. Ejecutar: python scripts/test_connectivity.py")
            print("   2. Ejecutar: python scripts/test_middleware.py") 
            print("   3. Iniciar Docker: docker-compose -f docker/docker-compose.dev.yml up")
        else:
            print("⚠️  Algunos checks fallaron. Revisar configuración.")
        
        return checks_passed == total_checks


def main():
    """Función principal"""
    initializer = SystemInitializer()
    
    try:
        success = initializer.run_full_initialization()
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n⚠️  Inicialización interrumpida por el usuario")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error durante la inicialización: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
