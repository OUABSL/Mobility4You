# api/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models.vehiculos import Categoria, Vehiculo, ImagenVehiculo, TarifaVehiculo, Mantenimiento
from .models.lugares import Direccion, Lugar
from .models.reservas import Reserva, ReservaConductor, Penalizacion, ReservaExtra, Extras
from .models.politicasPago import PoliticaPago, PoliticaIncluye, TipoPenalizacion, PoliticaPenalizacion
from .models.promociones import Promocion
from .models.contenidos import Contenido

# Inlines
class ImagenVehiculoInline(admin.TabularInline):
    model = ImagenVehiculo
    extra = 1
    fields = ('url', 'portada')  # Eliminados 'ancho', 'alto' porque no existen en el modelo

class TarifaVehiculoInline(admin.TabularInline):
    model = TarifaVehiculo
    extra = 1

class PoliticaIncluyeInline(admin.TabularInline):
    model = PoliticaIncluye
    extra = 2

class PoliticaPenalizacionInline(admin.TabularInline):
    model = PoliticaPenalizacion
    extra = 1

class ReservaConductorInline(admin.TabularInline):
    model = ReservaConductor
    extra = 1
    fields = ('nombre', 'apellidos', 'email', 'telefono', 'rol')

class PenalizacionInline(admin.TabularInline):
    model = Penalizacion
    extra = 0
    readonly_fields = ('fecha',)

class ReservaExtraInline(admin.TabularInline):
    model = ReservaExtra
    extra = 1
    fields = ('extra', 'cantidad')

# Admin para Vehículos
@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'vehiculos_count')
    search_fields = ('nombre',)
    
    def vehiculos_count(self, obj):
        return obj.vehiculos.count()
    vehiculos_count.short_description = 'Vehículos'

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('marca', 'modelo', 'matricula', 'categoria', 'grupo', 
                    'precio_actual', 'disponible', 'activo')
    list_filter = ('disponible', 'activo', 'categoria', 'grupo', 'combustible')
    search_fields = ('marca', 'modelo', 'matricula')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ImagenVehiculoInline, TarifaVehiculoInline]
    fieldsets = (
        ('Información básica', {
            'fields': (('marca', 'modelo'), 'matricula', ('categoria', 'grupo'), 
                      'combustible', 'anio', 'color')
        }),
        ('Características', {
            'fields': ('num_puertas', 'num_pasajeros', 'capacidad_maletero')
        }),
        ('Estado', {
            'fields': ('disponible', 'activo', 'kilometraje', 'fianza')
        }),
        ('Notas', {
            'fields': ('notas_internas',)
        }),
        ('Información del sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def precio_actual(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        tarifa = obj.tarifavehiculo_set.filter(fecha_inicio__lte=today, fecha_fin__gte=today).order_by('-fecha_inicio').first()
        if tarifa:
            return f"{tarifa.precio_dia} €"
        return "-"
    precio_actual.short_description = 'Precio actual'

@admin.register(Mantenimiento)
class MantenimientoAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'tipo_servicio', 'fecha', 'coste')
    list_filter = ('tipo_servicio', 'fecha')
    search_fields = ('vehiculo__marca', 'vehiculo__modelo', 'vehiculo__matricula')
    date_hierarchy = 'fecha'

# Admin para Lugares
@admin.register(Direccion)
class DireccionAdmin(admin.ModelAdmin):
    list_display = ('calle', 'ciudad', 'provincia', 'pais', 'codigo_postal')
    list_filter = ('ciudad', 'provincia', 'pais')
    search_fields = ('calle', 'ciudad', 'codigo_postal')

@admin.register(Lugar)
class LugarAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'direccion', 'direccion_ciudad')  # Añadido 'direccion_ciudad'
    list_filter = ('direccion__ciudad',)
    search_fields = ('nombre', 'direccion__calle', 'direccion__ciudad')
    
    def direccion_ciudad(self, obj):
        return obj.direccion.ciudad if obj.direccion else ""
    direccion_ciudad.short_description = 'Ciudad'

# Admin para Políticas
@admin.register(PoliticaPago)
class PoliticaPagoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'deductible', 'items_count')
    search_fields = ('titulo', 'descripcion')
    inlines = [PoliticaIncluyeInline, PoliticaPenalizacionInline]
    
    def items_count(self, obj):
        return obj.items.count()
    items_count.short_description = 'Items'

@admin.register(TipoPenalizacion)
class TipoPenalizacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'tipo_tarifa')
    list_filter = ('tipo_tarifa',)
    search_fields = ('nombre',)

# Admin para Reservas
@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehiculo_info', 'fecha_recogida', 'fecha_devolucion', 
                  'estado', 'precio_total', 'importe_pendiente_total')
    list_filter = ('estado', 'fecha_recogida', 'metodo_pago')
    inlines = [ReservaExtraInline, ReservaConductorInline, PenalizacionInline]

    def vehiculo_info(self, obj):
        if obj.vehiculo:
            return f"{obj.vehiculo.marca} {obj.vehiculo.modelo} ({obj.vehiculo.matricula})"
        return "-"
    vehiculo_info.short_description = 'Vehículo'

    def importe_pendiente_total(self, obj):
        return (obj.importe_pendiente_inicial or 0) + (obj.importe_pendiente_extra or 0)
    importe_pendiente_total.short_description = 'Importe pendiente total'

# Admin para Marketing
@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descuento_pct', 'activo', 'fecha_inicio', 'fecha_fin')
    search_fields = ('nombre', 'descripcion')
    list_filter = ('activo', 'fecha_inicio', 'fecha_fin')

# Ajustes en ContenidoAdmin
@admin.register(Contenido)
class ContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'tipo', 'activo')
    search_fields = ('titulo', 'tipo')
    list_filter = ('tipo', 'activo')

@admin.register(Extras)
class ExtrasAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'descripcion')
    search_fields = ('nombre',)
    ordering = ('nombre',)