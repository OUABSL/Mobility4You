#!/usr/bin/env python
"""
Comando de Django para gestionar versionado de archivos estáticos
"""
import os
import sys
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Versiona archivos estáticos para evitar problemas de caché'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar re-versionado aunque no hayan cambiado los archivos',
        )
        parser.add_argument(
            '--clean-only',
            action='store_true',
            help='Solo limpiar archivos antiguos sin generar nuevas versiones',
        )

    def handle(self, *args, **options):
        try:
            # Importar el módulo de versionado
            sys.path.append(os.path.join(settings.BASE_DIR, 'utils'))
            from static_versioning import version_all_admin_assets, clean_old_versions
            
            if options['clean_only']:
                self.stdout.write(self.style.SUCCESS('🧹 Limpiando archivos antiguos...'))
                # Solo limpiar archivos antiguos
                static_dir = os.path.join(settings.STATIC_ROOT, 'admin')
                clean_old_versions(os.path.join(static_dir, 'css'), 'custom_admin_v', keep_latest=1)
                clean_old_versions(os.path.join(static_dir, 'js'), 'vehiculos_admin_v', keep_latest=1)
                clean_old_versions(os.path.join(static_dir, 'js'), 'politicas_admin_v', keep_latest=1)
                clean_old_versions(os.path.join(static_dir, 'js'), 'usuarios_admin_v', keep_latest=1)
                clean_old_versions(os.path.join(static_dir, 'js'), 'payments_admin_v', keep_latest=1)
                clean_old_versions(os.path.join(static_dir, 'js'), 'reservas_admin_v', keep_latest=1)
                self.stdout.write(self.style.SUCCESS('✅ Limpieza completada'))
            else:
                self.stdout.write(self.style.SUCCESS('🔄 Iniciando versionado de assets...'))
                versioned = version_all_admin_assets()
                
                self.stdout.write(self.style.SUCCESS('✅ Versionado completado!'))
                for asset, filename in versioned.items():
                    self.stdout.write(f"  {asset}: {filename}")
                    
        except ImportError as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error al importar módulo de versionado: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error durante versionado: {e}')
            )
