# lugares/management/commands/verificar_lugares_direcciones.py
"""
Comando para verificar y corregir la integridad de datos entre lugares y direcciones
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db import models
from lugares.models import Lugar, Direccion
from lugares.services import LugarService


class Command(BaseCommand):
    help = 'Verifica y corrige la integridad de datos entre lugares y direcciones'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Corregir automáticamente los problemas encontrados',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar qué se haría sin hacer cambios',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🔍 Verificando integridad de lugares y direcciones...')
        )
        
        problemas_encontrados = 0
        lugares_sin_direccion = []
        direcciones_huerfanas = []
        
        # Verificar lugares sin dirección
        lugares_invalidos = Lugar.objects.filter(direccion__isnull=True)
        if lugares_invalidos.exists():
            problemas_encontrados += lugares_invalidos.count()
            for lugar in lugares_invalidos:
                lugares_sin_direccion.append(lugar)
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Lugar "{lugar.nombre}" (ID: {lugar.id}) no tiene dirección asociada'
                    )
                )
        
        # Verificar direcciones sin lugar asociado
        direcciones_sin_lugar = Direccion.objects.filter(lugar__isnull=True)
        if direcciones_sin_lugar.exists():
            for direccion in direcciones_sin_lugar:
                direcciones_huerfanas.append(direccion)
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️ Dirección "{direccion}" (ID: {direccion.id}) no tiene lugar asociado'
                    )
                )
        
        # Verificar direcciones incompletas
        direcciones_incompletas = Direccion.objects.filter(
            models.Q(ciudad__isnull=True) | models.Q(ciudad='') |
            models.Q(codigo_postal__isnull=True) | models.Q(codigo_postal='')
        )
        if direcciones_incompletas.exists():
            for direccion in direcciones_incompletas:
                self.stdout.write(
                    self.style.WARNING(
                        f'⚠️ Dirección incompleta (ID: {direccion.id}): '
                        f'ciudad="{direccion.ciudad}", cp="{direccion.codigo_postal}"'
                    )
                )
        
        # Mostrar resumen
        self.stdout.write(f'\n📊 Resumen de verificación:')
        self.stdout.write(f'   • Lugares sin dirección: {len(lugares_sin_direccion)}')
        self.stdout.write(f'   • Direcciones huérfanas: {len(direcciones_huerfanas)}')
        self.stdout.write(f'   • Direcciones incompletas: {direcciones_incompletas.count()}')
        
        if problemas_encontrados == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ No se encontraron problemas de integridad!')
            )
            return
        
        # Aplicar correcciones si se solicita
        if options['fix'] and not options['dry_run']:
            self.stdout.write('\n🔧 Aplicando correcciones...')
            
            with transaction.atomic():
                # Eliminar lugares sin dirección (ya que no se pueden corregir automáticamente)
                if lugares_sin_direccion:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️ Se eliminarán {len(lugares_sin_direccion)} lugares sin dirección'
                        )
                    )
                    for lugar in lugares_sin_direccion:
                        lugar.delete()
                        self.stdout.write(f'   🗑️ Eliminado lugar "{lugar.nombre}"')
                
                # Eliminar direcciones huérfanas
                if direcciones_huerfanas:
                    for direccion in direcciones_huerfanas:
                        direccion.delete()
                        self.stdout.write(f'   🗑️ Eliminada dirección huérfana (ID: {direccion.id})')
            
            self.stdout.write(
                self.style.SUCCESS('✅ Correcciones aplicadas exitosamente!')
            )
        
        elif options['dry_run']:
            self.stdout.write(
                self.style.WARNING(
                    '🧪 Modo dry-run: No se realizaron cambios. '
                    'Use --fix para aplicar las correcciones.'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    '💡 Use --fix para corregir automáticamente los problemas encontrados.'
                )
            )
