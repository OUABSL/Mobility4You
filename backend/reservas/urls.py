# reservas/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExtrasViewSet, ReservaViewSet

app_name = "reservas"

# Router estándar - mantener estructura funcional comprobada
router = DefaultRouter()
router.register(r'reservas', ReservaViewSet)
router.register(r'extras', ExtrasViewSet)

urlpatterns = [
    # URLs específicas con nombres limpios ANTES del router
    path(
        "create-new/",
        ReservaViewSet.as_view({"post": "crear_reserva"}),
        name="create-reserva-legacy",
    ),
    path(
        "calcular-precio/",
        ReservaViewSet.as_view({"post": "calcular_precio"}),
        name="calcular-precio-reserva",
    ),
    path(
        "calculate-price/",
        ReservaViewSet.as_view({"post": "calcular_precio"}),
        name="calculate-reservation-price",
    ),
    path(
        "find-by-number/<str:numero_reserva>/",
        ReservaViewSet.as_view({"post": "buscar_por_numero"}),
        name="find-reserva-by-number",
    ),
    path("", include(router.urls)),
]
