# politicas/urls.py
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'politicas-pago', views.PoliticaPagoViewSet)
router.register(r'tipos-penalizacion', views.TipoPenalizacionViewSet)
router.register(r'promociones', views.PromocionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
