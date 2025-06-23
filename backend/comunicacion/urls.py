# comunicacion/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContactoViewSet, ContenidoViewSet

app_name = "comunicacion"

router = DefaultRouter()
router.register(r"contenidos", ContenidoViewSet)
router.register(r"contacto", ContactoViewSet)

urlpatterns = [
    path("", include(router.urls)),
    # URLs específicas migradas desde api/urls.py
    path("contact/", ContactoViewSet.as_view({"post": "create", "get": "list"}), name="contact"),
    path("contact/<int:pk>/", ContactoViewSet.as_view({"get": "retrieve", "patch": "partial_update"}), name="contact-detail"),
]
