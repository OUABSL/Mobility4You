# politicas/management/commands/create_sample_policies.py
from django.core.management.base import BaseCommand
from politicas.models import PoliticaPago, PoliticaIncluye, TipoPenalizacion, PoliticaPenalizacion


class Command(BaseCommand):
    help = 'Crea políticas de pago de ejemplo para testing'

    def handle(self, *args, **options):
        self.stdout.write('Creando políticas de pago de ejemplo...')
        
        # Limpiar datos existentes
        PoliticaPago.objects.all().delete()
        TipoPenalizacion.objects.all().delete()
        
        # Crear tipos de penalización
        tipo_cancelacion = TipoPenalizacion.objects.create(
            nombre='cancelación',
            tipo_tarifa='porcentaje',
            valor_tarifa=50.00
        )
        
        tipo_retraso = TipoPenalizacion.objects.create(
            nombre='devolución tardía',
            tipo_tarifa='fijo',
            valor_tarifa=25.00
        )
        
        # 1. All Inclusive
        politica_all_inclusive = PoliticaPago.objects.create(
            titulo='All Inclusive',
            deductible=0.00,
            descripcion='Protección completa sin franquicia y con kilometraje ilimitado'
        )
        
        # Items incluidos All Inclusive
        items_all_inclusive = [
            'Cobertura a todo riesgo sin franquicia',
            'Kilometraje ilimitado',
            'Asistencia en carretera 24/7',
            'Conductor adicional gratuito',
            'Cancelación gratuita hasta 24h antes',
            'Entrega a domicilio GRATIS',
            'Parking express',
            'Pago flexible'
        ]
        
        for item in items_all_inclusive:
            PoliticaIncluye.objects.create(
                politica=politica_all_inclusive,
                item=item,
                incluye=True
            )
        
        # Items NO incluidos All Inclusive
        items_no_incluidos_all = [
            'Daños bajo efectos del alcohol o drogas',
            'Cargo por no devolver lleno'
        ]
        
        for item in items_no_incluidos_all:
            PoliticaIncluye.objects.create(
                politica=politica_all_inclusive,
                item=item,
                incluye=False
            )
        
        # Penalizaciones All Inclusive
        PoliticaPenalizacion.objects.create(
            politica=politica_all_inclusive,
            tipo_penalizacion=tipo_cancelacion,
            horas_previas=24
        )
        
        # 2. Economy
        politica_economy = PoliticaPago.objects.create(
            titulo='Economy',
            deductible=1200.00,
            descripcion='Opción económica con protección básica'
        )
        
        # Items incluidos Economy
        items_economy = [
            'Tarifa no reembolsable',
            'Kilometraje ampliado (500km/día, máx 3.500km)',
            'Cobertura básica con franquicia (depósito 1200€)'
        ]
        
        for item in items_economy:
            PoliticaIncluye.objects.create(
                politica=politica_economy,
                item=item,
                incluye=True
            )
        
        # Items NO incluidos Economy
        items_no_incluidos_economy = [
            'Daños bajo efectos del alcohol o drogas',
            'Cargo por no devolver lleno',
            'Cancelaciones o modificaciones'
        ]
        
        for item in items_no_incluidos_economy:
            PoliticaIncluye.objects.create(
                politica=politica_economy,
                item=item,
                incluye=False
            )
        
        # 3. Premium
        politica_premium = PoliticaPago.objects.create(
            titulo='Premium',
            deductible=500.00,
            descripcion='Protección premium con servicios exclusivos'
        )
        
        # Items incluidos Premium
        items_premium = [
            'Cobertura premium (franquicia reducida 500€)',
            'Kilometraje extendido (1000km/día, máx 7.000km)',
            'Conductor adicional incluido',
            'Cancelación flexible hasta 48h antes',
            'Upgrade gratuito sujeto a disponibilidad'
        ]
        
        for item in items_premium:
            PoliticaIncluye.objects.create(
                politica=politica_premium,
                item=item,
                incluye=True
            )
        
        # Items NO incluidos Premium
        items_no_incluidos_premium = [
            'Daños bajo efectos del alcohol o drogas',
            'Cargo por combustible'
        ]
        
        for item in items_no_incluidos_premium:
            PoliticaIncluye.objects.create(
                politica=politica_premium,
                item=item,
                incluye=False
            )
        
        # Penalizaciones Premium
        PoliticaPenalizacion.objects.create(
            politica=politica_premium,
            tipo_penalizacion=tipo_cancelacion,
            horas_previas=48
        )
        
        PoliticaPenalizacion.objects.create(
            politica=politica_premium,
            tipo_penalizacion=tipo_retraso,
            horas_previas=2
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✅ Políticas creadas exitosamente:\n'
                f'- All Inclusive (ID: {politica_all_inclusive.id})\n'
                f'- Economy (ID: {politica_economy.id})\n'
                f'- Premium (ID: {politica_premium.id})'
            )
        )
