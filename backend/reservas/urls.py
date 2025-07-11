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
    # URLs específicas para acciones personalizadas
    path(
        "reservas/<int:pk>/cancel/",
        ReservaViewSet.as_view({"post": "cancel"}),
        name="cancel-reserva",
    ),
    path(
        "reservas/<int:pk>/cancelar/",
        ReservaViewSet.as_view({"post": "cancelar"}),
        name="cancelar-reserva",
    ),
    path(
        "reservas/<int:pk>/confirm/",
        ReservaViewSet.as_view({"post": "confirmar"}),
        name="confirm-reserva",
    ),
    path(
        "reservas/<int:pk>/summary/",
        ReservaViewSet.as_view({"get": "resumen"}),
        name="summary-reserva",
    ),
    path(
        "reservas/<str:pk>/find/",
        ReservaViewSet.as_view({"post": "buscar"}),
        name="find-reserva",
    ),
    path(
        "reservas/calcular-precio/",
        ReservaViewSet.as_view({"post": "calcular_precio"}),
        name="calcular-precio-reserva",
    ),
    path(
        "reservas/calculate-price/",
        ReservaViewSet.as_view({"post": "calcular_precio"}),
        name="calculate-reservation-price",
    ),
    path(
        "reservas/<int:pk>/calcular-precio-edicion/",
        ReservaViewSet.as_view({"post": "calcular_precio_edicion"}),
        name="calcular-precio-edicion",
    ),
    path(
        "reservas/create-new/",
        ReservaViewSet.as_view({"post": "crear_reserva"}),
        name="create-reserva-legacy",
    ),
]
