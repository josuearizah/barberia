from app import db
from datetime import datetime

class Cita(db.Model):
    __tablename__ = 'cita'

    id = db.Column(db.Integer, primary_key=True)
    fecha_cita = db.Column(db.Date, nullable=False)
    hora = db.Column(db.String(5), nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='pendiente')
    notas = db.Column(db.Text, nullable=True)
    fecha_creacion = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id'), nullable=False)  # <-- AGREGADO

    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref=db.backref('citas_usuario', lazy=True))
    barbero = db.relationship('Usuario', foreign_keys=[barbero_id], backref=db.backref('citas_barbero', lazy=True))

    def __repr__(self):
        return f'<Cita {self.fecha_cita} {self.hora} - Usuario {self.usuario_id} - Barbero {self.barbero_id}>'

    def hora_12h(self):
        try:
            return datetime.strptime(self.hora, "%H:%M").strftime("%I:%M %p")
        except Exception:
            return self.hora