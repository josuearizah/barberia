from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.servicio import Servicio
from app import db
from datetime import datetime

cita_bp = Blueprint('cita', __name__)

@cita_bp.route('/reservar_cita', methods=['GET', 'POST'])
def reservar_cita():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))

    barberos = Usuario.query.filter_by(rol='admin').all()
    servicios = Servicio.query.order_by(Servicio.nombre.asc()).all()

    # Si no hay servicios, muestra el formulario pero bloquea el POST
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

            cita = Cita(
                fecha_cita=fecha,
                hora=request.form['time'],
                notas=request.form.get('notes', ''),
                usuario_id=session['usuario_id'],
                barbero_id=barbero_id,
                servicio_id=servicio_id
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
        citas = Cita.query.filter_by(usuario_id=usuario_id).all()
        return jsonify([{
            'id': cita.id,
            'barbero_id': cita.barbero_id,
            'barbero_nombre': cita.barbero.nombre,
            'barbero_apellido': cita.barbero.apellido,
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

