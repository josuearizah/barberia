from app import db
from datetime import datetime
from sqlalchemy import func

class Ingreso(db.Model):
    __tablename__ = 'ingreso'

    id = db.Column(db.Integer, primary_key=True)
    fecha_registro = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    monto = db.Column(db.Numeric(10, 2), nullable=False)
    cita_id = db.Column(db.Integer, db.ForeignKey('cita.id'), nullable=False)
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id'), nullable=False)
    descripcion = db.Column(db.Text, nullable=True)

    # Relaciones ORM
    # Relaciones ORM
    cita = db.relationship('Cita', backref=db.backref('ingresos', uselist=True, lazy=True))
    barbero = db.relationship('Usuario', backref=db.backref('ingresos', lazy=True))
    servicio = db.relationship('Servicio', backref=db.backref('ingresos', lazy=True))

    def __repr__(self):
        return f'<Ingreso #{self.id}: ${self.monto} - Barbero #{self.barbero_id}>'

    @classmethod
    def calcular_ingresos_barbero(cls, barbero_id, fecha_inicio=None, fecha_fin=None):
        """
        Calcula los ingresos totales de un barbero en un rango de fechas.

        :param barbero_id: ID del barbero (usuario)
        :param fecha_inicio: Fecha de inicio del rango (datetime, opcional)
        :param fecha_fin: Fecha de fin del rango (datetime, opcional)
        :return: Suma total de los montos (Numeric) o 0 si no hay ingresos
        """
        query = cls.query.filter_by(barbero_id=barbero_id)

        # Filtros por rango de fechas
        if fecha_inicio and isinstance(fecha_inicio, datetime):
            query = query.filter(cls.fecha_registro >= fecha_inicio)
        if fecha_fin and isinstance(fecha_fin, datetime):
            query = query.filter(cls.fecha_registro <= fecha_fin)

        # Calcular la suma de los montos
        total = db.session.query(func.sum(cls.monto)).filter(query.whereclause).scalar()

        return total or 0.0
    
    @property
    def servicio_nombre(self):
        return self.servicio.nombre if self.servicio else None


