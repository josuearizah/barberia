from flask import Blueprint, render_template, session, redirect, url_for, request
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.servicio import Servicio  # <-- importar modelo Servicio
from app import db
from datetime import datetime

cita_bp = Blueprint('cita', __name__)

# ...existing code...
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
# ...existing code...