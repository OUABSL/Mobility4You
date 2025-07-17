# config/management/commands/setup_superuser.py
"""
Comando para crear superusuario automáticamente
"""
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import IntegrityError


class Command(BaseCommand):
    help = 'Crea un superusuario automáticamente desde variables de entorno'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Fuerza la recreación del superusuario si ya existe',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@mobility4you.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'Admin@2025!')
        
        if not all([username, email, password]):
            self.stdout.write(
                self.style.ERROR(
                    'Faltan variables de entorno: DJANGO_SUPERUSER_USERNAME, '
                    'DJANGO_SUPERUSER_EMAIL, DJANGO_SUPERUSER_PASSWORD'
                )
            )
            return
        
        try:
            # Verificar si el usuario ya existe
            if User.objects.filter(username=username).exists():
                if options['force']:
                    User.objects.filter(username=username).delete()
                    self.stdout.write(
                        self.style.WARNING(f'Usuario existente {username} eliminado')
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(f'Usuario {username} ya existe. Use --force para recrear.')
                    )
                    return
            
            # Crear superusuario
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            
            # Configurar campos adicionales si es necesario
            user.first_name = 'Administrador'
            user.last_name = 'Sistema'
            user.is_staff = True
            user.is_active = True
            user.rol = 'admin'  # Si tu modelo tiene este campo
            user.save()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Superusuario creado exitosamente:\n'
                    f'  Username: {username}\n'
                    f'  Email: {email}\n'
                    f'  Password: [OCULTO]\n'
                    f'  Admin URL: /admin/'
                )
            )
            
        except IntegrityError as e:
            self.stdout.write(
                self.style.ERROR(f'Error creando superusuario: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error inesperado: {e}')
            )
