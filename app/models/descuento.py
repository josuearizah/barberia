from app import db
from datetime import datetime, date

class Descuento(db.Model):
    __tablename__ = 'descuento'

    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.Enum('porcentaje', 'cantidad', name='tipo_descuento'), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)  # Porcentaje o monto fijo
    fecha_inicio = db.Column(db.Date, nullable=False, default=date.today)
    fecha_fin = db.Column(db.Date, nullable=True)  # Null significa que no expira
    
    # Relación con servicio (un descuento se aplica a un servicio)
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id', ondelete="CASCADE"), nullable=True)
    servicio = db.relationship('Servicio', back_populates='descuento')

    def __repr__(self):
        return f'<Descuento {self.id}: {self.tipo} {self.valor}>'
    
    def esta_vigente(self):
        try:
            ahora = date.today()
            if self.fecha_fin and ahora > self.fecha_fin:
                return False
            return ahora >= self.fecha_inicio
        except Exception as e:
            print(f"Error al verificar vigencia: {str(e)}")
            return False