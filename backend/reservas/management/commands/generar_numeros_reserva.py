# reservas/management/commands/generar_numeros_reserva.py

import logging

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from reservas.models import Reserva
from reservas.utils import generar_numero_reserva_unico

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Genera números de reserva únicos para reservas existentes que no los tienen'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin hacer cambios reales',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regenerar números para todas las reservas, incluso las que ya tienen',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Tamaño del lote para procesar reservas (default: 100)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        batch_size = options['batch_size']

        self.stdout.write(
            self.style.HTTP_INFO(
                f"🔧 Iniciando generación de números de reserva..."
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("⚠️  MODO DRY-RUN: No se harán cambios reales")
            )

        # Obtener reservas que necesitan número
        if force:
            reservas = Reserva.objects.all()
            self.stdout.write(f"📋 Procesando TODAS las reservas ({reservas.count()})")
        else:
            reservas = Reserva.objects.filter(numero_reserva__isnull=True)
            self.stdout.write(f"📋 Reservas sin número de reserva: {reservas.count()}")

        if not reservas.exists():
            self.stdout.write(
                self.style.SUCCESS("✅ No hay reservas que requieran números de reserva")
            )
            return

        # Procesar en lotes para mejor rendimiento
        total_procesadas = 0
        total_exitosas = 0
        errores = []

        reservas_ids = list(reservas.values_list('id', flat=True))
        
        for i in range(0, len(reservas_ids), batch_size):
            batch_ids = reservas_ids[i:i + batch_size]
            batch_reservas = Reserva.objects.filter(id__in=batch_ids)
            
            self.stdout.write(
                f"🔄 Procesando lote {i//batch_size + 1} ({len(batch_ids)} reservas)..."
            )

            for reserva in batch_reservas:
                try:
                    with transaction.atomic():
                        if force or not reserva.numero_reserva:
                            numero_anterior = reserva.numero_reserva
                            
                            if not dry_run:
                                nuevo_numero = generar_numero_reserva_unico()
                                reserva.numero_reserva = nuevo_numero
                                reserva.save(update_fields=['numero_reserva'])
                                
                                self.stdout.write(
                                    f"  ✅ Reserva ID {reserva.id}: "
                                    f"{numero_anterior or 'SIN NÚMERO'} → {nuevo_numero}"
                                )
                            else:
                                self.stdout.write(
                                    f"  🔍 Reserva ID {reserva.id}: "
                                    f"Se generaría número para '{numero_anterior or 'SIN NÚMERO'}'"
                                )
                            
                            total_exitosas += 1
                        else:
                            self.stdout.write(
                                f"  ⏭️  Reserva ID {reserva.id}: "
                                f"Ya tiene número {reserva.numero_reserva}"
                            )
                            
                    total_procesadas += 1
                    
                except Exception as e:
                    error_msg = f"Error en reserva ID {reserva.id}: {str(e)}"
                    errores.append(error_msg)
                    self.stdout.write(
                        self.style.ERROR(f"  ❌ {error_msg}")
                    )
                    logger.error(error_msg, exc_info=True)

        # Resumen final
        self.stdout.write("\n" + "="*60)
        self.stdout.write(
            self.style.SUCCESS(
                f"🎉 Proceso completado!\n"
                f"   📊 Total procesadas: {total_procesadas}\n"
                f"   ✅ Exitosas: {total_exitosas}\n"
                f"   ❌ Errores: {len(errores)}"
            )
        )

        if errores:
            self.stdout.write(
                self.style.ERROR(
                    f"\n⚠️  Se encontraron {len(errores)} errores:"
                )
            )
            for error in errores[:10]:  # Mostrar solo los primeros 10 errores
                self.stdout.write(f"   • {error}")
            
            if len(errores) > 10:
                self.stdout.write(f"   ... y {len(errores) - 10} errores más")

        if dry_run and total_exitosas > 0:
            self.stdout.write(
                self.style.HTTP_INFO(
                    f"\n💡 Para aplicar los cambios, ejecute el comando sin --dry-run"
                )
            )
