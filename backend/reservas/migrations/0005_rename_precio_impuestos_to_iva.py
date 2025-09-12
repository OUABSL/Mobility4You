# Generated migration to rename precio_impuestos to iva
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reservas', '0004_add_numero_reserva'),
    ]

    operations = [
        migrations.RenameField(
            model_name='reserva',
            old_name='precio_impuestos',
            new_name='iva',
        ),
    ]
