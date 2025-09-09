from datetime import datetime
from flask import current_app
from app import db


class Notificacion(db.Model):
    __tablename__ = 'notificacion'

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False, index=True)
    titulo = db.Column(db.String(200), nullable=False)
    mensaje = db.Column(db.Text, nullable=True)
    tipo = db.Column(db.String(50), nullable=True)  # info, cita, pago, alerta
    prioridad = db.Column(db.String(20), nullable=True)  # baja, media, alta
    data = db.Column(db.JSON, nullable=True)  # datos adicionales, e.g. {"url":"/citas/123"}
    leida = db.Column(db.Boolean, default=False, index=True)
    creada_en = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    leida_en = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'prioridad': self.prioridad,
            'data': self.data or {},
            'leida': self.leida,
            'creada_en': self.creada_en.isoformat() if self.creada_en else None,
            'leida_en': self.leida_en.isoformat() if self.leida_en else None,
        }
