from app import db
from datetime import datetime

class HistorialCita(db.Model):
    __tablename__ = 'historial_cita'

    id = db.Column(db.Integer, primary_key=True)
    cita_id = db.Column(db.Integer, db.ForeignKey('cita.id'), nullable=True)  # Referencia opcional a la cita original
    fecha_cita = db.Column(db.Date, nullable=False)  # Fecha en que se realizó la cita
    hora = db.Column(db.String(5), nullable=False)   # Hora en que se realizó la cita
    fecha_completado = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)  # Cuándo se completó la cita
    
    # Clientes y servicios
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)  # Cliente
    barbero_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)  # Barbero
    servicio_id = db.Column(db.Integer, db.ForeignKey('servicio.id'), nullable=False)
    
    # Servicio adicional
    servicio_adicional_id = db.Column(db.Integer, db.ForeignKey('servicio.id'), nullable=True)
    
    # Datos adicionales que queremos conservar
    nombre_cliente = db.Column(db.String(120), nullable=True)  # Por si fue un invitado
    notas = db.Column(db.Text, nullable=True)
    
    # Relaciones ORM
    usuario = db.relationship('Usuario', foreign_keys=[usuario_id], backref=db.backref('historial_cliente', lazy=True))
    barbero = db.relationship('Usuario', foreign_keys=[barbero_id], backref=db.backref('historial_barbero', lazy=True))
    servicio = db.relationship('Servicio', foreign_keys=[servicio_id])
    servicio_adicional = db.relationship('Servicio', foreign_keys=[servicio_adicional_id])
    cita = db.relationship('Cita', foreign_keys=[cita_id])
    
    def __repr__(self):
        return f'<HistorialCita {self.id} - Fecha: {self.fecha_cita} {self.hora}>'
    
    def hora_12h(self):
        try:
            return datetime.strptime(self.hora, "%H:%M").strftime("%I:%M %p")
        except Exception:
            return self.hora
    
    @classmethod
    def from_cita(cls, cita):
        """
        Crea un registro de historial a partir de una cita completada
        """
        return cls(
            cita_id=cita.id,
            fecha_cita=cita.fecha_cita,
            hora=cita.hora,
            usuario_id=cita.usuario_id,
            barbero_id=cita.barbero_id,
            servicio_id=cita.servicio_id,
            servicio_adicional_id=cita.servicio_adicional_id,  # Añadir servicio adicional
            nombre_cliente=cita.nombre_cliente,
            notas=cita.notas
        )