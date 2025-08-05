from flask import Blueprint, render_template

cita_bp = Blueprint('cita', __name__)

@cita_bp.route('/reservar_cita')
def reservar_cita():
    return render_template('cita/reservar.html')