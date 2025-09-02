from flask import Blueprint, jsonify, session, request, render_template, redirect, url_for
from app import db
from app.models.ingreso import Ingreso
from app.models.servicio import Servicio
from app.models.cita import Cita
from datetime import datetime
from sqlalchemy import func

ingreso_bp = Blueprint('ingreso', __name__)

@ingreso_bp.route('/ingresos', methods=['GET'])
def panel_ingresos():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    return render_template('usuario/admin/ingresos.html')

@ingreso_bp.route('/api/usuario_actual', methods=['GET'])
def usuario_actual():
    if 'usuario_id' not in session:
        return jsonify({'error': 'No autenticado'}), 401
    return jsonify({'id': int(session['usuario_id'])}), 200

def _parse_fecha(fecha_str):
    if not fecha_str:
        return None
    try:
        return datetime.strptime(fecha_str, '%Y-%m-%d %H:%M:%S')
    except Exception:
        return datetime.strptime(fecha_str, '%Y-%m-%d')

@ingreso_bp.route('/api/ingresos', methods=['GET'])
def obtener_ingresos():
    if 'usuario_id' not in session:
        return jsonify({'error': 'No autenticado'}), 401

    barbero_id = request.args.get('barbero_id') or session.get('usuario_id')
    try:
        barbero_id = int(barbero_id)
    except Exception:
        return jsonify({'error': 'barbero_id inválido'}), 400

    fi_str = request.args.get('fecha_inicio')
    ff_str = request.args.get('fecha_fin')
    try:
        fi_dt = _parse_fecha(fi_str) if fi_str else None
        ff_dt = _parse_fecha(ff_str) if ff_str else None
        fi_date = fi_dt.date() if fi_dt else None
        ff_date = ff_dt.date() if ff_dt else None
    except Exception:
        return jsonify({'error': 'Formato de fecha inválido'}), 400

    try:
        # Base: ingresos del barbero + join a Cita (usar fecha/hora de la cita)
        q = (
            db.session.query(Ingreso, Cita)
            .join(Cita, Ingreso.cita_id == Cita.id)
            .filter(Ingreso.barbero_id == barbero_id)
        )
        if fi_date:
            q = q.filter(Cita.fecha_cita >= fi_date)
        if ff_date:
            q = q.filter(Cita.fecha_cita <= ff_date)

        rows = q.all()

        ingresos_list = []
        total = 0.0
        for ing, cita in rows:
            monto = float(ing.monto or 0)
            total += monto

            fecha_cita_str = cita.fecha_cita.strftime('%Y-%m-%d') if getattr(cita, 'fecha_cita', None) else None

            hora_str = '00:00:00'
            if hasattr(cita, 'hora') and cita.hora:
                # Soporta TIME, datetime, y string 'HH:MM'/'HH:MM:SS'
                try:
                    # datetime.time o datetime.datetime
                    hora_str = cita.hora.strftime('%H:%M:%S')
                except Exception:
                    if isinstance(cita.hora, str):
                        h = cita.hora.strip()
                        hora_str = f'{h}:00' if len(h) == 5 else h

            ingresos_list.append({
                'id': ing.id,
                'monto': monto,
                'servicio_id': ing.servicio_id,
                'cita_id': ing.cita_id,
                'fecha_cita': fecha_cita_str,
                'hora': hora_str,
                'fecha_cita_hora': f'{fecha_cita_str} {hora_str}' if fecha_cita_str else None,
                'fecha_registro': ing.fecha_registro.strftime('%Y-%m-%d %H:%M:%S') if ing.fecha_registro else None,
            })

        count = len(rows)

        # Tendencia por día (fecha de la cita)
        tq = (
            db.session.query(
                Cita.fecha_cita.label('fecha'),
                func.sum(Ingreso.monto).label('monto')
            )
            .join(Cita, Ingreso.cita_id == Cita.id)
            .filter(Ingreso.barbero_id == barbero_id)
        )
        if fi_date:
            tq = tq.filter(Cita.fecha_cita >= fi_date)
        if ff_date:
            tq = tq.filter(Cita.fecha_cita <= ff_date)
        tendencia_rows = tq.group_by(Cita.fecha_cita).order_by(Cita.fecha_cita.asc()).all()
        tendencia = [{'fecha': r.fecha.strftime('%Y-%m-%d'), 'monto': float(r.monto or 0)} for r in tendencia_rows]

        # Distribución por servicio
        dq = (
            db.session.query(
                Servicio.nombre.label('servicio_nombre'),
                func.sum(Ingreso.monto).label('monto')
            )
            .join(Servicio, Ingreso.servicio_id == Servicio.id)
            .join(Cita, Ingreso.cita_id == Cita.id)
            .filter(Ingreso.barbero_id == barbero_id)
        )
        if fi_date:
            dq = dq.filter(Cita.fecha_cita >= fi_date)
        if ff_date:
            dq = dq.filter(Cita.fecha_cita <= ff_date)
        distribucion_rows = dq.group_by(Servicio.nombre).all()
        distribucion = [{'servicio_nombre': r.servicio_nombre, 'monto': float(r.monto or 0)} for r in distribucion_rows]

        return jsonify({
            'total': total,
            'citas_completadas': count,
            'ingresos': ingresos_list,
            'tendencia': tendencia,
            'distribucion': distribucion
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno', 'detalle': str(e)}), 500