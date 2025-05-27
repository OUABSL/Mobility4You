# api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.contenidos import ContenidoViewSet
from .views.vehiculos import CategoriaViewSet, GrupoCocheViewSet, VehiculoViewSet
from .views.lugares import LugarViewSet
from .views.reservas import ReservaViewSet, ExtrasViewSet
from .views.reservas_new import ReservaViewSet as ReservaViewSetNew
from .views.promociones import PromocionViewSet
from .views.politicasPago import PoliticaPagoViewSet
from .views.facturacion import ContratoViewSet, FacturaViewSet
from .views.contacto import ContactoView, ContactoDetailView
# from .views.usuarios import UsuarioViewSet  # Descomentar si implementas UsuarioViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'grupos', GrupoCocheViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'lugares', LugarViewSet)
router.register(r'reservas', ReservaViewSet, basename='reserva')
router.register(r'reservations', ReservaViewSetNew, basename='reservation')
router.register(r'contenidos', ContenidoViewSet)
router.register(r'promociones', PromocionViewSet)
router.register(r'politicas-pago', PoliticaPagoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'facturas', FacturaViewSet)
router.register(r'extras', ExtrasViewSet)
# router.register(r'usuarios', UsuarioViewSet)  # Descomentar si implementas UsuarioViewSet

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', ContactoView.as_view(), name='contact'),
    path('contact/<int:pk>/', ContactoDetailView.as_view(), name='contact-detail'),
    path('search/', VehiculoViewSet.as_view({'post': 'disponibilidad'}), name='search'),
    path('reservations/<str:reserva_id>/cancel/', ReservaViewSet.as_view({'post': 'cancelar'}), name='cancel-reserva'),
    path('reservations/create-new/', ReservaViewSet.as_view({'post': 'crear_reserva'}), name='create-reserva'),
    path('reservations/<str:reserva_id>/find/', ReservaViewSet.as_view({'post': 'buscar'}), name='find-reserva'),
    path('locations/', LugarViewSet.as_view({'get': 'list'}), name='locations'),
    path('reservations/calculate-price/', ReservaViewSet.as_view({'post': 'calcular_precio'}), name='calculate-reservation-price'),
    path('politicas-pago/<int:pk>/incluye/', PoliticaPagoViewSet.as_view({'get': 'incluye'}), name='politica-incluye'),
    path('politicas-pago/<int:pk>/penalizaciones/', PoliticaPagoViewSet.as_view({'get': 'penalizaciones'}), name='politica-penalizaciones'),
    path('locations/destinations/', LugarViewSet.as_view({'get': 'destinos'}), name='locations-destinations'),
]