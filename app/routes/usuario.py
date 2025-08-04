from flask import Blueprint, render_template, request, redirect, url_for, flash
from app import db
from app.models.usuario import Usuario

bp = Blueprint('usuario', __name__)

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form['nombre']
        apellido = request.form['apellido']
        telefono = request.form['telefono']
        correo = request.form['correo']
        contrasena = request.form['contrasena']

        if Usuario.query.filter_by(correo=correo).first():
            flash('El correo ya está registrado.', 'danger')
            return render_template('usuario/register.html')

        nuevo_usuario = Usuario(
            nombre=nombre,
            apellido=apellido,
            telefono=telefono,
            correo=correo
        )
        nuevo_usuario.set_password(contrasena)
        db.session.add(nuevo_usuario)
        db.session.commit()

        flash('Registro exitoso. Ahora puedes iniciar sesión.', 'success')
        return redirect(url_for('auth.login'))  # asumiendo que login está en blueprint 'auth'

    return render_template('usuario/register.html')
