from app import db

class Servicio(db.Model):
    __tablename__ = 'servicio'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    duracion = db.Column(db.Time, nullable=False)

    # Relaciones
    citas = db.relationship('Cita', backref='servicio', lazy=True)
    # detalles = db.relationship('Detalle', backref='servicio', lazy=True)  # Si lo implementas
    # promociones = db.relationship('Promocion', backref='servicio', lazy=True)  # Si lo implementas
    # resenas = db.relationship('Resena', backref='servicio', lazy=True)  # Si lo implementas

    def __repr__(self):
        return f'<Servicio {self.nombre}>'


