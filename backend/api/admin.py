# api/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models.vehiculos import Categoria, GrupoCoche, Vehiculo, ImagenVehiculo, TarifaVehiculo, Mantenimiento
from .models.lugares import Direccion, Lugar
from .models.reservas import Reserva, ReservaExtra, ReservaConductor, Penalizacion
from .models.politicasPago import PoliticaPago, PoliticaIncluye, TipoPenalizacion, PoliticaPenalizacion
from .models.marketing import Promocion, Contenido

# Inlines
class GrupoCocheInline(admin.TabularInline):
    model = GrupoCoche
    extra = 1

class ImagenVehiculoInline(admin.TabularInline):
    model = ImagenVehiculo
    extra = 1
    fields = ('url', 'portada', 'ancho', 'alto')

class TarifaVehiculoInline(admin.TabularInline):
    model = TarifaVehiculo
    extra = 1

class PoliticaIncluyeInline(admin.TabularInline):
    model = PoliticaIncluye
    extra = 2

class PoliticaPenalizacionInline(admin.TabularInline):
    model = PoliticaPenalizacion
    extra = 1

class ReservaExtraInline(admin.TabularInline):
    model = ReservaExtra
    extra = 1

class ReservaConductorInline(admin.TabularInline):
    model = ReservaConductor
    extra = 1
    fields = ('nombre', 'apellidos', 'email', 'telefono', 'rol')

class PenalizacionInline(admin.TabularInline):
    model = Penalizacion
    extra = 0
    readonly_fields = ('fecha',)

# Admin para Vehículos
@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'vehiculos_count')
    search_fields = ('nombre',)
    inlines = [GrupoCocheInline]
    
    def vehiculos_count(self, obj):
        return obj.vehiculos.count()
    vehiculos_count.short_description = 'Vehículos'

@admin.register(GrupoCoche)
class GrupoCocheAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'edad_minima')
    list_filter = ('categoria', 'edad_minima')
    search_fields = ('nombre', 'categoria__nombre')

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('marca', 'modelo', 'matricula', 'categoria', 'grupo', 
                    'precio_actual', 'disponible', 'activo')
    list_filter = ('disponible', 'activo', 'categoria', 'grupo', 'combustible')
    search_fields = ('marca', 'modelo', 'matricula')
    readonly_fields = ('creado', 'actualizado')
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
            'fields': ('creado', 'actualizado'),
            'classes': ('collapse',)
        }),
    )
    
    def precio_actual(self, obj):
        precio = obj.precio_actual()
        return f"{precio}€" if precio else "No definido"
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
    list_display = ('nombre', 'direccion_ciudad', 'telefono', 'email', 'activo')
    list_filter = ('activo', 'direccion__ciudad', 'direccion__pais')
    search_fields = ('nombre', 'direccion__calle', 'direccion__ciudad')
    
    def direccion_ciudad(self, obj):
        return obj.direccion.ciudad if obj.direccion else "-"
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
    list_display = ('nombre', 'tipo_tarifa', 'valor_tarifa')
    list_filter = ('tipo_tarifa',)
    search_fields = ('nombre',)

# Admin para Reservas
@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ('id', 'vehiculo_info', 'fecha_recogida', 'fecha_devolucion', 
                  'estado', 'precio_total', 'importe_pendiente_total')
    list_filter = ('estado', 'fecha_recogida', 'metodo_pago_inicial')
    search_fields = ('id', 'vehiculo__marca', 'vehiculo__modelo')
    readonly_fields = ('creado', 'actualizado', 'dias_alquiler', 'generar_codigo_reserva')
    inlines = [ReservaConductorInline, ReservaExtraInline, PenalizacionInline]
    date_hierarchy = 'fecha_recogida'
    
    fieldsets = (
        ('Información básica', {
            'fields': ('estado', 'usuario', 'vehiculo', 'politica_pago', 'promocion')
        }),
        ('Fechas y lugares', {
            'fields': (('fecha_recogida', 'lugar_recogida'), 
                      ('fecha_devolucion', 'lugar_devolucion'), 'dias_alquiler')
        }),
        ('Precios', {
            'fields': (('precio_dia', 'precio_base'), ('precio_extras', 'precio_impuestos'),
                      ('descuento_promocion', 'precio_total'))
        }),
        ('Métodos de pago', {
            'fields': ('metodo_pago_inicial', ('importe_pagado_inicial', 'importe_pendiente_inicial'),
                      ('importe_pagado_extra', 'importe_pendiente_extra'))
        }),
        ('Referencia', {
            'fields': ('generar_codigo_reserva', 'referencia_externa', 'notas_internas')
        }),
        ('Información del sistema', {
            'fields': ('creado', 'actualizado'),
            'classes': ('collapse',)
        }),
    )
    
    def vehiculo_info(self, obj):
        return f"{obj.vehiculo.marca} {obj.vehiculo.modelo} ({obj.vehiculo.matricula})"
    vehiculo_info.short_description = 'Vehículo'
    
    def importe_pendiente_total(self, obj):
        return obj.importe_pendiente_inicial + obj.importe_pendiente_extra
    importe_pendiente_total.short_description = 'Pendiente total'
    
    actions = ['cancelar_reservas', 'confirmar_reservas']
    
    def cancelar_reservas(self, request, queryset):
        from api.services.reservas import cancelar_reserva
        count = 0
        errors = []
        
        for reserva in queryset:
            try:
                cancelar_reserva(reserva)
                count += 1
            except Exception as e:
                errors.append(f"Error al cancelar reserva {reserva.id}: {str(e)}")
        
        if errors:
            self.message_user(request, f"Se cancelaron {count} reservas con {len(errors)} errores", level='WARNING')
        else:
            self.message_user(request, f"Se cancelaron {count} reservas correctamente")
    cancelar_reservas.short_description = 'Cancelar reservas seleccionadas'
    
    def confirmar_reservas(self, request, queryset):
        count = queryset.filter(estado='pendiente').update(estado='confirmada')
        self.message_user(request, f"Se confirmaron {count} reservas")
    confirmar_reservas.short_description = 'Confirmar reservas pendientes'

# Admin para Marketing
@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descuento_pct', 'fecha_inicio', 'fecha_fin', 
                    'activo', 'esta_vigente')
    list_filter = ('activo', 'fecha_inicio', 'fecha_fin')
    search_fields = ('nombre', 'codigo')
    date_hierarchy = 'fecha_inicio'
    
    def esta_vigente(self, obj):
        return obj.esta_vigente()
    esta_vigente.boolean = True
    esta_vigente.short_description = 'Vigente'

@admin.register(Contenido)
class ContenidoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'publicado', 'destacado')
    list_filter = ('tipo', 'publicado', 'destacado')
    search_fields = ('titulo', 'subtitulo', 'cuerpo')
    fieldsets = (
        ('Información básica', {
            'fields': ('tipo', 'titulo', 'subtitulo', 'icono_url')
        }),
        ('Contenido', {
            'fields': ('cuerpo',)
        }),
        ('Configuración', {
            'fields': ('info_adicional', 'publicado', 'destacado', 'orden')
        }),
    )