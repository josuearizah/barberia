from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.servicio import Servicio
from app import db
from datetime import datetime
import re

cita_bp = Blueprint('cita', __name__)

@cita_bp.route('/reservar_cita', methods=['GET', 'POST'])
def reservar_cita():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))

    barberos = Usuario.query.filter_by(rol='admin').all()
    servicios = Servicio.query.order_by(Servicio.nombre.asc()).all()

    if request.method == 'POST' and len(servicios) == 0:
        return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=False, error_message='No hay servicios disponibles.')

    if request.method == 'POST':
        try:
            required_fields = ['date', 'time', 'service_id', 'barber']
            for field in required_fields:
                if field not in request.form or not request.form[field]:
                    raise ValueError(f"El campo {field} es requerido")

            fecha = datetime.strptime(request.form['date'], '%Y-%m-%d').date()

            barbero_id = int(request.form['barber'])
            barbero = Usuario.query.filter_by(id=barbero_id, rol='admin').first()
            if not barbero:
                raise ValueError("El barbero seleccionado no es válido")

            servicio_id = int(request.form['service_id'])
            servicio = Servicio.query.get(servicio_id)
            if not servicio:
                raise ValueError("El servicio seleccionado no existe")

            usuario_actual = Usuario.query.get(session['usuario_id'])
            full_name_db = f"{(usuario_actual.nombre or '').strip()} {(usuario_actual.apellido or '').strip()}".strip().lower()

            nombre_cliente = (request.form.get('name') or request.form.get('nombre') or '').strip()
            telefono_cliente = (request.form.get('phone') or request.form.get('telefono') or '').strip()

            def norm_phone(p): return re.sub(r'\D', '', p or '')
            same_name = bool(nombre_cliente) and nombre_cliente.lower() == full_name_db
            same_phone = bool(telefono_cliente and usuario_actual.telefono) and norm_phone(telefono_cliente) == norm_phone(usuario_actual.telefono)

            if same_name or same_phone:
                nombre_cliente = None
                telefono_cliente = None

            cita = Cita(
                fecha_cita=fecha,
                hora=request.form['time'],
                notas=request.form.get('notes', ''),
                usuario_id=session['usuario_id'],
                barbero_id=barbero_id,
                servicio_id=servicio_id,
                nombre_cliente=nombre_cliente or None,
                telefono_cliente=telefono_cliente or None
            )
            db.session.add(cita)
            db.session.commit()
            return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=True)

        except Exception as e:
            db.session.rollback()
            error_message = f"Error al registrar la cita: {str(e)}"
            return render_template('cita/reservar.html', barberos=barberos, servicios=servicios, exito=False, error_message=error_message)

    return render_template('cita/reservar.html', barberos=barberos, servicios=servicios)

@cita_bp.route('/api/citas', methods=['GET'])
def obtener_citas():
    try:
        usuario_id = session.get('usuario_id')
        if not usuario_id:
            return jsonify({'error': 'No autorizado'}), 401
        usuario = Usuario.query.get(usuario_id)
        if usuario.rol == 'admin':
            citas = Cita.query.all()
        else:
            citas = Cita.query.filter_by(usuario_id=usuario_id).all()
        return jsonify([{
            'id': cita.id,
            'barbero_id': cita.barbero_id,
            'barbero_nombre': cita.barbero.nombre if cita.barbero else None,
            'barbero_apellido': cita.barbero.apellido if cita.barbero else None,
            'usuario_id': cita.usuario_id,
            'usuario_nombre': cita.usuario.nombre if cita.usuario else '',
            'usuario_apellido': cita.usuario.apellido if cita.usuario else '',
            'usuario_telefono': cita.usuario.telefono if cita.usuario else None,
            'nombre_cliente': cita.nombre_cliente if cita.nombre_cliente else None,
            'telefono_cliente': cita.telefono_cliente if cita.telefono_cliente else None,
            'fecha_creacion': cita.fecha_creacion.strftime('%Y-%m-%d'),
            'fecha_cita': cita.fecha_cita.strftime('%Y-%m-%d'),
            'hora': cita.hora,
            'hora_12h': cita.hora_12h(),
            'servicio_id': cita.servicio_id,
            'servicio_nombre': cita.servicio.nombre if cita.servicio else None,
            'notas': cita.notas,
            'estado': cita.estado
        } for cita in citas]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/citas/<int:cita_id>', methods=['PUT'])
def actualizar_cita(cita_id):
    try:
        cita = Cita.query.get_or_404(cita_id)
        if cita.usuario_id != session.get('usuario_id'):
            return jsonify({'error': 'No tienes permiso para modificar esta cita'}), 403
        form_data = request.form
        cita.barbero_id = int(form_data.get('barbero'))
        cita.fecha_cita = datetime.strptime(form_data.get('fecha_cita'), '%Y-%m-%d').date()
        cita.hora = form_data.get('hora')
        cita.servicio_id = int(form_data.get('servicio')) if form_data.get('servicio') else None
        cita.notas = form_data.get('notas')
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/citas/<int:cita_id>', methods=['DELETE'])
def eliminar_cita(cita_id):
    try:
        cita = Cita.query.get_or_404(cita_id)
        if cita.usuario_id != session.get('usuario_id'):
            return jsonify({'error': 'No tienes permiso para eliminar esta cita'}), 403
        db.session.delete(cita)
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/barberos', methods=['GET'])
def obtener_barberos():
    try:
        barberos = Usuario.query.filter_by(rol='admin').all()
        return jsonify([{
            'id': b.id,
            'nombre': b.nombre,
            'apellido': b.apellido
        } for b in barberos]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cita_bp.route('/api/citas/<int:cita_id>/estado', methods=['POST'])
def actualizar_estado_cita(cita_id):
    if 'usuario_id' not in session or Usuario.query.get(session['usuario_id']).rol != 'admin':
        return jsonify({'error': 'No autorizado'}), 401
    try:
        data = request.json
        estado = data.get('estado')
        if estado not in ['pendiente', 'confirmado', 'cancelado', 'completado']:
            raise ValueError("Estado inválido")
        cita = Cita.query.get_or_404(cita_id)
        cita.estado = estado
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500