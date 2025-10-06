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
    # Sube el tamaño para hashes largos (scrypt/bcrypt/PBKDF2)
    contrasena = db.Column(db.String(255), nullable=False)
    ROL_CLIENTE = 'cliente'
    ROL_ADMIN = 'admin'
    ROL_SUPERADMIN = 'superadmin'
    ROLES_ADMINISTRATIVOS = (ROL_ADMIN, ROL_SUPERADMIN)

    rol = db.Column(db.String(20), nullable=False, default=ROL_CLIENTE)  # 'admin', 'superadmin' o 'cliente'
    # Añade estos campos a la clase Usuario (dentro de la definición de la clase)
    reset_codigo = db.Column(db.String(6), nullable=True)
    reset_expiracion = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(32), nullable=True)
    reset_token_expiracion = db.Column(db.DateTime, nullable=True)

    # Métodos para login
    def set_password(self, password):
        self.contrasena = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.contrasena, password)

    def es_superadmin(self):
        return self.rol == self.ROL_SUPERADMIN

    def es_admin(self):
        return self.rol in self.ROLES_ADMINISTRATIVOS

    def es_cliente(self):
        return self.rol == self.ROL_CLIENTE
