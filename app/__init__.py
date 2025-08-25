from flask import Flask, render_template, session
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from dotenv import load_dotenv 
import os
import cloudinary

load_dotenv()  # Cargar variables de entorno desde un archivo .env

db = SQLAlchemy()
mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.config['SECRET_KEY'] = os.urandom(24)

    # Configurar Cloudinary
    cloudinary.config(
        cloud_name=app.config['CLOUDINARY_CLOUD_NAME'],
        api_key=app.config['CLOUDINARY_API_KEY'],
        api_secret=app.config['CLOUDINARY_API_SECRET'],
        secure=app.config['SECURE']
    )
    
    # Configuración para Flask-Mail (Gmail)
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'josue091206@gmail.com')  # Usa variables de entorno si es posible
    app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'hohu nfab lxzg lvvg')  # O escribe directamente la contraseña de aplicación
    app.config['MAIL_DEFAULT_SENDER'] = ('RG4LBarber', os.environ.get('MAIL_USERNAME', 'josue091206@gmail.com'))
    
    # Verificar si las credenciales de correo están configuradas
    if not app.config['MAIL_USERNAME'] or not app.config['MAIL_PASSWORD']:
        print("⚠️ ADVERTENCIA: Credenciales de correo no configuradas. El envío de correos no funcionará.")
    else:
        print("✅ Configuración de correo cargada correctamente.")

    db.init_app(app)
    mail.init_app(app)

    # Crear tablas en la base de datos
    with app.app_context():
        db.create_all()

    # Registrar blueprints
    from app.routes import auth, usuario, cita, servicio, estilo, perfil  # Añade servicios
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuario.bp)
    app.register_blueprint(cita.cita_bp)
    app.register_blueprint(servicio.servicios_bp)  # Registra el blueprint
    app.register_blueprint(estilo.estilos_bp)  # Registra el blueprint de estilos
    app.register_blueprint(perfil.perfil_bp)  # Registra el blueprint de perfil
    
    @app.context_processor
    def inject_perfil_actual():
        from app.models.perfil import Perfil  # import interno evita ciclos
        perfil_actual = None
        if 'usuario_id' in session:
            perfil_actual = Perfil.query.filter_by(usuario_id=session['usuario_id']).first()
        return dict(perfil_actual=perfil_actual)

    @app.errorhandler(Exception)
    def handle_error(e):
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

    return app
