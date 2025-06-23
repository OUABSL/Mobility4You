# backend/payments/urls.py
from django.urls import path

from .views import (
    ConfirmPaymentIntentView,
    CreatePaymentIntentView,
    PaymentHistoryView,
    PaymentStatusView,
    RefundPaymentView,
    StripeWebhookView,
    check_payment_status_legacy,
    process_payment_legacy,
    stripe_config,
    stripe_error,
    stripe_success,
)

app_name = "payments"

urlpatterns = [
    # API endpoints principales de Stripe
    path(
        "stripe/create-payment-intent/",
        CreatePaymentIntentView.as_view(),
        name="create_payment_intent",
    ),
    path(
        "stripe/confirm-payment-intent/",
        ConfirmPaymentIntentView.as_view(),
        name="confirm_payment_intent",
    ),
    path(
        "stripe/payment-status/<str:numero_pedido>/",
        PaymentStatusView.as_view(),
        name="payment_status",
    ),
    path(
        "stripe/refund/<int:pago_id>/",
        RefundPaymentView.as_view(),
        name="refund_payment",
    ),
    path(
        "stripe/payment-history/", PaymentHistoryView.as_view(), name="payment_history"
    ),
    # Webhook de Stripe
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe_webhook"),
    # Endpoints de compatibilidad con sistema actual (reemplazan Redsys)
    path("process-payment/", process_payment_legacy, name="process_payment_legacy"),
    path(
        "payment-status/<str:order_number>/",
        check_payment_status_legacy,
        name="payment_status_legacy",
    ),
    # Redirects de éxito y error (compatibilidad)
    path("stripe/success/", stripe_success, name="stripe_success"),
    path("stripe/error/", stripe_error, name="stripe_error"),
    # Configuración pública para frontend
    path("stripe/config/", stripe_config, name="stripe_config"),
]

# URLs adicionales para el admin y debugging (opcional)
debug_urlpatterns = [
    # Estas URLs solo estarán disponibles en modo DEBUG
]

# Agregar URLs de debug si está habilitado
from django.conf import settings

if settings.DEBUG:
    urlpatterns += debug_urlpatterns
