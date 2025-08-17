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
        Calcula el precio total de una reserva con IVA incluido.
        La tarifa de política se suma al precio base antes de calcular impuestos.
        """
        try:
            # Importaciones lazy para evitar problemas circulares
            from politicas.models import PoliticaPago
            from vehiculos.models import Vehiculo

            from .models import Extras

            # Mapear campos para compatibilidad
            vehiculo_id = data.get("vehiculo_id")
            fecha_recogida = data.get("fecha_recogida") or data.get("fechaRecogida")
            fecha_devolucion = data.get("fecha_devolucion") or data.get("fechaDevolucion")
            politica_pago_id = data.get("politica_pago_id") or data.get("politicaPago_id")
            extras_data = data.get("extras", [])

            logger.info(f"Calculando precio - vehiculo: {vehiculo_id}, inicio: {fecha_recogida}, fin: {fecha_devolucion}")

            # Validación de datos requeridos
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

            # Obtener vehículo
            try:
                vehiculo = Vehiculo.objects.get(id=vehiculo_id)
                precio_dia_base = vehiculo.precio_dia
                logger.info(f"Vehículo encontrado: {vehiculo.marca} {vehiculo.modelo}, precio: {precio_dia_base}")
            except Vehiculo.DoesNotExist:
                return {"success": False, "error": "Vehículo no encontrado"}

            # Calcular días de reserva
            if isinstance(fecha_recogida, str):
                fecha_recogida = datetime.fromisoformat(fecha_recogida.replace("Z", "+00:00"))
            if isinstance(fecha_devolucion, str):
                fecha_devolucion = datetime.fromisoformat(fecha_devolucion.replace("Z", "+00:00"))

            dias = (fecha_devolucion - fecha_recogida).days
            if dias < 1:
                dias = 1  # Mínimo 1 día

            logger.info(f"Días de reserva: {dias}")

            # 1. Calcular precio base del vehículo
            precio_base = precio_dia_base * dias
            
            # 2. Obtener y calcular tarifa de política de pago
            tarifa_politica = Decimal("0.00")
            if politica_pago_id:
                try:
                    politica = PoliticaPago.objects.get(id=politica_pago_id)
                    if politica.tarifa and politica.tarifa > 0:
                        tarifa_politica = politica.tarifa * dias
                        logger.info(f"Tarifa política aplicada: {politica.tarifa} x {dias} días = {tarifa_politica}")
                except PoliticaPago.DoesNotExist:
                    logger.warning(f"Política de pago {politica_pago_id} no encontrada")

            # 3. Calcular precio de extras
            precio_extras = Decimal("0.00")
            extras_detalle = []

            for extra_data in extras_data:
                try:
                    if isinstance(extra_data, dict):
                        extra_id = extra_data.get("extra_id") or extra_data.get("id")
                        cantidad = int(extra_data.get("cantidad", 1))
                    else:
                        extra_id = extra_data
                        cantidad = 1
                        
                    if not extra_id:
                        continue
                        
                    extra = Extras.objects.get(id=extra_id)
                    precio_extra = extra.precio * cantidad * dias
                    precio_extras += precio_extra

                    extras_detalle.append({
                        "id": extra.id,
                        "nombre": extra.nombre,
                        "precio_unitario": str(extra.precio),
                        "cantidad": cantidad,
                        "dias": dias,
                        "subtotal": str(precio_extra),
                    })
                    logger.info(f"Extra agregado: {extra.nombre} x{cantidad} = {precio_extra}")
                except (Extras.DoesNotExist, ValueError, TypeError) as e:
                    logger.warning(f"Error procesando extra {extra_data}: {str(e)}")
                    continue

            # 4. Calcular subtotal (base + tarifa política + extras)
            subtotal_sin_iva = precio_base + tarifa_politica + precio_extras

            # IVA siempre incluido en el precio final según las nuevas especificaciones
            # El precio final ES el subtotal (IVA ya incluido)
            precio_total_con_iva = subtotal_sin_iva

            # 5. IVA siempre incluido en el precio final
            # La tasa de IVA se usa solo para mostrar desglose, no para cálculo
            tasa_iva_referencia = Decimal("0.21")  # 21% como referencia para desglose
            
            # Para el desglose, extraer el IVA del total usando la fórmula inversa
            # Si precio_con_iva = precio_sin_iva * (1 + tasa_iva)
            # Entonces precio_sin_iva = precio_con_iva / (1 + tasa_iva)
            precio_sin_iva_calculado = precio_total_con_iva / (1 + tasa_iva_referencia)
            iva_calculado = precio_total_con_iva - precio_sin_iva_calculado

            # Redondear a 2 decimales
            precio_total_con_iva = precio_total_con_iva.quantize(Decimal('0.01'))
            precio_sin_iva_calculado = precio_sin_iva_calculado.quantize(Decimal('0.01'))
            iva_calculado = iva_calculado.quantize(Decimal('0.01'))

            logger.info(f"Precio calculado para reserva: {precio_total_con_iva} "
                    f"(base: {precio_base}, tarifa_politica: {tarifa_politica}, "
                    f"extras: {precio_extras}, IVA incluido: {iva_calculado})")

            return {
                "success": True,
                "precio_total": float(precio_total_con_iva),
                "dias_alquiler": dias,
                "desglose": {
                    "precio_base": float(precio_base),
                    "precio_extras": float(precio_extras),
                    "tarifa_politica": float(tarifa_politica),
                    "subtotal_sin_iva": float(precio_sin_iva_calculado),
                    "iva": float(iva_calculado),
                    "total_con_iva": float(precio_total_con_iva),
                    "dias": dias,
                    "tasa_iva": float(tasa_iva_referencia),
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
