# utils/management/commands/auto_version_static.py
"""
Comando de gestión Django para versionado automático de archivos estáticos
Se puede ejecutar manualmente o desde hooks automáticos
"""
import logging
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from utils.smart_static_versioning import (SmartStaticVersioning,
                                           auto_version_static_files,
                                           validate_static_mappings)

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Versiona automáticamente todos los archivos estáticos y actualiza referencias'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--validate-only',
            action='store_true',
            help='Solo valida mappings existentes sin crear nuevas versiones',
        )
        parser.add_argument(
            '--force',
            action='store_true', 
            help='Fuerza re-versionado incluso si los archivos ya existen',
        )
        parser.add_argument(
            '--clean-old',
            type=int,
            default=2,
            help='Número de versiones antiguas a mantener (default: 2)',
        )
        
    def handle(self, *args, **options):
        """Ejecuta el versionado automático"""
        
        self.stdout.write(
            self.style.SUCCESS('🚀 Iniciando versionado automático de archivos estáticos...')
        )
        
        if options['validate_only']:
            # Solo validar
            errors = validate_static_mappings()
            if errors:
                self.stdout.write(
                    self.style.ERROR('❌ Errores de validación encontrados:')
                )
                for error in errors:
                    self.stdout.write(f"  • {error}")
                return
            else:
                self.stdout.write(
                    self.style.SUCCESS('✅ Todos los mappings son válidos')
                )
                return
        
        try:
            # Ejecutar versionado automático
            versioning = SmartStaticVersioning()
            success = versioning.auto_version_all_files()
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS('✅ Versionado automático completado exitosamente')
                )
                
                # Validar resultado
                errors = validate_static_mappings()
                if errors:
                    self.stdout.write(
                        self.style.WARNING('⚠️ Algunas validaciones fallaron:')
                    )
                    for error in errors:
                        self.stdout.write(f"  • {error}")
                else:
                    self.stdout.write(
                        self.style.SUCCESS('✅ Validación post-versionado exitosa')
                    )
                    
                # Mostrar archivo de mapeo generado
                mapping_file = os.path.join(versioning.base_dir, "utils", "static_mapping.py")
                if os.path.exists(mapping_file):
                    self.stdout.write(f"📄 Archivo de mapeo: {mapping_file}")
                    
            else:
                self.stdout.write(
                    self.style.ERROR('❌ Error durante el versionado automático')
                )
                
        except Exception as e:
            logger.error(f"Error en comando auto_version_static: {e}")
            self.stdout.write(
                self.style.ERROR(f'❌ Error inesperado: {e}')
            )
