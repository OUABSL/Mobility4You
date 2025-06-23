# usuarios/models.py
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Usuario(AbstractUser):
    """
    Modelo de Usuario extendido que hereda de AbstractUser
    Esto nos permite mantener toda la funcionalidad de Django User
    """

    SEXO_CHOICES = [
        ("masculino", _("Masculino")),
        ("femenino", _("Femenino")),
        ("no_indicado", _("Prefiero no contestar")),
    ]

    TIPO_DOCUMENTO_CHOICES = [
        ("pasaporte", _("Pasaporte")),
        ("dni", _("DNI")),
        ("nif", _("NIF")),
        ("nie", _("NIE")),
    ]

    ROL_CHOICES = [
        ("cliente", _("Cliente")),
        ("admin", _("Administrador")),
        ("empresa", _("Empresa")),
    ]
    # Campos adicionales al User de Django (La clase ya tiene email, first_name, last_name)
    fecha_nacimiento = models.DateField(
        _("Fecha de nacimiento"),
        null=True,
        blank=True,
        help_text=_("Solo requerido para usuarios cliente/empresa, no para admin"),
    )
    sexo = models.CharField(
        _("Sexo"),
        max_length=20,
        choices=SEXO_CHOICES,
        default="no_indicado",
        null=True,
        blank=True,
        help_text=_("Solo requerido para usuarios cliente/empresa"),
    )
    nacionalidad = models.CharField(
        _("Nacionalidad"),
        max_length=100,
        null=True,
        blank=True,
        help_text=_("Solo requerido para usuarios cliente/empresa"),
    )
    tipo_documento = models.CharField(
        _("Tipo de documento"),
        max_length=20,
        choices=TIPO_DOCUMENTO_CHOICES,
        null=True,
        blank=True,
        help_text=_("Solo requerido para usuarios cliente/empresa"),
        validators=[
            RegexValidator(
                regex=r"^(pasaporte|dni|nif|nie)$", message="Tipo de documento inválido"
            )
        ],
    )
    numero_documento = models.CharField(
        _("Número de documento"),
        max_length=20,
        null=True,
        blank=True,
        unique=True,
        help_text=_("Solo requerido para usuarios cliente/empresa"),        validators=[
            RegexValidator(
                regex=r"^[A-Z0-9]{6,20}$", message="Número de documento inválido"
            )
        ],
    )
    imagen_carnet = models.ImageField(
        _("Imagen de carnet"), upload_to="carnets/", null=True, blank=True
    )
    direccion = models.ForeignKey(
        "lugares.Direccion",  # Referencia a la app lugares
        on_delete=models.SET_NULL,
        related_name="usuarios",
        null=True,
        blank=True,
    )
    telefono = models.CharField(
        _("Teléfono"),
        max_length=20,
        null=True,
        blank=True,
        help_text=_(
            "Número de teléfono de contacto, no se solicitará al segundo conductor, de allí que sea opcional. Se validará a nivel de frontend y endpoint que el conductor primario tenga un número de teléfono válido."
        ),
        validators=[
            RegexValidator(
                regex=r"^\+?1?\d{9,15}$", message="Número de teléfono inválido"
            )
        ],
    )
    rol = models.CharField(
        _("Rol"),
        max_length=20,
        choices=ROL_CHOICES,
        null=True,
        blank=True,
        default="cliente",
        help_text=_("Admin no necesita rol específico (se maneja con is_superuser)"),
        validators=[
            RegexValidator(regex=r"^(cliente|admin|empresa)$", message="Rol inválido")
        ],
    )
    idioma = models.CharField(
        _("Idioma"), max_length=10, null=False, blank=False, default="es"
    )
    activo = models.BooleanField(
        _("Activo"),
        default=False,
        help_text=_(
            "Indica si el usuario está activo. Un usuario inactivo no podrá iniciar sesión."
        ),
    )
    acepta_recibir_ofertas = models.BooleanField(
        _("Acepta recibir ofertas"),
        default=False,
        help_text=_(
            "Indica si el usuario acepta recibir ofertas y promociones por email."
        ),
    )

    registrado = models.BooleanField(_("Registrado"), default=False)
    verificado = models.BooleanField(
        _("Verificado"),
        default=False,
        help_text=_(
            "Indica si el usuario ha verificado su cuenta a través del email de confirmación."
        ),
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)
    password = models.CharField(
        _("password"),
        max_length=128,
        null=True,
        blank=True,
        help_text=_(
            "Dejar vacío para usuarios cliente que no requieren login. Para admin/empresa debe tener valor."
        ),
    )

    groups = models.ManyToManyField(
        Group,
        verbose_name="groups",
        blank=True,
        related_name="usuario_set",
        related_query_name="usuario",
        help_text=(
            "The groups this user belongs to. "
            "A user will get all permissions granted to each of their groups."
        ),
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name="user permissions",
        blank=True,
        related_name="usuario_permissions_set",
        related_query_name="usuario_permission",
        help_text="Specific permissions for this user.",
    )

    class Meta:
        db_table = "usuario"
        verbose_name = _("Usuario")
        verbose_name_plural = _("Usuarios")
        indexes = [
            models.Index(fields=["email", "activo"]),
            models.Index(fields=["numero_documento"]),
        ]

    def __str__(self):
        if self.is_superuser:
            return f"Admin: {self.username} ({self.email})"
        return f"{self.get_full_name()} ({self.email})"

    def is_admin_user(self):
        """Verifica si es un usuario administrador del sistema"""
        return self.is_superuser or self.is_staff

    def is_business_user(self):
        """Verifica si es un usuario de empresa"""
        return self.rol == "empresa" and not self.is_superuser

    def is_client_user(self):
        """Verifica si es un usuario cliente"""
        return self.rol == "cliente" and not self.is_superuser

    def requires_personal_data(self):
        """Verifica si el usuario requiere datos personales"""
        return not self.is_admin_user()

    def requires_password(self):
        """Verifica si el usuario requiere contraseña"""
        return self.is_admin_user() or self.rol == "empresa"

    def edad(self):
        """Calcula la edad del usuario"""
        if not self.fecha_nacimiento:
            return None

        hoy = timezone.now().date()
        return (
            hoy.year
            - self.fecha_nacimiento.year
            - (
                (hoy.month, hoy.day)
                < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
            )
        )

    def es_mayor_que(self, edad_minima):
        """Verifica si el usuario es mayor que la edad mínima especificada"""
        if not self.fecha_nacimiento:
            return False

        edad_actual = self.edad()
        return edad_actual is not None and edad_actual >= edad_minima

    def save(self, *args, **kwargs):
        """Sobrescribe el método save para actualizar los campos de fecha"""
        if not self.id:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()

        # Para usuarios admin, establecer valores por defecto para campos no requeridos
        if self.is_superuser or self.is_staff:
            if not self.sexo:
                self.sexo = "no_indicado"
            if not self.rol:
                self.rol = None  # Admin no necesita rol

        super().save(*args, **kwargs)

    def get_summary(self):
        """Devuelve un resumen del usuario"""
        return {
            "id": self.id,
            "nombre_completo": self.get_full_name(),
            "email": self.email,
            "telefono": self.telefono,
            "fecha_nacimiento": self.fecha_nacimiento,
            "sexo": self.sexo,
            "nacionalidad": self.nacionalidad,
            "tipo_documento": self.tipo_documento,
            "numero_documento": self.numero_documento,
            "rol": self.rol,
            "activo": self.activo,
            "registrado": self.registrado,
            "verificado": self.verificado,
        }
