# vehiculos/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoriaViewSet, GrupoCocheViewSet, VehiculoViewSet

app_name = "vehiculos"

router = DefaultRouter()
router.register(r"categorias", CategoriaViewSet)
router.register(r"grupos", GrupoCocheViewSet)
router.register(r"vehiculos", VehiculoViewSet, basename="vehiculo")  # Con prefijo vehiculos

urlpatterns = [
    path("", include(router.urls)),
    # URLs específicas migradas desde api/urls.py
    path("disponibilidad/", VehiculoViewSet.as_view({"get": "disponibilidad", "post": "disponibilidad"}), name="disponibilidad"),
    path("vehiculos/search/", VehiculoViewSet.as_view({"get": "disponibilidad", "post": "disponibilidad"}), name="search"),
]
