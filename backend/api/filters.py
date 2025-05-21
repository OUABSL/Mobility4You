# api/filters.py
import django_filters
from .models.vehiculos import Vehiculo

class VehiculoFilter(django_filters.FilterSet):
    marca = django_filters.CharFilter(lookup_expr='icontains')
    modelo = django_filters.CharFilter(lookup_expr='icontains')
    combustible = django_filters.ChoiceFilter(choices=Vehiculo.COMBUSTIBLE_CHOICES)
    precio_min = django_filters.NumberFilter(field_name='precio_dia', lookup_expr='gte')
    precio_max = django_filters.NumberFilter(field_name='precio_dia', lookup_expr='lte')
    num_pasajeros_min = django_filters.NumberFilter(field_name='num_pasajeros', lookup_expr='gte')
    capacidad_maletero_min = django_filters.NumberFilter(field_name='capacidad_maletero', lookup_expr='gte')
    
    class Meta:
        model = Vehiculo
        fields = [
            'marca', 'modelo', 'combustible', 'categoria', 'grupo',
            'precio_min', 'precio_max', 'num_pasajeros_min', 'capacidad_maletero_min'
        ]