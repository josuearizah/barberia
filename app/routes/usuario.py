from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from app import db
from app.models.usuario import Usuario

bp = Blueprint('usuario', __name__)

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


@bp.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    if session.get('rol') != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    usuarios = Usuario.query.all()
    return jsonify([{
        'id': u.id,
        'nombre': u.nombre,
        'apellido': u.apellido,
        'telefono': u.telefono,
        'correo': u.correo,
        'rol': u.rol
    } for u in usuarios]), 200

@bp.route('/api/usuarios/<int:id>', methods=['PUT'])
def actualizar_usuario(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    usuario = Usuario.query.get_or_404(id)
    data = request.json
    if 'rol' in data:
        usuario.rol = data['rol']
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/api/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):
    if session.get('rol') != 'admin':
        return jsonify({'error': 'No autorizado'}), 403
    usuario = Usuario.query.get_or_404(id)
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'success': True}), 200
