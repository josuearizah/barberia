from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify
from app.models.usuario import Usuario
from app.models.cita import Cita
from app import db

bp = Blueprint('auth', __name__)

# ========== LOGIN ==========
@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        correo = request.form['correo']
        contrasena = request.form['contrasena']

        usuario = Usuario.query.filter_by(correo=correo).first()
        if usuario and usuario.check_password(contrasena):
            # Guardar datos en sesión
            session['usuario_id'] = usuario.id
            session['nombre'] = usuario.nombre
            session['apellido'] = usuario.apellido
            session['correo'] = usuario.correo 
            session['telefono'] = usuario.telefono
            session['rol'] = usuario.rol  # asegúrate que este campo existe
            flash('Inicio de sesión exitoso', 'success')
            return redirect(url_for('index'))  # redirige al home u otra página
        else:
            flash('Credenciales inválidas', 'error')

    return render_template('login.html')

@bp.route('/dashboard')
def dashboard():
    # Opcional: verifica si el usuario es admin
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('index'))
    return render_template('usuario/admin/admin_dashboard.html')

# ========== LOGOUT ==========
@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

@bp.route('/citas')
def citas():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('index'))
    
    # Obtener las citas asignadas al barbero (admin) actual
    citas = Cita.query.filter_by(barbero_id=session.get('usuario_id')).all()
    return render_template('usuario/admin/admin_dashboard.html', citas=citas)

from app.models.servicio import Servicio

@bp.route('/servicios')
def servicios():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('index'))
    servicios = Servicio.query.all()
    return render_template('usuario/admin/admin_dashboard.html', servicios=servicios)

@bp.route('/clientes')
def clientes():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('index'))
    return render_template('usuario/admin/admin_dashboard.html')


@bp.route('/historial')
def historial():
    # código similar
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/ingresos')
def ingresos():
    # código similar
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/inventario')
def inventario():
    # código similar
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/configuracion')
def configuracion():
    # código similar
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/actualizar_estado_cita/<int:cita_id>', methods=['POST'])
def actualizar_estado_cita(cita_id):
    try:
        cita = Cita.query.get_or_404(cita_id)
        if cita.barbero_id != session.get('usuario_id'):
            return jsonify({'error': 'No tienes permiso para modificar esta cita'}), 403
        estado = request.form.get('estado')
        if estado not in ['pendiente', 'confirmado', 'cancelado', 'completado']:
            return jsonify({'error': 'Estado inválido'}), 400
        cita.estado = estado
        db.session.commit()
        return jsonify({'success': True, 'estado': estado}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500