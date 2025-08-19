from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.estilo import Estilo
from app.models.servicio import Servicio
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
            session['rol'] = usuario.rol
            flash('Inicio de sesión exitoso', 'success')
            return redirect(url_for('auth.index'))
        else:
            flash('Credenciales inválidas', 'error')

    return render_template('login.html')

@bp.route('/')
def index():
    usuario_autenticado = 'usuario_id' in session
    servicios = Servicio.query.all()
    return render_template('main.html', usuario_autenticado=usuario_autenticado, servicios=servicios)

@bp.route('/dashboard')
def dashboard():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    if session.get('rol') == 'admin':
        servicios = Servicio.query.all()
        return render_template('usuario/admin/admin_dashboard.html', servicios=servicios)
    return render_template('usuario/cliente/cliente_dashboard.html')

# ========== LOGOUT ==========
@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.index'))

@bp.route('/citas')
def citas():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))

    from app.models.cita import Cita
    rol = session.get('rol')
    usuario_id = session.get('usuario_id')

    if rol == 'admin':
        citas = Cita.query.filter_by(barbero_id=usuario_id).all()
        return render_template('usuario/admin/admin_dashboard.html', citas=citas)
    else:
        citas = Cita.query.filter_by(usuario_id=usuario_id).all()
        return render_template('usuario/cliente/cliente_dashboard.html', citas=citas)

@bp.route('/servicios')
def servicios():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('auth.index'))
    servicios = Servicio.query.all()
    return render_template('usuario/admin/admin_dashboard.html', servicios=servicios)

@bp.route('/estilos')
def estilos():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('auth.index'))
    estilos = Estilo.query.all()
    return render_template('usuario/admin/admin_dashboard.html', estilos=estilos)

@bp.route('/clientes')
def clientes():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('auth.index'))
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/historial')
def historial():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    return render_template('usuario/cliente/cliente_dashboard.html')

@bp.route('/ingresos')
def ingresos():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    return render_template('usuario/cliente/cliente_dashboard.html')

@bp.route('/inventario')
def inventario():
    return render_template('usuario/admin/admin_dashboard.html')

@bp.route('/configuracion')
def configuracion():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    return render_template('usuario/cliente/cliente_dashboard.html')

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