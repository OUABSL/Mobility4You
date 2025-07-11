# lugares/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DireccionViewSet, LugarViewSet

app_name = "lugares"

router = DefaultRouter()
router.register(r"direcciones", DireccionViewSet)
router.register(r"lugares", LugarViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # Endpoints adicionales específicos para lugares
    path(
        "lugares/populares/",
        LugarViewSet.as_view({"get": "populares"}),
        name="lugares-populares",
    ),
    path(
        "lugares/activos/",
        LugarViewSet.as_view({"get": "activos"}),
        name="lugares-activos",
    ),
    path(
        "lugares/destinos/",
        LugarViewSet.as_view({"get": "destinos"}),
        name="lugares-destinos",
    ),
    # URLs de compatibilidad migradas desde api/urls.py
    path("locations/", LugarViewSet.as_view({"get": "list"}), name="locations"),
    path(
        "locations/destinations/",
        LugarViewSet.as_view({"get": "destinos"}),
        name="locations-destinations",
    ),
]
