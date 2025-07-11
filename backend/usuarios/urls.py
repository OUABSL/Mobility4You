# usuarios/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UsuarioViewSet

router = DefaultRouter()
router.register(r"usuarios", UsuarioViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
