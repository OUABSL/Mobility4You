# management/commands/reset_reservas_for_iva.py
"""
Comando para resetear tabla de reservas después de implementar IVA simbólico
"""

import logging

from django.core.management.base import BaseCommand
from django.db import transaction
from facturas_contratos.models import Contrato, Factura
from reservas.models import Reserva, ReservaExtra

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Resetea las tablas de reservas para implementar IVA simbólico'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirma que quieres borrar todos los datos de reservas',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'Este comando borrará TODOS los datos de reservas, facturas y contratos.\n'
                    'Para confirmar, ejecuta: python manage.py reset_reservas_for_iva --confirm'
                )
            )
            return

        try:
            with transaction.atomic():
                # Contar registros antes
                reservas_count = Reserva.objects.count()
                facturas_count = Factura.objects.count() if hasattr(Factura, 'objects') else 0
                contratos_count = Contrato.objects.count() if hasattr(Contrato, 'objects') else 0
                
                self.stdout.write(f'Registros a eliminar:')
                self.stdout.write(f'- Reservas: {reservas_count}')
                self.stdout.write(f'- Facturas: {facturas_count}')
                self.stdout.write(f'- Contratos: {contratos_count}')
                
                # Eliminar en orden correcto (por dependencias)
                if hasattr(Factura, 'objects'):
                    Factura.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS('✅ Facturas eliminadas'))
                
                if hasattr(Contrato, 'objects'):
                    Contrato.objects.all().delete()
                    self.stdout.write(self.style.SUCCESS('✅ Contratos eliminados'))
                
                ReservaExtra.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('✅ Extras de reservas eliminados'))
                
                Reserva.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('✅ Reservas eliminadas'))
                
                self.stdout.write(
                    self.style.SUCCESS(
                        '\n🎉 Reset completado. Ahora se puede implementar IVA simbólico.'
                    )
                )

        except Exception as e:
            logger.error(f'Error durante reset: {str(e)}')
            self.stdout.write(
                self.style.ERROR(f'❌ Error durante reset: {str(e)}')
            )
            raise
