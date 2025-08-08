from flask import Blueprint, render_template, session, redirect, url_for, request
from app.models.usuario import Usuario
from app.models.cita import Cita
from app import db
from datetime import datetime

cita_bp = Blueprint('cita', __name__)

@cita_bp.route('/reservar_cita', methods=['GET', 'POST'])
def reservar_cita():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    
    barberos = Usuario.query.filter_by(rol='admin').all()

    if request.method == 'POST':
        try:
            # Validar campos requeridos
            required_fields = ['date', 'time', 'service', 'barber']
            for field in required_fields:
                if field not in request.form or not request.form[field]:
                    raise ValueError(f"El campo {field} es requerido")

            # Validar fecha
            try:
                fecha = datetime.strptime(request.form['date'], '%Y-%m-%d').date()
            except ValueError:
                raise ValueError("La fecha proporcionada no es válida")

            # Validar barbero
            try:
                barbero_id = int(request.form['barber'])
                barbero = Usuario.query.filter_by(id=barbero_id, rol='admin').first()
                if not barbero:
                    raise ValueError("El barbero seleccionado no es válido")
            except ValueError:
                raise ValueError("El ID del barbero no es válido")

            # Validar servicio
            servicios_validos = ['corte', 'afeitado', 'barba', 'color', 'infantil', 'facial']
            servicio = request.form['service']
            if servicio not in servicios_validos:
                raise ValueError("El servicio seleccionado no es válido")

            cita = Cita(
                fecha=fecha,
                hora=request.form['time'],
                notas=request.form.get('notes', ''),
                usuario_id=session['usuario_id'],
                barbero_id=barbero_id,
                servicio=servicio
            )
            db.session.add(cita)
            db.session.commit()
            return render_template('cita/reservar.html', barberos=barberos, exito=True)
        except Exception as e:
            db.session.rollback()
            error_message = f"Error al registrar la cita: {str(e)}"
            print(error_message)
            return render_template('cita/reservar.html', barberos=barberos, exito=False, error_message=error_message)
    
    return render_template('cita/reservar.html', barberos=barberos)