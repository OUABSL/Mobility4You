# facturas_contratos/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContratoViewSet, FacturaViewSet

app_name = "facturas_contratos"

router = DefaultRouter()
router.register(r"contratos", ContratoViewSet)
router.register(r"facturas", FacturaViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
