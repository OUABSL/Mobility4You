
from django.urls import path, include
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from ..views import (
CategoriaViewSet, GrupoCocheViewSet, MantenimientoViewSet, PenalizacionViewSet, PoliticaIncluyeViewSet, RegisterUserView, ReservaConductorViewSet, TarifaVehiculoViewSet, TipoPenalizacionViewSet, UsuarioViewSet, LugarViewSet, VehiculoViewSet,
    ImagenVehiculoViewSet, PoliticaPagoViewSet, PromocionViewSet, ReservaViewSet, ContenidoViewSet
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'grupos', GrupoCocheViewSet)
router.register(r'usuarios', UsuarioViewSet)
router.register(r'lugares', LugarViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'imagenes', ImagenVehiculoViewSet)
router.register(r'politicas', PoliticaPagoViewSet)
router.register(r'promociones', PromocionViewSet)
router.register(r'reservas', ReservaViewSet)
router.register(r'contenidos', ContenidoViewSet)
router.register(r'registrar', RegisterUserView)
router.register(r'tarifas-vehiculos', TarifaVehiculoViewSet)
router.register(r'reservas-conductor', ReservaConductorViewSet)
router.register(r'penalizaciones', PenalizacionViewSet)
router.register(r'tipos-penalizacion', TipoPenalizacionViewSet)
router.register(r'politicas-incluye', PoliticaIncluyeViewSet)
router.register(r'mantenimientos', MantenimientoViewSet)


urlpatterns = [
    path('', include(router.urls)),
    path('admin/', admin.site.urls),
    path("rest-auth/", include("rest_framework.urls")),
    path('api/payments/', include('payments.urls')),
]
