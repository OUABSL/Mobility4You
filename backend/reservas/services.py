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
                - fecha_recogida: Fecha de Recogida
                - fecha_devolucion: Fecha de Devolución
                - lugar_recogida_id: ID del lugar de recogida
                - lugar_devolucion_id: ID del lugar de entrega
                - extras: Lista de extras con cantidad

        Returns:
            dict: Resultado del cálculo con precio_total y desglose
        """
        try:
            # Importaciones lazy para evitar problemas circulares
            from vehiculos.models import TarifaVehiculo, Vehiculo

            from .models import Extras

            # Mapear campos para compatibilidad
            vehiculo_id = data.get("vehiculo_id")
            fecha_recogida = data.get("fecha_recogida") or data.get("fechaRecogida")
            fecha_devolucion = data.get("fecha_devolucion") or data.get("fechaDevolucion")
            extras_data = data.get("extras", [])

            logger.info(f"Calculando precio - vehiculo: {vehiculo_id}, inicio: {fecha_recogida}, fin: {fecha_devolucion}")

            if not all([vehiculo_id, fecha_recogida, fecha_devolucion]):
                missing_fields = []
                if not vehiculo_id:
                    missing_fields.append("vehiculo_id")
                if not fecha_recogida:
                    missing_fields.append("fecha_recogida")
                if not fecha_devolucion:
                    missing_fields.append("fecha_devolucion")
                    
                return {
                    "success": False,
                    "error": f"Faltan datos requeridos: {', '.join(missing_fields)}",
                }

            # Obtener vehículo y sus tarifas
            try:
                vehiculo = Vehiculo.objects.get(id=vehiculo_id)
                # Usar el precio por día del vehículo directamente si no hay tarifas específicas
                precio_dia_base = vehiculo.precio_dia if hasattr(vehiculo, 'precio_dia') else Decimal("50.00")
                logger.info(f"Vehículo encontrado: {vehiculo.marca} {vehiculo.modelo}, precio: {precio_dia_base}")
            except Vehiculo.DoesNotExist:
                return {"success": False, "error": "Vehículo no encontrado"}

            # Calcular días de reserva
            if isinstance(fecha_recogida, str):
                fecha_recogida = datetime.fromisoformat(
                    fecha_recogida.replace("Z", "+00:00")
                )
            if isinstance(fecha_devolucion, str):
                fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace("Z", "+00:00"))

            dias = (fecha_devolucion - fecha_recogida).days
            if dias < 1:
                dias = 1  # Mínimo 1 día

            logger.info(f"Días de reserva: {dias}")

            # Calcular precio base del vehículo
            precio_base = precio_dia_base * dias

            # Calcular precio de extras
            precio_extras = Decimal("0.00")
            extras_detalle = []

            for extra_data in extras_data:
                try:
                    # Manejar diferentes formatos de extras
                    if isinstance(extra_data, dict):
                        extra_id = extra_data.get("extra_id") or extra_data.get("id")
                        cantidad = int(extra_data.get("cantidad", 1))
                    else:
                        # Si es solo el ID del extra
                        extra_id = extra_data
                        cantidad = 1
                        
                    if not extra_id:
                        continue
                        
                    extra = Extras.objects.get(id=extra_id)
                    precio_extra = extra.precio * cantidad * dias
                    precio_extras += precio_extra

                    extras_detalle.append(
                        {
                            "id": extra.id,
                            "nombre": extra.nombre,
                            "precio_unitario": str(extra.precio),
                            "cantidad": cantidad,
                            "dias": dias,
                            "subtotal": str(precio_extra),
                        }
                    )
                    logger.info(f"Extra agregado: {extra.nombre} x{cantidad} = {precio_extra}")
                except (Extras.DoesNotExist, ValueError, TypeError) as e:
                    logger.warning(f"Error procesando extra {extra_data}: {str(e)}")
                    continue

            # Calcular total
            subtotal = precio_base + precio_extras

            # Aplicar impuestos si están configurados (redondeo a 2 decimales)
            tasa_impuesto = getattr(
                settings, "TASA_IMPUESTO", Decimal("0.21")
            )  # 21% por defecto
            impuestos = (subtotal * tasa_impuesto).quantize(Decimal('0.01'))
            total_con_impuestos = (subtotal + impuestos).quantize(Decimal('0.01'))

            logger.info(f"Precio calculado para reserva: {total_con_impuestos} "
                       f"(base: {precio_base}, extras: {precio_extras}, "
                       f"subtotal: {subtotal}, impuestos: {impuestos})")

            return {
                "success": True,
                "precio_total": float(total_con_impuestos),
                "dias_alquiler": dias,
                "desglose": {
                    "precio_base": float(precio_base),
                    "precio_extras": float(precio_extras),
                    "subtotal": float(subtotal),
                    "impuestos": float(impuestos),
                    "total": float(total_con_impuestos),
                    "dias": dias,
                    "tasa_impuesto": float(tasa_impuesto),
                    "extras_detalle": extras_detalle,
                },
            }

        except Exception as e:
            logger.error(f"Error calculando precio de reserva: {str(e)}")
            return {"success": False, "error": f"Error en el cálculo: {str(e)}"}

    def validar_disponibilidad(
        self, vehiculo_id, fecha_recogida, fecha_devolucion, reserva_id=None
    ):
        """
        Valida si un vehículo está disponible en las fechas especificadas

        Args:
            vehiculo_id: ID del vehículo
            fecha_recogida: Fecha de recogida
            fecha_devolucion: Fecha de devolución
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
                fecha_recogida__lt=fecha_devolucion,
                fecha_devolucion__gt=fecha_recogida,
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
