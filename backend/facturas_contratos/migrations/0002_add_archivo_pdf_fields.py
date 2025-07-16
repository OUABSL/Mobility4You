# Generated migration for adding archivo_pdf fields

import facturas_contratos.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('facturas_contratos', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='archivo_pdf',
            field=models.FileField(blank=True, help_text='PDF del contrato que se almacenará en B2', null=True, upload_to=facturas_contratos.models.contrato_upload_path, verbose_name='Archivo PDF del contrato'),
        ),
        migrations.AddField(
            model_name='factura',
            name='archivo_pdf',
            field=models.FileField(blank=True, help_text='PDF de la factura que se almacenará en B2', null=True, upload_to=facturas_contratos.models.factura_upload_path, verbose_name='Archivo PDF de la factura'),
        ),
    ]
