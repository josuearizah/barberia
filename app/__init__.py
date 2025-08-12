from flask import Flask, render_template, session
from flask_sqlalchemy import SQLAlchemy
import os
import cloudinary

db = SQLAlchemy()

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

    db.init_app(app)

    # Crear tablas en la base de datos
    with app.app_context():
        db.create_all()

    # Registrar blueprints
    from app.routes import auth, usuario, cita, servicio  # Añade servicios
    app.register_blueprint(auth.bp)
    app.register_blueprint(usuario.bp)
    app.register_blueprint(cita.cita_bp)
    app.register_blueprint(servicio.servicios_bp)  # Registra el blueprint

    @app.route('/')
    def index():
        usuario_autenticado = 'usuario_id' in session
        return render_template('main.html', usuario_autenticado=usuario_autenticado)

    @app.errorhandler(Exception)
    def handle_error(e):
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

    return app