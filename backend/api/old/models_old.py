from django.conf import settings
from django.db import models
from django.db.models import Index
from django.utils.translation import gettext_lazy as _

# --- Catálogo ---
class Categoria(models.Model):
    """De momento hay dos categorias: Coche , Furgoneta"""
    
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    nombre = models.CharField(max_length=100, unique=True, verbose_name=_("Nombre"))
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.nombre}"
    
    class Meta:
        db_table = "categoria"
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"


class GrupoCoche(models.Model):
    """ Grupo de coche"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    nombre = models.CharField(max_length=100, unique=True, verbose_name=_("Nombre"))
    descripcion = models.TextField(default="", blank=True, verbose_name=_("Descripción"))
    edad_minima = models.PositiveSmallIntegerField(default=23)
    categoria_id = models.ForeignKey(to=Categoria, on_delete=models.CASCADE, related_name="get_Categoria_GrupoCoche")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.id}-{self.nombre_unico}"

    class Meta:
        db_table = "GrupoCoche"
        verbose_name = "Grupo Coche"
        verbose_name_plural ="Grupos Coches"

# --- Direccion ---
class Direccion(models.Model):
    """ Direccion """
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))    
    calle = models.CharField(max_length=12, verbose_name=_("Calle"))
    ciudad = models.CharField(max_length=30, verbose_name=_("Ciudad"))
    provincia = models.CharField(max_length=100, verbose_name=_("Provincia"))
    pais = models.CharField(max_length=100, verbose_name=_("país"))
    codigo_postal = models.CharField(max_length=10, verbose_name=_("Código Postal"))   
    
    def __str__(self) -> str:
        return f"{self.ciudad}-{self.ciudad}-{self.pais}"

    class Meta:
        db_table = "direccion"
        verbose_name = "Dirección"
        verbose_name_plural ="Direcciones"
    
    def save(self, *args, **kwargs):
        """ convertir a minúsculas ciudad/provincia/pais en inserciones y actualizaciones."""
        if self.ciudad:
            self.ciudad = self.ciudad.lower()
        if self.provincia:
            self.provincia = self.provincia.lower()
        if self.pais:
            self.pais = self.pais.lower()
        super().save(*args, **kwargs)

# --- Usuarios ---
class Usuario(models.Model):
    """"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    user_id = models.OneToOneField(to=settings.AUTH_USER_MODEL, on_delete=models.RESTRICT,related_name="get_User_Usuario")
    segundo_conductor = models.BooleanField(default=False)
    tipo_documento = models.CharField(max_length=50, verbose_name=_("Tipo de documento"), choices=[
        ('dni', 'DNI'),
        ('nie', 'NIE'),
        ('pasaporte', 'Pasaporte')
    ])
    numero_documento = models.CharField(max_length=12, null=True, blank=True, verbose_name=_("Número de documento"))
    imagen_carne = models.ImageField(upload_to='carne/imagenes', null=True, blank=True, verbose_name=_("Imagen"))
    direccion_id = models.ForeignKey(to=Direccion,null=True, blank=True, verbose_name=_("Dirección"), on_delete=models.RESTRICT, related_name="get_Direccion_Usuario" )    
    telefono = models.CharField(max_length=20, verbose_name=_("Telefono"))
    activo = models.BooleanField(default=False)    
    verificado = models.BooleanField(default=False)
    registrado = models.BooleanField(default=False)
    # password_hash = models.CharField(max_length=60)
    rol = models.CharField(max_length=20, choices=[
        ('cliente', 'Cliente'),
        ('admin', 'Administrador'),
        ('empresa', 'Empresa')
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user_id.first_name}-{self.user_id.last_name}"

    class Meta:
        db_table = "usuario"
        verbose_name = "Usuario"
        verbose_name_plural ="Usuarios"

# --- Localización ---
class Lugar(models.Model):
    """"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    nombre = models.CharField(max_length=100, verbose_name=_("Nombre"))
    email = models.EmailField(unique=True, verbose_name=_("Email"))
    telefono = models.CharField(max_length=20, verbose_name=_("Telefono"))
    direccion_id = models.ForeignKey(to=Direccion,null=True, blank=True, verbose_name=_("Dirección"), on_delete=models.RESTRICT, related_name="get_Direccion_Lugar" )        
    icono_url = models.CharField(max_length=200, default="", blank=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.nombre}-{self.direccion_id.pais}"

    class Meta:
        db_table = "lugar"
        verbose_name = "Lugar"
        verbose_name_plural ="Lugares"

# --- Vehículo ---
class Vehiculo(models.Model):
    """Vehiculo"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    matricula = models.CharField(max_length=100, unique=True, verbose_name=_("Matricula de vehiculo"))
    marca = models.CharField(max_length=100, verbose_name=_("Marca de vehiculo"))
    modelo = models.CharField(max_length=100, verbose_name=_("Modelo de vehiculo"))
    anio = models.PositiveIntegerField()
    color = models.CharField(max_length=50)
    num_puertas = models.PositiveSmallIntegerField()
    num_pasajeros = models.PositiveSmallIntegerField()
    capacidad_maletero = models.IntegerField()
    disponible = models.BooleanField(default=True, verbose_name=_("Disponible"))
    activo = models.BooleanField(default=True, help_text="",  verbose_name=_("Activo"))
    notas_internas = models.CharField(max_length=250, default="", blank=True)
    combustible = models.CharField(max_length=20, choices=[
        ('Gasolina', 'Gasolina'),
        ('Diesel', 'Diesel'),
        ('Híbrido', 'Híbrido'),
        ('Eléctrico', 'Eléctrico')
    ])
    precio_dia = models.DecimalField(max_digits=8, decimal_places=2, verbose_name=_("Precio al día"))

    categoria_id = models.ForeignKey(to=Categoria, on_delete=models.CASCADE, related_name="get_Categoria_Cehiculo")
    grupo_id = models.ForeignKey(to=GrupoCoche, on_delete=models.CASCADE, related_name="get_GrupoCoche_Vehiculo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.categoria}-{self.matricula}"

    class Meta:
        db_table = "vehiculo"
        verbose_name = "Grupo Coche"
        verbose_name_plural ="Grupos Coches"
        
        
# --- Mantenimiento --- 
class Mantenimiento(models.Model)        :
    """ Mantenimiento del vehiculo """
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))    
    fecha = models.DateTimeField(verbose_name=_("Fecha"))
    tipo_servicio = models.CharField(max_length=200, verbose_name=_("Tipo servicio"))
    coste = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Coste"))
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))   
    vehiculo_id = models.ForeignKey(db_column='vehiculo', to=Vehiculo, on_delete=models.RESTRICT, related_name='get_Vehiculo_Mantenimiento', verbose_name=_("Vehiculo"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self) -> str:
        return f"{self.id}"
    
    class Meta:
        db_table = "matenimiento"
        verbose_name = "Mantenimiento"
        verbose_name_plural ="Mantenimientos"
        
    
# --- Tarifa ----
class TarifaVehiculo(models.Model):
    """ la tarifa aplicada al vehiculo tenemos dos opciones 
        1: si tenemos fecha inicio y fecha fin. Aplicamos esta tarifa  
        2: si tenemos solo fecha inicio , aplicamos esta tarifa         
    """
    id = models.AutoField(db_column='id', primary_key=True, verbose_name=_('ID'))
    fecha_inicio = models.DateTimeField(verbose_name=_("Fecha de inicio"))
    fecha_fin = models.DateTimeField(verbose_name=_("Fecha de fin"))
    precio_dia = models.DecimalField(max_digits=8, decimal_places=2, verbose_name=_("Precio por día"))
    vehiculo_id = models.ForeignKey(db_column='vehiculo', to=Vehiculo, on_delete=models.CASCADE, related_name='get_Vehiculo_TarifaVehiculo', verbose_name=_("Vehiculo"))

    def __str__(self) -> str:
        return f"{self.imagen}-{self.vehiculo_id}"

    class Meta:
        db_table = "tarifa_vehiculo"
        verbose_name = "Tarifa Vehiculo"
        verbose_name_plural = "Tarifas Vehiculos"
        constraints = [
            models.UniqueConstraint(fields=['vehiculo_id', 'fecha_inicio'], name='unique_tarifa')
        ]
        indexes = [
            models.Index(fields=["vehiculo_id", "fecha_inicio", "fecha_fin"], name="idx_tarifa_periodo")
        ]
    
class ImagenVehiculo(models.Model):
    id = models.AutoField(db_column='id', primary_key=True, verbose_name=_('ID'))
    imagen = models.ImageField(upload_to='vehiculo/imagenes', null=True, blank=True, verbose_name=_("Imagen"))
    portada = models.BooleanField(default=False, blank=True, null=True, verbose_name="¿Imagen Principal?")
    vehiculo_id = models.ForeignKey(db_column='vehiculo', to=Vehiculo, on_delete=models.CASCADE, related_name='get_Vehiculo_ImagenVehiculo', verbose_name=_("Vehiculo"))

    def __str__(self) -> str:
        return f"{self.imagen}-{self.vehiculo_id}"

    class Meta:
        db_table = "imagen_vehiculo"
        verbose_name = "Imagen Vehiculo"
        verbose_name_plural = "Imagenes Vehiculos"

# --- Política de pago ---
class PoliticaPago(models.Model):
    """Politica de Pago"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    titulo = models.CharField(max_length=100, verbose_name=_("Titulo"))
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))   
    deducible = models.DecimalField(max_digits=10, decimal_places=2)
    deposito_seguridad = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name=_("Depósito de seguridad"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "politica_pago"
        verbose_name = "Politica Pago"
        verbose_name_plural = "Politicas Pagos"
        
class PoliticaIncluye(models.Model):
    """Politica Incluida o No Incluida"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))    
    politica_pago_id = models.ForeignKey(to=PoliticaPago, verbose_name=_("Politica de pago"), on_delete=models.RESTRICT, related_name="get_PoliticaPago_PoliticaIncluye")
    item = models.CharField(max_length=100, verbose_name=_("Item"))
    no_incluye = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "politica_incluye"
        verbose_name = "Politica Incluye"
        verbose_name_plural = "Politicas Incluyes"    
        constraints = [
            models.UniqueConstraint(fields=["politica_pago_id", "item"], name="unique_politica_item")
        ]


# --- TipoPenalizacion ---
class TipoPenalizacion(models.Model):
    """"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))    
    nombre = models.CharField(max_length=100, unique=True, verbose_name=_("Nombre"))
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))
    valor_tarifa = models.DecimalField(max_digits=8, decimal_places=2, verbose_name=_("Valor Tarifa"))
    Tipo_Tarifa = models.CharField(max_length=20, choices=[
        ('porcentaje', 'Porcentaje'),
        ('fijo', 'Fijo'),
        ('importe_dia', 'Importe')
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self) ->str:
        return f"{self.id}"
    
    class Meta:
        db_table = "tipo_penalizacion"        
        verbose_name = "Tipo Penalización"
        verbose_name_plural = "Tipos Penalizacines"        
        
# --- PoliticaPenalizacion ---
class PoliticaPenalizacion(models.Model):
    """"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))    
    politica_pago_id = models.ForeignKey(to=PoliticaPago, verbose_name=_("Politica de pago"), on_delete=models.RESTRICT, related_name="get_PoliticaPago_PoliticaPenalizacion")
    tipo_penalizacion_id = models.ForeignKey(to=TipoPenalizacion, verbose_name=_("Tipo de penalización"), on_delete=models.RESTRICT, related_name="get_TipoPenalizacion_PoliticaPenalizacion")
    horas_previas = models.PositiveSmallIntegerField(verbose_name=_("Horas previas"))
    
    def __str__(self) ->str:
        return f"{self.id}"
    
    class Meta:
        db_table = "politica_penalizacion"        
        verbose_name = "Politica Penalización"
        verbose_name_plural = "Politicas Penalizacines"
        constraints = [
            models.UniqueConstraint(fields=["politica_pago_id","tipo_penalizacion_id"], name="unique_politica_tipo_penalizacion")
        ]

# --- Promoción ---
class Promocion(models.Model):
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))
    fecha_inicio = models.DateTimeField(verbose_name=_("Fecha de inicio"))
    fecha_fin = models.DateTimeField(verbose_name=_("Fecha de fin"))
    activo = models.BooleanField(default=False)
    descuento_pct = models.DecimalField(max_digits=5, decimal_places=2, verbose_name=_("Descuento"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "promocion"
        verbose_name = "promoción"
        verbose_name_plural = "Promociones"

# --- Reserva ---
class Reserva(models.Model):
    """LA reserva """
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    fecha_recogida = models.DateTimeField(verbose_name=_("Fecha de recogida"))
    fecha_devolucion = models.DateTimeField(verbose_name=_("Fecha de devolucion"))
    fecha_pago = models.DateTimeField(null=True, blank=True)
    notas_internas = models.CharField(max_length=250, default="", blank=True)    
    precio_dia = models.DecimalField(max_digits=8, decimal_places=2, verbose_name=_("Precio por día en el momento de reservar"))
    precio_impuestos = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_("Precio total con impuestos"))
    precio_total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Impuestos totales")
    estado = models.CharField(max_length=20, choices=[
        ('pendiente', 'Pendiente'),
        ('confirmada', 'Confirmada'),
        ('cancelada', 'Cancelada')
    ])
    user_id = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='get_User_Reserva',verbose_name=_("User"))
    # usuario_id = models.ForeignKey(to=Usuario, on_delete=models.SET_NULL, related_name="get_Usuario_Reserva")    
    vehiculo_id = models.ForeignKey(to=Vehiculo, on_delete=models.RESTRICT, related_name="get_Vehiculo_Reserva")
    lugar_recogida_id = models.ForeignKey(to=Lugar, on_delete=models.RESTRICT, related_name='get_LugarRecogida_Reserva')
    lugar_devolucion_id = models.ForeignKey(to=Lugar, on_delete=models.RESTRICT, related_name='get_LugarDevolucion_Reserva')
    politica_pago_id = models.ForeignKey(to=PoliticaPago, on_delete=models.SET_NULL, null=True, blank=True)
    promocion_id = models.ForeignKey(to=Promocion, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "reserva"
        verbose_name = "Reseva"
        verbose_name_plural = "Resevas"
        # En Reserva, añadido índice compuesto (fecha_recogida, fecha_devolucion) para acelerar consultas de disponibilidad.
        indexes = [ 
            Index(fields=['fecha_recogida', 'fecha_devolucion'],name='idx_fechas_confirmadas',condition=models.Q(estado='confirmada'))
]
# --- Penalizacion
class Penalizacion(models.Model):
    """Penalización"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    fecha = models.DateTimeField(verbose_name=_("Fecha"))
    descripcion = models.TextField(default="", verbose_name=_("Descripción"))
    tipo_penalizacion_id = models.ForeignKey(to=TipoPenalizacion, verbose_name=_("Tipo de penalización"), on_delete=models.RESTRICT, related_name="get_TipoPenalizacion_Penalizacion")
    reserva_id = models.ForeignKey(to=Reserva, verbose_name=_("Reserva"), on_delete=models.RESTRICT, related_name="get_Reserva_Penalizacion")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "penalizacion"
        verbose_name = "Penalización"
        verbose_name_plural = "Penalizaciones"
        
# --- ReservaConductor ----
class ReservaConductor(models.Model):
    """ La reserva del conductor  """
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    reserva_id = models.ForeignKey(to=Reserva, verbose_name=_("Reserva"), on_delete=models.RESTRICT, related_name="get_Reserva_ReservaConductor")
    user_id = models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='get_User_ReservaConductor',verbose_name=_("User"))
    rol = models.CharField(max_length=20, choices=[
        ('principal', 'Principal'),
        ('segundario', 'Segundario'),       
    ])
    def __str__(self) -> str:
        return f"{self.id}"
    class Meta:
        db_table = "reserva_conductor"
        verbose_name = "Reserva Conductor"
        verbose_name_plural = "Reservas Conductores"
        constraints = [
            models.UniqueConstraint(fields=["user_id", "reserva_id"], name="unique_user_reserva")
        ]
        
    
# --- Contenido estático ---
class Contenido(models.Model):
    """Contenido"""
    id = models.AutoField(db_column="id", primary_key=True, verbose_name=_('ID'))
    titulo = models.CharField(max_length=255)
    subtitulo = models.CharField(max_length=255)
    cuerpo = models.TextField(default="", blank=True)
    info_adicional = models.TextField(default="", blank=True)
    icono_url = models.CharField(max_length=255, default="", blank=True)    
    activo = models.BooleanField(default=False)
    tipo = models.CharField(max_length=20, choices=[
        ('blog', 'Blog'),
        ('faq', 'FAQ'),
        ('legal', 'Legal'),
        ('info', 'Información'),
        ('min_section', 'Sección mínima'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.id}"

    class Meta:
        db_table = "contenido"
        verbose_name = "Contenido"
        verbose_name_plural = "Contenidos"