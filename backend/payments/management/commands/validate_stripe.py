# backend/payments/management/commands/validate_stripe.py
"""
Comando de management para validar la configuración de Stripe
"""
import stripe
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from payments.services import StripePaymentService


class Command(BaseCommand):
    help = 'Valida la configuración de Stripe y la conectividad'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-account',
            action='store_true',
            help='Verifica información de la cuenta de Stripe',
        )
        parser.add_argument(
            '--test-payment-intent',
            action='store_true',
            help='Crea un Payment Intent de prueba (sin cargos)',
        )

    def handle(self, *args, **options):
        self.stdout.write('🔍 Validando configuración de Stripe...\n')

        # 1. Verificar variables de entorno
        self._check_environment_variables()

        # 2. Verificar conectividad con Stripe
        self._check_stripe_connectivity()

        # 3. Verificar configuración del servicio
        self._check_service_configuration()

        # 4. Verificar cuenta (opcional)
        if options['check_account']:
            self._check_stripe_account()

        # 5. Test de Payment Intent (opcional)
        if options['test_payment_intent']:
            self._test_payment_intent()

        self.stdout.write(
            self.style.SUCCESS('\n✅ Validación de Stripe completada exitosamente!')
        )

    def _check_environment_variables(self):
        """Verifica que las variables de entorno estén configuradas"""
        self.stdout.write('📋 Verificando variables de entorno...')

        required_vars = {
            'STRIPE_PUBLISHABLE_KEY': settings.STRIPE_PUBLISHABLE_KEY,
            'STRIPE_SECRET_KEY': settings.STRIPE_SECRET_KEY,
            'STRIPE_WEBHOOK_SECRET': settings.STRIPE_WEBHOOK_SECRET,
        }

        for var_name, var_value in required_vars.items():
            if not var_value or var_value.endswith('_placeholder'):
                raise CommandError(
                    f'❌ {var_name} no está configurada o tiene valor placeholder'
                )
            
            # Verificar formato de claves
            if var_name == 'STRIPE_PUBLISHABLE_KEY' and not var_value.startswith('pk_'):
                raise CommandError(
                    f'❌ {var_name} debe comenzar con "pk_"'
                )
            elif var_name == 'STRIPE_SECRET_KEY' and not var_value.startswith('sk_'):
                raise CommandError(
                    f'❌ {var_name} debe comenzar con "sk_"'
                )
            elif var_name == 'STRIPE_WEBHOOK_SECRET' and not var_value.startswith('whsec_'):
                raise CommandError(
                    f'❌ {var_name} debe comenzar con "whsec_"'
                )

            self.stdout.write(f'  ✅ {var_name}: Configurada correctamente')

    def _check_stripe_connectivity(self):
        """Verifica la conectividad con la API de Stripe"""
        self.stdout.write('\n🌐 Verificando conectividad con Stripe API...')

        try:
            # Configurar Stripe con la clave secreta
            stripe.api_key = settings.STRIPE_SECRET_KEY

            # Intentar listar eventos (operación ligera)
            events = stripe.Event.list(limit=1)
            
            self.stdout.write('  ✅ Conectividad con Stripe API: OK')
            
        except stripe.error.AuthenticationError as e:
            raise CommandError(f'❌ Error de autenticación con Stripe: {e}')
        except stripe.error.APIConnectionError as e:
            raise CommandError(f'❌ Error de conexión con Stripe: {e}')
        except Exception as e:
            raise CommandError(f'❌ Error inesperado conectando con Stripe: {e}')

    def _check_service_configuration(self):
        """Verifica la configuración del servicio de pagos"""
        self.stdout.write('\n⚙️  Verificando configuración del servicio...')

        try:
            service = StripePaymentService()
            self.stdout.write('  ✅ StripePaymentService: Inicializado correctamente')
            
            # Verificar configuración básica
            if service.currency != 'eur':
                self.stdout.write(
                    self.style.WARNING(
                        f'  ⚠️  Moneda configurada: {service.currency} (esperada: eur)'
                    )
                )
            else:
                self.stdout.write('  ✅ Moneda: EUR')

        except Exception as e:
            raise CommandError(f'❌ Error inicializando StripePaymentService: {e}')

    def _check_stripe_account(self):
        """Verifica información de la cuenta de Stripe"""
        self.stdout.write('\n💳 Verificando información de la cuenta...')

        try:
            account = stripe.Account.retrieve()
            
            self.stdout.write(f'  ✅ ID de cuenta: {account.id}')
            self.stdout.write(f'  ✅ País: {account.country}')
            self.stdout.write(f'  ✅ Moneda por defecto: {account.default_currency}')
            self.stdout.write(f'  ✅ Cuenta activa: {"Sí" if account.charges_enabled else "No"}')
            
            if not account.charges_enabled:
                self.stdout.write(
                    self.style.WARNING(
                        '  ⚠️  La cuenta no puede procesar pagos. Verifica la configuración en Stripe Dashboard.'
                    )
                )

        except Exception as e:
            raise CommandError(f'❌ Error obteniendo información de la cuenta: {e}')

    def _test_payment_intent(self):
        """Crea un Payment Intent de prueba"""
        self.stdout.write('\n🧪 Creando Payment Intent de prueba...')

        try:
            # Datos de prueba
            reserva_data = {
                'id': 'test',
                'precio_total': 10.00,  # Importe mínimo
                'conductor': {
                    'email': 'test@example.com',
                    'nombre': 'Test',
                    'apellidos': 'User',
                },
            }

            service = StripePaymentService()
            resultado = service.crear_payment_intent(
                reserva_data=reserva_data,
                tipo_pago='INICIAL',
                metadata_extra={'test': 'true'}
            )

            if resultado['success']:
                pi_id = resultado['payment_intent_id']
                self.stdout.write(f'  ✅ Payment Intent creado: {pi_id}')
                
                # Cancelar el Payment Intent de prueba
                cancel_result = service.cancelar_payment_intent(
                    pi_id, 
                    'Test de validación de configuración'
                )
                
                if cancel_result['success']:
                    self.stdout.write(f'  ✅ Payment Intent cancelado: {pi_id}')
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'  ⚠️  No se pudo cancelar el Payment Intent: {cancel_result["error"]}'
                        )
                    )
            else:
                raise CommandError(f'❌ Error creando Payment Intent de prueba: {resultado["error"]}')

        except Exception as e:
            raise CommandError(f'❌ Error en test de Payment Intent: {e}')
