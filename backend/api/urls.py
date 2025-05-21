# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    vehiculos, lugares, reservas, 
    contenidos, contacto
)

router = DefaultRouter()
router.register(r'categorias', vehiculos.CategoriaViewSet)
router.register(r'grupos', vehiculos.GrupoCocheViewSet)
router.register(r'vehiculos', vehiculos.VehiculoViewSet)
router.register(r'lugares', lugares.LugarViewSet)
router.register(r'reservas', reservas.ReservaViewSet, basename='reserva')
router.register(r'contenidos', contenidos.ContenidoViewSet)
router.register(r'promociones', contenidos.PromocionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', contacto.ContactoView.as_view(), name='contact'),
    path('search/', vehiculos.VehiculoViewSet.as_view({'post': 'disponibilidad'}), name='search'),
    path('reservations/<str:reserva_id>/find/', reservas.ReservaViewSet.as_view({'post': 'buscar'}), name='find-reserva'),
    # Alias para compatibilidad frontend
    path('locations/', lugares.LugarViewSet.as_view({'get': 'list'}), name='locations'),  # Alias para /lugares/
    path('reservations/calculate-price/', reservas.ReservaViewSet.as_view({'post': 'calcular_precio'}), name='calculate-reservation-price'),
    path('politicas-pago/', contenidos.PoliticaPagoViewSet.as_view({'get': 'list'}), name='politicas-pago'),
    path('users/testimonials/', contenidos.TestimonioViewSet.as_view({'get': 'list'}), name='testimonials'),
    path('locations/destinations/', lugares.LugarViewSet.as_view({'get': 'destinos'}), name='locations-destinations'),
]

# payments/urls.py
from django.urls import path
from .views import (
    RedsysPrepareView, RedsysNotifyView,
    RedsysSuccessView, RedsysErrorView
)

urlpatterns = [
    path('redsys/prepare/', RedsysPrepareView.as_view(), name='redsys-prepare'),
    path('redsys/notify/', RedsysNotifyView.as_view(), name='redsys-notify'),
    path('redsys/success/', RedsysSuccessView.as_view(), name='redsys-success'),
    path('redsys/error/', RedsysErrorView.as_view(), name='redsys-error'),
]

# config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/payments/', include('payments.urls')),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)