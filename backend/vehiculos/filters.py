# vehiculos/filters.py
"""
Filtros para las vistas de vehículos
"""
import django_filters

from .models import Vehiculo


class VehiculoFilter(django_filters.FilterSet):
    """Filtro para vehículos con opciones de búsqueda avanzada"""

    marca = django_filters.CharFilter(lookup_expr="icontains")
    modelo = django_filters.CharFilter(lookup_expr="icontains")
    combustible = django_filters.ChoiceFilter(
        choices=[
            ("gasolina", "Gasolina"),
            ("diesel", "Diésel"),
            ("hibrido", "Híbrido"),
            ("electrico", "Eléctrico"),
        ]
    )
    precio_min = django_filters.NumberFilter(
        field_name="tarifas__precio_dia", lookup_expr="gte"
    )
    precio_max = django_filters.NumberFilter(
        field_name="tarifas__precio_dia", lookup_expr="lte"
    )
    num_puertas = django_filters.NumberFilter()
    num_pasajeros = django_filters.NumberFilter()

    class Meta:
        model = Vehiculo
        fields = [
            "marca",
            "modelo",
            "combustible",
            "categoria",
            "grupo",
            "num_puertas",
            "num_pasajeros",
        ]
