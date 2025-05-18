# archivo: payments/urls.py

from django.urls import path
from .views import (
    PrepareRedsysPaymentView,
    RedsysNotificationView,
    redsys_success,
    redsys_error,
    check_payment_status
)

app_name = 'payments'

urlpatterns = [
    # API endpoints
    path('redsys/prepare/', PrepareRedsysPaymentView.as_view(), name='redsys_prepare'),
    path('redsys/notify/', RedsysNotificationView.as_view(), name='redsys_notify'),
    path('redsys/status/<str:order_number>/', check_payment_status, name='redsys_status'),
    
    # Redirect endpoints (para Redsys)
    path('redsys/success/', redsys_success, name='redsys_success'),
    path('redsys/error/', redsys_error, name='redsys_error'),
]

# archivo: myproject/urls.py (URL principal)

from django.urls import path, include

urlpatterns = [
    
    # ... otras URLs
]

# archivo: settings.py (configuración de Django)






# archivo: payments/migrations/0001_initial.py (migración)

# Ejecutar estos comandos para crear las migraciones:
# python manage.py makemigrations payments
# python manage.py migrate

