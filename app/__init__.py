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

    db.init_app(app)
    mail.init_app(app)

    # Asegurar que todos los modelos estén importados antes de create_all
    # para que se creen sus tablas (incluida 'pago').
    from app.models import usuario as _m_usuario  # noqa: F401
    from app.models import cita as _m_cita        # noqa: F401
    from app.models import servicio as _m_serv    # noqa: F401
    from app.models import historial as _m_hist   # noqa: F401
    from app.models import ingreso as _m_ing      # noqa: F401
    from app.models import pago as _m_pago        # noqa: F401
    from app.models import factura as _m_factura  # noqa: F401

    # Crear tablas en la base de datos
    with app.app_context():
        db.create_all()

    # Registrar blueprints
    from app.routes import auth, usuario, cita, servicio, estilo, perfil, historial, ingreso, metrica  # Añade servicios
    from app.routes import pago
    from app.routes import factura
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuario.bp)
    app.register_blueprint(cita.cita_bp)
    app.register_blueprint(servicio.servicios_bp)  # Registra el blueprint
    app.register_blueprint(estilo.estilos_bp)  # Registra el blueprint de estilos
    app.register_blueprint(perfil.perfil_bp)  # Registra el blueprint de perfil
    app.register_blueprint(historial.historial_bp)  # Registra el blueprint de historial
    app.register_blueprint(ingreso.ingreso_bp)  # Registra el blueprint de ingresos
    app.register_blueprint(metrica.metrica_bp)  # Registra el blueprint de métricas
    app.register_blueprint(pago.pago_bp)  # Registra el blueprint de pagos
    app.register_blueprint(factura.factura_bp)  # Registra el blueprint de facturas

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
