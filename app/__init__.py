from flask import Flask, render_template
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')
    app.config['SECRET_KEY'] = os.urandom(24)

    db.init_app(app)

    # Registrar blueprints
    from app.routes import auth, usuario, cita
    app.register_blueprint(auth.bp)      # login, logout, dashboard
    app.register_blueprint(usuario.bp)   # register
    app.register_blueprint(cita.cita_bp) # reservar_cita

    # Ruta raíz → main.html
    @app.route('/')
    def index():
        return render_template('main.html')

    # Manejador de errores
    @app.errorhandler(Exception)
    def handle_error(e):
        print(f"Error: {str(e)}")
        return {"error": str(e)}, 500

    return app