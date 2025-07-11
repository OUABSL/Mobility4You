# comunicacion/models.py
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Contenido(models.Model):
    TIPO_CHOICES = [
        ("blog", _("Blog")),
        ("faq", _("FAQ")),
        ("legal", _("Legal")),
        ("info", _("Información")),
        ("mini_section", _("Sección mínima")),
        ("testimonial", _("Testimonio")),
    ]

    tipo = models.CharField(
        _("Tipo"), max_length=20, choices=TIPO_CHOICES, null=False, blank=False
    )
    titulo = models.CharField(_("Título"), max_length=255, null=False, blank=False)
    subtitulo = models.CharField(_("Subtítulo"), max_length=255, null=True, blank=True)
    cuerpo = models.TextField(_("Cuerpo"), null=True, blank=True)
    info_adicional = models.JSONField(_("Información adicional"), null=True, blank=True)
    icono_url = models.CharField(_("Icono"), max_length=200, null=True, blank=True)
    activo = models.BooleanField(_("Activo"), default=False, null=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "contenido"
        verbose_name = _("Contenido")
        verbose_name_plural = _("Contenidos")
        ordering = ["tipo", "titulo"]
        indexes = [
            models.Index(fields=["tipo", "activo"]),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()}: {self.titulo}"


class Contacto(models.Model):
    """
    Modelo para almacenar mensajes de contacto del formulario web
    """

    ESTADO_CHOICES = [
        ("pendiente", "Pendiente"),
        ("en_proceso", "En proceso"),
        ("resuelto", "Resuelto"),
        ("cerrado", "Cerrado"),
    ]

    # Datos del remitente
    nombre = models.CharField(max_length=100, verbose_name="Nombre")
    email = models.EmailField(verbose_name="Email")

    # Contenido del mensaje
    asunto = models.CharField(max_length=200, verbose_name="Asunto")
    mensaje = models.TextField(verbose_name="Mensaje")

    # Metadatos
    fecha_creacion = models.DateTimeField(
        default=timezone.now, verbose_name="Fecha de creación"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default="pendiente",
        verbose_name="Estado",
    )

    # Datos de respuesta (opcional)
    fecha_respuesta = models.DateTimeField(
        null=True, blank=True, verbose_name="Fecha de respuesta"
    )
    respuesta = models.TextField(blank=True, verbose_name="Respuesta")
    respondido_por = models.CharField(
        max_length=100, blank=True, verbose_name="Respondido por"
    )

    # Datos técnicos
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="Dirección IP"
    )
    user_agent = models.TextField(blank=True, verbose_name="User Agent")

    class Meta:
        verbose_name = "Mensaje de contacto"
        verbose_name_plural = "Mensajes de contacto"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.nombre} - {self.asunto} ({self.fecha_creacion.strftime('%d/%m/%Y')})"

    def marcar_como_resuelto(self, respuesta="", respondido_por=""):
        """
        Marca el mensaje como resuelto
        """
        self.estado = "resuelto"
        self.fecha_respuesta = timezone.now()
        if respuesta:
            self.respuesta = respuesta
        if respondido_por:
            self.respondido_por = respondido_por
        self.save()

    @property
    def tiempo_respuesta(self):
        """
        Calcula el tiempo transcurrido desde la creación hasta la respuesta
        """
        if self.fecha_respuesta:
            return self.fecha_respuesta - self.fecha_creacion
        return None

    @property
    def es_reciente(self):
        """
        Determina si el mensaje es reciente (menos de 24 horas)
        """
        return (timezone.now() - self.fecha_creacion).days < 1
