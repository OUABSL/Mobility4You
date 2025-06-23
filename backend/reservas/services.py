# reservas/services.py
import logging
from datetime import datetime
from decimal import Decimal

from django.conf import settings

logger = logging.getLogger(__name__)


class ReservaService:
    """
    Servicio para lógica de negocio relacionada con reservas
    """

    def calcular_precio_reserva(self, data):
        """
        Calcula el precio total de una reserva

        Args:
            data (dict): Datos de la reserva incluyendo:
                - vehiculo_id: ID del vehículo
                - fecha_inicio: Fecha de inicio
                - fecha_fin: Fecha de fin
                - lugar_recogida_id: ID del lugar de recogida
                - lugar_entrega_id: ID del lugar de entrega
                - extras: Lista de extras con cantidad

        Returns:
            dict: Resultado del cálculo con precio_total y desglose
        """
        try:
            # Importaciones lazy para evitar problemas circulares
            from vehiculos.models import TarifaVehiculo, Vehiculo

            from .models import Extras

            vehiculo_id = data.get("vehiculo_id")
            fecha_inicio = data.get("fecha_inicio")
            fecha_fin = data.get("fecha_fin")
            extras_data = data.get("extras", [])

            if not all([vehiculo_id, fecha_inicio, fecha_fin]):
                return {
                    "success": False,
                    "error": "Faltan datos requeridos para el cálculo",
                }

            # Obtener vehículo y sus tarifas
            try:
                vehiculo = Vehiculo.objects.get(id=vehiculo_id)
                tarifas = TarifaVehiculo.objects.filter(vehiculo=vehiculo)
            except Vehiculo.DoesNotExist:
                return {"success": False, "error": "Vehículo no encontrado"}

            # Calcular días de reserva
            if isinstance(fecha_inicio, str):
                fecha_inicio = datetime.fromisoformat(
                    fecha_inicio.replace("Z", "+00:00")
                )
            if isinstance(fecha_fin, str):
                fecha_fin = datetime.fromisoformat(fecha_fin.replace("Z", "+00:00"))

            dias = (fecha_fin - fecha_inicio).days
            if dias < 1:
                dias = 1  # Mínimo 1 día

            # Calcular precio base del vehículo
            precio_base = Decimal("0.00")
            if tarifas.exists():
                # Usar la primera tarifa disponible (se puede mejorar con lógica más compleja)
                tarifa = tarifas.first()
                precio_base = tarifa.precio_por_dia * dias
            else:
                # Precio por defecto si no hay tarifas
                precio_base = Decimal("50.00") * dias

            # Calcular precio de extras
            precio_extras = Decimal("0.00")
            extras_detalle = []

            for extra_data in extras_data:
                try:
                    extra = Extras.objects.get(id=extra_data.get("extra_id"))
                    cantidad = int(extra_data.get("cantidad", 1))
                    precio_extra = extra.precio * cantidad * dias
                    precio_extras += precio_extra

                    extras_detalle.append(
                        {
                            "nombre": extra.nombre,
                            "precio_unitario": str(extra.precio),
                            "cantidad": cantidad,
                            "dias": dias,
                            "subtotal": str(precio_extra),
                        }
                    )
                except (Extras.DoesNotExist, ValueError):
                    continue

            # Calcular total
            precio_total = precio_base + precio_extras

            # Aplicar impuestos si están configurados
            tasa_impuesto = getattr(
                settings, "TASA_IMPUESTO", Decimal("0.21")
            )  # 21% por defecto
            impuestos = precio_total * tasa_impuesto
            total_con_impuestos = precio_total + impuestos

            logger.info(f"Precio calculado para reserva: {total_con_impuestos}")

            return {
                "success": True,
                "precio_total": float(total_con_impuestos),
                "desglose": {
                    "precio_base": float(precio_base),
                    "precio_extras": float(precio_extras),
                    "subtotal": float(precio_total),
                    "impuestos": float(impuestos),
                    "total": float(total_con_impuestos),
                    "dias": dias,
                    "extras_detalle": extras_detalle,
                },
            }

        except Exception as e:
            logger.error(f"Error calculando precio de reserva: {str(e)}")
            return {"success": False, "error": f"Error en el cálculo: {str(e)}"}

    def validar_disponibilidad(
        self, vehiculo_id, fecha_inicio, fecha_fin, reserva_id=None
    ):
        """
        Valida si un vehículo está disponible en las fechas especificadas

        Args:
            vehiculo_id: ID del vehículo
            fecha_inicio: Fecha de inicio
            fecha_fin: Fecha de fin
            reserva_id: ID de reserva a excluir (para ediciones)

        Returns:
            dict: Resultado de la validación
        """
        try:
            from vehiculos.models import Vehiculo

            from .models import Reserva

            # Verificar que el vehículo existe
            try:
                vehiculo = Vehiculo.objects.get(id=vehiculo_id)
            except Vehiculo.DoesNotExist:
                return {"disponible": False, "error": "Vehículo no encontrado"}

            # Verificar disponibilidad del vehículo
            if not vehiculo.disponible:
                return {"disponible": False, "error": "El vehículo no está disponible"}

            # Buscar reservas conflictivas
            reservas_conflictivas = Reserva.objects.filter(
                vehiculo_id=vehiculo_id, estado__in=["confirmada", "en_progreso"]
            ).filter(
                # Solapamiento de fechas
                fecha_inicio__lt=fecha_fin,
                fecha_fin__gt=fecha_inicio,
            )

            # Excluir la reserva actual si se está editando
            if reserva_id:
                reservas_conflictivas = reservas_conflictivas.exclude(id=reserva_id)

            if reservas_conflictivas.exists():
                return {
                    "disponible": False,
                    "error": "El vehículo no está disponible en las fechas seleccionadas",
                    "reservas_conflictivas": list(
                        reservas_conflictivas.values_list("id", flat=True)
                    ),
                }

            return {"disponible": True, "vehiculo": vehiculo.matricula}

        except Exception as e:
            logger.error(f"Error validando disponibilidad: {str(e)}")
            return {"disponible": False, "error": f"Error en la validación: {str(e)}"}
