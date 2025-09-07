from flask import Blueprint, jsonify, request, session
from app import db
from app.models.cita import Cita
from app.models.usuario import Usuario
from app.models.servicio import Servicio
from app.models.pago import Pago
from decimal import Decimal

pago_bp = Blueprint('pago', __name__)


def _precio_con_descuento(servicio, fecha_cita):
    if not servicio:
        return Decimal('0.00')
    precio = Decimal(servicio.precio)
    descuento = getattr(servicio, 'descuento', None)
    if not descuento:
        return precio
    try:
        if descuento.fecha_inicio and fecha_cita < descuento.fecha_inicio:
            return precio
        if descuento.fecha_fin and fecha_cita > descuento.fecha_fin:
            return precio
        if descuento.tipo == 'porcentaje':
            porcentaje = Decimal(descuento.valor) / Decimal('100')
            return max(Decimal('0.00'), (precio * (Decimal('1.00') - porcentaje)).quantize(Decimal('0.01')))
        elif descuento.tipo == 'cantidad':
            return max(Decimal('0.00'), (precio - Decimal(descuento.valor)).quantize(Decimal('0.01')))
    except Exception:
        return precio
    return precio


@pago_bp.route('/api/pagos', methods=['POST'])
def crear_pago():
    """Registra información de pago de una cita. No procesa cobros, solo guarda el resumen."""
    try:
        if 'usuario_id' not in session or session.get('rol') != 'admin':
            return jsonify({'error': 'No autorizado'}), 403

        data = request.get_json() or {}
        cita_id = data.get('cita_id')
        metodo = (data.get('metodo') or '').strip().lower()
        recibido = data.get('monto_recibido')
        notas = (data.get('notas') or '').strip() or None

        if metodo not in ('efectivo', 'transferencia'):
            return jsonify({'error': 'Método de pago inválido'}), 400

        cita = Cita.query.get(cita_id)
        if not cita:
            return jsonify({'error': 'Cita no encontrada'}), 404

        # Seguridad: solo el barbero dueño de la cita puede registrar el pago
        usuario_id = session['usuario_id']
        if cita.barbero_id != usuario_id:
            return jsonify({'error': 'No autorizado para registrar este pago'}), 403

        # Calcular importes con descuento
        sp = Servicio.query.get(cita.servicio_id)
        base_p = Decimal(sp.precio) if sp else Decimal('0.00')
        final_p = _precio_con_descuento(sp, cita.fecha_cita) if sp else Decimal('0.00')
        desc_p = max(Decimal('0.00'), (base_p - final_p)).quantize(Decimal('0.01'))

        base_a = final_a = desc_a = Decimal('0.00')
        if cita.servicio_adicional_id:
            sa = Servicio.query.get(cita.servicio_adicional_id)
            base_a = Decimal(sa.precio) if sa else Decimal('0.00')
            final_a = _precio_con_descuento(sa, cita.fecha_cita) if sa else Decimal('0.00')
            desc_a = max(Decimal('0.00'), (base_a - final_a)).quantize(Decimal('0.01'))

        subtotal = (base_p + base_a).quantize(Decimal('0.01'))
        descuento_total = (desc_p + desc_a).quantize(Decimal('0.01'))
        total = (final_p + final_a).quantize(Decimal('0.01'))

        monto_recibido = None
        saldo = None
        try:
            if recibido is not None and str(recibido) != '':
                monto_recibido = Decimal(str(recibido)).quantize(Decimal('0.01'))
                saldo = max(Decimal('0.00'), (total - monto_recibido)).quantize(Decimal('0.01'))
        except Exception:
            return jsonify({'error': 'Monto recibido inválido'}), 400

        pago = Pago(
            cita_id=cita.id,
            barbero_id=cita.barbero_id,
            cliente_id=cita.usuario_id,
            metodo=metodo,
            subtotal=subtotal,
            descuento=descuento_total,
            total=total,
            monto_recibido=monto_recibido,
            saldo=saldo,
            notas=notas
        )
        db.session.add(pago)
        db.session.commit()

        return jsonify({
            'ok': True,
            'pago': {
                'id': pago.id,
                'cita_id': pago.cita_id,
                'metodo': pago.metodo,
                'subtotal': float(pago.subtotal),
                'descuento': float(pago.descuento),
                'total': float(pago.total),
                'monto_recibido': float(pago.monto_recibido) if pago.monto_recibido is not None else None,
                'saldo': float(pago.saldo) if pago.saldo is not None else None
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@pago_bp.route('/api/pagos', methods=['GET'])
def listar_pagos():
    """Lista pagos del barbero autenticado (admin) con detalles básicos."""
    try:
        if 'usuario_id' not in session or session.get('rol') != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        barbero_id = session['usuario_id']

        pagos = (
            db.session.query(Pago, Cita, Usuario)
            .join(Cita, Pago.cita_id == Cita.id)
            .join(Usuario, Cita.usuario_id == Usuario.id)
            .filter(Pago.barbero_id == barbero_id)
            .order_by(Pago.fecha_registro.desc())
            .all()
        )

        out = []
        for pago, cita, cliente in pagos:
            out.append({
                'id': pago.id,
                'fecha_registro': pago.fecha_registro.strftime('%Y-%m-%d %H:%M:%S'),
                'cita_id': pago.cita_id,
                'cliente_id': cliente.id if cliente else None,
                'cliente_nombre': cliente.nombre if cliente else None,
                'cliente_apellido': cliente.apellido if cliente else None,
                'metodo': pago.metodo,
                'subtotal': float(pago.subtotal or 0),
                'descuento': float(pago.descuento or 0),
                'total': float(pago.total or 0),
                'monto_recibido': float(pago.monto_recibido) if pago.monto_recibido is not None else None,
                'saldo': float(pago.saldo) if pago.saldo is not None else None
            })

        return jsonify(out), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pago_bp.route('/api/pagos/<int:pago_id>', methods=['PUT'])
def actualizar_pago(pago_id):
    try:
        if 'usuario_id' not in session or session.get('rol') != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        pago = Pago.query.get_or_404(pago_id)
        if pago.barbero_id != session['usuario_id']:
            return jsonify({'error': 'No autorizado'}), 403
        data = request.get_json() or {}
        recibido = data.get('monto_recibido')
        if recibido is None or str(recibido) == '':
            pago.monto_recibido = None
            pago.saldo = pago.total
        else:
            try:
                pago.monto_recibido = Decimal(str(recibido)).quantize(Decimal('0.01'))
                pago.saldo = max(Decimal('0.00'), (Decimal(pago.total) - pago.monto_recibido)).quantize(Decimal('0.01'))
            except Exception:
                return jsonify({'error': 'Monto recibido inválido'}), 400
        db.session.commit()
        return jsonify({'ok': True, 'pago': {
            'id': pago.id,
            'monto_recibido': float(pago.monto_recibido) if pago.monto_recibido is not None else None,
            'saldo': float(pago.saldo) if pago.saldo is not None else None
        }}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@pago_bp.route('/api/pagos/<int:pago_id>', methods=['DELETE'])
def eliminar_pago(pago_id):
    try:
        if 'usuario_id' not in session or session.get('rol') != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        pago = Pago.query.get_or_404(pago_id)
        if pago.barbero_id != session['usuario_id']:
            return jsonify({'error': 'No autorizado'}), 403
        db.session.delete(pago)
        db.session.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@pago_bp.route('/api/pagos/cliente', methods=['GET'])
def listar_pagos_cliente():
    """Lista pagos del cliente autenticado."""
    try:
        if 'usuario_id' not in session or session.get('rol') != 'cliente':
            return jsonify({'error': 'No autorizado'}), 403
        cliente_id = session['usuario_id']

        pagos = (
            db.session.query(Pago, Cita, Usuario)
            .join(Cita, Pago.cita_id == Cita.id)
            .join(Usuario, Cita.barbero_id == Usuario.id)
            .filter(Pago.cliente_id == cliente_id)
            .order_by(Pago.fecha_registro.desc())
            .all()
        )

        out = []
        for pago, cita, barbero in pagos:
            out.append({
                'id': pago.id,
                'fecha_registro': pago.fecha_registro.strftime('%Y-%m-%d %H:%M:%S'),
                'cita_id': pago.cita_id,
                'barbero_id': barbero.id if barbero else None,
                'barbero_nombre': barbero.nombre if barbero else None,
                'barbero_apellido': barbero.apellido if barbero else None,
                'metodo': pago.metodo,
                'subtotal': float(pago.subtotal or 0),
                'descuento': float(pago.descuento or 0),
                'total': float(pago.total or 0),
                'monto_recibido': float(pago.monto_recibido) if pago.monto_recibido is not None else None,
                'saldo': float(pago.saldo) if pago.saldo is not None else None
            })

        return jsonify(out), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
