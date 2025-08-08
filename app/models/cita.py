from app import db
from datetime import datetime

class Cita(db.Model):
    __tablename__ = 'cita'

    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.String(5), nullable=False)  # Cambiado a String para almacenar "HH:MM"
    estado = db.Column(db.String(20), nullable=False, default='pendiente')  # pendiente, confirmado, cancelado, completado
    notas = db.Column(db.Text, nullable=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    servicio = db.Column(db.String(50), nullable=False)  # Servicio como texto

    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref=db.backref('citas_usuario', lazy=True))
    barbero = db.relationship('Usuario', foreign_keys=[barbero_id], backref=db.backref('citas_barbero', lazy=True))

    def __repr__(self):
        return f'<Cita {self.fecha} {self.hora} - Usuario {self.usuario_id} - Barbero {self.barbero_id}>'