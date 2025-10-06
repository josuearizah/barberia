from app import db

class Servicio(db.Model):
    __tablename__ = 'servicio'

    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)
    precio = db.Column(db.Numeric(10, 2), nullable=False)
    duracion = db.Column(db.Time, nullable=False)
    imagen_url = db.Column(db.String(255), nullable=True)  # URL de la imagen en la nube
    transferido = db.Column(db.Numeric(10, 2), nullable=True, default=0)

    # Relaciones
    citas = db.relationship('Cita', back_populates='servicio', foreign_keys='Cita.servicio_id', lazy=True)
    citas_adicionales = db.relationship('Cita', foreign_keys='Cita.servicio_adicional_id', lazy=True)
    descuento = db.relationship('Descuento', back_populates='servicio', uselist=False, lazy=True)

    def __repr__(self):
        return f'<Servicio {self.nombre}>'
