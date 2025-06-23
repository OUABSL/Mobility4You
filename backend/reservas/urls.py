# reservas/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExtrasViewSet, ReservaViewSet

app_name = "reservas"

router = DefaultRouter()
router.register(r"reservas", ReservaViewSet)
router.register(r"extras", ExtrasViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # URLs específicas migradas desde api/urls.py
    path(
        "reservas/<str:reserva_id>/cancel/",
        ReservaViewSet.as_view({"post": "cancelar"}),
        name="cancel-reserva",
    ),
    path(
        "reservas/create-new/",
        ReservaViewSet.as_view({"post": "crear_reserva"}),
        name="create-reserva",
    ),
    path(
        "reservas/<str:reserva_id>/find/",
        ReservaViewSet.as_view({"post": "buscar"}),
        name="find-reserva",
    ),
    path(
        "reservas/calculate-price/",
        ReservaViewSet.as_view({"post": "calcular_precio"}),
        name="calculate-reservation-price",
    ),
]
