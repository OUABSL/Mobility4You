# facturas_contratos/utils.py

import os
from datetime import datetime
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (Image, Paragraph, SimpleDocTemplate, Spacer,
                                Table, TableStyle)


def generar_contrato_pdf(contrato):
    """
    Genera un PDF para el contrato y lo guarda en B2
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                          rightMargin=2*cm, leftMargin=2*cm,
                          topMargin=2*cm, bottomMargin=2*cm)
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=30,
        alignment=1,  # Centrado
        textColor=colors.darkblue
    )
    
    # Contenido del PDF
    story = []
    
    # Título
    story.append(Paragraph("CONTRATO DE ALQUILER DE VEHÍCULO", title_style))
    story.append(Spacer(1, 20))
    
    # Información del contrato
    info_data = [
        ["Número de Contrato:", contrato.numero_contrato],
        ["Fecha de Firma:", contrato.fecha_firma.strftime("%d/%m/%Y") if contrato.fecha_firma else "Pendiente"],
        ["Cliente:", f"{contrato.reserva.cliente.nombre} {contrato.reserva.cliente.apellidos}"],
        ["Email:", contrato.reserva.cliente.email],
        ["Teléfono:", contrato.reserva.cliente.telefono],
        ["Vehículo:", f"{contrato.reserva.vehiculo.marca} {contrato.reserva.vehiculo.modelo}"],
        ["Matrícula:", contrato.reserva.vehiculo.matricula],
        ["Fecha Inicio:", contrato.reserva.fecha_inicio.strftime("%d/%m/%Y")],
        ["Fecha Fin:", contrato.reserva.fecha_fin.strftime("%d/%m/%Y")],
        ["Precio Total:", f"{contrato.reserva.precio_total}€"],
    ]
    
    info_table = Table(info_data, colWidths=[5*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 30))
    
    # Condiciones del contrato
    if contrato.condiciones:
        story.append(Paragraph("CONDICIONES DEL CONTRATO", styles['Heading2']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(contrato.condiciones, styles['Normal']))
        story.append(Spacer(1, 20))
    
    # Condiciones generales
    condiciones_generales = """
    <b>CONDICIONES GENERALES:</b><br/>
    1. El arrendatario se compromete a usar el vehículo de forma responsable.<br/>
    2. Cualquier daño al vehículo será responsabilidad del arrendatario.<br/>
    3. El vehículo debe ser devuelto en las mismas condiciones.<br/>
    4. El combustible debe ser repuesto al nivel original.<br/>
    5. Se aplicarán penalizaciones por retraso en la devolución.<br/>
    """
    story.append(Paragraph(condiciones_generales, styles['Normal']))
    story.append(Spacer(1, 30))
    
    # Firmas
    firmas_data = [
        ["Fecha:", "_" * 30],
        ["", ""],
        ["Firma del Cliente:", "Firma de Mobility4You"],
        ["", ""],
        ["_" * 30, "_" * 30],
    ]
    
    firmas_table = Table(firmas_data, colWidths=[7.5*cm, 7.5*cm])
    firmas_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    
    story.append(firmas_table)
    
    # Generar PDF
    doc.build(story)
    
    # Guardar el archivo
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Crear nombre del archivo
    filename = f"contrato_{contrato.numero_contrato.replace('/', '_')}.pdf"
    
    # Guardar en el modelo (esto subirá automáticamente a B2)
    contrato.archivo_pdf.save(filename, ContentFile(pdf_content), save=True)
    
    # Actualizar la URL del PDF
    if contrato.archivo_pdf:
        contrato.url_pdf = contrato.archivo_pdf.url
        contrato.save()
    
    return contrato.archivo_pdf.url if contrato.archivo_pdf else None


def generar_factura_pdf(factura):
    """
    Genera un PDF para la factura y lo guarda en B2
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                          rightMargin=2*cm, leftMargin=2*cm,
                          topMargin=2*cm, bottomMargin=2*cm)
    
    # Estilos
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=30,
        alignment=1,  # Centrado
        textColor=colors.darkred
    )
    
    # Contenido del PDF
    story = []
    
    # Título
    story.append(Paragraph("FACTURA", title_style))
    story.append(Spacer(1, 20))
    
    # Información de la empresa
    empresa_info = """
    <b>MOBILITY4YOU</b><br/>
    Calle Ejemplo, 123<br/>
    28001 Madrid, España<br/>
    CIF: B12345678<br/>
    Tel: +34 900 123 456<br/>
    Email: info@mobility4you.com
    """
    story.append(Paragraph(empresa_info, styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Información de la factura
    info_data = [
        ["Número de Factura:", factura.numero_factura],
        ["Fecha de Emisión:", factura.fecha_emision.strftime("%d/%m/%Y")],
        ["Cliente:", f"{factura.reserva.cliente.nombre} {factura.reserva.cliente.apellidos}"],
        ["Email:", factura.reserva.cliente.email],
        ["Reserva:", f"#{factura.reserva.id}"],
        ["Vehículo:", f"{factura.reserva.vehiculo.marca} {factura.reserva.vehiculo.modelo}"],
        ["Período:", f"{factura.reserva.fecha_inicio.strftime('%d/%m/%Y')} - {factura.reserva.fecha_fin.strftime('%d/%m/%Y')}"],
    ]
    
    info_table = Table(info_data, colWidths=[5*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 30))
    
    # Desglose de precios
    desglose_data = [
        ["CONCEPTO", "IMPORTE"],
        ["Base Imponible", f"{factura.base_imponible}€"],
        ["IVA (21%)", f"{factura.iva}€"],
        ["", ""],
        ["TOTAL", f"{factura.total}€"],
    ]
    
    desglose_table = Table(desglose_data, colWidths=[10*cm, 5*cm])
    desglose_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -2), 1, colors.black),
        ('GRID', (0, -1), (-1, -1), 2, colors.black),
    ]))
    
    story.append(desglose_table)
    story.append(Spacer(1, 30))
    
    # Información de pago
    pago_info = """
    <b>INFORMACIÓN DE PAGO:</b><br/>
    Esta factura corresponde al alquiler del vehículo según la reserva especificada.<br/>
    El pago se ha realizado mediante tarjeta de crédito a través de nuestra plataforma segura.<br/>
    <br/>
    Gracias por confiar en Mobility4You.
    """
    story.append(Paragraph(pago_info, styles['Normal']))
    
    # Generar PDF
    doc.build(story)
    
    # Guardar el archivo
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    buffer.close()
    
    # Crear nombre del archivo
    filename = f"factura_{factura.numero_factura.replace('/', '_')}.pdf"
    
    # Guardar en el modelo (esto subirá automáticamente a B2)
    factura.archivo_pdf.save(filename, ContentFile(pdf_content), save=True)
    
    # Actualizar la URL del PDF
    if factura.archivo_pdf:
        factura.url_pdf = factura.archivo_pdf.url
        factura.save()
    
    return factura.archivo_pdf.url if factura.archivo_pdf else None


def generar_numero_contrato():
    """
    Genera un número único para el contrato
    Formato: CNT-YYYY-XXXXXX
    """
    from .models import Contrato
    
    year = datetime.now().year
    prefix = f"CNT-{year}-"
    
    # Buscar el último número del año
    last_contrato = Contrato.objects.filter(
        numero_contrato__startswith=prefix
    ).order_by('-numero_contrato').first()
    
    if last_contrato:
        # Extraer el número y incrementar
        last_number = int(last_contrato.numero_contrato.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1
    
    return f"{prefix}{new_number:06d}"


def generar_numero_factura():
    """
    Genera un número único para la factura
    Formato: FAC-YYYY-XXXXXX
    """
    from .models import Factura
    
    year = datetime.now().year
    prefix = f"FAC-{year}-"
    
    # Buscar el último número del año
    last_factura = Factura.objects.filter(
        numero_factura__startswith=prefix
    ).order_by('-numero_factura').first()
    
    if last_factura:
        # Extraer el número y incrementar
        last_number = int(last_factura.numero_factura.split('-')[-1])
        new_number = last_number + 1
    else:
        new_number = 1
    
    return f"{prefix}{new_number:06d}"
