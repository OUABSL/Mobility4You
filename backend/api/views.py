from rest_framework import viewsets, generics
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated
from .models import Categoria, GrupoCoche, Mantenimiento, Penalizacion, PoliticaIncluye, ReservaConductor, TarifaVehiculo, TipoPenalizacion, Usuario, Lugar, Vehiculo, ImagenVehiculo, PoliticaPago, Promocion, Reserva, Contenido
from .serializers import (
    CategoriaSerializer, GrupoCocheSerializer, MantenimientoSerializer, PenalizacionSerializer, PoliticaIncluyeSerializer, ReservaConductorSerializer, TarifaVehiculoSerializer, TipoPenalizacionSerializer, UsuarioSerializer, LugarSerializer,
    VehiculoSerializer, ImagenVehiculoSerializer, PoliticaPagoSerializer,
    PromocionSerializer, ReservaSerializer, ContenidoSerializer, RegisterUserSerializer
)


class RegisterUserView(viewsets.ModelViewSet):# crud
    """ Registrar User """
    queryset = get_user_model().objects.all()
    serializer_class = RegisterUserSerializer    
    permission_classes = []  # pública


class CategoriaViewSet(viewsets.ModelViewSet):
    # permission_classes = [IsAuthenticated]
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

class GrupoCocheViewSet(viewsets.ModelViewSet):
    queryset = GrupoCoche.objects.all()
    serializer_class = GrupoCocheSerializer

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

class LugarViewSet(viewsets.ModelViewSet):
    queryset = Lugar.objects.all()
    serializer_class = LugarSerializer

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class ImagenVehiculoViewSet(viewsets.ModelViewSet):
    queryset = ImagenVehiculo.objects.all()
    serializer_class = ImagenVehiculoSerializer

class PoliticaPagoViewSet(viewsets.ModelViewSet):
    queryset = PoliticaPago.objects.all()
    serializer_class = PoliticaPagoSerializer

class PromocionViewSet(viewsets.ModelViewSet):
    queryset = Promocion.objects.all()
    serializer_class = PromocionSerializer

class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer

class ContenidoViewSet(viewsets.ModelViewSet):
    queryset = Contenido.objects.all()
    serializer_class = ContenidoSerializer

class TarifaVehiculoViewSet(viewsets.ModelViewSet):
    queryset = TarifaVehiculo.objects.all()
    serializer_class = TarifaVehiculoSerializer
    
class ReservaConductorViewSet(viewsets.ModelViewSet):
    queryset = ReservaConductor.objects.all()
    serializer_class = ReservaConductorSerializer
    
class PenalizacionViewSet(viewsets.ModelViewSet):
    queryset = Penalizacion.objects.all()
    serializer_class = PenalizacionSerializer
    
class TipoPenalizacionViewSet(viewsets.ModelViewSet):
    queryset = TipoPenalizacion.objects.all()
    serializer_class = TipoPenalizacionSerializer

class PoliticaIncluyeViewSet(viewsets.ModelViewSet):
    queryset = PoliticaIncluye.objects.all()
    serializer_class = PoliticaIncluyeSerializer
    
class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.all()
    serializer_class = MantenimientoSerializer