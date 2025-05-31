# backend/api/management/commands/fix_admin_data.py

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from api.models import TipoPenalizacion, Reserva, Vehiculo, Usuario
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Corrige problemas de datos para el panel de administración'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecuta sin hacer cambios (solo muestra lo que haría)',
        )
        parser.add_argument(
            '--fix-penalizaciones',
            action='store_true',
            help='Corrige tipos de penalización sin valor_tarifa',
        )
        parser.add_argument(
            '--fix-reservas',
            action='store_true',
            help='Corrige reservas con datos inconsistentes',
        )
        parser.add_argument(
            '--fix-usuarios',
            action='store_true',
            help='Corrige usuarios con problemas de autenticación',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Ejecuta todas las correcciones',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS('🔧 Iniciando corrección de datos del admin...')
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('⚠️  MODO DRY-RUN: No se realizarán cambios')
            )
        
        try:
            with transaction.atomic():
                if options['fix_penalizaciones'] or options['all']:
                    self.fix_tipos_penalizacion(dry_run)
                
                if options['fix_reservas'] or options['all']:
                    self.fix_reservas_inconsistentes(dry_run)
                
                if options['fix_usuarios'] or options['all']:
                    self.fix_usuarios_problematicos(dry_run)
                
                if dry_run:
                    # En dry-run, hacer rollback
                    transaction.set_rollback(True)
                    self.stdout.write(
                        self.style.WARNING('🔄 Rollback realizado (dry-run)')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('✅ Todas las correcciones aplicadas exitosamente')
                    )
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Error durante la corrección: {str(e)}')
            )
            logger.error(f"Error en fix_admin_data: {str(e)}", exc_info=True)
    
    def fix_tipos_penalizacion(self, dry_run=False):
        """Corrige tipos de penalización sin valor_tarifa"""
        self.stdout.write('🔍 Verificando tipos de penalización...')
        
        # Datos por defecto para tipos comunes
        valores_default = {
            'cancelación': {'tipo': 'porcentaje', 'valor': Decimal('25.00')},
            'retraso_recogida': {'tipo': 'fijo', 'valor': Decimal('50.00')},
            'retraso_devolucion': {'tipo': 'importe_dia', 'valor': Decimal('30.00')},
            'daños': {'tipo': 'fijo', 'valor': Decimal('100.00')},
            'limpieza': {'tipo': 'fijo', 'valor': Decimal('40.00')},
        }
        
        tipos_corregidos = 0
        tipos_creados = 0
        
        # Verificar si el campo valor_tarifa existe
        try:
            # Intentar acceder al campo
            TipoPenalizacion._meta.get_field('valor_tarifa')
            tiene_valor_tarifa = True
        except:
            tiene_valor_tarifa = False
            self.stdout.write(
                self.style.WARNING('⚠️  Campo valor_tarifa no existe. Ejecuta las migraciones primero.')
            )
            return
        
        # Corregir tipos existentes sin valor
        tipos_sin_valor = TipoPenalizacion.objects.filter(valor_tarifa=Decimal('0.00'))
        
        for tipo in tipos_sin_valor:
            nombre_lower = tipo.nombre.lower()
            for key, config in valores_default.items():
                if key in nombre_lower:
                    if not dry_run:
                        tipo.tipo_tarifa = config['tipo']
                        tipo.valor_tarifa = config['valor']
                        tipo.save()
                    
                    self.stdout.write(
                        f'  📝 {"[DRY-RUN] " if dry_run else ""}Corrigiendo {tipo.nombre}: {config["tipo"]} = {config["valor"]}'
                    )
                    tipos_corregidos += 1
                    break
        
        # Crear tipos faltantes
        for nombre, config in valores_default.items():
            if not TipoPenalizacion.objects.filter(nombre__icontains=nombre).exists():
                if not dry_run:
                    TipoPenalizacion.objects.create(
                        nombre=nombre.title(),
                        tipo_tarifa=config['tipo'],
                        valor_tarifa=config['valor']
                    )
                
                self.stdout.write(
                    f'  ➕ {"[DRY-RUN] " if dry_run else ""}Creando tipo: {nombre.title()}'
                )
                tipos_creados += 1
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Tipos de penalización: {tipos_corregidos} corregidos, {tipos_creados} creados'
            )
        )
    
    def fix_reservas_inconsistentes(self, dry_run=False):
        """Corrige reservas con datos inconsistentes"""
        self.stdout.write('🔍 Verificando reservas inconsistentes...')
        
        reservas_corregidas = 0
        
        # Reservas sin precio_dia pero con vehículo
        reservas_sin_precio = Reserva.objects.filter(
            precio_dia__isnull=True,
            vehiculo__isnull=False
        ).select_related('vehiculo')
        
        for reserva in reservas_sin_precio:
            # Buscar tarifa vigente para el vehículo
            fecha_recogida = reserva.fecha_recogida.date() if hasattr(reserva.fecha_recogida, 'date') else reserva.fecha_recogida
            
            tarifa = reserva.vehiculo.tarifas.filter(
                fecha_inicio__lte=fecha_recogida
            ).filter(
                models.Q(fecha_fin__gte=fecha_recogida) | models.Q(fecha_fin__isnull=True)
            ).order_by('-fecha_inicio').first()
            
            if tarifa:
                if not dry_run:
                    reserva.precio_dia = tarifa.precio_dia
                    if not reserva.precio_total:
                        dias = reserva.dias_alquiler() if hasattr(reserva, 'dias_alquiler') else 1
                        subtotal = reserva.precio_dia * dias
                        reserva.precio_impuestos = subtotal * Decimal('0.21')
                        reserva.precio_total = subtotal + reserva.precio_impuestos
                    reserva.save()
                
                self.stdout.write(
                    f'  📝 {"[DRY-RUN] " if dry_run else ""}Corrigiendo reserva {reserva.id}: precio_dia = {tarifa.precio_dia}'
                )
                reservas_corregidas += 1
        
        # Reservas con importes inconsistentes
        reservas_importes_malos = Reserva.objects.filter(
            precio_total__gt=0,
            importe_pagado_inicial__gt=models.F('precio_total')
        )
        
        for reserva in reservas_importes_malos:
            if not dry_run:
                if reserva.metodo_pago == 'tarjeta':
                    reserva.importe_pagado_inicial = reserva.precio_total
                    reserva.importe_pendiente_inicial = Decimal('0.00')
                else:
                    reserva.importe_pagado_inicial = Decimal('0.00')
                    reserva.importe_pendiente_inicial = reserva.precio_total
                reserva.save()
            
            self.stdout.write(
                f'  💰 {"[DRY-RUN] " if dry_run else ""}Corrigiendo importes reserva {reserva.id}'
            )
            reservas_corregidas += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Reservas corregidas: {reservas_corregidas}')
        )
    
    def fix_usuarios_problematicos(self, dry_run=False):
        """Corrige usuarios con problemas de autenticación"""
        self.stdout.write('🔍 Verificando usuarios problemáticos...')
        
        usuarios_corregidos = 0
        
        # Usuarios admin/empresa sin contraseña usable
        usuarios_admin_sin_password = Usuario.objects.filter(
            rol__in=['admin', 'empresa'],
            password__in=['', '!']  # Contraseñas no usables
        )
        
        for usuario in usuarios_admin_sin_password:
            if not dry_run:
                # Generar contraseña temporal
                from django.contrib.auth.models import BaseUserManager
                temp_password = BaseUserManager().make_random_password()
                usuario.set_password(temp_password)
                usuario.is_staff = True
                usuario.save()
                
                self.stdout.write(
                    f'  🔑 Contraseña temporal para {usuario.username}: {temp_password}'
                )
            else:
                self.stdout.write(
                    f'  🔑 [DRY-RUN] Generaría contraseña para {usuario.username}'
                )
            
            usuarios_corregidos += 1
        
        # Usuarios cliente con is_staff=True
        usuarios_cliente_staff = Usuario.objects.filter(
            rol='cliente',
            is_staff=True
        )
        
        for usuario in usuarios_cliente_staff:
            if not dry_run:
                usuario.is_staff = False
                usuario.save()
            
            self.stdout.write(
                f'  👤 {"[DRY-RUN] " if dry_run else ""}Removiendo is_staff de cliente {usuario.username}'
            )
            usuarios_corregidos += 1
        
        self.stdout.write(
            self.style.SUCCESS(f'✅ Usuarios corregidos: {usuarios_corregidos}')
        )

# ===============================
# MIGRACIÓN PARA AÑADIR CAMPO valor_tarifa
# ===============================

# Crear archivo: backend/api/migrations/XXXX_add_valor_tarifa_to_tipopenalizacion.py

"""
# Generated migration file

from django.db import migrations, models
from decimal import Decimal
import django.core.validators

class Migration(migrations.Migration):
    dependencies = [
        ('api', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='tipopenalizacion',
            name='valor_tarifa',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                help_text='Valor de la tarifa según el tipo: para \'porcentaje\' es el % a aplicar (ej: 25.00 para 25%), para \'fijo\' es el importe fijo en euros, para \'importe_dia\' es el importe por día de alquiler',
                max_digits=10,
                validators=[django.core.validators.MinValueValidator(Decimal('0.00'))],
                verbose_name='Valor de la tarifa'
            ),
        ),
    ]
"""