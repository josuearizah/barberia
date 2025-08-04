from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

class Usuario(db.Model, UserMixin):
    __tablename__ = 'usuario'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    telefono = db.Column(db.String(20), nullable=False)
    correo = db.Column(db.String(100), unique=True, nullable=False)
    contrasena = db.Column(db.String(120), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='cliente')  # 'admin' o 'cliente'

    # Métodos para login
    def set_password(self, password):
        self.contrasena = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.contrasena, password)

    def es_admin(self):
        return self.rol == 'admin'

    def es_cliente(self):
        return self.rol == 'cliente'
