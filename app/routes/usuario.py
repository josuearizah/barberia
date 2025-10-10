from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from app import db
from app.models.usuario import Usuario
from app.models.notificacion import Notificacion

PROTECTED_CLIENT_ID = 6

ADMIN_ROLES = {Usuario.ROL_ADMIN, Usuario.ROL_SUPERADMIN}

bp = Blueprint('usuario', __name__)

# ========== REGISTRO ==========
@bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nombre = request.form.get('nombre')
        apellido = request.form.get('apellido')
        telefono = (request.form.get('telefono') or '').strip() or None
        correo = request.form.get('correo')
        contrasena = request.form.get('contrasena')

        try:
            usuario_existente = Usuario.query.filter_by(correo=correo).first()
            if usuario_existente:
                flash('El correo ya estÃÂ¡ registrado.', 'error')
                return render_template('usuario/register.html')
        except Exception as e:
            print("Error al buscar el correo:", e)
            flash('Error interno al validar el usuario.', 'error')
            return render_template('usuario/register.html')

        # Validar longitud minima
        if len((contrasena or '')) < 8:
            flash('La contraseña debe tener minimo 8 caracteres', 'error')
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
            # Notificar a administradores sobre nuevo registro
            try:
                admins = Usuario.query.filter(Usuario.rol.in_(Usuario.ROLES_ADMINISTRATIVOS)).all()
                for a in admins:
                    n = Notificacion(
                        usuario_id=a.id,
                        titulo='Nuevo usuario registrado',
                        mensaje=f"Se registrÃÂ³ {nombre} {apellido}",
                        tipo='usuario',
                        prioridad='baja',
                        data={"url": "/clientes"}
                    )
                    db.session.add(n)
                db.session.commit()
            except Exception:
                db.session.rollback()

            flash('Registro exitoso. Ya puedes iniciar sesiÃÂ³n.', 'success')
            return redirect(url_for('auth.login'))

        except Exception as e:
            print("Error al registrar usuario:", e)
            flash('Error al crear el usuario.', 'error')
            return render_template('usuario/register.html')

    return render_template('usuario/register.html')


@bp.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    if session.get('rol') not in ADMIN_ROLES:
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
    if session.get('rol') not in ADMIN_ROLES:
        return jsonify({'error': 'No autorizado'}), 403
    usuario = Usuario.query.get_or_404(id)
    data = request.json or {}
    if 'rol' in data:
        nuevo_rol = data['rol']
        roles_validos = {Usuario.ROL_CLIENTE, *Usuario.ROLES_ADMINISTRATIVOS}
        if nuevo_rol not in roles_validos:
            return jsonify({'error': 'Rol no vÃ¡lido'}), 400
        if usuario.es_superadmin() and nuevo_rol != usuario.rol:
            return jsonify({'error': 'No se puede cambiar el rol del superadministrador'}), 400
        usuario.rol = nuevo_rol
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/api/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):
    if session.get('rol') not in ADMIN_ROLES:
        return jsonify({'error': 'No autorizado'}), 403
    usuario = Usuario.query.get_or_404(id)
    if usuario.es_superadmin() or id == PROTECTED_CLIENT_ID:
        return jsonify({'error': 'Este usuario estÃ¡ protegido y no puede eliminarse'}), 400
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({'success': True}), 200

@bp.route('/api/barberos', methods=['GET'])
def obtener_barberos():
    try:
        from app.models.perfil import Perfil
        import json
        
        # Obtener usuarios con rol de admin que actuarÃÂ¡n como barberos
        barberos = Usuario.query.filter(Usuario.rol.in_(Usuario.ROLES_ADMINISTRATIVOS)).all()
        
        resultado = []
        for barbero in barberos:
            # Buscar el perfil correspondiente
            perfil = Perfil.query.filter_by(usuario_id=barbero.id).first()
            
            # Preparar datos de redes sociales
            redes_sociales = []
            if perfil and perfil.redes_sociales:
                try:
                    redes_sociales = json.loads(perfil.redes_sociales)
                except:
                    # Si hay un error al parsear el JSON, dejamos la lista vacÃa
                    pass
            
            # Crear objeto con los datos del barbero
            datos_barbero = {
                'id': barbero.id,
                'nombre': barbero.nombre,
                'apellido': barbero.apellido,
                'imagen': perfil.imagen if perfil else None,
                'descripcion': perfil.descripcion if perfil else None,
                'redes_sociales': redes_sociales
            }
            resultado.append(datos_barbero)
            
        return jsonify(resultado)
    except Exception as e:
        print("Error al obtener barberos:", e)
        return jsonify({'error': str(e)}), 500





