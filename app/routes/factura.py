from flask import Blueprint, render_template, jsonify, session, make_response
from app import db
from app.models.pago import Pago
from app.models.factura import Factura
from app.models.cita import Cita
from app.models.usuario import Usuario
from app.models.servicio import Servicio
from app.routes.cita import _precio_con_descuento
from datetime import datetime

factura_bp = Blueprint('factura', __name__)


def _gen_numero(pago_id: int) -> str:
    ts = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    return f'FAC-{ts}-{pago_id:06d}'


@factura_bp.route('/facturas/<int:pago_id>/descargar', methods=['GET'])
def descargar_factura(pago_id):
    if 'usuario_id' not in session:
        return jsonify({'error': 'No autorizado'}), 403

    pago = Pago.query.get_or_404(pago_id)

    # Solo barbero dueño del pago o cliente dueño
    uid = session['usuario_id']
    rol = session.get('rol')
    if rol == 'admin':
        if pago.barbero_id != uid:
            return jsonify({'error': 'No autorizado'}), 403
    else:
        if pago.cliente_id != uid:
            return jsonify({'error': 'No autorizado'}), 403

    # Crear o recuperar factura
    fac = getattr(pago, 'factura', None)
    if not fac:
        fac = Factura(
            numero=_gen_numero(pago.id),
            pago_id=pago.id,
            cita_id=pago.cita_id,
            cliente_id=pago.cliente_id,
            barbero_id=pago.barbero_id,
            subtotal=pago.subtotal or 0,
            descuento=pago.descuento or 0,
            total=pago.total or 0,
            metodo=pago.metodo,
        )
        db.session.add(fac)
        db.session.commit()

    cliente = Usuario.query.get(pago.cliente_id)
    barbero = Usuario.query.get(pago.barbero_id)
    cita = Cita.query.get(pago.cita_id) if pago.cita_id else None

    # Construir items de servicios
    items = []
    if cita and cita.servicio_id:
        sp = Servicio.query.get(cita.servicio_id)
        if sp:
            precio = _precio_con_descuento(sp, cita.fecha_cita)
            items.append({'nombre': sp.nombre, 'precio': float(precio)})
    if cita and cita.servicio_adicional_id:
        sa = Servicio.query.get(cita.servicio_adicional_id)
        if sa:
            precio = _precio_con_descuento(sa, cita.fecha_cita)
            items.append({'nombre': sa.nombre, 'precio': float(precio)})

    # Intentar generar PDF con reportlab; si no está disponible, fallback HTML
    try:
        from io import BytesIO
        from reportlab.lib.pagesizes import A5, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib import colors
        buffer = BytesIO()
        # Usar un tamaño de página compacto (A5) para facturas cortas
        pagesize = A5 if len(items) <= 4 else A4
        c = canvas.Canvas(buffer, pagesize=pagesize)
        width, height = pagesize

        left = 15*mm
        right = width - 15*mm
        y = height - 20*mm
        c.setFont('Helvetica-Bold', 16)
        c.drawString(left, y, 'Factura')
        c.setFont('Helvetica', 10)
        y -= 6*mm
        c.drawString(left, y, f'Número: {fac.numero}')
        y -= 5*mm
        c.drawString(left, y, f'Emitida: {fac.fecha_emision.strftime("%Y-%m-%d %H:%M:%S")}')

        # Cliente / Barbero
        y -= 10*mm
        c.setFont('Helvetica-Bold', 11)
        c.drawString(left, y, 'Cliente')
        c.drawString(right - 60*mm, y, 'Barbero')
        c.setFont('Helvetica', 10)
        y -= 5*mm
        c.drawString(left, y, f'{cliente.nombre} {cliente.apellido}')
        c.drawString(right - 60*mm, y, f'{barbero.nombre} {barbero.apellido}')

        # Cita
        if cita:
            y -= 8*mm
            c.setFont('Helvetica-Bold', 11)
            c.drawString(left, y, 'Cita')
            c.setFont('Helvetica', 10)
            y -= 5*mm
            c.drawString(left, y, f'Fecha: {cita.fecha_cita.strftime("%Y-%m-%d")}  Hora: {cita.hora}')

        # Tabla de items
        y -= 10*mm
        c.setFont('Helvetica-Bold', 11)
        c.drawString(left, y, 'Servicio')
        c.drawRightString(right, y, 'Precio')
        c.setStrokeColor(colors.lightgrey)
        c.line(left, y-2*mm, right, y-2*mm)
        y -= 6*mm
        c.setFont('Helvetica', 10)
        if items:
            for it in items:
                c.drawString(left, y, it['nombre'])
                c.drawRightString(right, y, f"$ {it['precio']:.2f}")
                y -= 6*mm
        else:
            c.drawString(left, y, 'Servicios de barbería')
            c.drawRightString(right, y, f"$ {float(pago.subtotal or 0):.2f}")
            y -= 6*mm

        # Totales
        y -= 6*mm
        c.setStrokeColor(colors.lightgrey)
        c.line(left, y, right, y)
        y -= 8*mm
        c.setFont('Helvetica', 10)
        c.drawString(right - 50*mm, y, 'Subtotal:')
        c.drawRightString(right, y, f"$ {float(pago.subtotal or 0):.2f}")
        y -= 6*mm
        c.drawString(right - 50*mm, y, 'Descuento:')
        c.drawRightString(right, y, f"- $ {float(pago.descuento or 0):.2f}")
        y -= 6*mm
        c.setFont('Helvetica-Bold', 11)
        c.drawString(right - 50*mm, y, 'Total:')
        c.drawRightString(right, y, f"$ {float(pago.total or 0):.2f}")
        y -= 10*mm
        c.setFont('Helvetica', 9)
        c.drawString(left, y, 'Gracias por su preferencia.')
        c.showPage()
        c.save()
        pdf = buffer.getvalue()
        buffer.close()
        resp = make_response(pdf)
        resp.headers['Content-Type'] = 'application/pdf'
        resp.headers['Content-Disposition'] = f'attachment; filename="{fac.numero}.pdf"'
        # Mitigar advertencias en navegadores móviles sobre descargas no seguras (si hay mezcla HTTP/HTTPS)
        resp.headers['X-Content-Type-Options'] = 'nosniff'
        resp.headers['Referrer-Policy'] = 'no-referrer'
        resp.headers['Cache-Control'] = 'no-store'
        resp.headers['Content-Security-Policy'] = 'block-all-mixed-content; upgrade-insecure-requests'
        return resp
    except Exception:
        # Fallback HTML si no hay reportlab
        html = render_template(
            'factura/factura.html',
            factura=fac,
            pago=pago,
            cliente=cliente,
            barbero=barbero,
            cita=cita,
            ahora=datetime.utcnow(),
            items=items
        )
        resp = make_response(html)
        resp.headers['Content-Type'] = 'text/html; charset=utf-8'
        resp.headers['Content-Disposition'] = f'attachment; filename="{fac.numero}.html"'
        return resp
