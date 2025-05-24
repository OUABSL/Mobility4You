from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import (
    Direccion, Lugar, Categoria, GrupoCoche, Vehiculo, 
    PoliticaPago, TipoPenalizacion, Promocion, Contenido
)
from decimal import Decimal


class Command(BaseCommand):
    help = 'Crea datos iniciales para la aplicación'

    def handle(self, *args, **options):
        self.stdout.write('Creando datos iniciales...')
        
        try:
            with transaction.atomic():
                self.create_direcciones()
                self.create_lugares()
                self.create_categorias()
                self.create_grupos_coche()
                self.create_politicas_pago()
                self.create_promociones()
                self.create_contenidos()
                
            self.stdout.write(
                self.style.SUCCESS('Datos iniciales creados exitosamente!')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creando datos iniciales: {str(e)}')
            )

    def create_direcciones(self):
        """Crear direcciones iniciales"""
        direcciones_data = [
            ('Aeropuerto de Málaga - Costa del Sol', 'málaga', 'málaga', 'españa', '29004'),
            ('Aeropuerto de Madrid-Barajas', 'madrid', 'madrid', 'españa', '28042'),
            ('Aeropuerto de Barcelona-El Prat', 'barcelona', 'barcelona', 'españa', '08820'),
            ('Aeropuerto de Palma de Mallorca', 'palma', 'islas baleares', 'españa', '07611'),
            ('Aeropuerto de Alicante-Elche', 'alicante', 'alicante', 'españa', '03195'),
            ('Estación AVE Santa Justa', 'sevilla', 'sevilla', 'españa', '41003'),
            ('Estación Chamartín-Clara Campoamor', 'madrid', 'madrid', 'españa', '28036'),
            ('Estación de Atocha', 'madrid', 'madrid', 'españa', '28045'),
            ('Puerto de Valencia', 'valencia', 'valencia', 'españa', '46024'),
            ('Puerto de Algeciras', 'algeciras', 'cádiz', 'españa', '11207'),
            ('Centro de Málaga', 'málaga', 'málaga', 'españa', '29015'),
            ('Centro de Madrid', 'madrid', 'madrid', 'españa', '28013'),
            ('Centro de Barcelona', 'barcelona', 'barcelona', 'españa', '08002'),
            ('Centro de Valencia', 'valencia', 'valencia', 'españa', '46003'),
            ('Centro de Sevilla', 'sevilla', 'sevilla', 'españa', '41001'),
            ('Plaza de España, Barcelona', 'barcelona', 'barcelona', 'españa', '08004'),
            ('Gran Vía, Madrid', 'madrid', 'madrid', 'españa', '28013'),
            ('Calle Alcalá, 123', 'madrid', 'madrid', 'españa', '28009'),
            ('Paseo de Gracia, 45', 'barcelona', 'barcelona', 'españa', '08008'),
            ('Calle Sierpes, 78', 'sevilla', 'sevilla', 'españa', '41002'),
        ]
        
        for calle, ciudad, provincia, pais, codigo_postal in direcciones_data:
            Direccion.objects.get_or_create(
                calle=calle,
                ciudad=ciudad,
                provincia=provincia,
                pais=pais,
                codigo_postal=codigo_postal
            )
        
        self.stdout.write('✓ Direcciones creadas')

    def create_lugares(self):
        """Crear lugares iniciales"""
        lugares_data = [
            ('Aeropuerto de Málaga', 1, 'faPlane'),
            ('Aeropuerto de Madrid', 2, 'faPlane'),
            ('Aeropuerto de Barcelona', 3, 'faPlane'),
            ('Aeropuerto de Palma', 4, 'faPlane'),
            ('Aeropuerto de Alicante', 5, 'faPlane'),
            ('Estación AVE Sevilla', 6, 'faTrain'),
            ('Estación Chamartín Madrid', 7, 'faTrain'),
            ('Estación Atocha Madrid', 8, 'faTrain'),
            ('Puerto de Valencia', 9, 'faShip'),
            ('Puerto de Algeciras', 10, 'faShip'),
            ('Málaga Centro', 11, 'faMapMarkerAlt'),
            ('Madrid Centro', 12, 'faMapMarkerAlt'),
            ('Barcelona Centro', 13, 'faMapMarkerAlt'),
            ('Valencia Centro', 14, 'faMapMarkerAlt'),
            ('Sevilla Centro', 15, 'faMapMarkerAlt'),
        ]
        
        for nombre, direccion_id, icono in lugares_data:
            try:
                direccion = Direccion.objects.get(id=direccion_id)
                Lugar.objects.get_or_create(
                    nombre=nombre,
                    direccion=direccion,
                    icono_url=icono
                )
            except Direccion.DoesNotExist:
                self.stdout.write(f'Dirección {direccion_id} no encontrada para {nombre}')
        
        self.stdout.write('✓ Lugares creados')

    def create_categorias(self):
        """Crear categorías de vehículos"""
        categorias = [
            ('Económico', 'Vehículos económicos y eficientes'),
            ('Compacto', 'Vehículos compactos ideales para ciudad'),
            ('Berlina', 'Berlinas cómodas y espaciosas'),
            ('Berlina Premium', 'Berlinas de lujo y alta gama'),
            ('SUV', 'Vehículos utilitarios deportivos'),
            ('SUV Premium', 'SUVs de lujo y prestaciones'),
            ('Familiar', 'Vehículos familiares espaciosos'),
            ('Descapotable', 'Vehículos descapotables'),
            ('Deportivo', 'Vehículos deportivos de alta gama'),
            ('Furgoneta', 'Furgonetas y vehículos comerciales'),
        ]
        
        for nombre, descripcion in categorias:
            Categoria.objects.get_or_create(
                nombre=nombre,
                defaults={'descripcion': descripcion}
            )
        
        self.stdout.write('✓ Categorías creadas')

    def create_grupos_coche(self):
        """Crear grupos de coches"""
        grupos = [
            ('Segmento A', 21, 'Vehículos pequeños y urbanos'),
            ('Segmento B', 21, 'Compactos versátiles'),
            ('Segmento C', 23, 'Berlinas medianas'),
            ('Segmento D', 25, 'Berlinas grandes'),
            ('Segmento E', 25, 'Berlinas ejecutivas'),
            ('SUV Compacto', 23, 'SUVs de tamaño medio'),
            ('SUV Grande', 25, 'SUVs de gran tamaño'),
            ('Deportivo', 25, 'Vehículos deportivos'),
            ('Familiar', 23, 'Vehículos familiares'),
            ('Premium', 25, 'Vehículos de lujo'),
        ]
        
        for nombre, edad_minima, descripcion in grupos:
            GrupoCoche.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'edad_minima': edad_minima,
                    'descripcion': descripcion
                }
            )
        
        self.stdout.write('✓ Grupos de coches creados')

    def create_politicas_pago(self):
        """Crear políticas de pago"""
        politicas = [
            ('All Inclusive', Decimal('0.00'), 'Protección completa sin franquicia'),
            ('Economy', Decimal('800.00'), 'Protección básica con franquicia'),
        ]
        
        for titulo, deductible, descripcion in politicas:
            PoliticaPago.objects.get_or_create(
                titulo=titulo,
                defaults={
                    'deductible': deductible,
                    'descripcion': descripcion
                }
            )
        
        self.stdout.write('✓ Políticas de pago creadas')

    def create_promociones(self):
        """Crear promociones"""
        from django.utils import timezone
        from datetime import timedelta
        
        hoy = timezone.now().date()
        
        promociones = [
            ('Descuento Verano 2024', 'Descuento especial para reservas de verano', Decimal('15.00'), hoy, hoy + timedelta(days=90)),
            ('Oferta Primavera', 'Aprovecha los mejores precios de primavera', Decimal('10.00'), hoy, hoy + timedelta(days=60)),
        ]
        
        for nombre, descripcion, descuento, fecha_inicio, fecha_fin in promociones:
            Promocion.objects.get_or_create(
                nombre=nombre,
                defaults={
                    'descripcion': descripcion,
                    'descuento_pct': descuento,
                    'fecha_inicio': fecha_inicio,
                    'fecha_fin': fecha_fin,
                    'activo': True
                }
            )
        
        self.stdout.write('✓ Promociones creadas')

    def create_contenidos(self):
        """Crear contenido inicial"""
        contenidos = [
            ('faq', 'Preguntas Frecuentes', 'Encuentra respuestas a las preguntas más comunes'),
            ('legal', 'Términos y Condiciones', 'Términos legales y condiciones de uso'),
            ('info', 'Sobre Nosotros', 'Información sobre Mobility 4 You'),
        ]
        
        for tipo, titulo, cuerpo in contenidos:
            Contenido.objects.get_or_create(
                tipo=tipo,
                titulo=titulo,
                defaults={
                    'cuerpo': cuerpo,
                    'activo': True
                }
            )
        
        self.stdout.write('✓ Contenidos creados')