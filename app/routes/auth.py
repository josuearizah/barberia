from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify, current_app
from flask_mail import Message
from app import db, mail
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.estilo import Estilo
from app.models.servicio import Servicio
from datetime import datetime, timedelta
import re
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

# Añadir esta función en app/routes/auth.py, junto a las demás rutas
@bp.route('/calendario')
def calendario():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    return render_template('usuario/cliente/cliente_dashboard.html')

@bp.route('/servicios')
def servicios():
    if session.get('rol') != 'admin':
        flash('Acceso no autorizado.', 'error')
        return redirect(url_for('auth.index'))
    servicios = Servicio.query.all()
    return render_template('usuario/admin/admin_dashboard.html', servicios=servicios)

@bp.route('/admin/estilos')
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

@bp.route('/pagos')
def pagos():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    # Por ahora no hay vista de pagos para cliente
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
            subject='Código de verificación - RG4LBarber',
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
        El equipo de RG4LBarber
        """
        
        # Versión HTML del mensaje
        msg.html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
            <title>Restablecimiento de Contraseña</title>
        </head>
        <body style="font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; border: 1px solid #eaeaea; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <!-- Logo en la parte superior -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dsi2yfaew/image/upload/v1756158124/logo2_hy3sol.png" alt="RG4LBarber Logo" style="max-width: 75px; height: auto;">
                </div>
                
                <h2 style="font-family: 'Oswald', sans-serif; color: #E5304A; text-align: center; font-size: 24px; font-weight: 600; margin-bottom: 20px;">RESTABLECIMIENTO DE CONTRASEÑA</h2>
                
                <p style="margin-bottom: 15px; color: #333; line-height: 1.6;font-size: 14px;">Hola <strong>{usuario.nombre}</strong>,</p>
                
                <p style="margin-bottom: 15px; color: #333; line-height: 1.6; font-size: 14px;">Has solicitado restablecer tu contraseña.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #E5304A; padding: 15px; margin: 20px 0; text-align: center;">
                    <p style="font-family: 'Oswald', sans-serif; margin: 0; font-size: 14px; color: #666;">TU CÓDIGO DE VERIFICACIÓN ES:</p>
                    <p style="font-family: 'Oswald', sans-serif; font-size: 32px; font-weight: 700; color: #E5304A; letter-spacing: 5px; margin: 10px 0;">{codigo}</p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-bottom: 15px;">Este código expirará en <strong>15 minutos</strong>.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="font-size: 13px; color: #777; margin-bottom: 5px;">Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: #333; margin-bottom: 5px;">RG4LBARBER</p>
                    <p style="font-size: 12px; color: #999;">Estilo y precisión en cada corte</p>
                </div>
            </div>
        </body>
        </html>
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
            subject='Código de verificación (Reenviado) - RG4LBarber',
            recipients=[email]
        )
        
        # Contenido del mensaje en texto plano
        msg.body = f"""
        Hola {usuario.nombre},
        
        Has solicitado reenviar tu código de verificación para restablecer tu contraseña.
        Tu nuevo código es: {codigo}
        
        Este código expirará en 15 minutos.
        
        Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.
        
        Saludos,
        El equipo de RG4LBarber
        """
        
        # Contenido del mensaje
        msg.html = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
            <title>Reenvío de Código</title>
        </head>
        <body style="font-family: 'Poppins', sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; border: 1px solid #eaeaea; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <!-- Logo en la parte superior -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://res.cloudinary.com/dsi2yfaew/image/upload/v1756158124/logo2_hy3sol.png" alt="RG4LBarber Logo" style="max-width: 75px; height: auto;">
                </div>
                
                <h2 style="font-family: 'Oswald', sans-serif; color: #E5304A; text-align: center; font-size: 24px; font-weight: 600; margin-bottom: 20px;">CÓDIGO REENVIADO</h2>
                
                <p style="margin-bottom: 15px; color: #333; line-height: 1.6;">Hola <strong>{usuario.nombre}</strong>,</p>
                
                <p style="margin-bottom: 15px; color: #333; line-height: 1.6;">Has solicitado reenviar tu código de verificación para restablecer tu contraseña.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #E5304A; padding: 15px; margin: 20px 0; text-align: center;">
                    <p style="font-family: 'Oswald', sans-serif; margin: 0; font-size: 14px; color: #666;">TU NUEVO CÓDIGO DE VERIFICACIÓN ES:</p>
                    <p style="font-family: 'Oswald', sans-serif; font-size: 32px; font-weight: 700; color: #E5304A; letter-spacing: 5px; margin: 10px 0;">{codigo}</p>
                </div>
                
                <p style="font-size: 14px; color: #666; margin-bottom: 15px;">Este código expirará en <strong>15 minutos</strong>.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
                
                <p style="font-size: 13px; color: #777; margin-bottom: 5px;">Si no solicitaste restablecer tu contraseña, por favor ignora este mensaje.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <p style="font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600; color: #333; margin-bottom: 5px;">RG4LBARBER</p>
                    <p style="font-size: 12px; color: #999;">Estilo y precisión en cada corte</p>
                </div>
            </div>
        </body>
        </html>
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
    
    # Validar complejidad de contraseña
    if not re.match(r'^(?=.*[A-Z])(?=.*\d).{8,}$', password or ''):
        return jsonify({'error': 'La contraseña debe tener mínimo 8 caracteres, 1 número y 1 mayúscula'}), 400

    # Cambiar contraseña
    usuario.set_password(password)
    
    # Limpiar campos de restablecimiento
    usuario.reset_codigo = None
    usuario.reset_expiracion = None
    usuario.reset_token = None
    usuario.reset_token_expiracion = None
    
    db.session.commit()
    
    return jsonify({'message': 'Contraseña cambiada con éxito'}), 200

@bp.route('/finanzas')
def finanzas():
    if 'usuario_id' not in session:
        return redirect(url_for('auth.login'))
    rol = session.get('rol')
    if rol == 'admin':
        return render_template('usuario/admin/admin_dashboard.html')
    return render_template('usuario/cliente/cliente_dashboard.html')
