from flask import Flask, render_template, session
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.config['SECRET_KEY'] = os.urandom(24)

    db.init_app(app)

    # Crear tablas en la base de datos
    with app.app_context():
        db.create_all()

    # Registrar blueprints
    from app.routes import auth, usuario, cita
    app.register_blueprint(auth.bp)      # login, logout, dashboard
    app.register_blueprint(usuario.bp)   # register
    app.register_blueprint(cita.cita_bp) # reservar_cita

    @app.route('/')
    def index():
        usuario_autenticado = 'usuario_id' in session
        return render_template('main.html', usuario_autenticado=usuario_autenticado)

    # Manejador de errores
    @app.errorhandler(Exception)
    def handle_error(e):
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

    return app