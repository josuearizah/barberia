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
    return jsonify({
        'id': int(session['usuario_id']),
        'rol': session.get('rol')
    }), 200

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

    # Asegurar aislamiento: el barbero solo puede ver sus propios ingresos
    barbero_id_param = request.args.get('barbero_id')
    try:
        barbero_id = int(session.get('usuario_id'))
    except Exception:
        return jsonify({'error': 'Sesión inválida'}), 401
    # Si se envía un barbero_id distinto al de la sesión, denegar.
    if barbero_id_param is not None:
        try:
            param_id = int(barbero_id_param)
            if param_id != barbero_id:
                return jsonify({'error': 'No autorizado'}), 403
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
                try:
                    hora_str = cita.hora.strftime('%H:%M:%S')
                except Exception:
                    if isinstance(cita.hora, str):
                        h = cita.hora.strip()
                        hora_str = f'{h}:00' if len(h) == 5 else h

            ingresos_list.append({
                'id': ing.id,
                'monto': monto,
                'servicio_id': ing.servicio_id,
                'servicio_nombre': ing.servicio_nombre,
                'cita_id': ing.cita_id,
                'fecha_cita': fecha_cita_str,
                'hora': hora_str,
                'fecha_cita_hora': f'{fecha_cita_str} {hora_str}' if fecha_cita_str else None,
                'fecha_registro': ing.fecha_registro.strftime('%Y-%m-%d %H:%M:%S') if ing.fecha_registro else None,
            })

        # Conteo correcto de citas completadas (DISTINCT cita_id)
        count_q = (
            db.session.query(func.count(func.distinct(Ingreso.cita_id)))
            .join(Cita, Ingreso.cita_id == Cita.id)
            .filter(Ingreso.barbero_id == barbero_id)
        )
        if fi_date:
            count_q = count_q.filter(Cita.fecha_cita >= fi_date)
        if ff_date:
            count_q = count_q.filter(Cita.fecha_cita <= ff_date)
        citas_completadas = int(count_q.scalar() or 0)

        # Tendencia por día
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
        distribucion_rows = dq.group_by(Servicio.nombre).order_by(func.sum(Ingreso.monto).desc()).all()
        distribucion = [{'servicio_nombre': r.servicio_nombre, 'monto': float(r.monto or 0)} for r in distribucion_rows]

    # NUEVA LÓGICA:
    # - Para admin: transferido = suma de Servicio.transferido (sus servicios) con signo negativo; neto = total - transferido_abs
    # - Para superadmin: transferido = suma de Servicio.transferido de TODOS los demás barberos (positivo); neto = total + transferido
    #   (el superadmin NO transfiere sobre sus propios servicios).
    # (Se usa la importación superior de Servicio; no re-importar dentro de la función para evitar UnboundLocalError.)
        rol_usuario = session.get('rol')

        transferido_signed = 0.0
        neto = total

        if rol_usuario == 'admin':
            # Sumar transferido por cada ingreso del propio barbero (ignorar NULL -> 0)
            admin_comm_q = (
                db.session.query(func.coalesce(func.sum(Servicio.transferido), 0.0))
                .select_from(Ingreso)
                .join(Servicio, Servicio.id == Ingreso.servicio_id)
                .join(Cita, Ingreso.cita_id == Cita.id)
                .filter(Ingreso.barbero_id == barbero_id)
            )
            if fi_date:
                admin_comm_q = admin_comm_q.filter(Cita.fecha_cita >= fi_date)
            if ff_date:
                admin_comm_q = admin_comm_q.filter(Cita.fecha_cita <= ff_date)
            transferido_abs = float(admin_comm_q.scalar() or 0.0)
            transferido_signed = -abs(transferido_abs)  # negativo para el admin
            neto = total - abs(transferido_abs)
        elif rol_usuario == 'superadmin':
            # Sumar transferidos de otros barberos (excluyendo al propio superadmin)
            super_comm_q = (
                db.session.query(func.coalesce(func.sum(Servicio.transferido), 0.0))
                .select_from(Ingreso)
                .join(Servicio, Servicio.id == Ingreso.servicio_id)
                .join(Cita, Ingreso.cita_id == Cita.id)
                .filter(Ingreso.barbero_id != barbero_id)
            )
            if fi_date:
                super_comm_q = super_comm_q.filter(Cita.fecha_cita >= fi_date)
            if ff_date:
                super_comm_q = super_comm_q.filter(Cita.fecha_cita <= ff_date)
            transferido_received = float(super_comm_q.scalar() or 0.0)
            transferido_signed = abs(transferido_received)  # positivo
            neto = total + abs(transferido_received)
        else:
            # Cliente: no aplica transferencias
            transferido_signed = 0.0
            neto = total

        return jsonify({
            'total': total,
            'transferido': transferido_signed,
            'neto': neto,
            'citas_completadas': citas_completadas,  # ahora es por cita, no por ingreso
            'ingresos': ingresos_list,
            'tendencia': tendencia,
            'distribucion': distribucion
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Error interno', 'detalle': str(e)}), 500
# ...existing code...
