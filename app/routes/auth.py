from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from app.models.usuario import Usuario
from app import db

bp = Blueprint('auth', __name__)

# ========== REGISTRO ==========
@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form.get('nombre')
        apellido = request.form.get('apellido')
        telefono = request.form.get('telefono')
        correo = request.form.get('correo')
        contrasena = request.form.get('contrasena')

        try:
            usuario_existente = Usuario.query.filter_by(correo=correo).first()
            if usuario_existente:
                flash('El correo ya está registrado.', 'error')
                return render_template('usuario/register.html')
        except Exception as e:
            print("Error al buscar el correo:", e)
            flash('Error interno al validar el usuario.', 'error')
            return render_template('usuario/register.html')

        try:
            nuevo_usuario = Usuario(
                nombre=nombre,
                apellido=apellido,
                telefono=telefono,
                correo=correo
            )
            nuevo_usuario.set_password(contrasena)
            db.session.add(nuevo_usuario)
            db.session.commit()

            flash('Registro exitoso. Ya puedes iniciar sesión.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            print("Error al registrar usuario:", e)
            flash('Error al crear el usuario.', 'error')
            return render_template('usuario/register.html')

    return render_template('usuario/register.html')


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
    return render_template('usuario/admin_dashboard.html')


# ========== LOGOUT ==========
@bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

