# vehiculos/management/commands/create_initial_locations.py
"""
Comando de Django para crear datos iniciales de lugares y direcciones
"""
import logging

from django.core.management.base import BaseCommand
from django.db import transaction
from lugares.models import Direccion, Lugar

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Crea datos iniciales de lugares y direcciones para el sistema"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Fuerza la recreación de datos incluso si ya existen",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("🏢 Iniciando creación de datos iniciales de lugares...")
        )

        # Verificar si ya existen lugares
        lugares_existentes = Lugar.objects.count()
        if lugares_existentes > 0 and not options["force"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Ya existen {lugares_existentes} lugares. Use --force para recrear."
                )
            )
            return

        try:
            with transaction.atomic():
                if options["force"]:
                    self.stdout.write("🧹 Limpiando datos existentes...")
                    Lugar.objects.all().delete()
                    Direccion.objects.all().delete()

                # Crear direcciones y lugares iniciales
                self._create_initial_data()

            self.stdout.write(
                self.style.SUCCESS(
                    "✅ Datos iniciales de lugares creados exitosamente!"
                )
            )

        except Exception as e:
            logger.error(f"Error creando datos iniciales: {str(e)}", exc_info=True)
            self.stdout.write(
                self.style.ERROR(f"❌ Error creando datos iniciales: {str(e)}")
            )

    def _create_initial_data(self):
        """Crear los datos iniciales de direcciones y lugares"""
        self.stdout.write("📍 Creando direcciones...")

        # Direcciones principales
        direcciones_data = [
            {
                "calle": "Avenida de Andalucía, 10",
                "ciudad": "Málaga",
                "provincia": "Málaga",
                "pais": "España",
                "codigo_postal": "29007",
            },
            {
                "calle": "Calle Gran Vía, 25",
                "ciudad": "Madrid",
                "provincia": "Madrid",
                "pais": "España",
                "codigo_postal": "28013",
            },
            {
                "calle": "Passeig de Gràcia, 50",
                "ciudad": "Barcelona",
                "provincia": "Barcelona",
                "pais": "España",
                "codigo_postal": "08007",
            },
            {
                "calle": "Calle Triana, 15",
                "ciudad": "Sevilla",
                "provincia": "Sevilla",
                "pais": "España",
                "codigo_postal": "41010",
            },
            {
                "calle": "Avenida de la Constitución, 30",
                "ciudad": "Valencia",
                "provincia": "Valencia",
                "pais": "España",
                "codigo_postal": "46003",
            },
            {
                "calle": "Calle Real, 8",
                "ciudad": "Bilbao",
                "provincia": "Vizcaya",
                "pais": "España",
                "codigo_postal": "48001",
            },
        ]

        direcciones = []
        for dir_data in direcciones_data:
            direccion = Direccion.objects.create(**dir_data)
            direcciones.append(direccion)
            self.stdout.write(f"  ✓ Creada dirección: {direccion.ciudad}")

        self.stdout.write("🏢 Creando lugares...")

        # Lugares con sus respectivas direcciones
        lugares_data = [
            {
                "nombre": "Mobility4You Málaga Centro",
                "direccion": direcciones[0],
                "telefono": "+34 952 123 456",
                "email": "malaga@mobility4you.com",
                "popular": True,
                "activo": True,
                "descripcion": "Oficina principal en el centro de Málaga",
            },
            {
                "nombre": "Mobility4You Madrid Centro",
                "direccion": direcciones[1],
                "telefono": "+34 915 123 456",
                "email": "madrid@mobility4you.com",
                "popular": True,
                "activo": True,
                "descripcion": "Oficina en Gran Vía, Madrid",
            },
            {
                "nombre": "Mobility4You Barcelona Eixample",
                "direccion": direcciones[2],
                "telefono": "+34 934 123 456",
                "email": "barcelona@mobility4you.com",
                "popular": True,
                "activo": True,
                "descripcion": "Oficina en Passeig de Gràcia, Barcelona",
            },
            {
                "nombre": "Mobility4You Sevilla Centro",
                "direccion": direcciones[3],
                "telefono": "+34 954 123 456",
                "email": "sevilla@mobility4you.com",
                "popular": True,
                "activo": True,
                "descripcion": "Oficina en el centro histórico de Sevilla",
            },
            {
                "nombre": "Mobility4You Valencia Ciudad",
                "direccion": direcciones[4],
                "telefono": "+34 963 123 456",
                "email": "valencia@mobility4you.com",
                "popular": False,
                "activo": True,
                "descripcion": "Oficina en el centro de Valencia",
            },
            {
                "nombre": "Mobility4You Bilbao Casco Viejo",
                "direccion": direcciones[5],
                "telefono": "+34 944 123 456",
                "email": "bilbao@mobility4you.com",
                "popular": False,
                "activo": True,
                "descripcion": "Oficina en el Casco Viejo de Bilbao",
            },
        ]

        for lugar_data in lugares_data:
            lugar = Lugar.objects.create(**lugar_data)
            self.stdout.write(f"  ✓ Creado lugar: {lugar.nombre}")

        # Estadísticas finales
        total_direcciones = Direccion.objects.count()
        total_lugares = Lugar.objects.count()
        lugares_populares = Lugar.objects.filter(popular=True).count()

        self.stdout.write("\n📊 Estadísticas:")
        self.stdout.write(f"  • Direcciones creadas: {total_direcciones}")
        self.stdout.write(f"  • Lugares creados: {total_lugares}")
        self.stdout.write(f"  • Lugares populares: {lugares_populares}")
        self.stdout.write(
            f"  • Lugares activos: {Lugar.objects.filter(activo=True).count()}"
        )
