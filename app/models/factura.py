from app import db
from datetime import datetime


class Factura(db.Model):
    __tablename__ = 'factura'

    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(32), unique=True, nullable=False)
    fecha_emision = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    pago_id = db.Column(db.Integer, db.ForeignKey('pago.id'), nullable=False)
    cita_id = db.Column(db.Integer, db.ForeignKey('cita.id'), nullable=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

    # Totales (denormalizados para robustez)
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    metodo = db.Column(db.String(20), nullable=False)

    pago = db.relationship('Pago', backref=db.backref('factura', uselist=False))

    def __repr__(self):
        return f'<Factura #{self.numero} Pago:{self.pago_id}>'

