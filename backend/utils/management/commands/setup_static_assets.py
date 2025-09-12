# utils/management/commands/setup_static_assets.py
"""
Comando simple para configurar archivos estáticos
"""
from django.core.management.base import BaseCommand
from utils.static_mapping import setup_static_system, validate_static_files


class Command(BaseCommand):
    help = 'Configura el sistema de archivos estáticos'

    def add_arguments(self, parser):
        parser.add_argument('--validate-only', action='store_true', 
                          help='Solo validar archivos')
        parser.add_argument('--force-collectstatic', action='store_true', 
                          help='Forzar collectstatic')

    def handle(self, *args, **options):
        if options['validate_only']:
            files = validate_static_files()
            self.stdout.write(f"✅ Validación completada. {len(files)} archivos encontrados.")
            for key, path in files.items():
                self.stdout.write(f"  • {key}: {path}")
        else:
            success = setup_static_system(options['force_collectstatic'])
            if success:
                self.stdout.write(self.style.SUCCESS('✅ Sistema configurado correctamente'))
            else:
                self.stdout.write(self.style.ERROR('❌ Error en configuración'))
