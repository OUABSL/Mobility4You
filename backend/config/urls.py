"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


# Simple health check view
def health_check(request):
    return JsonResponse({"status": "healthy", "service": "mobility4you-backend"})

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    # APIs modulares (sin namespace por ahora para evitar conflictos)
    path("api/usuarios/", include("usuarios.urls")),
    path("api/lugares/", include("lugares.urls")),
    path("api/vehiculos/", include("vehiculos.urls")),
    path("api/reservas/", include("reservas.urls")),
    path("api/politicas/", include("politicas.urls")),
    path("api/facturas-contratos/", include("facturas_contratos.urls")),
    path("api/comunicacion/", include("comunicacion.urls")),
    path("api/payments/", include("payments.urls", namespace="payments")),
    # API monolítica original (DESACTIVADA - funcionalidad migrada)
    # path('api/', include('api.urls')),  # ✅ Migrado a apps modulares
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
