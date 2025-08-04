from app import db

class Cita(db.Model):
    __tablename__ = 'cita'

    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default='pendiente')  # pendiente, confirmado, cancelado, completado
    notas = db.Column(db.Text, nullable=True)

    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id'), nullable=False)

    usuario = db.relationship('Usuario', backref=db.backref('citas', lazy=True))

    def __repr__(self):
        return f'<Cita {self.fecha} {self.hora} - Usuario {self.usuario_id}>'
