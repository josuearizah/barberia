from app import db
from datetime import datetime


class Pago(db.Model):
    __tablename__ = 'pago'

    id = db.Column(db.Integer, primary_key=True)
    fecha_registro = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones clave
    cita_id = db.Column(db.Integer, db.ForeignKey('cita.id'), nullable=False)
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)

    # Información del pago (informativa)
    metodo = db.Column(db.String(20), nullable=False)  # 'efectivo' | 'transferencia'
    subtotal = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    descuento = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    monto_recibido = db.Column(db.Numeric(10, 2), nullable=True)
    saldo = db.Column(db.Numeric(10, 2), nullable=True)
    notas = db.Column(db.Text, nullable=True)

    # Backrefs (no obligatorios, pero útiles)
    cita = db.relationship('Cita', backref=db.backref('pagos', lazy=True))

    def __repr__(self):
        return f'<Pago #{self.id} Cita #{self.cita_id} Total {self.total}>'

