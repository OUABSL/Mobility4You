# backend/payments/services.py
import hashlib
import logging
import time
from datetime import timedelta
from decimal import Decimal

import stripe
from django.conf import settings
from django.utils import timezone

from .models import PagoStripe, ReembolsoStripe, WebhookStripe

# Configurar Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = settings.STRIPE_CONFIG.get(
    "api_version", "2023-10-16"
)  # Usar get() con fallback

logger = logging.getLogger("stripe")


class StripePaymentService:
    """
    Servicio principal para gestionar pagos con Stripe
    """

    def __init__(self):
        """Inicializa el servicio con configuraciones"""
        self.currency = settings.STRIPE_CONFIG["currency"]
        self.api_key = settings.STRIPE_SECRET_KEY
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        logger.info("StripePaymentService inicializado")

    def crear_payment_intent(
        self, reserva_data, tipo_pago="INICIAL", metadata_extra=None
    ):
        """
        Crea un Payment Intent en Stripe

        Args:
            reserva_data: Dict con datos de la reserva
            tipo_pago: Tipo de pago (INICIAL, DIFERENCIA, EXTRA, PENALIZACION)
            metadata_extra: Metadatos adicionales

        Returns:
            Dict con información del pago creado
        """
        logger.info(f"Creando Payment Intent para tipo: {tipo_pago}")

        try:
            # Extraer información básica
            importe = self._extraer_importe(reserva_data, tipo_pago)
            email_cliente = self._extraer_email_cliente(reserva_data)
            nombre_cliente = self._extraer_nombre_cliente(reserva_data)

            # Validar importe
            if not self._validar_importe(importe):
                raise ValueError(f"Importe inválido: {importe}")

            # Generar número de pedido único
            numero_pedido = self._generar_numero_pedido(reserva_data, tipo_pago)

            # Convertir importe a centavos para Stripe
            importe_centavos = int(importe * 100)

            # Preparar metadatos
            metadata = self._preparar_metadata(reserva_data, tipo_pago, metadata_extra)

            # Generar clave de idempotencia
            idempotency_key = self._generar_idempotency_key(numero_pedido)

            # Crear el Payment Intent en Stripe
            payment_intent = stripe.PaymentIntent.create(
                amount=importe_centavos,
                currency=self.currency,
                payment_method_types=settings.STRIPE_CONFIG["payment_method_types"],
                capture_method=settings.STRIPE_CONFIG["capture_method"],
                confirmation_method=settings.STRIPE_CONFIG["confirmation_method"],
                automatic_payment_methods=settings.STRIPE_CONFIG[
                    "automatic_payment_methods"
                ],
                description=self._generar_descripcion(reserva_data, tipo_pago),
                statement_descriptor=settings.STRIPE_CONFIG["statement_descriptor"],
                metadata=metadata,
                receipt_email=email_cliente,
                idempotency_key=idempotency_key,
            )

            # Crear registro en base de datos
            pago_stripe = self._crear_registro_pago(
                payment_intent=payment_intent,
                reserva_data=reserva_data,
                tipo_pago=tipo_pago,
                numero_pedido=numero_pedido,
                email_cliente=email_cliente,
                nombre_cliente=nombre_cliente,
                importe=importe,
            )

            logger.info(f"Payment Intent creado exitosamente: {payment_intent.id}")

            return {
                "success": True,
                "payment_intent_id": payment_intent.id,
                "client_secret": payment_intent.client_secret,
                "numero_pedido": numero_pedido,
                "importe": float(importe),
                "currency": self.currency,
                "pago_id": pago_stripe.id,
                "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
            }

        except stripe.error.StripeError as e:
            logger.error(f"Error de Stripe al crear Payment Intent: {str(e)}")
            return {
                "success": False,
                "error": f"Error del procesador de pagos: {str(e)}",
                "error_code": getattr(e, "code", "stripe_error"),
            }
        except Exception as e:
            logger.error(f"Error interno al crear Payment Intent: {str(e)}")
            return {
                "success": False,
                "error": "Error interno del servidor",
                "error_code": "internal_error",
            }

    def confirmar_payment_intent(self, payment_intent_id, payment_method_id=None):
        """
        Confirma un Payment Intent

        Args:
            payment_intent_id: ID del Payment Intent
            payment_method_id: ID del método de pago (opcional)

        Returns:
            Dict con resultado de la confirmación
        """
        logger.info(f"Confirmando Payment Intent: {payment_intent_id}")

        try:
            # Obtener el registro local
            pago_stripe = PagoStripe.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )

            # Parámetros para confirmación
            confirm_params = {}
            if payment_method_id:
                confirm_params["payment_method"] = payment_method_id

            # Confirmar en Stripe
            payment_intent = stripe.PaymentIntent.confirm(
                payment_intent_id, **confirm_params
            )

            # Actualizar registro local
            pago_stripe.actualizar_desde_stripe(payment_intent)

            # Procesar según el estado
            if payment_intent.status == "succeeded":
                self._procesar_pago_exitoso(pago_stripe, payment_intent)

                logger.info(f"Pago confirmado exitosamente: {payment_intent_id}")
                return {
                    "success": True,
                    "status": "succeeded",
                    "payment_intent_id": payment_intent_id,
                    "charge_id": pago_stripe.stripe_charge_id,
                    "numero_pedido": pago_stripe.numero_pedido,
                }

            elif payment_intent.status == "requires_action":
                logger.info(f"Pago requiere acción adicional: {payment_intent_id}")
                return {
                    "success": True,
                    "status": "requires_action",
                    "payment_intent_id": payment_intent_id,
                    "client_secret": payment_intent.client_secret,
                }

            else:
                logger.warning(f"Pago en estado inesperado: {payment_intent.status}")
                return {
                    "success": False,
                    "status": payment_intent.status,
                    "error": f"Pago en estado inesperado: {payment_intent.status}",
                }

        except PagoStripe.DoesNotExist:
            logger.error(
                f"No se encontró registro local para Payment Intent: {payment_intent_id}"
            )
            return {
                "success": False,
                "error": "Pago no encontrado en el sistema",
                "error_code": "payment_not_found",
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error de Stripe al confirmar pago: {str(e)}")
            return {
                "success": False,
                "error": f"Error del procesador de pagos: {str(e)}",
                "error_code": getattr(e, "code", "stripe_error"),
            }
        except Exception as e:
            logger.error(f"Error interno al confirmar pago: {str(e)}")
            return {
                "success": False,
                "error": "Error interno del servidor",
                "error_code": "internal_error",
            }

    def procesar_reembolso(
        self,
        pago_id,
        importe_reembolso=None,
        motivo="CANCELACION_CLIENTE",
        descripcion=None,
    ):
        """
        Procesa un reembolso total o parcial

        Args:
            pago_id: ID del pago a reembolsar
            importe_reembolso: Importe a reembolsar (None = reembolso total)
            motivo: Motivo del reembolso
            descripcion: Descripción adicional

        Returns:
            Dict con resultado del reembolso
        """
        logger.info(f"Procesando reembolso para pago: {pago_id}")

        try:
            # Obtener el pago
            pago_stripe = PagoStripe.objects.get(id=pago_id)

            # Validar que se puede reembolsar
            if not pago_stripe.puede_reembolsar:
                return {
                    "success": False,
                    "error": "El pago no puede ser reembolsado",
                    "error_code": "cannot_refund",
                }

            # Determinar importe del reembolso
            if importe_reembolso is None:
                importe_reembolso = pago_stripe.importe_disponible_reembolso
            else:
                importe_reembolso = Decimal(str(importe_reembolso))
                if importe_reembolso > pago_stripe.importe_disponible_reembolso:
                    return {
                        "success": False,
                        "error": "Importe de reembolso mayor al disponible",
                        "error_code": "invalid_refund_amount",
                    }

            # Convertir a centavos
            importe_centavos = int(importe_reembolso * 100)

            # Preparar parámetros del reembolso
            refund_params = {
                "charge": pago_stripe.stripe_charge_id,
                "amount": importe_centavos,
                "reason": settings.STRIPE_REFUND_CONFIG["reason_mapping"].get(
                    motivo, "requested_by_customer"
                ),
                "metadata": {
                    "pago_id": str(pago_id),
                    "motivo_interno": motivo,
                    "reserva_id": (
                        str(pago_stripe.reserva.id) if pago_stripe.reserva else ""
                    ),
                },
            }

            if descripcion:
                refund_params["metadata"]["descripcion"] = descripcion[
                    :500
                ]  # Límite de Stripe

            # Crear reembolso en Stripe
            refund = stripe.Refund.create(**refund_params)

            # Crear registro de reembolso
            reembolso_stripe = ReembolsoStripe.objects.create(
                pago_stripe=pago_stripe,
                stripe_refund_id=refund.id,
                importe=importe_reembolso,
                motivo=motivo,
                descripcion=descripcion,
                stripe_status=refund.status,
            )

            # Actualizar pago principal
            pago_stripe.importe_reembolsado += importe_reembolso
            if pago_stripe.importe_reembolsado >= pago_stripe.importe:
                pago_stripe.estado = "REEMBOLSADO"
            else:
                pago_stripe.estado = "REEMBOLSO_PARCIAL"
            pago_stripe.save()

            logger.info(f"Reembolso procesado exitosamente: {refund.id}")

            return {
                "success": True,
                "refund_id": refund.id,
                "importe_reembolsado": float(importe_reembolso),
                "estado_reembolso": refund.status,
                "reembolso_local_id": reembolso_stripe.id,
            }

        except PagoStripe.DoesNotExist:
            logger.error(f"Pago no encontrado: {pago_id}")
            return {
                "success": False,
                "error": "Pago no encontrado",
                "error_code": "payment_not_found",
            }
        except stripe.error.StripeError as e:
            logger.error(f"Error de Stripe al procesar reembolso: {str(e)}")
            return {
                "success": False,
                "error": f"Error del procesador de pagos: {str(e)}",
                "error_code": getattr(e, "code", "stripe_error"),
            }
        except Exception as e:
            logger.error(f"Error interno al procesar reembolso: {str(e)}")
            return {
                "success": False,
                "error": "Error interno del servidor",
                "error_code": "internal_error",
            }

    def obtener_estado_pago(self, numero_pedido):
        """
        Obtiene el estado actual de un pago

        Args:
            numero_pedido: Número de pedido del pago

        Returns:
            Dict con información del estado del pago
        """
        try:
            pago_stripe = PagoStripe.objects.get(numero_pedido=numero_pedido)

            # Sincronizar con Stripe si está pendiente
            if pago_stripe.estado in ["PENDIENTE", "PROCESANDO"]:
                self._sincronizar_pago_con_stripe(pago_stripe)

            return {
                "success": True,
                "estado": pago_stripe.estado,
                "importe": float(pago_stripe.importe),
                "fecha_creacion": pago_stripe.fecha_creacion.isoformat(),
                "fecha_confirmacion": (
                    pago_stripe.fecha_confirmacion.isoformat()
                    if pago_stripe.fecha_confirmacion
                    else None
                ),
                "metodo_pago": pago_stripe.metodo_pago,
                "ultimos_4_digitos": pago_stripe.ultimos_4_digitos,
                "marca_tarjeta": pago_stripe.marca_tarjeta,
                "puede_reembolsar": pago_stripe.puede_reembolsar,
                "importe_reembolsado": float(pago_stripe.importe_reembolsado),
                "payment_intent_id": pago_stripe.stripe_payment_intent_id,
            }

        except PagoStripe.DoesNotExist:
            return {
                "success": False,
                "error": "Pago no encontrado",
                "error_code": "payment_not_found",
            }
        except Exception as e:
            logger.error(f"Error al obtener estado del pago: {str(e)}")
            return {
                "success": False,
                "error": "Error interno del servidor",
                "error_code": "internal_error",
            }

    # Métodos privados auxiliares

    def _extraer_importe(self, reserva_data, tipo_pago):
        """Extrae el importe según el tipo de pago"""
        if tipo_pago == "INICIAL":
            return Decimal(str(reserva_data.get("precio_total", 0)))
        elif tipo_pago == "DIFERENCIA":
            return Decimal(str(reserva_data.get("diferencia", 0)))
        elif tipo_pago == "EXTRA":
            return Decimal(str(reserva_data.get("importe_extra", 0)))
        elif tipo_pago == "PENALIZACION":
            return Decimal(str(reserva_data.get("importe_penalizacion", 0)))
        else:
            return Decimal("0")

    def _extraer_email_cliente(self, reserva_data):
        """Extrae el email del cliente"""
        return (
            reserva_data.get("conductor", {}).get("email")
            or reserva_data.get("conductorPrincipal", {}).get("email")
            or reserva_data.get("email")
            or ""
        )

    def _extraer_nombre_cliente(self, reserva_data):
        """Extrae el nombre completo del cliente"""
        conductor = reserva_data.get("conductor", {}) or reserva_data.get(
            "conductorPrincipal", {}
        )
        nombre = conductor.get("nombre", "")
        apellidos = conductor.get("apellidos", "") or conductor.get("apellido", "")
        return f"{nombre} {apellidos}".strip()

    def _validar_importe(self, importe):
        """Valida que el importe esté dentro de los límites de Stripe"""
        importe_centavos = int(importe * 100)
        min_amount = settings.STRIPE_MIN_AMOUNT.get(self.currency, 50)
        max_amount = settings.STRIPE_MAX_AMOUNT.get(self.currency, 99999999)
        return min_amount <= importe_centavos <= max_amount

    def _generar_numero_pedido(self, reserva_data, tipo_pago):
        """Genera un número de pedido único"""
        timestamp = int(time.time())
        reserva_id = reserva_data.get("id", "NEW")
        tipo_prefix = tipo_pago[:3]
        return f"M4Y-{tipo_prefix}-{reserva_id}-{timestamp}"

    def _preparar_metadata(self, reserva_data, tipo_pago, metadata_extra):
        """Prepara los metadatos para Stripe"""
        metadata = settings.STRIPE_DEFAULT_METADATA.copy()
        metadata.update(
            {
                "tipo_pago": tipo_pago,
                "reserva_id": str(reserva_data.get("id", "")),
                "vehiculo_id": str(reserva_data.get("vehiculo_id", "")),
                "cliente_email": self._extraer_email_cliente(reserva_data),
            }
        )

        if metadata_extra:
            metadata.update(metadata_extra)

        # Stripe tiene límite de 40 claves y 500 caracteres por valor
        return {k: str(v)[:500] for k, v in metadata.items()}

    def _generar_idempotency_key(self, numero_pedido):
        """Genera una clave de idempotencia única"""
        base_string = f"{settings.STRIPE_IDEMPOTENCY_KEY_PREFIX}_{numero_pedido}_{int(time.time())}"
        return hashlib.sha256(base_string.encode()).hexdigest()[:32]

    def _generar_descripcion(self, reserva_data, tipo_pago):
        """Genera la descripción del pago"""
        config = settings.STRIPE_PAYMENT_CONFIG.get(tipo_pago, {})
        base_description = config.get("description", "Pago de reserva de vehículo")

        vehiculo_info = ""
        if reserva_data.get("car"):
            car = reserva_data["car"]
            vehiculo_info = f" - {car.get('marca', '')} {car.get('modelo', '')}"

        return f"{base_description}{vehiculo_info}"[:200]  # Límite de Stripe

    def _crear_registro_pago(
        self,
        payment_intent,
        reserva_data,
        tipo_pago,
        numero_pedido,
        email_cliente,
        nombre_cliente,
        importe,
    ):
        """Crea el registro del pago en la base de datos"""

        # CORREGIR: Verificar si la reserva existe antes de asignarla
        reserva_instance = None
        reserva_id = reserva_data.get("id")
        if reserva_id:
            try:
                from reservas.models import Reserva

                reserva_instance = Reserva.objects.get(id=reserva_id)
            except Reserva.DoesNotExist:
                logger.warning(
                    f"Reserva {reserva_id} no encontrada, creando pago sin reserva asociada"
                )

        return PagoStripe.objects.create(
            numero_pedido=numero_pedido,
            stripe_payment_intent_id=payment_intent.id,
            stripe_client_secret=payment_intent.client_secret,
            importe=importe,
            moneda=self.currency.upper(),
            tipo_pago=tipo_pago,
            estado="PENDIENTE",
            stripe_status=payment_intent.status,
            stripe_metadata=payment_intent.metadata,
            datos_reserva=reserva_data,
            email_cliente=email_cliente,
            nombre_cliente=nombre_cliente,
            fecha_vencimiento=timezone.now() + timedelta(hours=1),
            reserva=reserva_instance,  # CORREGIR: usar la instancia, no el ID
        )

    def _procesar_pago_exitoso(self, pago_stripe, payment_intent):
        """Procesa las acciones necesarias cuando un pago es exitoso"""
        # Actualizar estado de la reserva si existe
        if pago_stripe.reserva:
            self._actualizar_reserva_pago_exitoso(pago_stripe)

        # Registrar en logs
        logger.info(f"Pago exitoso procesado: {pago_stripe.numero_pedido}")

        # Aquí podrías agregar más lógica como:
        # - Envío de emails de confirmación
        # - Notificaciones push
        # - Integración con sistemas externos
        # - etc.

    def _actualizar_reserva_pago_exitoso(self, pago_stripe):
        """Actualiza la reserva cuando un pago es exitoso"""
        try:
            reserva = pago_stripe.reserva

            if pago_stripe.tipo_pago == "INICIAL":
                reserva.importe_pagado_inicial += pago_stripe.importe
                reserva.importe_pendiente_inicial -= pago_stripe.importe
                if reserva.importe_pendiente_inicial <= 0:
                    reserva.estado = "confirmada"
            elif pago_stripe.tipo_pago in ["DIFERENCIA", "EXTRA"]:
                reserva.importe_pagado_extra += pago_stripe.importe
                reserva.importe_pendiente_extra -= pago_stripe.importe

            reserva.save()
            logger.info(f"Reserva {reserva.id} actualizada por pago exitoso")

        except Exception as e:
            logger.error(f"Error actualizando reserva por pago exitoso: {str(e)}")

    def _sincronizar_pago_con_stripe(self, pago_stripe):
        """Sincroniza el estado del pago con Stripe"""
        try:
            payment_intent = stripe.PaymentIntent.retrieve(
                pago_stripe.stripe_payment_intent_id
            )
            pago_stripe.actualizar_desde_stripe(payment_intent)
            return True
        except Exception as e:
            logger.error(f"Error sincronizando pago con Stripe: {str(e)}")
            return False


class StripeWebhookService:
    """
    Servicio para procesar webhooks de Stripe
    """

    def __init__(self):
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.tolerance = settings.STRIPE_WEBHOOK_TOLERANCE
        logger.info("StripeWebhookService inicializado")

    def procesar_webhook(self, payload, signature_header):
        """
        Procesa un webhook de Stripe

        Args:
            payload: Cuerpo del webhook
            signature_header: Header de firma

        Returns:
            Dict con resultado del procesamiento
        """
        logger.info("Procesando webhook de Stripe")

        try:
            # Verificar la firma del webhook
            event = stripe.Webhook.construct_event(
                payload, signature_header, self.webhook_secret
            )

            # Registrar el webhook
            webhook_record = self._registrar_webhook(event)

            # Procesar según el tipo de evento
            resultado = self._procesar_evento(event, webhook_record)

            # Marcar como procesado si fue exitoso
            if resultado.get("success"):
                webhook_record.procesado = True
                webhook_record.fecha_procesamiento = timezone.now()
                webhook_record.save()

            return resultado

        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Error de verificación de firma del webhook: {str(e)}")
            return {
                "success": False,
                "error": "Firma del webhook inválida",
                "error_code": "invalid_signature",
            }
        except Exception as e:
            logger.error(f"Error procesando webhook: {str(e)}")
            return {
                "success": False,
                "error": "Error interno procesando webhook",
                "error_code": "internal_error",
            }

    def _registrar_webhook(self, event):
        """Registra el webhook en la base de datos"""
        webhook, created = WebhookStripe.objects.get_or_create(
            stripe_event_id=event["id"],
            defaults={
                "tipo_evento": event["type"],
                "datos_evento": event,
                "procesado": False,
            },
        )

        if not created:
            webhook.intentos_procesamiento += 1
            webhook.save()

        return webhook

    def _procesar_evento(self, event, webhook_record):
        """Procesa un evento específico de Stripe"""
        event_type = event["type"]

        try:
            if event_type == "payment_intent.succeeded":
                return self._procesar_payment_intent_succeeded(event)
            elif event_type == "payment_intent.payment_failed":
                return self._procesar_payment_intent_failed(event)
            elif event_type == "payment_intent.canceled":
                return self._procesar_payment_intent_canceled(event)
            elif event_type == "refund.created":
                return self._procesar_refund_created(event)
            elif event_type == "charge.dispute.created":
                return self._procesar_dispute_created(event)
            else:
                logger.info(f"Tipo de evento no manejado: {event_type}")
                return {"success": True, "message": "Evento no procesado"}

        except Exception as e:
            webhook_record.mensaje_error = str(e)
            webhook_record.save()
            raise

    def _procesar_payment_intent_succeeded(self, event):
        """Procesa cuando un Payment Intent es exitoso"""
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]

        try:
            pago_stripe = PagoStripe.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )
            pago_stripe.actualizar_desde_stripe(payment_intent)

            # Procesar lógica adicional
            service = StripePaymentService()
            service._procesar_pago_exitoso(pago_stripe, payment_intent)

            logger.info(
                f"Payment Intent exitoso procesado via webhook: {payment_intent_id}"
            )
            return {"success": True, "message": "Payment Intent exitoso procesado"}

        except PagoStripe.DoesNotExist:
            logger.warning(
                f"Payment Intent no encontrado localmente: {payment_intent_id}"
            )
            return {"success": False, "error": "Payment Intent no encontrado"}

    def _procesar_payment_intent_failed(self, event):
        """Procesa cuando un Payment Intent falla"""
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]

        try:
            pago_stripe = PagoStripe.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )
            pago_stripe.estado = "FALLIDO"
            pago_stripe.mensaje_error = payment_intent.get(
                "last_payment_error", {}
            ).get("message", "Pago fallido")
            pago_stripe.codigo_error_stripe = payment_intent.get(
                "last_payment_error", {}
            ).get("code")
            pago_stripe.save()

            logger.info(
                f"Payment Intent fallido procesado via webhook: {payment_intent_id}"
            )
            return {"success": True, "message": "Payment Intent fallido procesado"}

        except PagoStripe.DoesNotExist:
            logger.warning(
                f"Payment Intent no encontrado localmente: {payment_intent_id}"
            )
            return {"success": False, "error": "Payment Intent no encontrado"}

    def _procesar_payment_intent_canceled(self, event):
        """Procesa cuando un Payment Intent es cancelado"""
        payment_intent = event["data"]["object"]
        payment_intent_id = payment_intent["id"]

        try:
            pago_stripe = PagoStripe.objects.get(
                stripe_payment_intent_id=payment_intent_id
            )
            pago_stripe.estado = "CANCELADO"
            pago_stripe.save()

            logger.info(
                f"Payment Intent cancelado procesado via webhook: {payment_intent_id}"
            )
            return {"success": True, "message": "Payment Intent cancelado procesado"}

        except PagoStripe.DoesNotExist:
            logger.warning(
                f"Payment Intent no encontrado localmente: {payment_intent_id}"
            )
            return {"success": False, "error": "Payment Intent no encontrado"}

    def _procesar_refund_created(self, event):
        """Procesa cuando se crea un reembolso"""
        refund = event["data"]["object"]
        refund_id = refund["id"]

        try:
            # Buscar si ya existe el reembolso
            reembolso_existente = ReembolsoStripe.objects.filter(
                stripe_refund_id=refund_id
            ).first()
            if reembolso_existente:
                reembolso_existente.stripe_status = refund["status"]
                if refund["status"] == "succeeded":
                    reembolso_existente.estado = "COMPLETADO"
                    reembolso_existente.fecha_procesamiento = timezone.now()
                reembolso_existente.save()

            logger.info(f"Reembolso procesado via webhook: {refund_id}")
            return {"success": True, "message": "Reembolso procesado"}

        except Exception as e:
            logger.error(f"Error procesando reembolso via webhook: {str(e)}")
            return {"success": False, "error": "Error procesando reembolso"}

    def _procesar_dispute_created(self, event):
        """Procesa cuando se crea una disputa"""
        dispute = event["data"]["object"]
        charge_id = dispute["charge"]

        try:
            # Buscar el pago relacionado con el cargo
            pago_stripe = PagoStripe.objects.filter(stripe_charge_id=charge_id).first()
            if pago_stripe:
                # Aquí podrías crear un modelo para disputas o marcar el pago
                logger.warning(f"Disputa creada para pago: {pago_stripe.numero_pedido}")
                # Implementar lógica adicional según necesidades del negocio

            return {"success": True, "message": "Disputa registrada"}

        except Exception as e:
            logger.error(f"Error procesando disputa: {str(e)}")
            return {"success": False, "error": "Error procesando disputa"}
