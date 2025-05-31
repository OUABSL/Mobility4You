# api/services/reservas.py
import logging
from decimal import Decimal, InvalidOperation
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from ..models.reservas import Reserva, ReservaExtra, ReservaConductor, Penalizacion, Extras
from ..models.vehiculos import Vehiculo
from ..models.usuarios import Usuario
from ..models.lugares import Lugar
from ..models.promociones import Promocion
from ..models.politicasPago import PoliticaPago

logger = logging.getLogger(__name__)

class ReservaService:
    """
    Servicio centralizado para manejar todas las operaciones de reservas
    Implementa logging completo, validación robusta y manejo de errores
    """
    
    
    @staticmethod
    def validar_datos_reserva(datos):
        """
        Valida los datos de entrada para una reserva
        
        Args:
            datos: Dict con datos de la reserva
            
        Returns:
            dict: Datos validados y normalizados
            
        Raises:
            ValidationError: Si los datos no son válidos
        """
        logger.info("Iniciando validación de datos de reserva")
        
        errores = {}
        
        # Mapear campos del frontend al backend
        # El frontend envía pickupDate/dropoffDate, mapear a fecha_recogida/fecha_devolucion
        if 'fechas' in datos:
            fechas_data = datos['fechas']
            if 'pickupDate' in fechas_data:
                datos['fecha_recogida'] = fechas_data['pickupDate']
            if 'dropoffDate' in fechas_data:
                datos['fecha_devolucion'] = fechas_data['dropoffDate']
            if 'pickupLocation' in fechas_data and fechas_data['pickupLocation'].get('id'):
                datos['lugar_recogida_id'] = fechas_data['pickupLocation']['id']
            if 'dropoffLocation' in fechas_data and fechas_data['dropoffLocation'].get('id'):
                datos['lugar_devolucion_id'] = fechas_data['dropoffLocation']['id']
        
        # Si el frontend envía el coche en 'car'
        if 'car' in datos and datos['car'].get('id'):
            datos['vehiculo_id'] = datos['car']['id']
        
        # Validar campos obligatorios SIN asignar valores por defecto
        campos_obligatorios = [
            'vehiculo_id', 'fecha_recogida', 'fecha_devolucion',
            'lugar_recogida_id', 'lugar_devolucion_id', 'politica_pago_id'
        ]
        
        for campo in campos_obligatorios:
            if not datos.get(campo):
                errores[campo] = f"El campo {campo} es obligatorio"
        
        # Validar fechas
        try:
            fecha_recogida = datos.get('fecha_recogida')
            fecha_devolucion = datos.get('fecha_devolucion')
        
            logger.info(f"Recibidas fechas de reserva: - RCG - DEV: || {fecha_recogida} || {fecha_devolucion}")
            
            if fecha_recogida and fecha_devolucion:
                if isinstance(fecha_recogida, str):
                    fecha_recogida = timezone.datetime.fromisoformat(fecha_recogida.replace('Z', '+00:00'))
                if isinstance(fecha_devolucion, str):
                    fecha_devolucion = timezone.datetime.fromisoformat(fecha_devolucion.replace('Z', '+00:00'))
                
                logger.info(f"Las fechas recibidas y formateadas son - RCG - DEV: || {fecha_recogida} || {fecha_devolucion}")
                
                # ANTES: if fecha_recogida <= fecha_devolucion: (ESTO ESTABA MAL)
                # AHORA: La fecha de recogida debe ser ANTES que la de devolución
                if fecha_recogida >= fecha_devolucion:
                    errores['fechas'] = "La fecha de devolución debe ser posterior a la de recogida"
                
                # Validación flexible para "fecha futura"
                # Permitir hasta 1 hora de margen para procesar la reserva
                now = timezone.now()
                margen_horas = timezone.timedelta(hours=1)
                limite_minimo = now - margen_horas
                
                if fecha_recogida <= limite_minimo:
                    errores['fecha_recogida'] = f"La fecha de recogida debe ser futura (con al menos 1 hora de margen)"
                    logger.warning(f"Fecha recogida muy en el pasado: {fecha_recogida} vs límite: {limite_minimo}")
                
                # Validar que la recogida no sea demasiado en el futuro (ej: máximo 2 años)
                limite_maximo = now + timezone.timedelta(days=730)  # 2 años
                if fecha_recogida > limite_maximo:
                    errores['fecha_recogida'] = "La fecha de recogida no puede ser más de 2 años en el futuro"
                
                datos['fecha_recogida'] = fecha_recogida
                datos['fecha_devolucion'] = fecha_devolucion
                
        except (ValueError, TypeError) as e:
            logger.error(f"Error parseando fechas: {str(e)}")
            errores['fechas'] = f"Formato de fecha inválido: {str(e)}"
        
        # Validar IDs de entidades relacionadas SIN asignar valores por defecto
        try:
            if datos.get('vehiculo_id'):
                if not Vehiculo.objects.filter(id=datos['vehiculo_id'], disponible=True).exists():
                    errores['vehiculo_id'] = "Vehículo no encontrado o no disponible"
                    
            if datos.get('lugar_recogida_id'):
                if not Lugar.objects.filter(id=datos['lugar_recogida_id']).exists():
                    errores['lugar_recogida_id'] = "Lugar de recogida no encontrado"
                    
            if datos.get('lugar_devolucion_id'):
                if not Lugar.objects.filter(id=datos['lugar_devolucion_id']).exists():
                    errores['lugar_devolucion_id'] = "Lugar de devolución no encontrado"
            
            # POLÍTICA DE PAGO: DEBE SER OBLIGARTORIA
            if datos.get('politica_pago_id'):
                if not PoliticaPago.objects.filter(id=datos['politica_pago_id']).exists():
                    errores['politica_pago_id'] = "Política de pago no encontrada"
            # Si no se proporciona politica_pago_id, ya se marca como error en campos_obligatorios
                    
            if datos.get('promocion_id'):
                promocion = Promocion.objects.filter(
                    id=datos['promocion_id'], 
                    activo=True,
                    fecha_inicio__lte=timezone.now().date(),
                    fecha_fin__gte=timezone.now().date()
                ).first()
                if not promocion:
                    errores['promocion_id'] = "Promoción no válida o expirada"
                    
        except Exception as e:
            logger.error(f"Error validando entidades relacionadas: {str(e)}")
            errores['database'] = "Error validando datos en base de datos"
        
        # Validar extras con mapeo correcto
        if datos.get('extras') or datos.get('extrasSeleccionados'):
            # El frontend puede enviar en 'extras' o 'extrasSeleccionados'
            extras_data = datos.get('extrasSeleccionados') or datos.get('extras', [])
            extras_ids = []
            
            # Los extras pueden venir como objetos completos con 'id' o como IDs simples
            for extra in extras_data:
                if isinstance(extra, dict) and 'id' in extra:
                    extras_ids.append(extra['id'])
                elif isinstance(extra, dict) and 'extra_id' in extra:
                    extras_ids.append(extra['extra_id'])
                elif isinstance(extra, (int, str)):
                    extras_ids.append(int(extra))
            
            if extras_ids:
                extras_validos = Extras.objects.filter(id__in=extras_ids).count()
                if extras_validos != len(extras_ids):
                    errores['extras'] = "Algunos extras seleccionados no son válidos"
                else:
                    # Convertir a formato esperado por el backend
                    datos['extras'] = [{'extra_id': extra_id, 'cantidad': 1} for extra_id in extras_ids]
        
        if errores:
            logger.warning(f"Errores de validación encontrados: {errores}")
            raise ValidationError(errores)
        
        # Normalizar método de pago
        metodo_pago = datos.get('metodo_pago', 'tarjeta').lower()
        if metodo_pago not in ['tarjeta', 'efectivo', 'paypal']:
            metodo_pago = 'tarjeta'
        datos['metodo_pago'] = metodo_pago
        
        logger.info("Validación de datos completada exitosamente")
        logger.info(f"Datos validados finales: vehiculo_id={datos.get('vehiculo_id')}, fechas={datos.get('fecha_recogida')} - {datos.get('fecha_devolucion')}, politica_pago_id={datos.get('politica_pago_id')}")
        
        return datos
    @staticmethod
    def calcular_precio_reserva(datos_reserva):
        """
        Calcula el precio de una reserva SIN crearla
        
        Args:
            datos_reserva: Dict con datos de la reserva
            
        Returns:
            dict: Desglose completo de precios
        """
        logger.info(f"Calculando precio para reserva con vehículo {datos_reserva.get('vehiculo_id')}")
        
        try:
            # Validar datos primero
            datos_validados = ReservaService.validar_datos_reserva(datos_reserva)
            
            # Obtener vehículo
            vehiculo = Vehiculo.objects.get(id=datos_validados['vehiculo_id'])
            
            # Calcular días de alquiler
            dias = (datos_validados['fecha_devolucion'] - datos_validados['fecha_recogida']).days
            if dias <= 0:
                raise ValidationError("El período de alquiler debe ser de al menos 1 día")
            
            # Precio base del vehículo
            precio_base = vehiculo.precio_dia * dias
            
            # Calcular extras
            precio_extras = Decimal('0.00')
            extras_detalle = []
            
            if datos_validados.get('extras'):
                for extra_data in datos_validados['extras']:
                    try:
                        extra = Extras.objects.get(id=extra_data['extra_id'])
                        cantidad = int(extra_data.get('cantidad', 1))
                        precio_extra = extra.precio * cantidad * dias
                        precio_extras += precio_extra
                        
                        extras_detalle.append({
                            'id': extra.id,
                            'nombre': extra.nombre,
                            'cantidad': cantidad,
                            'precio_unitario': float(extra.precio),
                            'precio_total': float(precio_extra)
                        })
                    except (Extras.DoesNotExist, ValueError) as e:
                        logger.warning(f"Extra inválido ignorado: {e}")
                        continue
            
            # Aplicar promoción si existe
            descuento = Decimal('0.00')
            promocion_detalle = None
            
            if datos_validados.get('promocion_id'):
                try:
                    promocion = Promocion.objects.get(id=datos_validados['promocion_id'])
                    if promocion.tipo_descuento == 'porcentaje':
                        descuento = (precio_base + precio_extras) * (promocion.descuento_pct / 100)
                    elif promocion.tipo_descuento == 'fijo':
                        descuento = promocion.descuento_fijo
                        
                    promocion_detalle = {
                        'id': promocion.id,
                        'nombre': promocion.nombre,
                        'tipo': promocion.tipo_descuento,
                        'valor': float(promocion.descuento_pct if promocion.tipo_descuento == 'porcentaje' else promocion.descuento_fijo),
                        'descuento_aplicado': float(descuento)
                    }
                except Promocion.DoesNotExist:
                    logger.warning(f"Promoción {datos_validados['promocion_id']} no encontrada")
            
            # Calcular subtotal después de descuento
            subtotal = precio_base + precio_extras - descuento
            
            # Calcular impuestos (IVA 21%)
            iva = subtotal * Decimal('0.21')
            
            # Total final
            total = subtotal + iva
            
            resultado = {
                'vehiculo_id': datos_validados['vehiculo_id'],
                'dias_alquiler': dias,
                'precio_dia': float(vehiculo.precio_dia),
                'precio_base': float(precio_base),
                'precio_extras': float(precio_extras),
                'extras_detalle': extras_detalle,
                'descuento': float(descuento),
                'promocion': promocion_detalle,
                'subtotal': float(subtotal),
                'iva': float(iva),
                'iva_porcentaje': 21.0,
                'total': float(total),
                'currency': 'EUR'
            }
            
            logger.info(f"Precio calculado exitosamente: {total}€ para {dias} días")
            return resultado
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error calculando precio de reserva: {str(e)}")
            raise Exception(f"Error en el cálculo de precios: {str(e)}")

    @staticmethod
    @transaction.atomic
    def crear_reserva_completa(datos_reserva, usuario):
        """
        Crea una reserva completa con todos sus componentes
        SOLO se llama en el paso de PAGO
        
        Args:
            datos_reserva: Dict con todos los datos validados
            usuario: Usuario que hace la reserva
            
        Returns:
            Reserva: Objeto de reserva creado
        """
        logger.info(f"Creando reserva para usuario {usuario.id}")
        
        try:
            # Validar datos
            datos_validados = ReservaService.validar_datos_reserva(datos_reserva)
            
            # Verificar disponibilidad del vehículo una vez más
            vehiculo = Vehiculo.objects.select_for_update().get(id=datos_validados['vehiculo_id'])
            
            if not ReservaService.verificar_disponibilidad_vehiculo(
                vehiculo.id,
                datos_validados['fecha_recogida'],
                datos_validados['fecha_devolucion']
            ):
                raise ValidationError("El vehículo ya no está disponible para esas fechas")
            
            # Calcular precios actualizados
            calculo_precios = ReservaService.calcular_precio_reserva(datos_validados)
            
            # Crear la reserva
            reserva = Reserva.objects.create(
                usuario=usuario,
                vehiculo=vehiculo,
                lugar_recogida_id=datos_validados['lugar_recogida_id'],
                lugar_devolucion_id=datos_validados['lugar_devolucion_id'],
                fecha_recogida=datos_validados['fecha_recogida'],
                fecha_devolucion=datos_validados['fecha_devolucion'],
                politica_pago_id=datos_validados['politica_pago_id'],
                promocion_id=datos_validados.get('promocion_id'),
                precio_dia=Decimal(str(calculo_precios['precio_dia'])),
                precio_impuestos=Decimal(str(calculo_precios['iva'])),
                precio_total=Decimal(str(calculo_precios['total'])),
                metodo_pago=datos_validados['metodo_pago'],
                estado='pendiente'
            )
            
            # Configurar importes según método de pago
            ReservaService.configurar_importes_pago(reserva, datos_validados['metodo_pago'])
            
            # Crear extras
            if datos_validados.get('extras'):
                ReservaService.crear_extras_reserva(reserva, datos_validados['extras'])
            
            # Crear conductores
            if datos_validados.get('conductores'):
                ReservaService.crear_conductores_reserva(reserva, datos_validados['conductores'])
            
            logger.info(f"Reserva {reserva.id} creada exitosamente")
            return reserva
            
        except Exception as e:
            logger.error(f"Error creando reserva: {str(e)}")
            raise

    @staticmethod
    def configurar_importes_pago(reserva, metodo_pago):
        """Configura los importes pagados/pendientes según el método de pago"""
        total = reserva.precio_total
        
        if metodo_pago in ['tarjeta', 'paypal']:
            # Pago completo por adelantado
            reserva.importe_pagado_inicial = total
            reserva.importe_pendiente_inicial = Decimal('0.00')
            reserva.estado = 'confirmada'
        else:  # efectivo
            # Pago en destino
            reserva.importe_pagado_inicial = Decimal('0.00')
            reserva.importe_pendiente_inicial = total
            reserva.estado = 'pendiente'
        
        reserva.importe_pagado_extra = Decimal('0.00')
        reserva.importe_pendiente_extra = Decimal('0.00')
        reserva.save()

    @staticmethod
    def crear_extras_reserva(reserva, extras_data):
        """Crea los extras asociados a una reserva"""
        for extra_data in extras_data:
            try:
                ReservaExtra.objects.create(
                    reserva=reserva,
                    extra_id=extra_data['extra_id'],
                    cantidad=extra_data.get('cantidad', 1)
                )
            except Exception as e:
                logger.warning(f"Error creando extra {extra_data}: {e}")
                
    @staticmethod
    def crear_conductores_reserva(reserva, conductores_data):
        """Crea los conductores asociados a una reserva"""
        for conductor_data in conductores_data:
            try:
                ReservaConductor.objects.create(
                    reserva=reserva,
                    conductor_id=conductor_data['conductor_id'],
                    rol=conductor_data.get('rol', 'principal')
                )
            except Exception as e:
                logger.warning(f"Error creando conductor {conductor_data}: {e}")

    @staticmethod
    def verificar_disponibilidad_vehiculo(vehiculo_id, fecha_inicio, fecha_fin):
        """
        Verifica si un vehículo está disponible en un rango de fechas
        
        Args:
            vehiculo_id: ID del vehículo
            fecha_inicio: Fecha de inicio
            fecha_fin: Fecha de fin
            
        Returns:
            bool: True si está disponible
        """
        reservas_conflicto = Reserva.objects.filter(
                    vehiculo_id=vehiculo_id,
            estado__in=['confirmada', 'pendiente'],
            fecha_recogida__lt=fecha_fin,
            fecha_devolucion__gt=fecha_inicio
        ).count()
        
        return reservas_conflicto == 0
    
    @staticmethod
    def buscar_reserva_por_datos(reserva_id, email):
        """
        Busca una reserva por ID y email del usuario
        
        Args:
            reserva_id: ID de la reserva
            email: Email del usuario
            
        Returns:
            Reserva: Objeto de reserva encontrado
            
        Raises:
            Reserva.DoesNotExist: Si no se encuentra la reserva
        """
        logger.info(f"Buscando reserva {reserva_id} con email {email}")
        
        try:
            reserva = Reserva.objects.select_related(
                'vehiculo', 'lugar_recogida', 'lugar_devolucion', 
                'politica_pago', 'promocion', 'usuario'
            ).prefetch_related(
                'extras__extra', 'conductores__conductor'
            ).get(
                id=reserva_id,
                usuario__email=email
            )
            
            logger.info(f"Reserva {reserva_id} encontrada exitosamente")
            return reserva
            
        except Reserva.DoesNotExist:
            logger.warning(f"Reserva {reserva_id} no encontrada para email {email}")
            raise

    @staticmethod
    @transaction.atomic
    def cancelar_reserva(reserva):
        """
        Cancela una reserva y aplica penalizaciones si corresponde
        
        Args:
            reserva: Objeto Reserva
            
        Returns:
            Reserva actualizada
            
        Raises:
            ValueError: Si no se puede cancelar la reserva
        """
        logger.info(f"Iniciando cancelación de reserva {reserva.id}")
        
        # Verificar si se puede cancelar
        puede, motivo = ReservaService.puede_cancelar_reserva(reserva)
        if not puede:
            logger.warning(f"No se puede cancelar reserva {reserva.id}: {motivo}")
            raise ValueError(motivo)
        
        # Calcular horas hasta recogida para penalizaciones
        horas_hasta_recogida = ReservaService.calcular_horas_hasta_recogida(reserva)
        
        # Buscar política de penalización aplicable
        penalizaciones = reserva.politica_pago.penalizaciones.filter(
            tipo_penalizacion__nombre='cancelación',
            horas_previas__gte=horas_hasta_recogida
        ).order_by('horas_previas').first()
        
        # Aplicar penalización si corresponde
        if penalizaciones:
            tipo_penalizacion = penalizaciones.tipo_penalizacion
            
            # Calcular importe según tipo
            if tipo_penalizacion.tipo_tarifa == 'porcentaje':
                importe = (reserva.precio_total * tipo_penalizacion.valor_tarifa) / 100
            elif tipo_penalizacion.tipo_tarifa == 'fijo':
                importe = tipo_penalizacion.valor_tarifa
            elif tipo_penalizacion.tipo_tarifa == 'importe_dia':
                dias = (reserva.fecha_devolucion - reserva.fecha_recogida).days
                importe = tipo_penalizacion.valor_tarifa * dias
            else:
                importe = Decimal('0.00')
            
            # Crear registro de penalización
            Penalizacion.objects.create(
                reserva=reserva,
                tipo_penalizacion=tipo_penalizacion,
                importe=importe,
                fecha=timezone.now(),
                descripcion=f"Cancelación con {horas_hasta_recogida:.1f} horas de antelación"
            )
            
            logger.info(f"Penalización aplicada: {importe}€")
        
        # Cambiar estado a cancelada
        reserva.estado = 'cancelada'
        reserva.save()
        
        logger.info(f"Reserva {reserva.id} cancelada exitosamente")
        return reserva
    
    @staticmethod
    def puede_cancelar_reserva(reserva):
        """
        Verifica si una reserva puede ser cancelada
        
        Args:
            reserva: Objeto Reserva
            
        Returns:
            (bool, str): Puede cancelarse y motivo
        """
        # No se puede cancelar si ya está cancelada
        if reserva.estado == 'cancelada':
            return False, "La reserva ya está cancelada"
        
        # Verificar si la recogida ya pasó
        if timezone.now() > reserva.fecha_recogida:
            return False, "No se puede cancelar una reserva cuya fecha de recogida ya pasó"
        
        # Se puede cancelar
        return True, ""
    
    @staticmethod
    def calcular_horas_hasta_recogida(reserva):
        """
        Calcula las horas que faltan hasta la recogida
        
        Args:
            reserva: Objeto Reserva
            
        Returns:
            float: Horas hasta recogida
        """
        ahora = timezone.now()
        delta = reserva.fecha_recogida - ahora
        return delta.total_seconds() / 3600

@transaction.atomic
def crear_reserva(datos_reserva):
    """DEPRECATED: Usar ReservaService.crear_reserva_completa"""
    logger.warning("Usando función crear_reserva deprecated")
    # Extraer datos principales
    vehiculo_id = datos_reserva.get('vehiculo_id')
    lugar_recogida_id = datos_reserva.get('lugar_recogida_id')
    lugar_devolucion_id = datos_reserva.get('lugar_devolucion_id')
    fecha_recogida = datos_reserva.get('fecha_recogida')
    fecha_devolucion = datos_reserva.get('fecha_devolucion')
    politica_pago_id = datos_reserva.get('politica_pago_id')
    promocion_id = datos_reserva.get('promocion_id')
    metodo_pago = datos_reserva.get('metodo_pago', 'tarjeta')
    usuario = datos_reserva.get('usuario')
    
    # Validar disponibilidad
    vehiculo = Vehiculo.objects.get(id=vehiculo_id)
    if not vehiculo.disponibilidad(fecha_recogida, fecha_devolucion):
        raise ValueError("El vehículo no está disponible en esas fechas")
    
    # Calcular precio actual
    from .vehiculos import calcular_precio_alquiler
    precios = calcular_precio_alquiler(
        vehiculo_id, 
        fecha_recogida, 
        fecha_devolucion,
        datos_reserva.get('extras', []),
        promocion_id
    )
    
    # Crear reserva
    reserva = Reserva(
        usuario=usuario,
        vehiculo_id=vehiculo_id,
        lugar_recogida_id=lugar_recogida_id,
        lugar_devolucion_id=lugar_devolucion_id,
        fecha_recogida=fecha_recogida,
        fecha_devolucion=fecha_devolucion,
        politica_pago_id=politica_pago_id,
        promocion_id=promocion_id,
        precio_dia=precios['precio_dia'],
        precio_base=precios['precio_base'],
        precio_extras=precios['precio_extras'],
        precio_impuestos=precios['impuestos'],
        descuento_promocion=precios['descuento'],
        precio_total=precios['total'],
        metodo_pago=metodo_pago,
        estado='pendiente'
    )
    
    # Configurar importes según método de pago
    if metodo_pago in ['tarjeta', 'paypal']:
        reserva.importe_pagado_inicial = Decimal(str(precios['total']))
        reserva.importe_pendiente_inicial = Decimal('0.00')
    else:  # efectivo
        reserva.importe_pagado_inicial = Decimal('0.00')
        reserva.importe_pendiente_inicial = Decimal(str(precios['total']))
    
    reserva.save()
    # Crear extras
    extras_data = datos_reserva.get('extras', [])
    for extra in extras_data:
        ReservaExtra.objects.create(
            reserva=reserva,
            extra_id=extra['extra_id'],
            cantidad=extra.get('cantidad', 1)
        )
    
    # Crear conductores
    conductores_data = datos_reserva.get('conductores', [])
    for conductor_data in conductores_data:
        ReservaConductor.objects.create(
            reserva=reserva,
            **conductor_data
        )
    
    return reserva

@transaction.atomic
def cancelar_reserva(reserva):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Cancela una reserva y aplica penalizaciones si corresponde
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        Reserva actualizada
    """
    from django.utils import timezone
    
    # Verificar si se puede cancelar
    puede, _ = puede_cancelar_reserva(reserva)
    if not puede:
        raise ValueError("No se puede cancelar esta reserva")
    
    # Cambiar estado
    reserva.estado = 'cancelada'
    reserva.save()
    
    # Verificar si aplica penalización
    horas_faltantes = calcular_horas_hasta_recogida(reserva)
    
    # Buscar política de penalización aplicable
    penalizaciones = reserva.politica_pago.penalizaciones.filter(
        tipo_penalizacion__nombre='cancelación',
        horas_previas__gte=horas_faltantes
    ).order_by('horas_previas').first()
    
    if penalizaciones:
        tipo_penalizacion = penalizaciones.tipo_penalizacion
        
        # Calcular importe según tipo
        if tipo_penalizacion.tipo_tarifa == 'porcentaje':
            importe = (reserva.precio_total * tipo_penalizacion.valor_tarifa) / 100
        elif tipo_penalizacion.tipo_tarifa == 'fijo':
            importe = tipo_penalizacion.valor_tarifa
        elif tipo_penalizacion.tipo_tarifa == 'importe_dia':
            importe = tipo_penalizacion.valor_tarifa * reserva.dias_alquiler()
        
        # Crear registro de penalización
        Penalizacion.objects.create(
            reserva=reserva,
            tipo_penalizacion=tipo_penalizacion,
            importe=importe,
            fecha=timezone.now(),
            descripcion=f"Cancelación con {horas_faltantes} horas de antelación"
        )
    
    # Devolver reserva actualizada
    return reserva

def puede_cancelar_reserva(reserva):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Verifica si una reserva puede ser cancelada
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        (bool, str): Puede cancelarse y motivo
    """
    # No se puede cancelar si ya está cancelada
    if reserva.estado == 'cancelada':
        return False, "La reserva ya está cancelada"
    
    # Verificar si la recogida ya pasó
    if timezone.now() > reserva.fecha_recogida:
        return False, "No se puede cancelar una reserva cuya fecha de recogida ya pasó"
    
    return True, ""

def calcular_horas_hasta_recogida(reserva):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Calcula las horas que faltan hasta la recogida
    
    Args:
        reserva: Objeto Reserva
        
    Returns:
        float: Horas hasta recogida
    """
    from django.utils import timezone
    
    ahora = timezone.now()
    delta = reserva.fecha_recogida - ahora
    
    return delta.total_seconds() / 3600

@transaction.atomic
def registrar_pago_diferencia(reserva, importe, metodo):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Registra un pago de diferencia para una reserva
    
    Args:
        reserva: Objeto Reserva
        importe: Importe pagado
        metodo: Método de pago
        
    Returns:
        Reserva actualizada
    """
    # Validar que hay importe pendiente
    importe_decimal = Decimal(str(importe))
    if reserva.importe_pendiente_extra < importe_decimal:
        raise ValueError("El importe pagado es mayor que el pendiente")
    
    # Actualizar importes
    reserva.importe_pagado_extra += importe_decimal
    reserva.importe_pendiente_extra -= importe_decimal
    
    # Guardar método de pago
    if metodo in ['tarjeta', 'paypal', 'efectivo']:
        reserva.metodo_pago_extra = metodo
    
    reserva.save()
    return reserva

@transaction.atomic
def actualizar_pago_reserva(reserva, pago):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Actualiza una reserva con los datos de un pago procesado
    
    Args:
        reserva: Objeto Reserva
        pago: Objeto PagoRedsys
        
    Returns:
        Reserva actualizada
    """
    # Verificar que el pago está completado
    if pago.estado != 'COMPLETADO':
        return reserva
    
    # Determinar si es pago inicial o extra
    if reserva.importe_pendiente_inicial > 0:
        # Es pago inicial
        reserva.importe_pagado_inicial += Decimal(str(pago.importe))
        reserva.importe_pendiente_inicial -= Decimal(str(pago.importe))
        
        # Si se ha pagado todo, confirmar reserva
        if reserva.importe_pendiente_inicial <= 0:
            reserva.estado = 'confirmada'
    else:
        # Es pago de diferencia
        reserva.importe_pagado_extra += Decimal(str(pago.importe))
        reserva.importe_pendiente_extra -= Decimal(str(pago.importe))
    
    reserva.save()
    return reserva

def calcular_diferencia_edicion(reserva_id, datos_nuevos):
    """DEPRECATED: Usar ReservaService directamente"""
    """
    Calcula la diferencia de precio al editar una reserva
    
    Args:
        reserva_id: ID de la reserva a editar
        datos_nuevos: Dict con nuevos datos
        
    Returns:
        Dict con precios originales y nuevos
    """
    try:
        # Obtener reserva actual
        reserva = Reserva.objects.get(id=reserva_id)
        
        # Obtener fechas nuevas
        fecha_recogida = datos_nuevos.get('fecha_recogida', reserva.fecha_recogida)
        fecha_devolucion = datos_nuevos.get('fecha_devolucion', reserva.fecha_devolucion)
        
        # Calcular precio nuevo
        from .vehiculos import calcular_precio_alquiler
        nuevos_precios = calcular_precio_alquiler(
            reserva.vehiculo_id,
            fecha_recogida,
            fecha_devolucion,
            datos_nuevos.get('extras', []),
            datos_nuevos.get('promocion_id', reserva.promocion_id)
        )
        
        # Calcular diferencia
        diferencia = nuevos_precios['total'] - float(reserva.precio_total)
        
        return {
            'original_price': float(reserva.precio_total),
            'new_price': nuevos_precios['total'],
            'difference': diferencia
        }
        
    except Reserva.DoesNotExist:
        raise ValueError("Reserva no encontrada")
    except Exception as e:
        raise ValueError(f"Error al calcular diferencia: {str(e)}")