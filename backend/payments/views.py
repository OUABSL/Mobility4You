# backend/payments/views.py
import logging

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reservas.models import Reserva

from .models import PagoStripe
from .serializers import PagoStripeSerializer
from .services import StripePaymentService, StripeWebhookService

logger = logging.getLogger("stripe")


class CreatePaymentIntentView(APIView):
    """
    Vista para crear Payment Intents de Stripe
    """

    permission_classes = [AllowAny]  # Cambiará a IsAuthenticated en producción

    def post(self, request):
        """
        Crea un Payment Intent para una reserva

        Body esperado:
        {
            "reserva_data": {...},
            "tipo_pago": "INICIAL|DIFERENCIA|EXTRA|PENALIZACION",
            "metadata_extra": {...} // opcional
        }
        """
        logger.info("=== INICIO CREACIÓN PAYMENT INTENT ===")

        try:
            # Validar datos de entrada
            reserva_data = request.data.get("reserva_data")
            tipo_pago = request.data.get("tipo_pago", "INICIAL")
            metadata_extra = request.data.get("metadata_extra", {})

            if not reserva_data:
                logger.error("Datos de reserva faltantes")
                return Response(
                    {"error": "Se requieren datos de reserva"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validar tipo de pago
            tipos_validos = ["INICIAL", "DIFERENCIA", "EXTRA", "PENALIZACION"]
            if tipo_pago not in tipos_validos:
                logger.error(f"Tipo de pago inválido: {tipo_pago}")
                return Response(
                    {
                        "error": "Tipo de pago debe ser uno de: {0}".format(", ".join(tipos_validos))
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Crear Payment Intent
            service = StripePaymentService()
            resultado = service.crear_payment_intent(
                reserva_data=reserva_data,
                tipo_pago=tipo_pago,
                metadata_extra=metadata_extra,
            )

            if resultado["success"]:
                logger.info(
                    f"Payment Intent creado exitosamente: {resultado['payment_intent_id']}"
                )
                return Response(resultado, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Error creando Payment Intent: {resultado['error']}")
                return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error interno en CreatePaymentIntentView: {str(e)}")
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConfirmPaymentIntentView(APIView):
    """
    Vista para confirmar Payment Intents
    """

    permission_classes = [AllowAny]  # Cambiará a IsAuthenticated en producción

    def post(self, request):
        """
        Confirma un Payment Intent

        Body esperado:
        {
            "payment_intent_id": "pi_xxx",
            "payment_method_id": "pm_xxx" // opcional
        }
        """
        logger.info("=== INICIO CONFIRMACIÓN PAYMENT INTENT ===")

        try:
            payment_intent_id = request.data.get("payment_intent_id")
            payment_method_id = request.data.get("payment_method_id")

            if not payment_intent_id:
                logger.error("Payment Intent ID faltante")
                return Response(
                    {"error": "Se requiere payment_intent_id"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Confirmar Payment Intent
            service = StripePaymentService()
            resultado = service.confirmar_payment_intent(
                payment_intent_id=payment_intent_id, payment_method_id=payment_method_id
            )

            if resultado["success"]:
                logger.info(
                    f"Payment Intent confirmado exitosamente: {payment_intent_id}"
                )

                # Determinar status code apropiado
                if resultado.get("status") == "succeeded":
                    return Response(resultado, status=status.HTTP_200_OK)
                elif resultado.get("status") == "requires_action":
                    return Response(resultado, status=status.HTTP_202_ACCEPTED)
                else:
                    return Response(resultado, status=status.HTTP_200_OK)
            else:
                logger.error(f"Error confirmando Payment Intent: {resultado['error']}")
                return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error interno en ConfirmPaymentIntentView: {str(e)}")
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaymentStatusView(APIView):
    """
    Vista para obtener el estado de un pago
    """

    permission_classes = [AllowAny]  # Cambiará a IsAuthenticated en producción

    def get(self, request, numero_pedido):
        """
        Obtiene el estado de un pago por número de pedido
        """
        logger.info(f"Consultando estado del pago: {numero_pedido}")

        try:
            service = StripePaymentService()
            resultado = service.obtener_estado_pago(numero_pedido)

            if resultado["success"]:
                return Response(resultado, status=status.HTTP_200_OK)
            else:
                return Response(resultado, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"Error obteniendo estado del pago: {str(e)}")
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RefundPaymentView(APIView):
    """
    Vista para procesar reembolsos
    """

    permission_classes = [IsAuthenticated]  # Solo usuarios autenticados

    def post(self, request, pago_id):
        """
        Procesa un reembolso total o parcial

        Body esperado:
        {
            "importe_reembolso": 100.50, // opcional, null = reembolso total
            "motivo": "CANCELACION_CLIENTE",
            "descripcion": "Cliente canceló la reserva" // opcional
        }
        """
        logger.info(f"=== INICIO REEMBOLSO PAGO {pago_id} ===")

        try:
            importe_reembolso = request.data.get("importe_reembolso")
            motivo = request.data.get("motivo", "CANCELACION_CLIENTE")
            descripcion = request.data.get("descripcion")

            # Validar motivo
            motivos_validos = [
                "CANCELACION_CLIENTE",
                "CANCELACION_EMPRESA",
                "MODIFICACION_RESERVA",
                "ERROR_PAGO",
                "FRAUDE",
                "OTRO",
            ]
            if motivo not in motivos_validos:
                return Response(
                    {"error": "Motivo debe ser uno de: {0}".format(", ".join(motivos_validos))},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Procesar reembolso
            service = StripePaymentService()
            resultado = service.procesar_reembolso(
                pago_id=pago_id,
                importe_reembolso=importe_reembolso,
                motivo=motivo,
                descripcion=descripcion,
            )

            if resultado["success"]:
                logger.info(
                    f"Reembolso procesado exitosamente: {resultado['refund_id']}"
                )
                return Response(resultado, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Error procesando reembolso: {resultado['error']}")
                return Response(resultado, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error interno en RefundPaymentView: {str(e)}")
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PaymentHistoryView(APIView):
    """
    Vista para obtener historial de pagos
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Obtiene el historial de pagos del usuario
        """
        try:
            # Filtrar pagos por usuario
            pagos = PagoStripe.objects.filter(
                email_cliente=request.user.email
            ).order_by("-fecha_creacion")

            # Aplicar filtros opcionales
            estado = request.query_params.get("estado")
            if estado:
                pagos = pagos.filter(estado=estado)

            tipo_pago = request.query_params.get("tipo_pago")
            if tipo_pago:
                pagos = pagos.filter(tipo_pago=tipo_pago)

            # Paginación simple
            page_size = int(request.query_params.get("page_size", 20))
            page = int(request.query_params.get("page", 1))
            start = (page - 1) * page_size
            end = start + page_size

            pagos_pagina = pagos[start:end]
            total_count = pagos.count()

            # Serializar
            serializer = PagoStripeSerializer(
                pagos_pagina, many=True, context={"request": request}
            )

            return Response(
                {
                    "success": True,
                    "count": len(pagos_pagina),
                    "total": total_count,
                    "page": page,
                    "page_size": page_size,
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Error obteniendo historial de pagos: {str(e)}")
            return Response(
                {"error": "Error interno del servidor"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Vista para procesar webhooks de Stripe
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Procesa webhooks enviados por Stripe
        """
        logger.info("=== WEBHOOK STRIPE RECIBIDO ===")

        try:
            payload = request.body
            signature_header = request.META.get("HTTP_STRIPE_SIGNATURE")

            if not signature_header:
                logger.error("Header de firma de Stripe faltante")
                return HttpResponse("Missing Stripe signature header", status=400)

            # Procesar webhook
            service = StripeWebhookService()
            resultado = service.procesar_webhook(payload, signature_header)

            if resultado["success"]:
                logger.info("Webhook procesado exitosamente")
                return HttpResponse("Webhook processed successfully", status=200)
            else:
                logger.error(f"Error procesando webhook: {resultado['error']}")
                return HttpResponse(
                    f"Webhook processing failed: {resultado['error']}", status=400
                )

        except Exception as e:
            logger.error(f"Error interno procesando webhook: {str(e)}")
            return HttpResponse("Internal server error processing webhook", status=500)


# Vistas de compatibilidad con el sistema actual


@api_view(["POST"])
@permission_classes([AllowAny])
def process_payment_legacy(request):
    """
    Vista de compatibilidad para procesar pagos con la interfaz actual
    Reemplaza la funcionalidad de Redsys manteniendo la misma interfaz
    """
    logger.info("=== PROCESAMIENTO PAGO LEGACY ===")

    try:
        # Extraer datos del request (mantener compatibilidad)
        reserva_id = request.data.get("reserva_id")
        payment_data = request.data.get("payment_data", {})

        # Si viene un importe específico (para diferencias)
        diferencia = request.data.get("diferencia")
        if diferencia:
            payment_data["importe_diferencia"] = diferencia
            tipo_pago = "DIFERENCIA"
        else:
            tipo_pago = "INICIAL"

        # Buscar la reserva si viene ID
        reserva_data = None
        if reserva_id:
            try:
                reserva = Reserva.objects.get(id=reserva_id)
                reserva_data = {
                    "id": reserva.id,
                    "precio_total": float(reserva.precio_total),
                    "diferencia": diferencia or 0,
                    "conductor": {
                        "email": payment_data.get("email", ""),
                        "nombre": (
                            payment_data.get("titular", "").split()[0]
                            if payment_data.get("titular")
                            else ""
                        ),
                        "apellidos": (
                            " ".join(payment_data.get("titular", "").split()[1:])
                            if payment_data.get("titular")
                            else ""
                        ),
                    },
                }
            except Reserva.DoesNotExist:
                return Response(
                    {"error": "Reserva no encontrada"}, status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Usar datos del request directamente
            reserva_data = request.data.get("reserva_data", {})

        # Crear Payment Intent
        service = StripePaymentService()
        resultado = service.crear_payment_intent(
            reserva_data=reserva_data, tipo_pago=tipo_pago
        )

        if resultado["success"]:
            # Formato de respuesta compatible con frontend actual
            return Response(
                {
                    "success": True,
                    "message": "Payment Intent creado exitosamente",
                    "payment_intent_id": resultado["payment_intent_id"],
                    "client_secret": resultado["client_secret"],
                    "publishable_key": resultado["publishable_key"],
                    "numero_pedido": resultado["numero_pedido"],
                    "importe": resultado["importe"],
                    "transaction_id": resultado["numero_pedido"],  # Compatibilidad
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"success": False, "error": resultado["error"]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        logger.error(f"Error en process_payment_legacy: {str(e)}")
        return Response(
            {"error": "Error interno del servidor"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def check_payment_status_legacy(request, order_number):
    """
    Vista de compatibilidad para verificar estado de pago
    """
    try:
        service = StripePaymentService()
        resultado = service.obtener_estado_pago(order_number)

        if resultado["success"]:
            # Formato compatible con frontend actual
            return Response(
                {
                    "success": True,
                    "order": order_number,
                    "status": (
                        "COMPLETADO"
                        if resultado["estado"] == "COMPLETADO"
                        else "PENDIENTE"
                    ),
                    "estado": resultado["estado"],
                    "importe": resultado["importe"],
                    "payment_method": resultado["metodo_pago"],
                }
            )
        else:
            return Response(
                {"success": False, "error": resultado["error"]},
                status=status.HTTP_404_NOT_FOUND,
            )

    except Exception as e:
        logger.error(f"Error en check_payment_status_legacy: {str(e)}")
        return Response(
            {"error": "Error interno del servidor"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# Vistas de redirección para éxito y error (mantenidas para compatibilidad)


@api_view(["GET"])
@permission_classes([AllowAny])
def stripe_success(request):
    """Vista de redirección de éxito"""
    from django.http import HttpResponseRedirect

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return HttpResponseRedirect(
        f"{frontend_url}/reservation-confirmation/exito?payment=success"
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def stripe_error(request):
    """Vista de redirección de error"""
    from django.http import HttpResponseRedirect

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    return HttpResponseRedirect(
        f"{frontend_url}/reservation-confirmation/error?payment=failed"
    )


# Vista de configuración para el frontend


@api_view(["GET"])
@permission_classes([AllowAny])
def stripe_config(request):
    """
    Proporciona la configuración pública de Stripe al frontend
    """
    return Response(
        {
            "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
            "currency": settings.STRIPE_CONFIG["currency"],
            "country": "ES",  # Para localización de elementos de Stripe
            "supported_payment_methods": settings.STRIPE_CONFIG["payment_method_types"],
            "statement_descriptor": settings.STRIPE_CONFIG["statement_descriptor"],
        }
    )
