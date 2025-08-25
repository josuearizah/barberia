from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify, current_app
from flask_mail import Message
from app import db, mail
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.estilo import Estilo
from app.models.servicio import Servicio
from datetime import datetime, timedelta
import random
import string


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
    
# ========== RESTABLECER CONTRASEÑA ==========
@bp.route('/reset-password')
def reset_password():
    return render_template('usuario/cambiar_contraseña.html')

@bp.route('/api/reset-password/solicitar', methods=['POST'])
def solicitar_reset():
    data = request.get_json()
    email = data.get('email')
    
    # Verificar si el correo existe
    usuario = Usuario.query.filter_by(correo=email).first()
    if not usuario:
        # Por seguridad, no revelar si el correo existe o no
        return jsonify({'message': 'Si el correo está registrado, recibirás un código de verificación.'}), 200
    
    # Generar código de verificación
    codigo = ''.join(random.choices(string.digits, k=6))
    expiracion = datetime.now() + timedelta(minutes=15)  # El código expira en 15 minutos
    
    # Almacenar el código en la base de datos
    usuario.reset_codigo = codigo
    usuario.reset_expiracion = expiracion
    db.session.commit()
    
    try:
        # Crear mensaje de correo
        msg = Message(
            subject='Código de verificación - Barbería Clásica',
            recipients=[email]
        )
        
        # Contenido del mensaje
        msg.body = f"""
        Hola {usuario.nombre},
        
        Has solicitado restablecer tu contraseña. 
        Tu código de verificación es: {codigo}
        
        Este código expirará en 15 minutos.
        
        Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.
        
        Saludos,
        El equipo de Barbería Clásica
        """
        
        # Versión HTML del mensaje
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #E5304A; text-align: center;">Barbería Clásica</h2>
            <p>Hola <strong>{usuario.nombre}</strong>,</p>
            <p>Has solicitado restablecer tu contraseña.</p>
            <p>Tu código de verificación es: <strong style="font-size: 24px; color: #E5304A;">{codigo}</strong></p>
            <p style="font-size: 0.9em; color: #777;">Este código expirará en 15 minutos.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8em; color: #777;">Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.</p>
            <p style="text-align: center; font-size: 0.8em; color: #777;">El equipo de Barbería Clásica</p>
        </div>
        """
        
        # Información de depuración antes del envío
        print(f"Intentando enviar correo a: {email}")
        print(f"Configuración de correo actual:")
        print(f"  - MAIL_SERVER: {current_app.config.get('MAIL_SERVER')}")
        print(f"  - MAIL_PORT: {current_app.config.get('MAIL_PORT')}")
        print(f"  - MAIL_USE_TLS: {current_app.config.get('MAIL_USE_TLS')}")
        print(f"  - MAIL_USERNAME: {current_app.config.get('MAIL_USERNAME')}")
        
        # Enviar el correo
        mail.send(msg)
        
        print(f"✅ Correo enviado exitosamente a {email} con código {codigo}")
        
        return jsonify({'message': 'Código de verificación enviado'}), 200
    
    except Exception as e:
        # Registro detallado del error
        import traceback
        error_traceback = traceback.format_exc()
        print(f"❌ ERROR al enviar correo a {email}:")
        print(f"Tipo de error: {type(e).__name__}")
        print(f"Descripción del error: {str(e)}")
        print(f"Traceback completo:")
        print(error_traceback)
        
        # Si es un error de conexión, proporciona más información
        if "socket.gaierror" in error_traceback or "Connection refused" in error_traceback:
            return jsonify({'error': 'Error de conexión con el servidor de correo. Verifica la configuración.'}), 500
        elif "Authentication" in str(e):
            return jsonify({'error': 'Error de autenticación con el servidor de correo. Verifica usuario y contraseña.'}), 500
        elif "Sender address rejected" in str(e):
            return jsonify({'error': 'Dirección de remitente rechazada. Verifica tu dirección de correo.'}), 500
        else:
            # Error genérico para el usuario pero detallado en los logs
            return jsonify({'error': f'No se pudo enviar el correo: {type(e).__name__}'}), 500

# API para verificar el código
@bp.route('/api/reset-password/verificar', methods=['POST'])
def verificar_codigo():
    data = request.get_json()
    email = data.get('email')
    codigo = data.get('codigo')
    
    usuario = Usuario.query.filter_by(correo=email).first()
    if not usuario or not usuario.reset_codigo or usuario.reset_codigo != codigo:
        return jsonify({'error': 'Código inválido'}), 400
    
    # Verificar si el código ha expirado
    if datetime.now() > usuario.reset_expiracion:
        return jsonify({'error': 'Código expirado. Solicita uno nuevo.'}), 400
    
    # Generar token para cambio de contraseña
    token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    usuario.reset_token = token
    usuario.reset_token_expiracion = datetime.now() + timedelta(minutes=15)
    db.session.commit()
    
    return jsonify({'token': token}), 200

# API para reenviar código
@bp.route('/api/reset-password/reenviar', methods=['POST'])
def reenviar_codigo():
    data = request.get_json()
    email = data.get('email')
    
    usuario = Usuario.query.filter_by(correo=email).first()
    if not usuario:
        return jsonify({'message': 'Si el correo está registrado, recibirás un código de verificación.'}), 200
    
    # Generar nuevo código
    codigo = ''.join(random.choices(string.digits, k=6))
    expiracion = datetime.now() + timedelta(minutes=15)
    
    usuario.reset_codigo = codigo
    usuario.reset_expiracion = expiracion
    db.session.commit()
    
    try:
        # Crear mensaje de correo
        msg = Message(
            subject='Código de verificación (Reenviado) - Barbería Clásica',
            recipients=[email]
        )
        
        # Contenido del mensaje
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #E5304A; text-align: center;">Barbería Clásica</h2>
            <p>Hola <strong>{usuario.nombre}</strong>,</p>
            <p>Has solicitado reenviar tu código de verificación para restablecer tu contraseña.</p>
            <p>Tu nuevo código es: <strong style="font-size: 24px; color: #E5304A;">{codigo}</strong></p>
            <p style="font-size: 0.9em; color: #777;">Este código expirará en 15 minutos.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 0.8em; color: #777;">Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.</p>
            <p style="text-align: center; font-size: 0.8em; color: #777;">El equipo de Barbería Clásica</p>
        </div>
        """
        
        # Enviar el correo
        mail.send(msg)
        print(f"Correo reenviado a {email} con código {codigo}")
        
        return jsonify({'message': 'Código reenviado correctamente'}), 200
    
    except Exception as e:
        print(f"Error al enviar correo: {str(e)}")
        return jsonify({'error': 'No se pudo enviar el correo. Por favor, inténtalo más tarde.'}), 500

# API para completar el cambio de contraseña
@bp.route('/api/reset-password/completar', methods=['POST'])
def completar_reset():
    data = request.get_json()
    email = data.get('email')
    token = data.get('token')
    password = data.get('password')
    
    usuario = Usuario.query.filter_by(correo=email).first()
    if not usuario or not usuario.reset_token or usuario.reset_token != token:
        return jsonify({'error': 'Token inválido'}), 400
    
    # Verificar si el token ha expirado
    if datetime.now() > usuario.reset_token_expiracion:
        return jsonify({'error': 'Sesión expirada. Inicia el proceso nuevamente.'}), 400
    
    # Cambiar contraseña
    usuario.set_password(password)
    
    # Limpiar campos de restablecimiento
    usuario.reset_codigo = None
    usuario.reset_expiracion = None
    usuario.reset_token = None
    usuario.reset_token_expiracion = None
    
    db.session.commit()
    
    return jsonify({'message': 'Contraseña cambiada con éxito'}), 200